/**
 * NICE 본인인증 API 프록시 서버
 * 
 * React Native 앱에서 NICE API를 호출할 수 있도록 프록시 역할을 합니다.
 * 서버 IP를 NICE에 등록하여 IP 접근 제한 문제를 해결합니다.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const security = require('./security');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const crypto = require('crypto');

// CI 기반 안정 UID 생성용 도메인 분리 솔트 (변경 금지: 변경 시 기존 계정과 매칭 불가)
const NICE_UID_SALT = process.env.NICE_UID_SALT || 'smtalk-nice-v1';

/**
 * NICE CI(개인 고유 연결정보) 기반의 안정적 Firebase UID 생성
 * - 같은 사람은 항상 같은 UID → 재로그인/재설치 시 동일 계정 유지
 * - 원본 CI는 저장/반환하지 않고 해시만 사용 (개인정보 보호)
 */
function deriveStableUid(ci, fallbackTransactionId) {
  if (ci) {
    const hash = crypto
      .createHash('sha256')
      .update(`${NICE_UID_SALT}:${ci}`)
      .digest('hex')
      .substring(0, 32);
    return `nice_${hash}`;
  }
  // CI가 없는 예외 상황: 기존 동작(트랜잭션 기반)으로 폴백
  return `nice_${fallbackTransactionId}`;
}

/**
 * NICE transaction_id 재사용 방지 (영속) - Firestore 기반
 * - 서버 재시작/다중 인스턴스에서도 재사용을 차단한다.
 * - Firebase Admin 미설정 시 메모리 기반(security.js)으로 폴백한다.
 * @returns {Promise<boolean>} 최초 사용이면 true, 이미 사용된 경우 throw
 */
async function checkAndMarkNiceTransaction(transactionId) {
  if (!firebaseAdmin) {
    // 폴백: 메모리 기반 (단일 인스턴스 한정)
    security.checkTransactionIdReuse(transactionId);
    return true;
  }

  const db = admin.firestore();
  const docId = crypto.createHash('sha256').update(String(transactionId)).digest('hex');
  const ref = db.collection('niceTransactions').doc(docId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      throw new Error('이미 사용된 인증 정보입니다. 다시 인증해주세요.');
    }
    tx.set(ref, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  return true;
}

// Firebase Admin SDK 초기화
let firebaseAdmin = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log('Firebase Admin SDK 초기화 성공');
  } else {
    console.warn('⚠️  Firebase Admin 환경 변수 미설정. Custom Token 발급 불가.');
    console.warn('   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY를 설정하세요.');
  }
} catch (e) {
  console.error('Firebase Admin SDK 초기화 오류:', e.message);
}

// Node.js 18+에서는 내장 fetch 사용
// Node.js 18 미만인 경우: npm install node-fetch@2
const fetch = globalThis.fetch || (() => {
  try {
    return require('node-fetch');
  } catch (e) {
    console.error('❌ fetch를 사용할 수 없습니다.');
    console.error('   Node.js 18+를 사용하거나 node-fetch를 설치하세요:');
    console.error('   npm install node-fetch@2');
    process.exit(1);
  }
})();

const app = express();
// Railway 등 리버스 프록시 뒤에서 HTTPS/X-Forwarded-Proto 인식
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV !== 'production';

// 보안: HTTPS 강제 (프로덕션 환경)
if (!isDevelopment) {
  app.use((req, res, next) => {
    // X-Forwarded-Proto 헤더 확인 (로드밸런서/프록시 뒤에 있을 때)
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure && req.method !== 'GET') {
      return res.status(403).json({
        success: false,
        error: 'HTTPS를 사용해야 합니다.',
      });
    }
    next();
  });
}

// NICE API 설정
const NICE_CONFIG = {
  clientId: process.env.NICE_CLIENT_ID || '',
  clientSecret: process.env.NICE_CLIENT_SECRET || '',
  baseUrl: process.env.NICE_API_URL || 'https://auth.niceid.co.kr',
  version: process.env.NICE_API_VERSION || 'v1.0',
  devLang: process.env.NICE_DEV_LANG || 'Node.js/Express',
};

// 필수 설정 확인
if (!NICE_CONFIG.clientId || !NICE_CONFIG.clientSecret) {
  console.error('❌ NICE_CLIENT_ID 또는 NICE_CLIENT_SECRET이 설정되지 않았습니다.');
  console.error('   .env 파일을 확인하거나 환경 변수를 설정하세요.\n');
  process.exit(1);
}

// 개발 환경에서만 설정 로그 출력
if (isDevelopment) {
  console.log('\n📋 NICE API 설정:');
  console.log(`   Client ID: ${NICE_CONFIG.clientId ? NICE_CONFIG.clientId.substring(0, 20) + '...' : '❌ 없음'}`);
  console.log(`   Client Secret: ${NICE_CONFIG.clientSecret ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   Base URL: ${NICE_CONFIG.baseUrl}`);
  console.log(`   Version: ${NICE_CONFIG.version}\n`);
}

