import { Region, Location } from '../types';

// 한국 주요 지역의 좌표 정보
export const REGION_COORDINATES: Record<Region, Location> = {
  seoul: { latitude: 37.5665, longitude: 126.9780 },           // 서울
  busan: { latitude: 35.1796, longitude: 129.0756 },          // 부산
  daegu: { latitude: 35.8714, longitude: 128.6014 },          // 대구
  incheon: { latitude: 37.4563, longitude: 126.7052 },        // 인천
  gwangju: { latitude: 35.1595, longitude: 126.8526 },        // 광주
  daejeon: { latitude: 36.3504, longitude: 127.3845 },        // 대전
  ulsan: { latitude: 35.5384, longitude: 129.3114 },          // 울산
  sejong: { latitude: 36.4800, longitude: 127.2890 },          // 세종
  gyeonggi: { latitude: 37.4138, longitude: 127.5183 },       // 경기도 (수원)
  gangwon: { latitude: 37.8228, longitude: 128.1555 },       // 강원도 (춘천)
  chungbuk: { latitude: 36.8000, longitude: 127.7000 },       // 충청북도 (청주)
  chungnam: { latitude: 36.4556, longitude: 126.7047 },       // 충청남도 (천안)
  jeonbuk: { latitude: 35.7175, longitude: 127.1530 },        // 전라북도 (전주)
  jeonnam: { latitude: 34.8679, longitude: 126.9910 },        // 전라남도 (목포)
  gyeongbuk: { latitude: 36.4919, longitude: 128.8889 },      // 경상북도 (포항)
  gyeongnam: { latitude: 35.2279, longitude: 128.6819 },      // 경상남도 (창원)
  jeju: { latitude: 33.4996, longitude: 126.5312 },           // 제주도
};

// 지역 한글 이름 매핑
export const REGION_NAMES: Record<Region, string> = {
  seoul: '서울',
  busan: '부산',
  daegu: '대구',
  incheon: '인천',
  gwangju: '광주',
  daejeon: '대전',
  ulsan: '울산',
  sejong: '세종',
  gyeonggi: '경기도',
  gangwon: '강원도',
  chungbuk: '충청북도',
  chungnam: '충청남도',
  jeonbuk: '전라북도',
  jeonnam: '전라남도',
  gyeongbuk: '경상북도',
  gyeongnam: '경상남도',
  jeju: '제주도',
};

// 지역 목록 (선택 UI용)
export const REGION_LIST: Region[] = [
  'seoul',
  'busan',
  'daegu',
  'incheon',
  'gwangju',
  'daejeon',
  'ulsan',
  'sejong',
  'gyeonggi',
  'gangwon',
  'chungbuk',
  'chungnam',
  'jeonbuk',
  'jeonnam',
  'gyeongbuk',
  'gyeongnam',
  'jeju',
];

// 지역으로부터 좌표 가져오기
export const getLocationFromRegion = (region: Region): Location => {
  return REGION_COORDINATES[region];
};

// 좌표로부터 가장 가까운 지역 찾기 (선택사항)
export const getRegionFromLocation = (location: Location): Region | null => {
  let minDistance = Infinity;
  let closestRegion: Region | null = null;

  for (const [region, coords] of Object.entries(REGION_COORDINATES)) {
    const distance = Math.sqrt(
      Math.pow(location.latitude - coords.latitude, 2) +
      Math.pow(location.longitude - coords.longitude, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = region as Region;
    }
  }

  return closestRegion;
};













