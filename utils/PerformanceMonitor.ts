/**
 * 성능 모니터링 유틸리티
 * 앱 성능 측정 및 분석
 */

import { Platform } from 'react-native';

export interface PerformanceMetrics {
  screenName: string;
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // 최대 저장 개수
  private screenLoadTimes: Map<string, number> = new Map();

  /**
   * 화면 로딩 시작
   */
  startScreenLoad(screenName: string): void {
    this.screenLoadTimes.set(screenName, Date.now());
  }

  /**
   * 화면 로딩 완료
   */
  endScreenLoad(screenName: string): number {
    const startTime = this.screenLoadTimes.get(screenName);
    if (!startTime) {
      console.warn(`화면 로딩 시작 시간을 찾을 수 없습니다: ${screenName}`);
      return 0;
    }

    const loadTime = Date.now() - startTime;
    this.screenLoadTimes.delete(screenName);

    // 메트릭 저장
    this.recordMetric({
      screenName,
      loadTime,
      renderTime: 0, // 렌더링 시간은 별도 측정 필요
      timestamp: Date.now(),
    });

    // 개발 환경에서만 콘솔 출력
    if (__DEV__) {
      console.log(`[Performance] ${screenName} 로딩 시간: ${loadTime}ms`);
    }

    return loadTime;
  }

  /**
   * 렌더링 시간 측정
   */
  measureRenderTime(screenName: string, renderFn: () => void): void {
    const startTime = performance.now();
    renderFn();
    const renderTime = performance.now() - startTime;

    // 개발 환경에서만 콘솔 출력
    if (__DEV__) {
      console.log(`[Performance] ${screenName} 렌더링 시간: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * 메트릭 기록
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // 오래된 메트릭 제거
    }
  }

  /**
   * 메모리 사용량 가져오기 (근사치)
   * 실제 메모리는 네이티브 도구로 측정해야 합니다.
   */
  getMemoryUsage(): number | null {
    // React Native에서는 직접 메모리 사용량을 가져올 수 없습니다.
    // Xcode Instruments 또는 Android Studio Profiler를 사용하세요.
    return null;
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 화면별 평균 로딩 시간 계산
   */
  getAverageLoadTime(screenName: string): number {
    const screenMetrics = this.metrics.filter(m => m.screenName === screenName);
    if (screenMetrics.length === 0) return 0;

    const totalLoadTime = screenMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    return totalLoadTime / screenMetrics.length;
  }

  /**
   * 성능 리포트 생성
   */
  generateReport(): {
    totalScreens: number;
    averageLoadTime: number;
    slowestScreen: { name: string; time: number } | null;
    fastestScreen: { name: string; time: number } | null;
    screenBreakdown: Array<{ name: string; count: number; averageTime: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalScreens: 0,
        averageLoadTime: 0,
        slowestScreen: null,
        fastestScreen: null,
        screenBreakdown: [],
      };
    }

    // 화면별 그룹화
    const screenGroups = new Map<string, PerformanceMetrics[]>();
    this.metrics.forEach(metric => {
      const existing = screenGroups.get(metric.screenName) || [];
      existing.push(metric);
      screenGroups.set(metric.screenName, existing);
    });

    // 평균 로딩 시간 계산
    const totalLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0);
    const averageLoadTime = totalLoadTime / this.metrics.length;

    // 가장 느린/빠른 화면 찾기
    let slowestScreen: { name: string; time: number } | null = null;
    let fastestScreen: { name: string; time: number } | null = null;

    screenGroups.forEach((metrics, screenName) => {
      const avgTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
      
      if (!slowestScreen || avgTime > slowestScreen.time) {
        slowestScreen = { name: screenName, time: avgTime };
      }
      
      if (!fastestScreen || avgTime < fastestScreen.time) {
        fastestScreen = { name: screenName, time: avgTime };
      }
    });

    // 화면별 상세 정보
    const screenBreakdown = Array.from(screenGroups.entries()).map(([name, metrics]) => ({
      name,
      count: metrics.length,
      averageTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
    }));

    return {
      totalScreens: this.metrics.length,
      averageLoadTime,
      slowestScreen,
      fastestScreen,
      screenBreakdown,
    };
  }

  /**
   * 성능 리포트 출력 (개발 환경)
   */
  printReport(): void {
    if (!__DEV__) return;

    const report = this.generateReport();
    console.log('=== 성능 리포트 ===');
    console.log(`총 화면 로딩: ${report.totalScreens}회`);
    console.log(`평균 로딩 시간: ${report.averageLoadTime.toFixed(2)}ms`);
    
    if (report.slowestScreen) {
      console.log(`가장 느린 화면: ${report.slowestScreen.name} (${report.slowestScreen.time.toFixed(2)}ms)`);
    }
    
    if (report.fastestScreen) {
      console.log(`가장 빠른 화면: ${report.fastestScreen.name} (${report.fastestScreen.time.toFixed(2)}ms)`);
    }
    
    console.log('\n화면별 상세:');
    report.screenBreakdown.forEach(screen => {
      console.log(`  ${screen.name}: ${screen.count}회, 평균 ${screen.averageTime.toFixed(2)}ms`);
    });
  }

  /**
   * 메트릭 초기화
   */
  clearMetrics(): void {
    this.metrics = [];
    this.screenLoadTimes.clear();
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// React Native의 performance API 사용 (있는 경우)
const performance = (global as any).performance || {
  now: () => Date.now(),
};







