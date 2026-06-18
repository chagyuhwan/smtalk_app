/**
 * Firestore DB 초기화 스크립트
 * 
 * 사용법:
 * 1. Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" 클릭
 * 2. 다운로드된 JSON 파일을 backend/serviceAccountKey.json 으로 저장
 * 3. node reset-db.js 실행
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ serviceAccountKey.json 파일이 없습니다.');
  console.error('');
  console.error('📋 방법:');
  console.error('   1. https://console.firebase.google.com 접속');
  console.error('   2. 프로젝트 선택 (kc-chat-3e4be)');
  console.error('   3. 프로젝트 설정 (⚙️) → 서비스 계정 탭');
  console.error('   4. "새 비공개 키 생성" 버튼 클릭');
  console.error('   5. 다운로드된 파일을 backend/serviceAccountKey.json 으로 저장');
  console.error('   6. 다시 실행: node reset-db.js');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const COLLECTIONS = ['users', 'posts', 'reports', 'chatRooms', 'purchases', 'inquiries'];

async function deleteCollection(collectionPath, depth = 0) {
  const indent = '  '.repeat(depth);
  const collRef = db.collection(collectionPath);
  
  const docs = await collRef.listDocuments();
  if (docs.length === 0) {
    console.log(`${indent}📂 ${collectionPath} - 비어있음`);
    return 0;
  }

  let totalDeleted = 0;

  for (const docRef of docs) {
    // 하위 컬렉션 재귀 삭제
    const subCollections = await docRef.listCollections();
    for (const subCol of subCollections) {
      const subPath = `${collectionPath}/${docRef.id}/${subCol.id}`;
      totalDeleted += await deleteCollection(subPath, depth + 1);
    }

    await docRef.delete();
    totalDeleted++;
  }

  console.log(`${indent}🗑️  ${collectionPath} - ${totalDeleted}개 문서 삭제 완료`);
  return totalDeleted;
}

async function resetDB() {
  // 안전 가드: 실수로 운영 DB를 삭제하는 것을 방지
  // 실행하려면 명시적으로 환경변수를 지정해야 함:
  //   CONFIRM_RESET=I_UNDERSTAND node reset-db.js
  if (process.env.CONFIRM_RESET !== 'I_UNDERSTAND') {
    console.error('⛔ 안전 가드: 이 스크립트는 모든 데이터를 영구 삭제합니다.');
    console.error('   정말 실행하려면 다음과 같이 실행하세요:');
    console.error('   CONFIRM_RESET=I_UNDERSTAND node reset-db.js');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('⛔ NODE_ENV=production 에서는 실행할 수 없습니다.');
    process.exit(1);
  }

  console.log('');
  console.log('🔥 Firestore DB 초기화 시작...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let grandTotal = 0;

  for (const col of COLLECTIONS) {
    try {
      const count = await deleteCollection(col);
      grandTotal += count;
    } catch (error) {
      console.error(`❌ ${col} 삭제 중 오류:`, error.message);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 완료! 총 ${grandTotal}개 문서 삭제됨`);
  console.log('');
  process.exit(0);
}

resetDB().catch((error) => {
  console.error('❌ 초기화 실패:', error);
  process.exit(1);
});
