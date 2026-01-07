export type Gender = 'male' | 'female';

export type BDSMPreference = 
  | 'vanilla'         // 바닐라
  | 'owner'           // 오너
  | 'daddy'           // 대디
  | 'mommy'           // 마미
  | 'dominant'        // 도미넌트
  | 'master'          // 마스터
  | 'mistress'        // 미스트리스
  | 'hunter'          // 헌터
  | 'brattamer'       // 브랫테이머
  | 'degrader'        // 디그레이더
  | 'rigger'          // 리거
  | 'boss'            // 보스
  | 'switch'          // 스위치
  | 'sadist'          // 사디스트
  | 'spanker'         // 스팽커
  | 'pet'             // 펫
  | 'little'          // 리틀
  | 'submissive'      // 서브미시브
  | 'slave'           // 슬레이브
  | 'prey'            // 프레이
  | 'brat'            // 브랫
  | 'degradee'        // 디그레이디
  | 'ropebunny'       // 로프버니
  | 'servant'         // 서번트
  | 'masochist'       // 마조히스트
  | 'spankee';        // 스팽키이거

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
  avatar?: string; // 첫 번째 프로필 사진 (호환성 유지)
  profileImages?: string[]; // 프로필 사진 배열 (최대 5장)
  gender?: Gender;
  age?: number;
  location?: Location;
  region?: Region; // 지역 정보
  isAdmin?: boolean; // 관리자 여부
  bdsmPreference?: BDSMPreference[]; // BDSM 성향 (선택사항, 최대 3개)
  bio?: string; // 자기소개
  deletionRequestedAt?: number; // 탈퇴 요청일 (타임스탬프)
  deletionScheduledAt?: number; // 탈퇴 예정일 (타임스탬프, 요청일 + 30일)
  lastAttendanceDate?: string; // 마지막 출석체크 날짜 (YYYY-MM-DD 형식)
  lastPostRewardDate?: string; // 마지막 게시글 포인트 지급 날짜 (YYYY-MM-DD 형식)
  suspendedUntil?: number; // 정지 해제일 (타임스탬프)
  suspensionType?: '1day' | '7days' | 'permanent'; // 정지 타입
  likeCount?: number; // 좋아요 수
  likedBy?: Record<string, number>; // 좋아요를 누른 사용자 목록 (userId -> timestamp)
  lastSeen?: number; // 마지막 접속 시간 (타임스탬프)
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  read: boolean;
  images?: string[];
}

export interface ChatRoom {
  id: string;
  participants: [string, string];
  participantsInfo?: [User, User]; // 참가자 정보 (선택적)
  lastMessage?: Message;
  unreadCount: number;
  pinnedBy?: Record<string, number>; // 고정한 사용자 목록 (userId -> pinnedAt timestamp)
  isPinned?: boolean; // 현재 사용자가 고정했는지 여부 (클라이언트에서 계산)
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

export interface NotificationSettings {
  enabled: boolean; // 전체 알림 ON/OFF
  messages: boolean; // 메시지 알림
  likes: boolean; // 좋아요 알림
  reports: boolean; // 신고 처리 완료 알림
  updatedAt: number; // 마지막 업데이트 시간
}


