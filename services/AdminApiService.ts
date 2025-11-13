/**
 * 관리자 API 서비스
 * Spring Boot 백엔드와 통신하는 서비스
 * 
 * 실제 Spring 백엔드가 준비되면 이 서비스를 사용하여 연동합니다.
 */

// 개발 환경에서는 로컬호스트 사용
// 실제 배포 시에는 환경 변수로 설정
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

export interface ReportDTO {
  id: string;
  postId?: string;
  userId?: string;
  reportedBy: string;
  reason: string;
  description?: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'rejected';
}

export interface UserDTO {
  id: string;
  name: string;
  avatar?: string;
  gender?: 'male' | 'female';
  age?: number;
  isBlocked: boolean;
  createdAt: number;
}

export interface PostDTO {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  images?: string[];
  timestamp: number;
  viewCount: number;
}

export interface StatsDTO {
  pendingReports: number;
  totalUsers: number;
  totalPosts: number;
  blockedUsers: number;
  todayNewUsers: number;
  todayNewPosts: number;
}

class AdminApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 인증 토큰 설정
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * API 요청 실행
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `API Error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ''
        }`
      );
    }

    const rawText = await response.text();

    if (!rawText) {
      // @ts-ignore - 빈 응답 허용
      return undefined;
    }

    try {
      return JSON.parse(rawText);
    } catch (parseError) {
      console.error('🚨 API 응답 파싱 실패', {
        url,
        rawText,
        parseError,
      });
      throw new Error('API 응답을 JSON으로 파싱할 수 없습니다.');
    }
  }

  // ==================== 신고 관리 ====================

  /**
   * 신고 생성
   */
  async createReport(data: {
    postId?: string;
    userId?: string;
    reportedBy: string;
    reason: string;
    description?: string;
  }): Promise<ReportDTO> {
    return this.request<ReportDTO>('/admin/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 신고 목록 조회
   */
  async getReports(status?: 'pending' | 'resolved' | 'rejected'): Promise<ReportDTO[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<ReportDTO[]>(`/admin/reports${query}`);
  }

  /**
   * 신고 상세 조회
   */
  async getReport(reportId: string): Promise<ReportDTO> {
    return this.request<ReportDTO>(`/admin/reports/${reportId}`);
  }

  /**
   * 신고 처리
   */
  async resolveReport(
    reportId: string,
    action: 'resolve' | 'reject'
  ): Promise<ReportDTO> {
    return this.request<ReportDTO>(`/admin/reports/${reportId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  // ==================== 사용자 관리 ====================

  /**
   * 사용자 생성 또는 업데이트
   */
  async createOrUpdateUser(data: {
    id: string;
    name: string;
    avatar?: string;
    gender?: 'male' | 'female';
    age?: number;
    latitude?: number;
    longitude?: number;
    isAdmin?: boolean;
    points?: number;
  }): Promise<UserDTO> {
    return this.request<UserDTO>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        gender: data.gender ? data.gender.toUpperCase() : undefined,
      }),
    });
  }

  /**
   * 사용자 목록 조회
   */
  async getUsers(page: number = 0, size: number = 20): Promise<{
    content: UserDTO[];
    totalElements: number;
    totalPages: number;
  }> {
    return this.request(`/admin/users?page=${page}&size=${size}`);
  }

  /**
   * 사용자 상세 조회
   */
  async getUser(userId: string): Promise<UserDTO> {
    return this.request<UserDTO>(`/admin/users/${userId}`);
  }

  /**
   * 사용자 차단/차단 해제
   */
  async blockUser(userId: string, blocked: boolean): Promise<UserDTO> {
    return this.request<UserDTO>(`/admin/users/${userId}/block`, {
      method: 'PUT',
      body: JSON.stringify({ blocked }),
    });
  }

  // ==================== 게시글 관리 ====================

  /**
   * 게시글 생성
   */
  async createPost(data: {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    images?: string[];
  }): Promise<PostDTO> {
    return this.request<PostDTO>('/admin/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 게시글 목록 조회
   */
  async getPosts(page: number = 0, size: number = 20): Promise<{
    content: PostDTO[];
    totalElements: number;
    totalPages: number;
  }> {
    return this.request(`/admin/posts?page=${page}&size=${size}`);
  }

  /**
   * 게시글 삭제
   */
  async deletePost(postId: string): Promise<void> {
    return this.request<void>(`/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // ==================== 통계 ====================

  /**
   * 대시보드 통계 조회
   */
  async getStats(): Promise<StatsDTO> {
    return this.request<StatsDTO>('/admin/stats');
  }
}

export const adminApiService = new AdminApiService();

