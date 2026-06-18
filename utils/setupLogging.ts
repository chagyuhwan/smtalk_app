/**
 * 프로덕션 로깅 정리
 *
 * 릴리스 빌드(!__DEV__)에서는 console.log/info/debug를 비활성화하여
 * 민감정보 노출과 성능 저하를 방지합니다. (warn/error는 유지)
 *
 * 반드시 다른 모듈보다 먼저 import 되어야 합니다.
 */
if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

export {};