// 미들웨어
// CORS: 허용 오리진을 환경변수로 제한 (네이티브 앱 요청은 Origin 헤더가 없어 영향 없음)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Origin이 없는 요청(네이티브 앱, 서버 간 호출, NICE 콜백)은 허용
    if (!origin) return callback(null, true);
    // 허용 목록이 비어있으면(미설정) 기본적으로 허용 (운영 시 ALLOWED_ORIGINS 설정 권장)
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS 정책에 의해 차단되었습니다.'));
  },
}));

app.use(express.json({ limit: '1mb' }));
// NICE API가 form-data로 POST 요청을 보낼 수 있으므로 urlencoded도 추가
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 간단한 인메모리 레이트리밋 (단일 인스턴스 기준)
// IP+경로별 윈도우 내 요청 횟수 제한
function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  // 주기적으로 만료 항목 정리
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref?.();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { count: 1, start: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    next();
  };
}

// 인증/결제 엔드포인트에 레이트리밋 적용 (남용/토큰 쿼터 소진 방지)
app.use('/api/nice', createRateLimiter({ windowMs: 60 * 1000, max: 20 }));
app.use('/api/iap', createRateLimiter({ windowMs: 60 * 1000, max: 30 }));
app.use('/api/points', createRateLimiter({ windowMs: 60 * 1000, max: 30 }));

/**
 * Firebase ID 토큰 검증 미들웨어
 * Authorization: Bearer <idToken> 헤더에서 토큰을 검증하고 req.uid를 설정한다.
 */
async function verifyFirebaseToken(req, res, next) {
  if (!firebaseAdmin) {
    return res.status(503).json({ success: false, error: '서버 인증이 구성되지 않았습니다.' });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: '인증 토큰이 필요합니다.' });
  }
  try {
    req.firebaseToken = await admin.auth().verifyIdToken(token);
    req.uid = req.firebaseToken.uid;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: '유효하지 않은 인증 토큰입니다.' });
  }
}

// 한국 시간(KST, UTC+9) 기준 날짜 문자열 (YYYY-MM-DD)
function kstDateString() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  return kst.toISOString().split('T')[0];
}

/**
 * 포인트 보상 규칙 (서버 권위)
 * - dailyField: 하루 1회 제한(해당 날짜 필드와 오늘이 같으면 중복)
 * - onceField: 1회 제한(플래그가 true면 중복)
 * - anonymousOnly: 익명 로그인(심사 데모)만 허용
 */
const REWARD_RULES = {
  'attendance': { amount: 50, dailyField: 'lastAttendanceDate' },
  'post-reward': { amount: 50, dailyField: 'lastPostRewardDate' },
  'signup-bonus': { amount: 100, onceField: 'signupBonusGranted' },
  'reviewer-demo': { amount: 10000, onceField: 'reviewerDemoGranted', anonymousOnly: true },
};

