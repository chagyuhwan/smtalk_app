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
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Post, Report, ChatRoom, Message, Purchase } from '../types';

class FirebaseFirestoreService {
  // 컬렉션 이름
  private readonly COLLECTIONS = {
    USERS: 'users',
    POSTS: 'posts',
    REPORTS: 'reports',
    CHAT_ROOMS: 'chatRooms',
    MESSAGES: 'messages',
    PURCHASES: 'purchases',
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
    isAdmin?: boolean;
    points?: number;
    bdsmPreference?: 'dominant' | 'submissive' | 'switch' | 'none';
    bio?: string;
  }): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTIONS.USERS, userData.id);
      
      // undefined 필드를 제거하여 Firestore 오류 방지
      const cleanedData: any = {
        id: userData.id,
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        updatedAt: Timestamp.now(),
      };
      
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
      return {
        id: userSnap.id,
        name: data.name,
        avatar: data.avatar,
        gender: data.gender,
        age: data.age,
        location: data.latitude && data.longitude
          ? { latitude: data.latitude, longitude: data.longitude }
          : undefined,
        isAdmin: data.isAdmin || false,
        points: data.points || 0, // 포인트 정보 포함
        bdsmPreference: data.bdsmPreference,
        bio: data.bio,
      };
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
    callback: (user: User | null, points?: number) => void
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
        const user: User = {
          id: snapshot.id,
          name: data.name,
          avatar: data.avatar,
          gender: data.gender,
          age: data.age,
          location: data.latitude && data.longitude
            ? { latitude: data.latitude, longitude: data.longitude }
            : undefined,
          isAdmin: data.isAdmin || false,
          bdsmPreference: data.bdsmPreference,
          bio: data.bio,
        };
        const points = data.points !== undefined ? data.points : 1000; // 기본값 1000
        console.log('사용자 정보 실시간 업데이트:', user.id, user.name, user.location, '포인트:', points);
        callback(user, points);
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
          const shouldExclude = excludeUserId && doc.id === excludeUserId;
          if (shouldExclude) {
            console.log('사용자 제외:', doc.id);
          }
          return !shouldExclude;
        })
        .map((doc) => {
          const data = doc.data();
          const user = {
            id: doc.id,
            name: data.name,
            avatar: data.avatar,
            gender: data.gender,
            age: data.age,
            location: data.latitude && data.longitude
              ? { latitude: data.latitude, longitude: data.longitude }
              : undefined,
            isAdmin: data.isAdmin || false,
            bdsmPreference: data.bdsmPreference,
            bio: data.bio,
          };
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
            const shouldExclude = excludeUserId && doc.id === excludeUserId;
            return !shouldExclude;
          })
          .map((doc) => {
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
              isAdmin: data.isAdmin || false,
              bdsmPreference: data.bdsmPreference,
              bio: data.bio,
            };
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
   * 게시글 생성
   */
  async createPost(postData: {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    images?: string[];
  }): Promise<void> {
    try {
      const postRef = doc(db, this.COLLECTIONS.POSTS, postData.id);
      await setDoc(postRef, {
        ...postData,
        images: postData.images || [], // undefined를 빈 배열로 변환
        timestamp: Timestamp.now(),
        viewCount: 0,
        isDeleted: false,
      });
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
      const reportRef = await addDoc(collection(db, this.COLLECTIONS.REPORTS), {
        ...reportData,
        status: 'pending',
        timestamp: Timestamp.now(),
      });
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
                  bdsmPreference: p1.bdsmPreference,
                },
                {
                  id: p2.id,
                  name: p2.name,
                  avatar: p2.avatar,
                  gender: p2.gender,
                  age: p2.age,
                  location: p2.location,
                  isAdmin: p2.isAdmin,
                  bdsmPreference: p2.bdsmPreference,
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
          
          rooms.push({
            id: doc.id,
            participants: participants as [string, string],
            participantsInfo,
            lastMessage,
            unreadCount: 0, // TODO: 읽지 않은 메시지 수 계산
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
      const roomRef = doc(db, this.COLLECTIONS.CHAT_ROOMS, roomId);
      await deleteDoc(roomRef);
    } catch (error) {
      console.error('채팅방 삭제 오류:', error);
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
  }): Promise<string> {
    try {
      console.log('메시지 저장 시작:', {
        chatRoomId: messageData.chatRoomId,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        text: messageData.text.substring(0, 50) + (messageData.text.length > 50 ? '...' : ''),
      });

      const messageRef = await addDoc(
        collection(db, this.COLLECTIONS.CHAT_ROOMS, messageData.chatRoomId, 'messages'),
        {
          ...messageData,
          timestamp: Timestamp.now(),
          read: false,
        }
      );

      console.log('메시지 저장 성공:', {
        messageId: messageRef.id,
        chatRoomId: messageData.chatRoomId,
        timestamp: new Date().toISOString(),
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
          text: data.text,
          senderId: data.senderId,
          receiverId: data.receiverId,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          read: data.read || false,
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
              text: data.text,
              senderId: data.senderId,
              receiverId: data.receiverId,
              timestamp: data.timestamp?.toMillis() || Date.now(),
              read: data.read || false,
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
            console.error('메시지 구독 권한 오류:', error.message);
          } else if (error.code === 'not-found') {
            console.warn('채팅방이 존재하지 않습니다:', chatRoomId);
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
}

export const firebaseFirestoreService = new FirebaseFirestoreService();

