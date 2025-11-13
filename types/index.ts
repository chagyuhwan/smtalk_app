export type Gender = 'male' | 'female';

export type BDSMPreference = 'dominant' | 'submissive' | 'switch' | 'none';

export type Region = 
  | 'seoul'           // 서울
  | 'busan'           // 부산
  | 'daegu'           // 대구
  | 'incheon'         // 인천
  | 'gwangju'         // 광주
  | 'daejeon'         // 대전
  | 'ulsan'           // 울산
  | 'sejong'          // 세종
  | 'gyeonggi'        // 경기도
  | 'gangwon'         // 강원도
  | 'chungbuk'        // 충청북도
  | 'chungnam'        // 충청남도
  | 'jeonbuk'         // 전라북도
  | 'jeonnam'         // 전라남도
  | 'gyeongbuk'       // 경상북도
  | 'gyeongnam'       // 경상남도
  | 'jeju';           // 제주도

export interface Location {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  gender?: Gender;
  age?: number;
  location?: Location;
  region?: Region; // 지역 정보
  isAdmin?: boolean; // 관리자 여부
  bdsmPreference?: BDSMPreference; // BDSM 성향
  bio?: string; // 자기소개
  deletionRequestedAt?: number; // 탈퇴 요청일 (타임스탬프)
  deletionScheduledAt?: number; // 탈퇴 예정일 (타임스탬프, 요청일 + 30일)
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: [string, string];
  participantsInfo?: [User, User]; // 참가자 정보 (선택적)
  lastMessage?: Message;
  unreadCount: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  images?: string[];
  timestamp: number;
  viewCount: number;
}

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'fake' | 'other';

export interface Report {
  id: string;
  postId?: string;
  userId?: string;
  reportedBy: string; // 신고한 사용자 ID
  reason: ReportReason;
  description?: string;
  timestamp: number;
  status?: 'pending' | 'resolved' | 'rejected'; // 신고 처리 상태
}

export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  points: number;
  transactionId: string;
  transactionReceipt?: string; // iOS
  purchaseToken?: string; // Android
  platform: 'ios' | 'android';
  timestamp: number;
  verified: boolean; // 영수증 검증 여부
}


