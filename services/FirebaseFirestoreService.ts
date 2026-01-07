/**
 * Firebase Firestore 서비스
 * 사용자, 게시글, 채팅, 신고 데이터 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db, auth } from '../config/firebase';
import { User, Post, Report, ChatRoom, Message, Purchase, Region, BDSMPreference } from '../types';
import { firebaseStorageService } from './FirebaseStorageService';
import { REGION_COORDINATES } from '../utils/regions';
import { POINTS } from '../constants';

// 기본 지역: 서울
const DEFAULT_REGION: Region = 'seoul';
const DEFAULT_LOCATION = REGION_COORDINATES[DEFAULT_REGION];

class FirebaseFirestoreService {
  // bdsmPreference가 단일 값인 경우 배열로 변환 (기존 데이터 호환성)
  private normalizeBdsmPreference(pref: any): BDSMPreference[] | undefined {
    if (!pref) return undefined;
    if (Array.isArray(pref)) {
      // 배열인 경우 각 항목이 유효한 BDSMPreference인지 확인
      return pref.filter((p: any) => typeof p === 'string') as BDSMPreference[];
    }
    // 단일 값인 경우 배열로 변환 (기존 'none' 값은 제외)
    if (typeof pref === 'string' && pref !== 'none') {
      return [pref as BDSMPreference];
    }
    return undefined;
  }

  /**
   * suspendedUntil 필드 처리 (Long 또는 Timestamp)
   */
  private parseSuspendedUntil(data: any): number | undefined {
    if (!data.suspendedUntil) return undefined;
    if (data.suspendedUntil.toMillis) {
      return data.suspendedUntil.toMillis();
    }
    if (typeof data.suspendedUntil === 'number') {
      return data.suspendedUntil;
    }
    return undefined;
  }

  /**
   * Firestore 문서 데이터를 User 객체로 변환
   */
  private transformUserData(
    docId: string,
    data: DocumentData,
    options: {
      includePoints?: boolean;
      includeBlockedUsers?: boolean;
      includeLastSeen?: boolean;
    } = {}
  ): User {
    const {
      includePoints = false,
      includeBlockedUsers = false,
      includeLastSeen = true,
    } = options;

    return {
      id: docId,
      name: data.name,
      avatar: data.avatar,
      gender: data.gender,
      age: data.age,
      location: data.latitude && data.longitude
        ? { latitude: data.latitude, longitude: data.longitude }
        : undefined,
      region: data.region,
      isAdmin: data.isAdmin || false,
      bdsmPreference: this.normalizeBdsmPreference(data.bdsmPreference),
      bio: data.bio,
      deletionRequestedAt: data.deletionRequestedAt?.toMillis(),
      deletionScheduledAt: data.deletionScheduledAt?.toMillis(),
      lastAttendanceDate: data.lastAttendanceDate,
      lastPostRewardDate: data.lastPostRewardDate,
      suspendedUntil: this.parseSuspendedUntil(data),
      suspensionType: data.suspensionType,
      likeCount: data.likeCount || 0,
      likedBy: data.likedBy || {},
      lastSeen: includeLastSeen
        ? (data.updatedAt?.toMillis() || data.createdAt?.toMillis() || undefined)
        : undefined,
      ...(includePoints && { points: data.points !== undefined ? data.points : POINTS.DEFAULT }),
      ...(includeBlockedUsers && { blockedUsers: data.blockedUsers || {} }),
    };
  }

  /**
   * 사용자 필터링 (탈퇴 예정, 운영자 제외 등)
   */
  private shouldExcludeUser(
    docId: string,
    data: DocumentData,
    excludeUserId?: string
  ): boolean {
    const shouldExclude = excludeUserId && docId === excludeUserId;
    const isDeletionScheduled = data.deletionScheduledAt && data.deletionScheduledAt.toMillis() <= Date.now();
    const isDeletionRequested = data.deletionRequestedAt;
    const isAdmin = data.isAdmin || false;
    
    return !!(shouldExclude || isDeletionRequested || isDeletionScheduled || isAdmin);
  }
  // 컬렉션 이름
  private readonly COLLECTIONS = {
    USERS: 'users',
    POSTS: 'posts',
    REPORTS: 'reports',
    CHAT_ROOMS: 'chatRooms',
    MESSAGES: 'messages',
    PURCHASES: 'purchases',
    INQUIRIES: 'inquiries',
  };

  // ==================== 사용자 관리 ====================

  /**
   * 사용자 생성 또는 업데이트
   */
  async createOrUpdateUser(userData: {
    id: string;
    phoneNumber: string;
    name: string;
    avatar?: string;
    gender?: 'male' | 'female';
    age?: number;
    latitude?: number;
    longitude?: number;
    region?: Region;
    isAdmin?: boolean;
    points?: number;
    bdsmPreference?: BDSMPreference[];
    bio?: string;
    deletionRequestedAt?: number;
    deletionScheduledAt?: number;
    lastAttendanceDate?: string;
    lastPostRewardDate?: string; // 마지막 게시글 포인트 지급 날짜 (YYYY-MM-DD 형식)
    blockedUsers?: Record<string, number>; // 차단된 사용자 목록 (userId -> blockedAt timestamp)
  }): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userData.id);
      
      // 기존 문서 존재 여부 확인
      const userDoc = await getDoc(userRef);
      const isNewUser = !userDoc.exists();
      
      // phoneNumber 검증: 빈 문자열이거나 공백만 있는 경우 기존 문서의 phoneNumber 사용
      let phoneNumberToSave = userData.phoneNumber?.trim() || '';
      if (!phoneNumberToSave && !isNewUser && userDoc.exists()) {
        const existingData = userDoc.data();
        phoneNumberToSave = existingData?.phoneNumber || '';
        console.warn('phoneNumber가 비어있어 기존 값 사용:', phoneNumberToSave);
      }
      
      // phoneNumber가 여전히 비어있으면 에러
      if (!phoneNumberToSave) {
        throw new Error('phoneNumber는 필수 필드입니다.');
      }
      
      // undefined 필드를 제거하여 Firestore 오류 방지
      const cleanedData: any = {
        id: userData.id,
        phoneNumber: phoneNumberToSave,
        name: userData.name,
        updatedAt: Timestamp.now(),
      };
      
      // 신규 사용자인 경우에만 createdAt 설정
      if (isNewUser) {
        cleanedData.createdAt = Timestamp.now();
      }
      
      // undefined가 아닌 필드만 추가
      if (userData.avatar !== undefined) {
        cleanedData.avatar = userData.avatar;
      }
      if (userData.gender !== undefined) {
        cleanedData.gender = userData.gender;
      }
      if (userData.age !== undefined) {
        cleanedData.age = userData.age;
      }
      if (userData.latitude !== undefined) {
        cleanedData.latitude = userData.latitude;
      }
      if (userData.longitude !== undefined) {
        cleanedData.longitude = userData.longitude;
      }
      if (userData.region !== undefined) {
        cleanedData.region = userData.region;
      }
      if (userData.isAdmin !== undefined) {
        cleanedData.isAdmin = userData.isAdmin;
      }
      if (userData.points !== undefined) {
        cleanedData.points = userData.points;
      }
      if (userData.bdsmPreference !== undefined) {
        cleanedData.bdsmPreference = userData.bdsmPreference;
      }
      if (userData.bio !== undefined) {
        cleanedData.bio = userData.bio;
      }
      if (userData.deletionRequestedAt !== undefined) {
        cleanedData.deletionRequestedAt = Timestamp.fromMillis(userData.deletionRequestedAt);
      }
      if (userData.deletionScheduledAt !== undefined) {
        cleanedData.deletionScheduledAt = Timestamp.fromMillis(userData.deletionScheduledAt);
      }
      if (userData.lastAttendanceDate !== undefined) {
        cleanedData.lastAttendanceDate = userData.lastAttendanceDate;
      }
      if (userData.lastPostRewardDate !== undefined) {
        cleanedData.lastPostRewardDate = userData.lastPostRewardDate;
      }
      if (userData.blockedUsers !== undefined) {
        cleanedData.blockedUsers = userData.blockedUsers;
      }
      
      await setDoc(userRef, cleanedData, { merge: true });
    } catch (error) {
      console.error('사용자 생성/업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 조회
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const data = userSnap.data();
      return this.transformUserData(userSnap.id, data, {
        includeLastSeen: true,
      });
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 실시간 구독
   */
  subscribeToUser(
    userId: string,
    callback: (user: User | null, points?: number, blockedUsers?: Record<string, number>) => void
  ): () => void {
    const userRef = doc(db, this.COLLECTIONS.USERS, userId);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        const data = snapshot.data();
        const user = this.transformUserData(snapshot.id, data, {
          includeLastSeen: true,
        });
        const points = data.points !== undefined ? data.points : POINTS.DEFAULT;
        const blockedUsers = data.blockedUsers || {};
        console.log('사용자 정보 실시간 업데이트:', user.id, user.name, user.location, '지역:', user.region, '포인트:', points, '차단된 사용자:', Object.keys(blockedUsers).length, '명');
        callback(user, points, blockedUsers);
      },
      (error: any) => {
        console.error('사용자 구독 오류:', error);
        callback(null);
      }
    );
  }

  /**
   * 모든 사용자 조회 (현재 사용자 제외)
   */
  async getAllUsers(excludeUserId?: string): Promise<User[]> {
    try {
      console.log('getAllUsers 호출, excludeUserId:', excludeUserId);
      let q = query(collection(db, this.COLLECTIONS.USERS));
      
      const querySnapshot = await getDocs(q);
      console.log('getAllUsers - 전체 문서 수:', querySnapshot.docs.length);
      
      const users = querySnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          const shouldExclude = this.shouldExcludeUser(doc.id, data, excludeUserId);
          
          if (shouldExclude) {
            console.log('사용자 제외:', doc.id);
          }
          
          return !shouldExclude;
        })
        .map((doc) => {
          const data = doc.data();
          const user = this.transformUserData(doc.id, data, {
            includeLastSeen: true,
          });
          console.log('사용자 매핑:', user.id, user.name);
          return user;
        });
      
      console.log('getAllUsers - 반환할 사용자 수:', users.length);
      return users;
    } catch (error: any) {
      console.error('모든 사용자 조회 오류:', error);
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      throw error;
    }
  }

  /**
   * 사용자 목록 실시간 구독
   */
  subscribeToUsers(
    callback: (users: User[]) => void,
    excludeUserId?: string
  ): () => void {
    const q = query(collection(db, this.COLLECTIONS.USERS));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const users: User[] = snapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return !this.shouldExcludeUser(doc.id, data, excludeUserId);
          })
          .map((doc) => {
            const data = doc.data();
            return this.transformUserData(doc.id, data, {
              includeLastSeen: true,
            });
          });
        console.log('사용자 목록 실시간 업데이트:', users.length, '명');
        callback(users);
      },
      (error: any) => {
        console.error('사용자 목록 구독 오류:', error);
        callback([]); // 에러 발생 시 빈 배열 반환
      }
    );
  }

  /**
   * 전화번호로 사용자 조회
   */
  async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.USERS),
        where('phoneNumber', '==', phoneNumber),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        avatar: data.avatar,
        gender: data.gender,
        age: data.age,
        location: data.latitude && data.longitude
          ? { latitude: data.latitude, longitude: data.longitude }
          : undefined,
        region: data.region,
        isAdmin: data.isAdmin || false,
        bdsmPreference: data.bdsmPreference,
        bio: data.bio,
      };
    } catch (error) {
      console.error('전화번호로 사용자 조회 오류:', error);
      throw error;
    }
  }

  // ==================== 게시글 관리 ====================

  /**
   * 사용자의 게시글 목록 조회 (삭제되지 않은 것만)
   * 인덱스 없이 작동하도록 authorId로만 필터링하고 메모리에서 정렬
   */
  async getUserPosts(authorId: string): Promise<Post[]> {
    try {
      // authorId로만 필터링 (인덱스 없이 작동)
      const q = query(
        collection(db, this.COLLECTIONS.POSTS),
        where('authorId', '==', authorId)
      );
      const querySnapshot = await getDocs(q);
      
      // 메모리에서 isDeleted=false인 게시글만 필터링하고 timestamp로 정렬
      const posts: Post[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const isDeleted = data.isDeleted || false;
        
        // 삭제되지 않은 게시글만 추가
        if (!isDeleted) {
          posts.push({
            id: doc.id,
            authorId: data.authorId,
            authorName: data.authorName,
            content: data.content,
            images: data.images || [],
            timestamp: data.timestamp?.toMillis() || Date.now(),
            viewCount: data.viewCount || 0,
          });
        }
      }
      
      // 오래된 순서대로 정렬
      posts.sort((a, b) => a.timestamp - b.timestamp);
      
      return posts;
    } catch (error) {
      console.error('사용자 게시글 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 게시글 생성
   * 사용자가 게시글을 작성하면, 기존 게시글이 있으면 모두 삭제하고 새 게시글만 유지합니다.
   * 항상 최신 게시글 1개만 유지됩니다.
   */
  async createPost(postData: {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    images?: string[];
  }): Promise<void> {
    try {
      // 사용자의 기존 게시글 조회 (삭제되지 않은 것만)
      const userPosts = await this.getUserPosts(postData.authorId);
      console.log(`사용자 ${postData.authorId}의 기존 게시글 수: ${userPosts.length}`);
      
      // 기존 게시글이 있으면 모두 삭제 (항상 최신 게시글 1개만 유지)
      if (userPosts.length > 0) {
        console.log(`기존 게시글 ${userPosts.length}개 삭제 시작`);
        
        // 모든 기존 게시글 삭제
        for (const post of userPosts) {
          try {
            await this.deletePost(post.id);
            console.log('기존 게시글 삭제 완료:', post.id);
            
            // 삭제된 게시글의 이미지도 Storage에서 삭제
            if (post.images && post.images.length > 0) {
              try {
                await firebaseStorageService.deleteMultipleImages(post.images);
                console.log('삭제된 게시글의 이미지 삭제 완료:', post.images.length, '개');
              } catch (imageError) {
                console.error('삭제된 게시글의 이미지 삭제 실패:', imageError);
                // 이미지 삭제 실패해도 게시글 삭제는 계속 진행
              }
            }
          } catch (deleteError) {
            console.error('게시글 삭제 실패:', post.id, deleteError);
            // 개별 게시글 삭제 실패해도 다음 게시글 삭제 계속 진행
          }
        }
        
        console.log(`기존 게시글 ${userPosts.length}개 삭제 완료`);
      }
      
      // 새 게시글 생성
      console.log('새 게시글 생성 시작:', postData.id);
      const postRef = doc(db, this.COLLECTIONS.POSTS, postData.id);
      await setDoc(postRef, {
        ...postData,
        images: postData.images || [], // undefined를 빈 배열로 변환
        timestamp: Timestamp.now(),
        viewCount: 0,
        isDeleted: false,
      });
      console.log('새 게시글 생성 완료:', postData.id);
    } catch (error) {
      console.error('게시글 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 게시글 목록 조회
   */
  async getPosts(limitCount: number = 50): Promise<Post[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.POSTS),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          authorId: data.authorId,
          authorName: data.authorName,
          content: data.content,
          images: data.images || [],
          timestamp: data.timestamp?.toMillis() || Date.now(),
          viewCount: data.viewCount || 0,
        };
      });
    } catch (error) {
      console.error('게시글 목록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 게시글 실시간 구독
   */
  subscribeToPosts(
    callback: (posts: Post[]) => void,
    limitCount: number = 50
  ): () => void {
    // 인덱스가 없어도 작동하도록 쿼리 수정 (isDeleted 필터는 클라이언트에서 처리)
    const q = query(
      collection(db, this.COLLECTIONS.POSTS),
      orderBy('timestamp', 'desc'),
      limit(limitCount * 2) // 더 많이 가져온 후 필터링
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const posts: Post[] = snapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return data.isDeleted !== true; // 클라이언트에서 필터링
          })
          .slice(0, limitCount) // 제한 적용
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              authorId: data.authorId,
              authorName: data.authorName,
              content: data.content,
              images: data.images || [],
              timestamp: data.timestamp?.toMillis() || Date.now(),
              viewCount: data.viewCount || 0,
            };
          });
        callback(posts);
      },
      (error: any) => {
        // 인덱스 에러인 경우 특별 처리
        if (error.code === 'failed-precondition') {
          // 에러 메시지에서 인덱스 링크 추출
          const indexLinkMatch = error.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
          const indexLink = indexLinkMatch ? indexLinkMatch[0] : null;
          
          console.warn('⚠️ Firestore 인덱스가 필요합니다.');
          if (indexLink) {
            console.warn('인덱스 생성 링크:', indexLink);
          } else {
            console.warn('수동 생성: Firebase Console → Firestore → 인덱스 → 컬렉션: posts, 필드: timestamp(내림차순)');
          }
        } else {
          console.error('게시글 구독 오류:', error.code, error.message);
        }
        
        // 에러 발생 시에도 빈 배열로 콜백 호출하여 UI 업데이트
        callback([]);
      }
    );
  }

  /**
   * 게시글 삭제
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const postRef = doc(db, this.COLLECTIONS.POSTS, postId);
      await updateDoc(postRef, {
        isDeleted: true,
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      throw error;
    }
  }

  // ==================== 문의 관리 ====================

  // 운영자(고객센터) 사용자 ID
  private readonly CUSTOMER_SERVICE_USER_ID = 'customer_service';

  /**
   * 운영자(고객센터) 사용자 정보 가져오기 또는 생성
   */
  private async getOrCreateCustomerServiceUser(): Promise<User> {
    try {
      const adminUser = await this.getUser(this.CUSTOMER_SERVICE_USER_ID);
      if (adminUser) {
        return adminUser;
      }

      // 운영자 사용자가 없으면 생성
      const adminUserData: User = {
        id: this.CUSTOMER_SERVICE_USER_ID,
        name: '운영자',
        phoneNumber: '',
        location: DEFAULT_LOCATION,
        region: DEFAULT_REGION,
        isAdmin: true,
      };

      await this.createOrUpdateUser({
        id: this.CUSTOMER_SERVICE_USER_ID,
        phoneNumber: '',
        name: '운영자',
        isAdmin: true,
      });

      return adminUserData;
    } catch (error) {
      console.error('운영자 사용자 생성/조회 오류:', error);
      // 실패해도 기본 정보 반환
      return {
        id: this.CUSTOMER_SERVICE_USER_ID,
        name: '운영자',
        phoneNumber: '',
        location: DEFAULT_LOCATION,
        region: DEFAULT_REGION,
        isAdmin: true,
      };
    }
  }

  /**
   * 문의 생성
   */
  async createInquiry(inquiryData: {
    userId: string;
    userName: string;
    content: string;
  }): Promise<string> {
    try {
      const inquiryRef = await addDoc(collection(db, this.COLLECTIONS.INQUIRIES), {
        userId: inquiryData.userId,
        userName: inquiryData.userName,
        content: inquiryData.content,
        status: 'pending',
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
      console.log('문의 생성 완료:', inquiryRef.id);

      // 운영자와의 채팅방 생성 및 문의 내용을 메시지로 저장
      try {
        const adminUser = await this.getOrCreateCustomerServiceUser();
        const chatRoomId = await this.getOrCreateChatRoom(inquiryData.userId, this.CUSTOMER_SERVICE_USER_ID);
        
        // 문의 내용을 메시지로 저장
        await this.sendMessage({
          chatRoomId,
          senderId: inquiryData.userId,
          receiverId: this.CUSTOMER_SERVICE_USER_ID,
          text: inquiryData.content,
        });

        console.log('문의 채팅방 메시지 저장 완료:', chatRoomId);
      } catch (error) {
        console.error('문의 채팅방 생성/메시지 저장 실패:', error);
        // 실패해도 문의는 생성됨
      }

      return inquiryRef.id;
    } catch (error) {
      console.error('문의 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 문의 답변을 채팅방에 메시지로 추가
   */
  async addInquiryAnswerToChat(inquiryId: string, userId: string, answer: string): Promise<void> {
    try {
      // 운영자와의 채팅방 찾기 또는 생성
      const chatRoomId = await this.getOrCreateChatRoom(userId, this.CUSTOMER_SERVICE_USER_ID);
      
      // 답변을 메시지로 저장 (운영자가 보낸 메시지)
      await this.sendMessage({
        chatRoomId,
        senderId: this.CUSTOMER_SERVICE_USER_ID,
        receiverId: userId,
        text: answer,
      });

      console.log('문의 답변 채팅방 메시지 저장 완료:', chatRoomId);
    } catch (error) {
      console.error('문의 답변 채팅방 메시지 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자의 문의 목록 실시간 구독 (답변 알림용)
   */
  subscribeToInquiries(
    userId: string,
    callback: (inquiries: Array<{
      id: string;
      userId: string;
      userName: string;
      content: string;
      status: 'pending' | 'answered';
      answer?: string;
      answeredAt?: number;
      timestamp: number;
      createdAt: number;
    }>) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTIONS.INQUIRIES),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const inquiries = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            content: data.content,
            status: data.status || 'pending',
            answer: data.answer,
            answeredAt: data.answeredAt?.toMillis(),
            timestamp: data.timestamp?.toMillis() || Date.now(),
            createdAt: data.createdAt?.toMillis() || Date.now(),
          };
        });
        // 클라이언트 측에서 createdAt 기준으로 내림차순 정렬
        inquiries.sort((a, b) => b.createdAt - a.createdAt);
        callback(inquiries);
      },
      (error) => {
        console.error('문의 구독 오류:', error);
      }
    );
  }

  // ==================== 신고 관리 ====================

  /**
   * 신고 생성
   */
  async createReport(reportData: {
    postId?: string;
    userId?: string;
    reportedBy: string;
    reason: string;
    description?: string;
  }): Promise<string> {
    try {
      // undefined 값을 제거한 데이터 객체 생성
      const firestoreData: any = {
        reportedBy: reportData.reportedBy,
        reason: reportData.reason,
        status: 'pending',
        timestamp: Timestamp.now(),
      };

      // 선택적 필드 추가 (undefined가 아닐 때만)
      if (reportData.postId) {
        firestoreData.postId = reportData.postId;
      }
      if (reportData.userId) {
        firestoreData.userId = reportData.userId;
      }
      if (reportData.description !== undefined && reportData.description !== null && reportData.description !== '') {
        firestoreData.description = reportData.description;
      }

      const reportRef = await addDoc(collection(db, this.COLLECTIONS.REPORTS), firestoreData);
      return reportRef.id;
    } catch (error) {
      console.error('신고 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 신고 목록 조회
   */
  async getReports(status?: 'pending' | 'resolved' | 'rejected'): Promise<Report[]> {
    try {
      let q = query(
        collection(db, this.COLLECTIONS.REPORTS),
        orderBy('timestamp', 'desc')
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          postId: data.postId,
          userId: data.userId,
          reportedBy: data.reportedBy,
          reason: data.reason as Report['reason'],
          description: data.description,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          status: data.status || 'pending',
        };
      });
    } catch (error) {
      console.error('신고 목록 조회 오류:', error);
      throw error;
    }
  }

  // ==================== 채팅 관리 ====================

  /**
   * 채팅방 생성 또는 조회
   */
  async getOrCreateChatRoom(userId1: string, userId2: string): Promise<string> {
    try {
      // 기존 채팅방 찾기
      const q = query(
        collection(db, this.COLLECTIONS.CHAT_ROOMS),
        where('participants', 'array-contains', userId1)
      );
      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(userId2)) {
          const roomId = doc.id;
          
          // 기존 채팅방에 participantsInfo가 없으면 추가
          if (!data.participantsInfo) {
            try {
              const [user1, user2] = await Promise.all([
                this.getUser(userId1),
                this.getUser(userId2),
              ]);
              
              if (user1 && user2) {
                // participantsInfo를 Firestore에 저장 (undefined 필드 제거)
                const user1Data: any = {
                  id: user1.id,
                  name: user1.name,
                };
                const user2Data: any = {
                  id: user2.id,
                  name: user2.name,
                };
                
                // undefined가 아닌 필드만 추가
                if (user1.avatar !== undefined) user1Data.avatar = user1.avatar;
                if (user1.gender !== undefined) user1Data.gender = user1.gender;
                if (user1.age !== undefined) user1Data.age = user1.age;
                if (user1.location !== undefined) user1Data.location = user1.location;
                if (user1.isAdmin !== undefined) user1Data.isAdmin = user1.isAdmin;
                if (user1.bdsmPreference !== undefined) user1Data.bdsmPreference = user1.bdsmPreference;
                
                if (user2.avatar !== undefined) user2Data.avatar = user2.avatar;
                if (user2.gender !== undefined) user2Data.gender = user2.gender;
                if (user2.age !== undefined) user2Data.age = user2.age;
                if (user2.location !== undefined) user2Data.location = user2.location;
                if (user2.isAdmin !== undefined) user2Data.isAdmin = user2.isAdmin;
                if (user2.bdsmPreference !== undefined) user2Data.bdsmPreference = user2.bdsmPreference;
                
                const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, roomId);
                await updateDoc(roomRef, {
                  participantsInfo: [user1Data, user2Data],
                });
                console.log('기존 채팅방에 participantsInfo 추가 완료:', roomId);
              }
            } catch (error) {
              console.error('participantsInfo 추가 실패:', error);
              // 실패해도 계속 진행
            }
          }
          
          return roomId;
        }
      }

      // 새 채팅방 생성 - 사용자 정보도 함께 가져오기
      const [user1, user2] = await Promise.all([
        this.getUser(userId1),
        this.getUser(userId2),
      ]);

      const roomData: any = {
        participants: [userId1, userId2],
        createdAt: Timestamp.now(),
      };

      // 사용자 정보가 있으면 participantsInfo도 함께 저장 (undefined 필드 제거)
      if (user1 && user2) {
        const user1Data: any = {
          id: user1.id,
          name: user1.name,
        };
        const user2Data: any = {
          id: user2.id,
          name: user2.name,
        };
        
        // undefined가 아닌 필드만 추가
        if (user1.avatar !== undefined) user1Data.avatar = user1.avatar;
        if (user1.gender !== undefined) user1Data.gender = user1.gender;
        if (user1.age !== undefined) user1Data.age = user1.age;
        if (user1.location !== undefined) user1Data.location = user1.location;
        if (user1.isAdmin !== undefined) user1Data.isAdmin = user1.isAdmin;
        if (user1.bdsmPreference !== undefined) user1Data.bdsmPreference = user1.bdsmPreference;
        
        if (user2.avatar !== undefined) user2Data.avatar = user2.avatar;
        if (user2.gender !== undefined) user2Data.gender = user2.gender;
        if (user2.age !== undefined) user2Data.age = user2.age;
        if (user2.location !== undefined) user2Data.location = user2.location;
        if (user2.isAdmin !== undefined) user2Data.isAdmin = user2.isAdmin;
        if (user2.bdsmPreference !== undefined) user2Data.bdsmPreference = user2.bdsmPreference;
        
        roomData.participantsInfo = [user1Data, user2Data];
      }

      const roomRef = await addDoc(collection(db, this.COLLECTIONS.CHAT_ROOMS), roomData);
      console.log('새 채팅방 생성 완료 (participantsInfo 포함):', roomRef.id);

      return roomRef.id;
    } catch (error) {
      console.error('채팅방 생성/조회 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자가 참여한 채팅방 실시간 구독
   */
  subscribeToChatRooms(
    userId: string,
    callback: (rooms: ChatRoom[]) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTIONS.CHAT_ROOMS),
      where('participants', 'array-contains', userId)
    );

    return onSnapshot(
      q,
      async (snapshot: QuerySnapshot<DocumentData>) => {
        const rooms: ChatRoom[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          const participants = data.participants || [];
          
          // 참가자 정보 가져오기 - Firestore에 저장된 정보 우선 사용
          let participantsInfo: [User, User] | undefined = undefined;
          
          // Firestore에 participantsInfo가 저장되어 있으면 사용
          if (data.participantsInfo && Array.isArray(data.participantsInfo) && data.participantsInfo.length >= 2) {
            try {
              const [p1, p2] = data.participantsInfo;
              participantsInfo = [
                {
                  id: p1.id,
                  name: p1.name,
                  avatar: p1.avatar,
                  gender: p1.gender,
                  age: p1.age,
                  location: p1.location,
                  isAdmin: p1.isAdmin,
                  bdsmPreference: this.normalizeBdsmPreference(p1.bdsmPreference),
                },
                {
                  id: p2.id,
                  name: p2.name,
                  avatar: p2.avatar,
                  gender: p2.gender,
                  age: p2.age,
                  location: p2.location,
                  isAdmin: p2.isAdmin,
                  bdsmPreference: this.normalizeBdsmPreference(p2.bdsmPreference),
                },
              ] as [User, User];
            } catch (error) {
              console.error('저장된 participantsInfo 파싱 오류:', error);
            }
          }
          
          // Firestore에 participantsInfo가 없으면 사용자 정보를 가져와서 사용
          if (!participantsInfo && participants.length >= 2) {
            try {
              const [userId1, userId2] = participants as [string, string];
              const [user1, user2] = await Promise.all([
                this.getUser(userId1),
                this.getUser(userId2),
              ]);
              
              if (user1 && user2) {
                participantsInfo = [user1, user2];
                
                // 나중에 사용할 수 있도록 Firestore에 저장 (비동기, 실패해도 계속 진행)
                // undefined 필드 제거
                const user1Data: any = {
                  id: user1.id,
                  name: user1.name,
                };
                const user2Data: any = {
                  id: user2.id,
                  name: user2.name,
                };
                
                // undefined가 아닌 필드만 추가
                if (user1.avatar !== undefined) user1Data.avatar = user1.avatar;
                if (user1.gender !== undefined) user1Data.gender = user1.gender;
                if (user1.age !== undefined) user1Data.age = user1.age;
                if (user1.location !== undefined) user1Data.location = user1.location;
                if (user1.isAdmin !== undefined) user1Data.isAdmin = user1.isAdmin;
                if (user1.bdsmPreference !== undefined) user1Data.bdsmPreference = user1.bdsmPreference;
                
                if (user2.avatar !== undefined) user2Data.avatar = user2.avatar;
                if (user2.gender !== undefined) user2Data.gender = user2.gender;
                if (user2.age !== undefined) user2Data.age = user2.age;
                if (user2.location !== undefined) user2Data.location = user2.location;
                if (user2.isAdmin !== undefined) user2Data.isAdmin = user2.isAdmin;
                if (user2.bdsmPreference !== undefined) user2Data.bdsmPreference = user2.bdsmPreference;
                
                const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, doc.id);
                updateDoc(roomRef, {
                  participantsInfo: [user1Data, user2Data],
                }).catch((error) => {
                  console.error('participantsInfo 저장 실패:', error);
                });
              }
            } catch (error) {
              console.error('참가자 정보 조회 오류:', error);
            }
          }
          
          // 각 채팅방의 마지막 메시지 가져오기
          let lastMessage: Message | undefined = undefined;
          try {
            const messagesQuery = query(
              collection(db, this.COLLECTIONS.CHAT_ROOMS, doc.id, 'messages'),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            const messagesSnapshot = await getDocs(messagesQuery);
            if (!messagesSnapshot.empty) {
              const msgDoc = messagesSnapshot.docs[0];
              const msgData = msgDoc.data();
              lastMessage = {
                id: msgDoc.id,
                text: msgData.text,
                senderId: msgData.senderId,
                receiverId: msgData.receiverId,
                timestamp: msgData.timestamp?.toMillis() || Date.now(),
                read: msgData.read || false,
              };
            }
          } catch (error) {
            console.error('마지막 메시지 조회 오류:', error);
          }
          
          // 읽지 않은 메시지 수 계산 (Firestore에 저장된 값 우선 사용)
          let unreadCount = 0;
          if (data.unreadCounts && typeof data.unreadCounts === 'object') {
            unreadCount = data.unreadCounts[userId] || 0;
          } else {
            // unreadCounts가 없으면 직접 계산
            try {
              const unreadQuery = query(
                collection(db, this.COLLECTIONS.CHAT_ROOMS, doc.id, 'messages'),
                where('receiverId', '==', userId),
                where('read', '==', false)
              );
              const unreadSnapshot = await getDocs(unreadQuery);
              unreadCount = unreadSnapshot.size;
              
              // 계산한 값을 Firestore에 저장 (비동기, 실패해도 계속 진행)
              const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, doc.id);
              updateDoc(roomRef, {
                unreadCounts: { [userId]: unreadCount },
                updatedAt: Timestamp.now(),
              }).catch((error) => {
                console.warn('unreadCounts 저장 실패:', error);
              });
            } catch (error) {
              // 인덱스가 없거나 다른 오류가 발생하면 0으로 설정
              console.warn('읽지 않은 메시지 수 계산 오류:', error);
              unreadCount = 0;
            }
          }
          
          const pinnedBy = data.pinnedBy || {};
          
          rooms.push({
            id: doc.id,
            participants: participants as [string, string],
            participantsInfo,
            lastMessage,
            unreadCount,
            pinnedBy: pinnedBy,
          });
        }
        
        callback(rooms);
      },
      (error) => {
        console.error('채팅방 구독 오류:', error);
        callback([]);
      }
    );
  }

  /**
   * 채팅방 삭제
   */
  async deleteChatRoom(roomId: string): Promise<void> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('로그인이 필요합니다.');
      }

      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, roomId);
      
      // 채팅방이 존재하는지 확인
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) {
        console.warn('채팅방이 이미 삭제되었습니다:', roomId);
        return; // 이미 삭제된 경우 성공으로 처리
      }

      const roomData = roomDoc.data();
      // 참가자인지 확인
      if (!roomData.participants || !roomData.participants.includes(firebaseUser.uid)) {
        throw new Error('채팅방 삭제 권한이 없습니다.');
      }

      await deleteDoc(roomRef);
    } catch (error: any) {
      console.error('채팅방 삭제 오류:', error);
      // 이미 삭제된 경우는 성공으로 처리
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        console.warn('채팅방이 이미 삭제되었거나 권한이 없습니다:', roomId);
        return;
      }
      throw error;
    }
  }

  // ==================== 채팅방 고정 관리 ====================

  /**
   * 채팅방 고정
   */
  async pinChatRoom(roomId: string, userId: string): Promise<void> {
    try {
      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }

      const roomData = roomDoc.data();
      const pinnedBy = roomData.pinnedBy || {};

      // 이미 고정했는지 확인
      if (pinnedBy[userId]) {
        console.log('이미 고정된 채팅방입니다.');
        return;
      }

      // 고정 추가
      const updatedPinnedBy = {
        ...pinnedBy,
        [userId]: Date.now(),
      };

      await updateDoc(roomRef, {
        pinnedBy: updatedPinnedBy,
        updatedAt: Timestamp.now(),
      });

      console.log('채팅방 고정 완료:', roomId);
    } catch (error) {
      console.error('채팅방 고정 오류:', error);
      throw error;
    }
  }

  /**
   * 채팅방 고정 해제
   */
  async unpinChatRoom(roomId: string, userId: string): Promise<void> {
    try {
      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }

      const roomData = roomDoc.data();
      const pinnedBy = roomData.pinnedBy || {};

      // 고정하지 않았는지 확인
      if (!pinnedBy[userId]) {
        console.log('고정되지 않은 채팅방입니다.');
        return;
      }

      // 고정 제거
      const updatedPinnedBy = { ...pinnedBy };
      delete updatedPinnedBy[userId];

      await updateDoc(roomRef, {
        pinnedBy: updatedPinnedBy,
        updatedAt: Timestamp.now(),
      });

      console.log('채팅방 고정 해제 완료:', roomId);
    } catch (error) {
      console.error('채팅방 고정 해제 오류:', error);
      throw error;
    }
  }

  /**
   * 메시지 전송
   */
  async sendMessage(messageData: {
    chatRoomId: string;
    senderId: string;
    receiverId: string;
    text: string;
    images?: string[];
  }): Promise<string> {
    try {
      console.log('메시지 저장 시작:', {
        chatRoomId: messageData.chatRoomId,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        text: messageData.text.substring(0, 50) + (messageData.text.length > 50 ? '...' : ''),
        imageCount: messageData.images?.length || 0,
      });

      const messageDataToSave: any = {
        ...messageData,
        timestamp: Timestamp.now(),
        read: false,
      };

      // images가 있으면 추가
      if (messageData.images && messageData.images.length > 0) {
        messageDataToSave.images = messageData.images;
      }

      const messageRef = await addDoc(
        collection(db, this.COLLECTIONS.CHAT_ROOMS, messageData.chatRoomId, 'messages'),
        messageDataToSave
      );

      console.log('메시지 저장 성공:', {
        messageId: messageRef.id,
        chatRoomId: messageData.chatRoomId,
        timestamp: new Date().toISOString(),
      });

      // 채팅방의 unreadCounts 업데이트 (비동기, 실패해도 메시지 전송은 성공)
      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, messageData.chatRoomId);
      getDoc(roomRef).then((roomDoc) => {
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          const unreadCounts = roomData.unreadCounts || {};
          const currentCount = unreadCounts[messageData.receiverId] || 0;
          unreadCounts[messageData.receiverId] = currentCount + 1;
          
          updateDoc(roomRef, {
            unreadCounts,
            updatedAt: Timestamp.now(),
          }).catch((error) => {
            console.warn('unreadCounts 업데이트 실패:', error);
          });
        }
      }).catch((error) => {
        console.warn('채팅방 조회 실패:', error);
      });

      // 푸시 알림 전송 (비동기, 실패해도 메시지 전송은 성공)
      // 백그라운드/종료 상태에서도 알림을 받기 위해 항상 전송
      // 메시지가 성공적으로 저장된 후에만 푸시 알림 전송
      // 중요: 백그라운드에서도 알림을 받으려면 반드시 Expo Push API를 통해 전송해야 함
      console.log('[메시지 전송] 푸시 알림 전송 시작 (백그라운드 지원):', {
        receiverId: messageData.receiverId,
        senderId: messageData.senderId,
        chatRoomId: messageData.chatRoomId,
        messageId: messageRef.id,
        messageText: messageData.text.substring(0, 30) + '...',
      });
      
      // 백그라운드/종료 상태에서도 알림을 받기 위해 항상 Expo Push API를 통해 전송
      // 로컬 알림은 포그라운드에서만 작동하므로, 백그라운드에서는 반드시 서버 푸시 사용
      this.sendPushNotificationToReceiver(
        messageData.receiverId, 
        messageData.senderId, 
        messageData.text, 
        messageData.chatRoomId
      ).then(() => {
        console.log('[메시지 전송] 푸시 알림 전송 완료:', {
          receiverId: messageData.receiverId,
          chatRoomId: messageData.chatRoomId,
        });
      }).catch((error) => {
        console.error('[메시지 전송] 푸시 알림 전송 실패:', {
          error: error.message,
          errorStack: error.stack,
          receiverId: messageData.receiverId,
          senderId: messageData.senderId,
          chatRoomId: messageData.chatRoomId,
        });
      });

      return messageRef.id;
    } catch (error: any) {
      console.error('메시지 전송 오류:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        chatRoomId: messageData.chatRoomId,
      });
      throw error;
    }
  }

  /**
   * 수신자에게 푸시 알림 전송
   */
  private async sendPushNotificationToReceiver(
    receiverId: string,
    senderId: string,
    messageText: string,
    chatRoomId: string
  ): Promise<void> {
    try {
      console.log('[푸시 알림] 전송 시작:', { 
        receiverId, 
        senderId, 
        chatRoomId,
        messageText: messageText.substring(0, 30) + '...',
      });
      
      // 수신자 정보 가져오기
      const receiverDoc = await getDoc(doc(db, this.COLLECTIONS.USERS, receiverId));
      if (!receiverDoc.exists()) {
        console.warn('[푸시 알림] 수신자 정보를 찾을 수 없습니다:', receiverId);
        return;
      }

      const receiverData = receiverDoc.data();
      const expoPushToken = receiverData.expoPushToken;

      console.log('[푸시 알림] 수신자 토큰 확인:', { 
        receiverId, 
        receiverName: receiverData.name,
        hasToken: !!expoPushToken,
        tokenPreview: expoPushToken ? expoPushToken.substring(0, 30) + '...' : '없음',
        tokenLength: expoPushToken ? expoPushToken.length : 0,
      });

      if (!expoPushToken) {
        console.warn('[푸시 알림] 수신자의 푸시 토큰이 없습니다. 푸시 알림을 전송할 수 없습니다:', {
          receiverId,
          receiverName: receiverData.name,
        });
        return;
      }
      
      // 푸시 토큰 형식 확인 (Expo Push Token은 "ExponentPushToken[...]" 형식)
      if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
        console.warn('[푸시 알림] 잘못된 푸시 토큰 형식:', {
          receiverId,
          tokenPreview: expoPushToken.substring(0, 50),
        });
        // 형식이 잘못되었어도 전송 시도 (Expo가 자동으로 처리할 수 있음)
      }

      // 발신자 정보 가져오기
      const senderDoc = await getDoc(doc(db, this.COLLECTIONS.USERS, senderId));
      const senderName = senderDoc.exists() ? senderDoc.data().name : '알 수 없음';

      // 메시지 텍스트가 너무 길면 잘라내기
      const truncatedText = messageText.length > 50 
        ? messageText.substring(0, 50) + '...' 
        : messageText;

      // Expo Push API 페이로드 생성
      // 백그라운드/종료 상태에서도 알림이 표시되도록 올바른 형식으로 설정
      const pushPayload: any = {
        to: expoPushToken,
        sound: 'default',
        title: senderName,
        body: truncatedText,
        data: {
          chatRoomId,
          type: 'message',
        },
        badge: 1, // iOS 배지 업데이트
        priority: 'high', // 백그라운드 알림을 위해 필수 (Android & iOS)
      };

      // Android 설정
      if (Platform.OS === 'android') {
        pushPayload.channelId = 'messages'; // Android 8.0+ 알림 채널
      }
      
      // iOS도 priority를 명시적으로 설정 (백그라운드 알림을 위해)
      // priority: 'high'는 이미 설정됨

      console.log('[푸시 알림] Expo Push API 호출:', {
        to: expoPushToken.substring(0, 20) + '...',
        title: senderName,
        body: truncatedText.substring(0, 30) + '...',
        platform: Platform.OS,
        priority: pushPayload.priority,
        channelId: pushPayload.channelId,
        payload: JSON.stringify(pushPayload).substring(0, 200),
      });

      // Expo Push API 호출
      // 백그라운드/종료 상태에서도 알림을 받기 위해 반드시 호출해야 함
      console.log('[푸시 알림] Expo Push API 호출 시작 (백그라운드 지원):', {
        url: 'https://exp.host/--/api/v2/push/send',
        tokenLength: expoPushToken.length,
        payloadSize: JSON.stringify(pushPayload).length,
      });
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(pushPayload),
      });

      const responseText = await response.text();
      console.log('[푸시 알림] API 응답:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText.substring(0, 500),
      });

      if (!response.ok) {
        throw new Error(`푸시 알림 전송 실패: ${response.status} - ${responseText}`);
      }

      // Expo Push API는 배열 또는 객체를 반환할 수 있음
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[푸시 알림] JSON 파싱 오류:', parseError);
        throw new Error(`푸시 알림 응답 파싱 실패: ${responseText}`);
      }

      // 배열인 경우 첫 번째 요소 확인
      const resultData = Array.isArray(result) ? result[0] : result;
      
      console.log('[푸시 알림] 전송 결과 (상세):', {
        success: resultData.status === 'ok',
        status: resultData.status,
        id: resultData.id,
        message: resultData.message,
        details: resultData.details,
        fullResponse: JSON.stringify(resultData).substring(0, 500),
      });
      
      // 결과 확인
      if (resultData.status === 'error') {
        console.error('[푸시 알림] ❌ Expo Push 서비스 오류:', {
          message: resultData.message,
          details: resultData.details,
          errorCode: resultData.details?.error,
          receiverId,
          senderId,
          expoPushToken: expoPushToken.substring(0, 30) + '...',
        });
        
        // 특정 에러 코드에 대한 안내
        if (resultData.details?.error === 'DeviceNotRegistered') {
          console.error('[푸시 알림] ⚠️ 디바이스가 등록되지 않았습니다. 수신자가 앱을 재설치했거나 푸시 토큰이 만료되었을 수 있습니다.');
        } else if (resultData.details?.error === 'InvalidCredentials') {
          console.error('[푸시 알림] ⚠️ 잘못된 자격 증명입니다. Expo 프로젝트 설정을 확인하세요.');
        }
      } else if (resultData.status === 'ok') {
        console.log('[푸시 알림] ✅ 전송 성공 (백그라운드 지원):', {
          ticketId: resultData.id,
          receiverId,
          senderId,
          message: '백그라운드/종료 상태에서도 알림이 표시되어야 합니다.',
        });
      } else {
        console.warn('[푸시 알림] ⚠️ 알 수 없는 상태:', {
          status: resultData.status,
          fullResponse: JSON.stringify(resultData),
        });
      }
    } catch (error: any) {
      console.error('[푸시 알림] 전송 오류:', {
        message: error.message,
        stack: error.stack,
        receiverId,
        senderId,
      });
      // 푸시 알림 실패는 메시지 전송에 영향을 주지 않도록 조용히 처리
    }
  }

  /**
   * 메시지 목록 조회
   */
  async getMessages(chatRoomId: string, limitCount: number = 100): Promise<Message[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.CHAT_ROOMS, chatRoomId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          senderId: data.senderId,
          receiverId: data.receiverId,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          read: data.read || false,
          images: data.images || undefined,
        };
      }).reverse(); // 시간순 정렬
    } catch (error) {
      console.error('메시지 목록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 메시지 실시간 구독
   */
  subscribeToMessages(
    chatRoomId: string,
    callback: (messages: Message[]) => void,
    limitCount: number = 100
  ): () => void {
    // 채팅방이 존재하지 않을 수 있으므로 안전하게 처리
    try {
      const q = query(
        collection(db, this.COLLECTIONS.CHAT_ROOMS, chatRoomId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const messages: Message[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text || '',
              senderId: data.senderId,
              receiverId: data.receiverId,
              timestamp: data.timestamp?.toMillis() || Date.now(),
              read: data.read || false,
              images: data.images || undefined,
            };
          }).reverse();
          callback(messages);
        },
        (error: any) => {
          // 인덱스 에러인 경우 특별 처리
          if (error.code === 'failed-precondition') {
            // 에러 메시지에서 인덱스 링크 추출
            const indexLinkMatch = error.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
            const indexLink = indexLinkMatch ? indexLinkMatch[0] : null;
            
            console.warn('⚠️ Firestore 인덱스가 필요합니다.');
            if (indexLink) {
              console.warn('인덱스 생성 링크:', indexLink);
            } else {
              console.warn('수동 생성: Firebase Console → Firestore → 인덱스 → 컬렉션: chatRooms/{roomId}/messages, 필드: timestamp(내림차순)');
            }
          } else if (error.code === 'permission-denied') {
            // 권한 오류는 채팅방이 삭제되었거나 접근 권한이 없는 경우
            // 조용히 처리 (로그만 남기고 에러로 표시하지 않음)
            console.log('메시지 구독 권한 오류 (채팅방이 삭제되었거나 접근 권한 없음):', chatRoomId);
          } else if (error.code === 'not-found') {
            console.log('채팅방이 존재하지 않습니다:', chatRoomId);
          } else {
            console.error('메시지 구독 오류:', error.code, error.message);
          }
          
          // 에러 발생 시에도 빈 배열로 콜백 호출하여 UI 업데이트
          callback([]);
        }
      );
    } catch (error: any) {
      console.error('메시지 구독 초기화 오류:', error);
      // 초기화 실패 시에도 빈 배열로 콜백 호출
      callback([]);
      // 빈 함수 반환 (구독 해제 시 오류 방지)
      return () => {};
    }
  }

  /**
   * 메시지 읽음 상태 업데이트 (채팅방의 모든 읽지 않은 메시지를 읽음으로 표시)
   */
  async markMessagesAsRead(chatRoomId: string, userId: string): Promise<void> {
    try {
      console.log('[메시지 읽음] 시작:', { chatRoomId, userId });
      
      // 해당 채팅방의 읽지 않은 메시지 조회
      const q = query(
        collection(db, this.COLLECTIONS.CHAT_ROOMS, chatRoomId, 'messages'),
        where('receiverId', '==', userId),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('[메시지 읽음] 읽을 메시지 없음:', chatRoomId);
        return;
      }
      
      // 배치 업데이트로 모든 읽지 않은 메시지를 읽음으로 표시
      const batch = writeBatch(db);
      let updateCount = 0;
      
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
        updateCount++;
      });
      
      await batch.commit();
      console.log('[메시지 읽음] 완료:', { chatRoomId, updateCount });
      
      // 채팅방의 unreadCount 업데이트
      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, chatRoomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const unreadCounts = roomData.unreadCounts || {};
        unreadCounts[userId] = 0;
        
        await updateDoc(roomRef, {
          unreadCounts,
          updatedAt: Timestamp.now(),
        });
        console.log('[메시지 읽음] 채팅방 unreadCount 업데이트 완료:', chatRoomId);
      }
    } catch (error: any) {
      console.error('[메시지 읽음] 오류:', {
        chatRoomId,
        userId,
        error: error.message,
        code: error.code,
      });
      // 읽음 상태 업데이트 실패는 치명적이지 않으므로 조용히 처리
    }
  }

  /**
   * 메시지 삭제
   */
  async deleteMessage(chatRoomId: string, messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, chatRoomId, 'messages', messageId);
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('메시지 삭제 오류:', error);
      throw error;
    }
  }

  // ==================== 구매 관리 ====================

  /**
   * 구매 이력 저장
   */
  async createPurchase(purchaseData: Purchase): Promise<void> {
    try {
      const purchaseRef = doc(db, this.COLLECTIONS.PURCHASES, purchaseData.id);
      await setDoc(
        purchaseRef,
        {
          ...purchaseData,
          timestamp: Timestamp.fromMillis(purchaseData.timestamp),
          createdAt: Timestamp.now(),
        }
      );
      console.log('구매 이력 저장 완료:', purchaseData.id);
    } catch (error) {
      console.error('구매 이력 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 거래 ID로 구매 이력 확인 (중복 구매 방지)
   */
  async getPurchaseByTransactionId(transactionId: string): Promise<Purchase | null> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.PURCHASES),
        where('transactionId', '==', transactionId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        productId: data.productId,
        points: data.points,
        transactionId: data.transactionId,
        transactionReceipt: data.transactionReceipt,
        purchaseToken: data.purchaseToken,
        platform: data.platform,
        timestamp: data.timestamp?.toMillis() || Date.now(),
        verified: data.verified || false,
      };
    } catch (error) {
      console.error('구매 이력 조회 오류:', error);
      return null;
    }
  }

  /**
   * 회원탈퇴 요청 (30일 후 삭제 예정)
   */
  async requestAccountDeletion(userId: string): Promise<void> {
    try {
      const now = Date.now();
      const deletionScheduledAt = now + 30 * 24 * 60 * 60 * 1000; // 30일 후
      
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        deletionRequestedAt: Timestamp.fromMillis(now),
        deletionScheduledAt: Timestamp.fromMillis(deletionScheduledAt),
      });
      
      console.log('회원탈퇴 요청 완료:', {
        userId,
        requestedAt: new Date(now).toISOString(),
        scheduledAt: new Date(deletionScheduledAt).toISOString(),
      });
    } catch (error) {
      console.error('회원탈퇴 요청 오류:', error);
      throw error;
    }
  }

  /**
   * 회원탈퇴 취소
   */
  async cancelAccountDeletion(userId: string): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      });
      
      console.log('회원탈퇴 취소 완료:', userId);
    } catch (error) {
      console.error('회원탈퇴 취소 오류:', error);
      throw error;
    }
  }

  /**
   * 차단된 사용자 목록 업데이트
   */
  async updateBlockedUsers(userId: string, blockedUsers: Record<string, number>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        blockedUsers: blockedUsers,
        updatedAt: Timestamp.now(),
      });
      console.log('차단된 사용자 목록 업데이트 완료:', Object.keys(blockedUsers).length, '명');
    } catch (error) {
      console.error('차단된 사용자 목록 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자의 구매 이력 조회
   */
  async getUserPurchases(userId: string, limitCount: number = 50): Promise<Purchase[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.PURCHASES),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          productId: data.productId,
          points: data.points,
          transactionId: data.transactionId,
          transactionReceipt: data.transactionReceipt,
          purchaseToken: data.purchaseToken,
          platform: data.platform,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          verified: data.verified || false,
        };
      });
    } catch (error) {
      console.error('사용자 구매 이력 조회 오류:', error);
      throw error;
    }
  }

  // ==================== 좋아요 관리 ====================

  /**
   * 사용자에게 좋아요 추가
   */
  async likeUser(likerId: string, likedUserId: string): Promise<void> {
    try {
      if (likerId === likedUserId) {
        throw new Error('자기 자신에게 좋아요를 누를 수 없습니다.');
      }

      const likedUserRef = doc(db, this.COLLECTIONS.USERS, likedUserId);
      const likedUserDoc = await getDoc(likedUserRef);

      if (!likedUserDoc.exists()) {
        throw new Error('좋아요를 누를 사용자를 찾을 수 없습니다.');
      }

      const likedUserData = likedUserDoc.data();
      const likedBy = likedUserData.likedBy || {};
      const currentLikeCount = likedUserData.likeCount || 0;

      // 이미 좋아요를 눌렀는지 확인
      if (likedBy[likerId]) {
        console.log('이미 좋아요를 누른 사용자입니다.');
        return;
      }

      // 좋아요 추가
      const updatedLikedBy = {
        ...likedBy,
        [likerId]: Date.now(),
      };

      await updateDoc(likedUserRef, {
        likedBy: updatedLikedBy,
        likeCount: currentLikeCount + 1,
        updatedAt: Timestamp.now(),
      });

      console.log('좋아요 추가 완료:', likerId, '->', likedUserId);
    } catch (error) {
      console.error('좋아요 추가 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자에게 좋아요 제거
   */
  async unlikeUser(likerId: string, likedUserId: string): Promise<void> {
    try {
      if (likerId === likedUserId) {
        throw new Error('자기 자신의 좋아요를 취소할 수 없습니다.');
      }

      const likedUserRef = doc(db, this.COLLECTIONS.USERS, likedUserId);
      const likedUserDoc = await getDoc(likedUserRef);

      if (!likedUserDoc.exists()) {
        throw new Error('좋아요를 취소할 사용자를 찾을 수 없습니다.');
      }

      const likedUserData = likedUserDoc.data();
      const likedBy = likedUserData.likedBy || {};
      const currentLikeCount = likedUserData.likeCount || 0;

      // 좋아요를 누르지 않았는지 확인
      if (!likedBy[likerId]) {
        console.log('좋아요를 누르지 않은 사용자입니다.');
        return;
      }

      // 좋아요 제거
      const updatedLikedBy = { ...likedBy };
      delete updatedLikedBy[likerId];

      await updateDoc(likedUserRef, {
        likedBy: updatedLikedBy,
        likeCount: Math.max(0, currentLikeCount - 1),
        updatedAt: Timestamp.now(),
      });

      console.log('좋아요 제거 완료:', likerId, '->', likedUserId);
    } catch (error) {
      console.error('좋아요 제거 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 좋아요 상태 확인
   */
  async getUserLikeStatus(likerId: string, likedUserId: string): Promise<boolean> {
    try {
      if (likerId === likedUserId) {
        return false;
      }

      const likedUserRef = doc(db, this.COLLECTIONS.USERS, likedUserId);
      const likedUserDoc = await getDoc(likedUserRef);

      if (!likedUserDoc.exists()) {
        return false;
      }

      const likedUserData = likedUserDoc.data();
      const likedBy = likedUserData.likedBy || {};

      return !!likedBy[likerId];
    } catch (error) {
      console.error('좋아요 상태 확인 오류:', error);
      return false;
    }
  }

  /**
   * 사용자 좋아요 수 조회
   */
  async getUserLikeCount(userId: string): Promise<number> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return 0;
      }

      const userData = userDoc.data();
      return userData.likeCount || 0;
    } catch (error) {
      console.error('좋아요 수 조회 오류:', error);
      return 0;
    }
  }

  /**
   * 약관 동의 내역 저장
   */
  async setUserAgreement(
    userId: string,
    agreement: {
      termsAgreed: boolean;
      privacyAgreed: boolean;
      termsAgreedAt: number;
      privacyAgreedAt: number;
    }
  ): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        termsAgreed: agreement.termsAgreed,
        privacyAgreed: agreement.privacyAgreed,
        termsAgreedAt: Timestamp.fromMillis(agreement.termsAgreedAt),
        privacyAgreedAt: Timestamp.fromMillis(agreement.privacyAgreedAt),
        updatedAt: Timestamp.now(),
      });
      console.log('약관 동의 내역 저장 완료:', userId);
    } catch (error) {
      console.error('약관 동의 내역 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 알림 설정 저장
   */
  async setNotificationSettings(
    userId: string,
    settings: {
      enabled: boolean;
      messages: boolean;
      likes: boolean;
      reports: boolean;
      updatedAt: number;
    }
  ): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        notificationSettings: {
          enabled: settings.enabled,
          messages: settings.messages,
          likes: settings.likes,
          reports: settings.reports,
          updatedAt: Timestamp.fromMillis(settings.updatedAt),
        },
        updatedAt: Timestamp.now(),
      });
      console.log('알림 설정 저장 완료:', userId);
    } catch (error) {
      console.error('알림 설정 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 알림 설정 조회
   */
  async getNotificationSettings(userId: string): Promise<{
    enabled: boolean;
    messages: boolean;
    likes: boolean;
    reports: boolean;
    updatedAt: number;
  } | null> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      const settings = userData.notificationSettings;

      if (!settings) {
        // 기본값 반환
        return {
          enabled: true,
          messages: true,
          likes: true,
          reports: true,
          updatedAt: Date.now(),
        };
      }

      return {
        enabled: settings.enabled ?? true,
        messages: settings.messages ?? true,
        likes: settings.likes ?? true,
        reports: settings.reports ?? true,
        updatedAt: settings.updatedAt?.toMillis() || Date.now(),
      };
    } catch (error) {
      console.error('알림 설정 조회 오류:', error);
      // 오류 시 기본값 반환
      return {
        enabled: true,
        messages: true,
        likes: true,
        reports: true,
        updatedAt: Date.now(),
      };
    }
  }

  /**
   * 푸시 토큰 업데이트
   * 앱이 완전히 종료된 상태에서도 알림을 받기 위해 필요합니다.
   */
  async updatePushToken(userId: string, pushToken: string | null): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (pushToken) {
        updateData.expoPushToken = pushToken;
      } else {
        // null인 경우 필드 삭제
        updateData.expoPushToken = null;
      }

      await updateDoc(userRef, updateData);
      console.log('푸시 토큰 업데이트 완료:', userId, pushToken ? '토큰 저장' : '토큰 제거');
    } catch (error) {
      console.error('푸시 토큰 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 필드 업데이트 (단일 필드 업데이트용)
   */
  async updateUserField(userId: string, field: string, value: any): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userId);
      const updateData: any = {
        [field]: value,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(userRef, updateData);
      console.log(`사용자 필드 업데이트 완료: ${field} = ${value}`);
    } catch (error) {
      console.error(`사용자 필드 업데이트 오류 (${field}):`, error);
      throw error;
    }
  }
}

export const firebaseFirestoreService = new FirebaseFirestoreService();