// Base64UrlEncoding 구현
function base64UrlEncode(str) {
  const base64 = Buffer.from(str).toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 고유한 요청 번호 생성
function generateRequestNo(clientId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${clientId}_${timestamp}_${random}`.substring(0, 50);
}

// 로깅 미들웨어 (개발 환경에서만)
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/**
 * 1. 접근 토큰 발급
 * POST /api/nice/token
 */
app.post('/api/nice/token', async (req, res) => {
  try {
    const url = `${NICE_CONFIG.baseUrl}/ido/intc/${NICE_CONFIG.version}/auth/token`;
    
    // Basic 인증: Base64UrlEncoding{client_id + ":" + client_secret}
    const credentials = `${NICE_CONFIG.clientId}:${NICE_CONFIG.clientSecret}`;
    const basicAuth = `Basic ${base64UrlEncode(credentials)}`;
    
    // 고유한 요청 번호 생성
    const requestNo = generateRequestNo(NICE_CONFIG.clientId);
    
    if (isDevelopment) {
      console.log('[NICE] 접근 토큰 발급 요청:', url);
      console.log('[NICE] Request No:', requestNo);

      // 현재 서버의 공인 IP 확인 (개발 디버깅용)
      try {
        const ipCheck = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipCheck.json();
        console.log('[NICE] 현재 서버 공인 IP:', ipData.ip);
      } catch (ipError) {
        console.log('[NICE] IP 확인 실패 (무시 가능)');
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'charset': 'UTF-8',
        'Authorization': basicAuth,
        'X-Intc-DevLang': NICE_CONFIG.devLang,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        request_no: requestNo,
      }),
    });

      const responseText = await response.text();
      if (isDevelopment) {
        console.log('[NICE] 토큰 발급 응답:', response.status, responseText);
      }

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          console.error('[NICE] 토큰 발급 실패:', {
            result_code: errorData.result_code,
            result_message: errorData.result_message,
            status: response.status,
          });
          
          // 현재 서버 IP 확인 (에러 메시지용)
          let currentIP = '확인 불가';
          try {
            const ipCheck = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipCheck.json();
            currentIP = ipData.ip;
            console.error('[NICE] 현재 서버 공인 IP:', currentIP);
          } catch (ipError) {
            console.error('[NICE] IP 확인 실패:', ipError);
          }
          
          // 에러 코드별 안내 메시지
          let errorMessage = errorData.result_message || errorData.message || '토큰 발급 실패';
          if (errorData.result_code === '1006') {
            errorMessage = `ClientID 권한 없음 오류입니다.\n\n` +
              `해결 방법:\n` +
              `1. NICE 관리 페이지에서 Client ID가 활성화되어 있는지 확인\n` +
              `2. Client ID와 Secret Key가 올바른지 확인\n` +
              `3. NICE 담당자에게 문의:\n` +
              `   - 이메일: niceid_support@nice.co.kr\n` +
              `   - 전화: 02-2122-4872~3\n` +
              `   - Client ID: ${NICE_CONFIG.clientId}`;
          } else if (errorData.result_code === '1007') {
            console.error('[NICE] ⚠️ IP 접근 제한 오류 상세 정보:');
            console.error(`   - 현재 서버 IP: ${currentIP}`);
            console.error(`   - 등록해야 할 IP: ${currentIP}`);
            console.error(`   - Client ID: ${NICE_CONFIG.clientId}`);
            console.error(`   - NICE 관리 페이지에서 확인 사항:`);
            console.error(`     1. "${currentIP}" IP가 정확히 등록되어 있는지 확인`);
            console.error(`     2. "IP 주소 등록하기" 버튼을 눌러 저장했는지 확인`);
            console.error(`     3. 등록한 IP 목록에서 "${currentIP}"가 표시되는지 확인`);
            console.error(`     4. Client ID와 IP가 같은 계정에 등록되어 있는지 확인`);
            
            errorMessage = `IP 접근 제한 오류입니다.\n\n` +
              `현재 서버 IP: ${currentIP}\n\n` +
              `⚠️  중요 확인 사항:\n` +
              `1. NICE 관리 페이지에서 "${currentIP}" IP가 정확히 등록되어 있는지 확인\n` +
              `2. "IP 주소 등록하기" 버튼을 눌러 저장했는지 확인 (입력만 하고 저장하지 않으면 등록되지 않음)\n` +
              `3. 등록한 IP 목록에서 "${currentIP}"가 표시되는지 확인\n` +
              `4. Client ID와 IP가 같은 계정에 등록되어 있는지 확인\n` +
              `5. 등록 후 최소 30분, 최대 1시간 대기 후 다시 시도\n` +
              `6. 문제가 계속되면 NICE 담당자에게 문의:\n` +
              `   - 이메일: niceid_support@nice.co.kr\n` +
              `   - 전화: 02-2122-4872~3\n` +
              `   - Client ID: ${NICE_CONFIG.clientId}\n` +
              `   - 등록한 IP: ${currentIP}\n` +
              `   - 오류 코드: 1007\n\n` +
              `💡 추가 확인:\n` +
              `- 로컬 개발 환경에서는 공인 IP가 아닌 사설 IP(192.168.x.x)를 등록하면 안 됩니다\n` +
              `- 공인 IP만 등록 가능합니다 (https://api.ipify.org에서 확인한 IP)\n` +
              `- IP 등록 후에도 오류가 계속되면 NICE 담당자에게 직접 문의하세요`;
          }
          
          // 프로덕션에서는 내부 정보(Client ID/서버 IP) 비노출, 일반 메시지만 전달
          return res.status(response.status).json({
            success: false,
            error: isDevelopment ? errorMessage : '인증 토큰 발급에 실패했습니다. 잠시 후 다시 시도해주세요.',
            result_code: errorData.result_code,
            ...(isDevelopment ? { current_ip: currentIP } : {}),
          });
        } catch {
          return res.status(response.status).json({
            success: false,
            error: `토큰 발급 실패 (${response.status})`,
          });
        }
      }

    const data = JSON.parse(responseText);
    
    if (data.result_code !== '0000') {
      return res.status(400).json({
        success: false,
        error: data.result_message || '토큰 발급에 실패했습니다.',
        result_code: data.result_code,
      });
    }

    res.json({
      success: true,
      data: {
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        request_no: requestNo,
      },
    });
  } catch (error) {
    console.error('[NICE] 토큰 발급 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * 2. 인증 URL 요청
 * POST /api/nice/auth-url
 */
app.post('/api/nice/auth-url', async (req, res) => {
  try {
    const { access_token, phone_number } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'access_token이 필요합니다.',
      });
    }

    const url = `${NICE_CONFIG.baseUrl}/ido/intc/${NICE_CONFIG.version}/auth/url`;
    
    // 고유한 요청 번호 생성
    const requestNo = generateRequestNo(NICE_CONFIG.clientId);
    
    // return_url: 인증 완료 후 web_transaction_id를 받을 URL
    // NICE API는 공개적으로 접근 가능한 HTTPS URL만 허용합니다
    // 딥링크 스킴은 지원하지 않으므로 반드시 백엔드 서버 URL 사용 필요
    const backendBaseUrl = process.env.BACKEND_BASE_URL;
    let returnUrl;
    let closeUrl;
    
    if (!backendBaseUrl) {
      // BACKEND_BASE_URL이 없으면 오류 반환
      const errorMessage = `BACKEND_BASE_URL 환경 변수가 설정되지 않았습니다.\n\n` +
        `NICE API는 공개 HTTPS URL만 허용합니다. 다음 중 하나를 수행하세요:\n\n` +
        `1. ngrok 사용 (로컬 개발):\n` +
        `   - ngrok 설치: brew install ngrok (macOS) 또는 https://ngrok.com/download\n` +
        `   - 백엔드 서버 실행: npm start\n` +
        `   - 다른 터미널에서: ngrok http 3000\n` +
        `   - 생성된 HTTPS URL을 backend/.env에 추가:\n` +
        `     BACKEND_BASE_URL=https://abc123.ngrok.io\n\n` +
        `2. 배포된 서버 사용 (프로덕션):\n` +
        `   - backend/.env에 배포된 서버 URL 추가:\n` +
        `     BACKEND_BASE_URL=https://your-deployed-server.com\n\n` +
        `현재 서버: http://localhost:${PORT}`;
      
      console.error('[NICE] ❌', errorMessage);
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }
    
    // 백엔드 서버 URL 사용 (ngrok 또는 배포된 서버)
    returnUrl = `${backendBaseUrl}/api/nice/callback`;
    closeUrl = `${backendBaseUrl}/api/nice/close`;
    
    const requestBody = {
      request_no: requestNo,
      return_url: returnUrl,
      close_url: closeUrl,
      svc_types: ['M'], // M: 휴대폰인증
      method_type: 'GET',
      exp_mods: ['closeButtonOn'],
    };

    if (isDevelopment) {
      console.log('[NICE] 인증 URL 요청:', url);
      console.log('[NICE] return_url:', returnUrl);
      console.log('[NICE] 인증 URL 요청 본문:', JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'charset': 'UTF-8',
        'Authorization': `Bearer ${access_token}`,
        'X-Intc-DevLang': NICE_CONFIG.devLang,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    if (isDevelopment) {
      console.log('[NICE] 인증 URL 응답 상태:', response.status);
      console.log('[NICE] 인증 URL 응답 본문:', responseText);
    }

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        console.error('[NICE] ❌ 인증 URL 요청 실패 (HTTP 오류):', {
          status: response.status,
          result_code: errorData.result_code,
          result_message: errorData.result_message,
          error: errorData,
        });
        return res.status(response.status).json({
          success: false,
          error: errorData.result_message || errorData.message || '인증 URL 요청 실패',
          result_code: errorData.result_code,
        });
      } catch (parseError) {
        console.error('[NICE] ❌ 응답 파싱 실패:', parseError);
        console.error('[NICE] 원본 응답:', responseText);
        return res.status(response.status).json({
          success: false,
          error: `인증 URL 요청 실패 (${response.status})`,
        });
      }
    }

    const data = JSON.parse(responseText);
    
    if (data.result_code !== '0000') {
      // 에러는 항상 로깅
      console.error('[NICE] ❌ 인증 URL 요청 실패:', {
        result_code: data.result_code,
        result_message: data.result_message,
        return_url: returnUrl,
        close_url: closeUrl,
        full_response: data,
      });
      
      // 클라이언트에는 일반화된 메시지만 전달 (내부 IP/도메인/Client ID 비노출)
      const errorMessage = '본인인증 요청에 실패했습니다. 잠시 후 다시 시도해주세요.';

      return res.status(400).json({
        success: false,
        error: errorMessage,
        result_code: data.result_code,
      });
    }

    if (isDevelopment) {
      console.log('[NICE] 인증 URL 발급 성공');
    }

    res.json({
      success: true,
      data: {
        auth_url: data.auth_url,
        transaction_id: data.transaction_id,
        request_no: requestNo,
      },
    });
  } catch (error) {
    console.error('[NICE] 인증 URL 요청 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * 3. 인증 결과 요청
 * POST /api/nice/auth-result
 */
app.post('/api/nice/auth-result', async (req, res) => {
  try {
    const { access_token, web_transaction_id, transaction_id, request_no } = req.body;

    if (!access_token || !web_transaction_id || !transaction_id || !request_no) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다.',
      });
    }

    const url = `${NICE_CONFIG.baseUrl}/ido/intc/${NICE_CONFIG.version}/auth/result`;
    
    if (isDevelopment) {
      console.log('[NICE] 인증 결과 요청:', url);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'charset': 'UTF-8',
        'Authorization': `Bearer ${access_token}`,
        'X-Intc-DevLang': NICE_CONFIG.devLang,
      },
      body: JSON.stringify({
        web_transaction_id: web_transaction_id,
        transaction_id: transaction_id,
        request_no: request_no,
      }),
    });

    const responseText = await response.text();
    if (isDevelopment) {
      console.log('[NICE] 인증 결과 응답:', response.status, responseText);
    }

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        return res.status(response.status).json({
          success: false,
          error: errorData.result_message || errorData.message || '인증 결과 확인 실패',
          result_code: errorData.result_code,
        });
      } catch {
        return res.status(response.status).json({
          success: false,
          error: `인증 결과 확인 실패 (${response.status})`,
        });
      }
    }

    const data = JSON.parse(responseText);
    
    const verified = data.result_code === '0000';

    // NICE API 응답에서 사용자 정보 추출
    // 실제 응답 형식에 따라 필드명이 다를 수 있으므로 여러 가능성 확인
    const rawUserInfo = {
      mobile_no: data.mobile_no || data.mobileNo || data.phoneNumber || data.phone || null,
      name: data.name || data.userName || data.user_name || null,
      birthdate: data.birthdate || data.birthDate || data.birth_date || null,
      gender: data.gender || data.sex || null,
      ci: data.ci || null, // 본인확인 CI (민감정보)
      di: data.di || null, // 중복가입 확인 DI (민감정보)
    };

    // 보안: Transaction ID 재사용 방지 (Firestore 영속)
    if (verified && transaction_id) {
      try {
        await checkAndMarkNiceTransaction(transaction_id);
      } catch (reuseError) {
        console.error('[NICE] ❌ Transaction ID 재사용 시도 차단');
        return res.status(400).json({
          success: false,
          error: reuseError.message,
          result_code: 'SECURITY_ERROR',
        });
      }
    }

    // 보안: 민감정보 제거 (CI/DI는 클라이언트에 전달하지 않음)
    const { sanitized: userInfo, masked: maskedUserInfo } = security.sanitizeUserInfo(rawUserInfo);

    // 보안: 안전한 로깅 (민감정보 마스킹)
    if (isDevelopment) {
      security.safeLog('[NICE] 인증 결과 사용자 정보:', { userInfo: maskedUserInfo });
    }

    // Firebase Custom Token 발급 (인증 성공 시)
    // 보안/영속성: CI(개인 고유값) 해시 기반의 안정 UID 사용 → 재로그인 시 동일 계정 유지
    let customToken = null;
    let resolvedUid = null;
    if (verified && firebaseAdmin) {
      try {
        resolvedUid = deriveStableUid(rawUserInfo.ci, transaction_id);
        customToken = await admin.auth().createCustomToken(resolvedUid, {
          provider: 'nice',
          phoneNumber: userInfo.mobile_no || null,
        });
        console.log('[NICE] Firebase Custom Token 발급 성공 (uid:', resolvedUid, ')');
      } catch (tokenError) {
        console.error('[NICE] Firebase Custom Token 발급 실패:', tokenError.message);
      }
    }

    // 보안: CI/DI를 제외한 정보만 클라이언트에 전달
    res.json({
      success: true,
      verified: verified,
      customToken: customToken,
      uid: resolvedUid,
      data: {
        // 원본 데이터에서 CI/DI 제외
        ...Object.fromEntries(
          Object.entries(data).filter(([key]) => 
            !['ci', 'di'].includes(key.toLowerCase())
          )
        ),
        userInfo: userInfo, // CI/DI가 제거된 정보만 전달
      },
      message: verified 
        ? (data.result_message || '본인인증이 완료되었습니다.')
        : (data.result_message || '본인인증에 실패했습니다.'),
    });
  } catch (error) {
    console.error('[NICE] 인증 결과 요청 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * NICE 인증 완료 콜백
 * GET /api/nice/callback?web_transaction_id=xxx
 * POST /api/nice/callback (body에 web_transaction_id 포함 가능)
 * 
 * NICE API에서 return_url로 리다이렉트되면,
 * web_transaction_id를 받아서 앱의 딥링크로 리다이렉트합니다.
 */
const handleNiceCallback = (req, res) => {
  try {
    // 상세 요청 로깅은 개발 환경에서만 (민감정보 노출 방지)
    if (isDevelopment) {
      console.log('[NICE] 콜백 요청 수신:', {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
      });
    }

    // GET 요청: 쿼리 파라미터에서 가져오기
    // POST 요청: body 또는 쿼리 파라미터에서 가져오기
    // NICE API가 다양한 파라미터 이름을 사용할 수 있으므로 모두 확인
    let webTransactionId = req.query.web_transaction_id || 
                          req.body?.web_transaction_id || 
                          req.query.webTransactionId ||
                          req.body?.webTransactionId ||
                          req.query.transaction_id ||
                          req.body?.transaction_id ||
                          req.query.tid ||
                          req.body?.tid ||
                          req.query.webTid ||
                          req.body?.webTid;
    
    // URL 파라미터에서도 시도 (일부 경우)
    if (!webTransactionId && req.url) {
      // web_transaction_id 패턴 매칭
      const patterns = [
        /web_transaction_id=([^&]+)/i,
        /webTransactionId=([^&]+)/i,
        /transaction_id=([^&]+)/i,
        /tid=([^&]+)/i,
        /webTid=([^&]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = req.url.match(pattern);
        if (match) {
          webTransactionId = decodeURIComponent(match[1]);
          console.log('[NICE] URL에서 파라미터 추출:', { pattern: pattern.toString(), value: webTransactionId });
          break;
        }
      }
    }
    
    // 모든 쿼리 파라미터 출력 (디버깅용)
    if (!webTransactionId) {
      console.log('[NICE] 모든 쿼리 파라미터:', Object.keys(req.query).length > 0 ? req.query : '없음');
      console.log('[NICE] 모든 body 파라미터:', req.body && Object.keys(req.body).length > 0 ? req.body : '없음');
    }
    
    console.log('[NICE] 추출된 web_transaction_id:', webTransactionId);
    
    if (!webTransactionId) {
      console.error('[NICE] ❌ web_transaction_id를 찾을 수 없음');
      console.error('[NICE] 요청 상세:', {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
        rawBody: req.body ? JSON.stringify(req.body) : '없음',
      });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>인증 오류</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px;">
            <h1>인증 오류</h1>
            <p>인증 정보를 받을 수 없습니다.</p>
            <p>web_transaction_id가 없습니다.</p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              요청 정보: ${req.method} ${req.url}
            </p>
          </body>
        </html>
      `);
    }
    
    // 딥링크로 리다이렉트
    const deepLink = `smtalk://nice-auth-callback?web_transaction_id=${encodeURIComponent(webTransactionId)}`;
    
    console.log('[NICE] ✅ 인증 콜백 처리 성공:', { web_transaction_id: webTransactionId });
    console.log('[NICE] 딥링크로 리다이렉트:', deepLink);
    
    // HTML 페이지로 리다이렉트 (앱이 딥링크를 감지하도록)
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>본인인증 완료</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
            // 딥링크로 리다이렉트 시도
            window.location.href = '${deepLink}';
            
            // 앱이 열리지 않으면 3초 후 메시지 표시
            setTimeout(function() {
              document.getElementById('message').style.display = 'block';
            }, 3000);
          </script>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px;">
          <h1>본인인증 완료</h1>
          <p>앱으로 돌아가는 중...</p>
          <div id="message" style="display: none; margin-top: 20px; color: #666;">
            <p>앱이 자동으로 열리지 않으면 앱을 직접 열어주세요.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[NICE] ❌ 콜백 처리 오류:', error);
    console.error('[NICE] 오류 스택:', error.stack);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>오류</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px;">
          <h1>오류가 발생했습니다.</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
};

// GET과 POST 모두 처리
app.get('/api/nice/callback', handleNiceCallback);
app.post('/api/nice/callback', handleNiceCallback);

/**
 * NICE 인증 취소 콜백
 * GET /api/nice/close
 */
app.get('/api/nice/close', (req, res) => {
  const deepLink = 'smtalk://nice-auth-close';
  
  if (isDevelopment) {
    console.log('[NICE] 인증 취소 콜백 수신');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>본인인증 취소</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script>
          window.location.href = '${deepLink}';
        </script>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px;">
        <h1>본인인증 취소</h1>
        <p>앱으로 돌아가는 중...</p>
      </body>
    </html>
  `);
});

/**
 * 상품 ID → 지급 포인트 (서버 권위 매핑)
 * 클라이언트가 보낸 포인트 값을 신뢰하지 않고 서버에서 결정한다.
 */
const PRODUCT_POINTS = {
  'com.randomchat.points.1000': 1000,
  'com.randomchat.points.3000': 3000,
  'com.randomchat.points.5000': 5000,
  'com.randomchat.points.10000': 10000,
  'com.randomchat.points.30000': 30000,
  'com.randomchat.points.50000': 50000,
};

/**
 * 검증된 구매에 대해 서버에서 포인트를 적립한다. (중복 적립 방지 + 원자적 처리)
 * - 거래 ID 해시를 purchases 문서 ID로 사용하여 멱등성 보장
 * - users 문서의 points를 트랜잭션으로 증가
 */
async function creditPointsForPurchase({ userId, productId, transactionId, platform, orderId }) {
  const points = PRODUCT_POINTS[productId];
  if (!points) {
    throw new Error(`알 수 없는 상품입니다: ${productId}`);
  }
  if (!firebaseAdmin) {
    throw new Error('서버 구성 오류: Firebase Admin이 초기화되지 않았습니다.');
  }

  const db = admin.firestore();
  const purchaseDocId = crypto.createHash('sha256').update(String(transactionId)).digest('hex');
  const purchaseRef = db.collection('purchases').doc(purchaseDocId);
  const userRef = db.collection('users').doc(userId);

  return db.runTransaction(async (tx) => {
    const purchaseSnap = await tx.get(purchaseRef);
    const userSnap = await tx.get(userRef);
    const currentBalance = userSnap.exists ? (userSnap.data().points || 0) : 0;

    // 이미 처리된 거래면 중복 적립하지 않음
    if (purchaseSnap.exists) {
      return { alreadyProcessed: true, creditedPoints: 0, newBalance: currentBalance };
    }

    const newBalance = currentBalance + points;
    tx.set(userRef, {
      points: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.set(purchaseRef, {
      userId,
      productId,
      points,
      transactionId: String(transactionId),
      orderId: orderId || null,
      platform,
      verified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { alreadyProcessed: false, creditedPoints: points, newBalance };
  });
}

/**
 * IAP Google Play 영수증 서버 검증 + 포인트 적립
 * POST /api/iap/verify-android
 */
app.post('/api/iap/verify-android', async (req, res) => {
  try {
    const { packageName, productId, purchaseToken, userId } = req.body;

    if (!packageName || !productId || !purchaseToken || !userId) {
      return res.status(400).json({ success: false, error: '필수 파라미터 누락 (packageName, productId, purchaseToken, userId)' });
    }

    if (!PRODUCT_POINTS[productId]) {
      return res.status(400).json({ success: false, verified: false, error: '유효하지 않은 상품입니다.' });
    }

    const gPlayClientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    const gPlayPrivateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // 보안: 서비스 계정 미설정 시 검증 실패 처리 (구매 허용 금지)
    if (!gPlayClientEmail || !gPlayPrivateKey) {
      console.error('[IAP] Google Play 서비스 계정 미설정 - 검증 불가');
      return res.status(503).json({ success: false, verified: false, error: '결제 검증 서버가 아직 구성되지 않았습니다. 잠시 후 다시 시도해주세요.' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: gPlayClientEmail, private_key: gPlayPrivateKey },
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidpublisher = google.androidpublisher({ version: 'v3', auth });

    const response = await androidpublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    const purchase = response.data;
    // purchaseState: 0 = 구매됨, 1 = 취소됨, 2 = 보류중
    const isValid = purchase.purchaseState === 0 || purchase.purchaseState === undefined;

    if (!isValid) {
      return res.json({ success: true, verified: false, error: '완료되지 않았거나 취소된 구매입니다.', purchaseState: purchase.purchaseState });
    }

    // 검증 성공 → 서버에서 포인트 적립 (멱등)
    const credit = await creditPointsForPurchase({
      userId,
      productId,
      transactionId: purchaseToken,
      platform: 'android',
      orderId: purchase.orderId,
    });

    console.log('[IAP] Android 검증/적립 완료:', { productId, orderId: purchase.orderId, ...credit });

    return res.json({
      success: true,
      verified: true,
      orderId: purchase.orderId,
      ...credit,
    });
  } catch (error) {
    console.error('[IAP] Google Play 검증 오류:', error.message);
    // 보안: 권한 미설정(401/403)이어도 구매를 허용하지 않고 실패 처리
    if (error.code === 401 || error.code === 403) {
      return res.status(503).json({ success: false, verified: false, error: '결제 검증 서버 권한이 아직 구성되지 않았습니다.' });
    }
    if (error.code === 404) {
      return res.status(400).json({ success: false, verified: false, error: '유효하지 않은 구매 토큰입니다.' });
    }
    return res.status(500).json({ success: false, verified: false, error: error.message });
  }
});

/**
 * Apple 영수증 검증 (프로덕션 → 샌드박스 폴백)
 */
async function verifyAppleReceipt(receiptData) {
  const body = JSON.stringify({
    'receipt-data': receiptData,
    'password': process.env.APPLE_SHARED_SECRET || undefined,
    'exclude-old-transactions': true,
  });

  const post = async (url) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return r.json();
  };

  let data = await post('https://buy.itunes.apple.com/verifyReceipt');
  // 21007: 샌드박스 영수증을 프로덕션으로 보낸 경우 → 샌드박스로 재시도
  if (data && data.status === 21007) {
    data = await post('https://sandbox.itunes.apple.com/verifyReceipt');
  }
  return data;
}

/**
 * IAP Apple App Store 영수증 서버 검증 + 포인트 적립
 * POST /api/iap/verify-ios
 */
app.post('/api/iap/verify-ios', async (req, res) => {
  try {
    const { productId, transactionId, receipt, userId } = req.body;

    if (!productId || !receipt || !userId) {
      return res.status(400).json({ success: false, error: '필수 파라미터 누락 (productId, receipt, userId)' });
    }

    if (!PRODUCT_POINTS[productId]) {
      return res.status(400).json({ success: false, verified: false, error: '유효하지 않은 상품입니다.' });
    }

    const data = await verifyAppleReceipt(receipt);

    // status 0 = 정상 영수증
    if (!data || data.status !== 0) {
      console.error('[IAP] Apple 영수증 검증 실패. status:', data && data.status);
      return res.json({ success: true, verified: false, error: `영수증 검증 실패 (status: ${data ? data.status : 'unknown'})` });
    }

    // 영수증의 in_app 목록에서 해당 상품/거래 확인
    const inApp = (data.receipt && data.receipt.in_app) || data.latest_receipt_info || [];
    const match = inApp.find((item) =>
      item.product_id === productId &&
      (!transactionId || item.transaction_id === transactionId || item.original_transaction_id === transactionId)
    ) || inApp.find((item) => item.product_id === productId);

    if (!match) {
      return res.json({ success: true, verified: false, error: '영수증에서 해당 상품 구매 내역을 찾을 수 없습니다.' });
    }

    // 멱등성을 위한 거래 식별자 (Apple의 transaction_id 우선)
    const txId = match.transaction_id || transactionId;

    const credit = await creditPointsForPurchase({
      userId,
      productId,
      transactionId: txId,
      platform: 'ios',
      orderId: match.original_transaction_id || null,
    });

    console.log('[IAP] iOS 검증/적립 완료:', { productId, txId, ...credit });

    return res.json({
      success: true,
      verified: true,
      ...credit,
    });
  } catch (error) {
    console.error('[IAP] Apple 검증 오류:', error.message);
    return res.status(500).json({ success: false, verified: false, error: error.message });
  }
});

/**
 * 포인트 보상 적립 (서버 권위, 멱등)
 * POST /api/points/claim  { type: 'attendance' | 'post-reward' | 'signup-bonus' | 'reviewer-demo' }
 * 헤더: Authorization: Bearer <Firebase ID Token>
 */
app.post('/api/points/claim', verifyFirebaseToken, async (req, res) => {
  try {
    const { type } = req.body || {};
    const rule = REWARD_RULES[type];
    if (!rule) {
      return res.status(400).json({ success: false, error: '알 수 없는 보상 유형입니다.' });
    }

    // 익명 전용 보상(심사 데모) 보호
    const provider = req.firebaseToken.firebase && req.firebaseToken.firebase.sign_in_provider;
    if (rule.anonymousOnly && provider !== 'anonymous') {
      return res.status(403).json({ success: false, error: '허용되지 않은 요청입니다.' });
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(req.uid);
    const today = kstDateString();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() : {};
      const current = data.points || 0;

      // 중복 적립 방지
      if (rule.dailyField && data[rule.dailyField] === today) {
        return { granted: false, creditedPoints: 0, newBalance: current };
      }
      if (rule.onceField && data[rule.onceField]) {
        return { granted: false, creditedPoints: 0, newBalance: current };
      }

      const newBalance = current + rule.amount;
      const update = {
        points: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (rule.dailyField) update[rule.dailyField] = today;
      if (rule.onceField) update[rule.onceField] = true;

      tx.set(userRef, update, { merge: true });
      return { granted: true, creditedPoints: rule.amount, newBalance };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[POINTS] 적립 오류:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 정적 정책 페이지 (Railway/AWS nginx 없이도 Play Store URL로 사용 가능)
const sendPolicyPage = (filename) => (req, res) => {
  res.sendFile(path.join(__dirname, filename));
};
app.get('/privacy-policy', sendPolicyPage('privacy-policy.html'));
app.get('/terms', sendPolicyPage('terms.html'));
app.get('/delete-account', sendPolicyPage('delete-account.html'));

// Railway/NICE 등록용: 이 서버의 실제 아웃바운드(외부) IP 확인
app.get('/api/outbound-ip', async (req, res) => {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    res.json({
      outbound_ip: ipData.ip,
      note: 'NICE 관리 페이지 > IP 주소 등록에 위 IP를 추가하세요. Railway는 IP가 바뀔 수 있어 Pro 플랜 Static IP 권장.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'IP 확인 실패' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NICE Auth Proxy Server',
  });
});

// 서버 시작
app.listen(PORT, async () => {
  if (isDevelopment) {
    console.log(`\n🚀 NICE 본인인증 프록시 서버가 시작되었습니다.`);
    console.log(`📍 서버 주소: http://localhost:${PORT}`);
    console.log(`📋 Health Check: http://localhost:${PORT}/health`);
    console.log(`\n⚠️  이 서버의 IP 주소를 NICE 관리 페이지에 등록해야 합니다.`);
    
    // 현재 공인 IP 확인 (개발 환경에서만)
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      console.log(`\n📌 현재 서버의 공인 IP 주소: ${ipData.ip}`);
      console.log(`   이 IP를 NICE 관리 페이지에 등록하세요!`);
      console.log(`   Client ID: ${NICE_CONFIG.clientId}`);
    } catch (error) {
      console.log(`\n📌 IP 확인 실패. 수동으로 확인: https://api.ipify.org?format=json`);
    }
    console.log(`\n`);
  } else {
    console.log(`NICE 본인인증 프록시 서버가 시작되었습니다. (포트: ${PORT})`);
  }
});
