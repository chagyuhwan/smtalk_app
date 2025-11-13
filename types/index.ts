export type Gender = 'male' | 'female';

export type BDSMPreference = 'dominant' | 'submissive' | 'switch' | 'none';

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
  isAdmin?: boolean; // 관리자 여부
  bdsmPreference?: BDSMPreference; // BDSM 성향
  bio?: string; // 자기소개
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


