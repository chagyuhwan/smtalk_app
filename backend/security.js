/**
 * NICE 본인인증 보안 유틸리티
 * 
 * 보안 취약점 체크리스트 대응:
 * 1. 불필요한 중요정보 평문 노출 방지
 * 2. 파라미터 변조 방지
 * 3. 입력정보 일치여부 검증
 * 4. 데이터 재사용 방지
 */

const crypto = require('crypto');

// 사용된 transaction_id 저장 (재사용 방지)
const usedTransactionIds = new Set();
const TRANSACTION_ID_TTL = 24 * 60 * 60 * 1000; // 24시간

/**
 * CI/DI 등 민감정보 마스킹
 */
function maskSensitiveInfo(data) {
  if (!data) return null;
  
  if (typeof data === 'string' && data.length > 8) {
    // 앞 4자리와 뒤 4자리만 표시, 중간은 마스킹
    return data.substring(0, 4) + '*'.repeat(data.length - 8) + data.substring(data.length - 4);
  }
  
  return '****';
}

/**
 * 민감정보 제거 (CI/DI 등)
 */
function sanitizeUserInfo(userInfo) {
  const sanitized = { ...userInfo };
  
  // CI/DI 제거 (클라이언트에 전달하지 않음)
  delete sanitized.ci;
  delete sanitized.di;
  
  // 로그용 마스킹된 정보
  const masked = {
    ...sanitized,
    ci: userInfo.ci ? maskSensitiveInfo(userInfo.ci) : null,
    di: userInfo.di ? maskSensitiveInfo(userInfo.di) : null,
  };
  
  return { sanitized, masked };
}

/**
 * Transaction ID 재사용 방지
 */
function checkTransactionIdReuse(transactionId) {
  if (usedTransactionIds.has(transactionId)) {
    throw new Error('이미 사용된 인증 정보입니다. 다시 인증해주세요.');
  }
  
  // 사용된 ID 저장
  usedTransactionIds.add(transactionId);
  
  // 24시간 후 자동 제거
  setTimeout(() => {
    usedTransactionIds.delete(transactionId);
  }, TRANSACTION_ID_TTL);
  
  return true;
}

/**
 * 입력 정보 일치 여부 검증
 * (NICE에서 받은 정보와 사용자가 입력한 정보 비교)
 */
function validateUserInput(niceData, userInput) {
  const errors = [];
  
  // 전화번호 일치 확인
  if (niceData.mobile_no && userInput.phoneNumber) {
    const nicePhone = niceData.mobile_no.replace(/[-\s]/g, '');
    const userPhone = userInput.phoneNumber.replace(/[-\s]/g, '');
    
    if (nicePhone !== userPhone) {
      errors.push('전화번호가 일치하지 않습니다.');
    }
  }
  
  // 생년월일 일치 확인 (있는 경우)
  if (niceData.birthdate && userInput.birthdate) {
    if (niceData.birthdate !== userInput.birthdate) {
      errors.push('생년월일이 일치하지 않습니다.');
    }
  }
  
  // 이름 일치 확인 (있는 경우)
  if (niceData.name && userInput.name) {
    if (niceData.name !== userInput.name) {
      errors.push('이름이 일치하지 않습니다.');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  
  return true;
}

/**
 * 요청 무결성 검증 (HMAC 등)
 */
function generateRequestHash(data, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
}

function verifyRequestHash(data, hash, secret) {
  const expectedHash = generateRequestHash(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
}

/**
 * 안전한 로깅 (민감정보 제외)
 */
function safeLog(message, data = {}) {
  const sanitized = { ...data };
  
  // 민감정보 제거
  if (sanitized.userInfo) {
    const { masked } = sanitizeUserInfo(sanitized.userInfo);
    sanitized.userInfo = masked;
  }
  
  if (sanitized.ci) delete sanitized.ci;
  if (sanitized.di) delete sanitized.di;
  if (sanitized.access_token) sanitized.access_token = '***';
  if (sanitized.clientSecret) sanitized.clientSecret = '***';
  
  console.log(message, sanitized);
}

module.exports = {
  maskSensitiveInfo,
  sanitizeUserInfo,
  checkTransactionIdReuse,
  validateUserInput,
  generateRequestHash,
  verifyRequestHash,
  safeLog,
};
