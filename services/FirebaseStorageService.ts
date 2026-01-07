/**
 * Firebase Cloud Storage 서비스
 * 이미지 업로드 및 관리
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import * as FileSystem from 'expo-file-system';

class FirebaseStorageService {
  // 스토리지 경로
  private readonly PATHS = {
    AVATARS: 'avatars',
    POSTS: 'posts',
    MESSAGES: 'messages',
  };

  /**
   * 파일을 Blob으로 변환 (React Native용)
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    try {
      console.log('이미지 URI:', uri);
      
      // base64 데이터인 경우
      if (uri.startsWith('data:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log('base64 데이터 Blob 생성 완료, 크기:', blob.size);
        return blob;
      }

      // 로컬 파일인 경우 - fetch를 사용하여 Blob으로 변환 (더 안정적)
      if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
        // React Native에서는 fetch를 사용하여 Blob으로 변환하는 것이 더 안정적
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`파일을 읽을 수 없습니다: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('로컬 파일 Blob 생성 완료, 크기:', blob.size, '타입:', blob.type);
        return blob;
      }

      // 기존 방식 (fallback)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // MIME 타입 추출 (확장자 기반)
      let mimeType = 'image/jpeg';
      if (uri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (uri.toLowerCase().includes('.gif')) {
        mimeType = 'image/gif';
      } else if (uri.toLowerCase().includes('.webp')) {
        mimeType = 'image/webp';
      }

      // base64를 Blob으로 변환
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      console.log('base64 Blob 생성 완료, 크기:', blob.size, '타입:', mimeType);
      return blob;
    } catch (error: any) {
      console.error('URI to Blob 변환 오류:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new Error(`이미지 변환 실패: ${error.message}`);
    }
  }

  /**
   * 사용자 아바타 업로드
   */
  async uploadAvatar(userId: string, imageUri: string): Promise<string> {
    try {
      const blob = await this.uriToBlob(imageUri);
      const fileName = `${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `${this.PATHS.AVATARS}/${userId}/${fileName}`);

      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('아바타 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 프로필 이미지 업로드 (인덱스 포함)
   */
  async uploadProfileImage(userId: string, imageUri: string, index: number): Promise<string> {
    try {
      const blob = await this.uriToBlob(imageUri);
      
      // MIME 타입에 따라 확장자 결정
      const extension = blob.type?.includes('png') ? 'png' : 
                       blob.type?.includes('gif') ? 'gif' :
                       blob.type?.includes('webp') ? 'webp' : 'jpg';
      
      const fileName = `${userId}_${index}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, `${this.PATHS.AVATARS}/${userId}/${fileName}`);

      await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
      });

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error(`프로필 이미지 업로드 오류 [${index}]:`, error);
      throw error;
    }
  }

  /**
   * 여러 프로필 이미지 업로드
   */
  async uploadMultipleProfileImages(userId: string, imageUris: string[]): Promise<string[]> {
    try {
      console.log('여러 프로필 이미지 업로드 시작:', imageUris.length, '개');
      
      if (!imageUris || imageUris.length === 0) {
        throw new Error('업로드할 이미지가 없습니다.');
      }

      if (imageUris.length > 3) {
        throw new Error('프로필 이미지는 최대 3장까지 업로드할 수 있습니다.');
      }

      // 순차적으로 업로드 (동시 업로드 시 메모리 부족 방지)
      const uploadResults: string[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        try {
          const url = await this.uploadProfileImage(userId, imageUris[i], i);
          uploadResults.push(url);
          console.log(`프로필 이미지 ${i + 1}/${imageUris.length} 업로드 완료`);
        } catch (error: any) {
          console.error(`프로필 이미지 ${i + 1} 업로드 실패:`, error);
          throw error;
        }
      }

      console.log('모든 프로필 이미지 업로드 완료:', uploadResults.length, '개');
      return uploadResults;
    } catch (error: any) {
      console.error('여러 프로필 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 게시글 이미지 업로드
   */
  async uploadPostImage(postId: string, imageUri: string, index: number): Promise<string> {
    try {
      console.log(`이미지 업로드 시작 [${index}]:`, imageUri);
      
      const blob = await this.uriToBlob(imageUri);
      
      if (!blob || blob.size === 0) {
        throw new Error('빈 이미지 파일입니다.');
      }
      
      // MIME 타입에 따라 확장자 결정
      const extension = blob.type?.includes('png') ? 'png' : 
                       blob.type?.includes('gif') ? 'gif' :
                       blob.type?.includes('webp') ? 'webp' : 'jpg';
      
      const fileName = `${postId}_${index}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, `${this.PATHS.POSTS}/${postId}/${fileName}`);

      console.log(`Storage 업로드 시작 [${index}]:`, fileName, '크기:', blob.size);
      
      await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
      });

      console.log(`Storage 업로드 완료 [${index}]`);
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`다운로드 URL 생성 완료 [${index}]:`, downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error(`게시글 이미지 업로드 오류 [${index}]:`, error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new Error(`이미지 업로드 실패 (${index + 1}번째 이미지): ${error.message}`);
    }
  }

  /**
   * 여러 이미지 업로드
   */
  async uploadMultipleImages(
    postId: string,
    imageUris: string[]
  ): Promise<string[]> {
    try {
      console.log('여러 이미지 업로드 시작:', imageUris.length, '개');
      
      if (!imageUris || imageUris.length === 0) {
        throw new Error('업로드할 이미지가 없습니다.');
      }
      
      // 순차적으로 업로드 (동시 업로드 시 메모리 부족 방지)
      const uploadResults: string[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        try {
          const url = await this.uploadPostImage(postId, imageUris[i], i);
          uploadResults.push(url);
          console.log(`이미지 ${i + 1}/${imageUris.length} 업로드 완료`);
        } catch (error: any) {
          console.error(`이미지 ${i + 1} 업로드 실패:`, error);
          // 하나라도 실패하면 전체 실패
          throw error;
        }
      }
      
      console.log('모든 이미지 업로드 완료:', uploadResults.length, '개');
      return uploadResults;
    } catch (error: any) {
      console.error('여러 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 메시지 이미지 업로드
   */
  async uploadMessageImage(
    chatRoomId: string,
    messageId: string,
    imageUri: string,
    index: number
  ): Promise<string> {
    try {
      console.log('메시지 이미지 업로드 시작:', { chatRoomId, messageId, index });
      
      const blob = await this.uriToBlob(imageUri);
      const fileName = `message_${messageId}_${index}_${Date.now()}.jpg`;
      const storagePath = `${this.PATHS.MESSAGES}/${chatRoomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('스토리지 경로:', storagePath);
      
      const uploadResult: UploadResult = await uploadBytes(storageRef, blob);
      console.log('업로드 완료:', uploadResult.metadata.fullPath);
      
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('다운로드 URL:', downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error('메시지 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 여러 메시지 이미지 업로드
   */
  async uploadMultipleMessageImages(
    chatRoomId: string,
    messageId: string,
    imageUris: string[]
  ): Promise<string[]> {
    try {
      console.log('여러 메시지 이미지 업로드 시작:', imageUris.length, '개');
      
      if (!imageUris || imageUris.length === 0) {
        throw new Error('업로드할 이미지가 없습니다.');
      }
      
      const uploadResults: string[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        try {
          const url = await this.uploadMessageImage(chatRoomId, messageId, imageUris[i], i);
          uploadResults.push(url);
          console.log(`메시지 이미지 ${i + 1}/${imageUris.length} 업로드 완료`);
        } catch (error: any) {
          console.error(`메시지 이미지 ${i + 1} 업로드 실패:`, error);
          throw error;
        }
      }
      
      console.log('모든 메시지 이미지 업로드 완료:', uploadResults.length, '개');
      return uploadResults;
    } catch (error: any) {
      console.error('여러 메시지 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 메시지 이미지 업로드
   */
  async uploadMessageImage(
    chatRoomId: string,
    messageId: string,
    imageUri: string,
    index: number
  ): Promise<string> {
    try {
      console.log('메시지 이미지 업로드 시작:', { chatRoomId, messageId, index });
      
      const blob = await this.uriToBlob(imageUri);
      const fileName = `message_${messageId}_${index}_${Date.now()}.jpg`;
      const storagePath = `${this.PATHS.MESSAGES}/${chatRoomId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('스토리지 경로:', storagePath);
      
      const uploadResult: UploadResult = await uploadBytes(storageRef, blob);
      console.log('업로드 완료:', uploadResult.metadata.fullPath);
      
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('다운로드 URL:', downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error('메시지 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 여러 메시지 이미지 업로드
   */
  async uploadMultipleMessageImages(
    chatRoomId: string,
    messageId: string,
    imageUris: string[]
  ): Promise<string[]> {
    try {
      console.log('여러 메시지 이미지 업로드 시작:', imageUris.length, '개');
      
      if (!imageUris || imageUris.length === 0) {
        throw new Error('업로드할 이미지가 없습니다.');
      }
      
      const uploadResults: string[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        try {
          const url = await this.uploadMessageImage(chatRoomId, messageId, imageUris[i], i);
          uploadResults.push(url);
          console.log(`메시지 이미지 ${i + 1}/${imageUris.length} 업로드 완료`);
        } catch (error: any) {
          console.error(`메시지 이미지 ${i + 1} 업로드 실패:`, error);
          throw error;
        }
      }
      
      console.log('모든 메시지 이미지 업로드 완료:', uploadResults.length, '개');
      return uploadResults;
    } catch (error: any) {
      console.error('여러 메시지 이미지 업로드 오류:', error);
      throw error;
    }
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // URL에서 경로 추출
      const urlParts = imageUrl.split('/');
      const pathIndex = urlParts.findIndex((part) => part.includes('o'));
      if (pathIndex === -1) {
        throw new Error('잘못된 이미지 URL입니다.');
      }

      const encodedPath = urlParts[pathIndex + 1];
      const decodedPath = decodeURIComponent(encodedPath);
      const storageRef = ref(storage, decodedPath);

      await deleteObject(storageRef);
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * 여러 이미지 삭제
   */
  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    try {
      await Promise.all(imageUrls.map((url) => this.deleteImage(url)));
    } catch (error) {
      console.error('여러 이미지 삭제 오류:', error);
      throw error;
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();

