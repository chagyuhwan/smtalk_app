/**
 * NICE 본인인증 API 프록시 서버
 * 
 * React Native 앱에서 NICE API를 호출할 수 있도록 프록시 역할을 합니다.
 * 서버 IP를 NICE에 등록하여 IP 접근 제한 문제를 해결합니다.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const security = require('./security');
const admin = require('firebase-admin');
const { google } = require('googleapis');

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
app.use(cors());
app.use(express.json());
// NICE API가 form-data로 POST 요청을 보낼 수 있으므로 urlencoded도 추가
app.use(express.urlencoded({ extended: true }));

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
    
    console.log('[NICE] 접근 토큰 발급 요청:', url);
    console.log('[NICE] Client ID:', NICE_CONFIG.clientId);
    console.log('[NICE] Request No:', requestNo);
    
    // 현재 서버의 공인 IP 확인 (디버깅용)
    try {
      const ipCheck = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipCheck.json();
      console.log('[NICE] 현재 서버 공인 IP:', ipData.ip);
      console.log('[NICE] ⚠️  이 IP가 NICE 관리 페이지에 등록되어 있는지 확인하세요!');
    } catch (ipError) {
      console.log('[NICE] IP 확인 실패 (무시 가능)');
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
          
          return res.status(response.status).json({
            success: false,
            error: errorMessage,
            result_code: errorData.result_code,
            current_ip: currentIP,
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
    
    // 항상 로깅 (오류 디버깅용)
    console.log('[NICE] 인증 URL 요청:', url);
    console.log('[NICE] return_url:', returnUrl);
    console.log('[NICE] close_url:', closeUrl);
    console.log('[NICE] BACKEND_BASE_URL:', process.env.BACKEND_BASE_URL || '설정되지 않음');
    
    const requestBody = {
      request_no: requestNo,
      return_url: returnUrl,
      close_url: closeUrl,
      svc_types: ['M'], // M: 휴대폰인증
      method_type: 'GET',
      exp_mods: ['closeButtonOn'],
    };
    
    console.log('[NICE] 인증 URL 요청 본문:', JSON.stringify(requestBody, null, 2));
    
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
    // 항상 응답 로깅 (디버깅용) - 매우 중요!
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[NICE] 인증 URL 응답 상태:', response.status);
    console.log('[NICE] 인증 URL 응답 본문:', responseText);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
      
      // "요청하신 사이트 정보가 올바르지 않습니다" 오류 처리
      let errorMessage = data.result_message || '인증 URL 요청에 실패했습니다.';
      if (data.result_message && data.result_message.includes('사이트 정보')) {
        errorMessage = `요청하신 사이트 정보가 올바르지 않습니다.\n\n` +
          `오류 코드: ${data.result_code}\n` +
          `오류 메시지: ${data.result_message}\n` +
          `현재 return_url: ${returnUrl}\n\n` +
          `⚠️ 중요: Return URL은 관리 페이지에 등록하지 않고 API 요청 시 파라미터로 전달합니다.\n\n` +
          `가능한 원인:\n` +
          `1. 서비스 신청 시 도메인 등록 필요\n` +
          `   - NICE 관리 페이지 > 서비스 관리 > 도메인 등록\n` +
          `   - 도메인: hailee-unannihilated-metempirically.ngrok-free.dev\n\n` +
          `2. IP 화이트리스트 등록 필요\n` +
          `   - NICE 관리 페이지 > IP 등록\n` +
          `   - 서버 공인 IP: 211.178.123.241\n\n` +
          `3. NICE 고객 지원 문의\n` +
          `   - 이메일: niceid_support@nice.co.kr\n` +
          `   - 전화: 02-2122-4872~3\n` +
          `   - Client ID: NI3e27f2e2-2bae-4d2e-93d4-e477e915763b\n\n` +
          `자세한 내용은 backend/NICE_TROUBLESHOOTING.md 파일을 참고하세요.`;
      }
      
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

    // 보안: Transaction ID 재사용 방지
    if (verified && transaction_id) {
      try {
        security.checkTransactionIdReuse(transaction_id);
      } catch (reuseError) {
        console.error('[NICE] ❌ Transaction ID 재사용 시도:', transaction_id);
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
    let customToken = null;
    if (verified && firebaseAdmin) {
      try {
        const uid = `nice_${transaction_id}`;
        customToken = await admin.auth().createCustomToken(uid, {
          provider: 'nice',
          phoneNumber: userInfo.mobile_no || null,
        });
        console.log('[NICE] Firebase Custom Token 발급 성공 (uid:', uid, ')');
      } catch (tokenError) {
        console.error('[NICE] Firebase Custom Token 발급 실패:', tokenError.message);
      }
    }

    // 보안: CI/DI를 제외한 정보만 클라이언트에 전달
    res.json({
      success: true,
      verified: verified,
      customToken: customToken,
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
    // 상세 로깅 (디버깅용) - 매우 중요!
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[NICE] 콜백 요청 수신:', {
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
      },
    });
    console.log('[NICE] 전체 요청 객체:', JSON.stringify({
      method: req.method,
      originalUrl: req.originalUrl,
      url: req.url,
      query: req.query,
      params: req.params,
      body: req.body,
      headers: req.headers,
    }, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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
 * IAP Google Play 영수증 서버 검증
 * POST /api/iap/verify-android
 */
app.post('/api/iap/verify-android', async (req, res) => {
  try {
    const { packageName, productId, purchaseToken, userId } = req.body;

    if (!packageName || !productId || !purchaseToken || !userId) {
      return res.status(400).json({ success: false, error: '필수 파라미터 누락 (packageName, productId, purchaseToken, userId)' });
    }

    const gPlayClientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    const gPlayPrivateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!gPlayClientEmail || !gPlayPrivateKey) {
      console.warn('[IAP] Google Play 서비스 계정 미설정 - 검증 건너뜀');
      return res.json({ success: true, verified: false, error: 'Google Play 서비스 계정이 설정되지 않았습니다.' });
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
    // purchaseState: 0 = 구매됨, 1 = 취소됨
    const isValid = purchase.purchaseState === 0 || purchase.purchaseState === undefined;
    // consumptionState: 0 = 미소비, 1 = 소비됨
    const isConsumed = purchase.consumptionState === 1;

    console.log('[IAP] Google Play 검증 결과:', {
      productId,
      purchaseState: purchase.purchaseState,
      consumptionState: purchase.consumptionState,
      orderId: purchase.orderId,
      isValid,
      isConsumed,
    });

    if (!isValid) {
      return res.json({ success: true, verified: false, error: '취소된 구매입니다.', purchaseState: purchase.purchaseState });
    }

    if (isConsumed) {
      return res.json({ success: true, verified: false, error: '이미 소비된 구매입니다.' });
    }

    return res.json({
      success: true,
      verified: true,
      orderId: purchase.orderId,
      purchaseTimeMillis: purchase.purchaseTimeMillis,
    });
  } catch (error) {
    console.error('[IAP] Google Play 검증 오류:', error.message);
    // Google API 오류 코드별 처리
    if (error.code === 401 || error.code === 403) {
      // Play Console API 액세스 미설정 상태 - 앱 출시 후 서비스 계정 연결 필요
      // 임시로 구매 허용 처리 (연결 후 strict 모드로 변경)
      console.warn('[IAP] Google Play API 권한 미설정 - 임시 허용 처리');
      return res.json({ success: true, verified: true, orderId: null, note: 'play_api_not_linked' });
    }
    if (error.code === 404) {
      return res.status(400).json({ success: false, error: '유효하지 않은 구매 토큰입니다.' });
    }
    return res.status(500).json({ success: false, error: error.message });
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
