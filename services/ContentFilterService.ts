/**
 * 콘텐츠 필터링 서비스
 * 욕설, 성매매 관련 키워드, 불법 행위 관련 키워드 차단
 */

export interface FilterResult {
  passed: boolean; // 필터링 통과 여부
  blocked: boolean; // 차단 여부
  reason?: string; // 차단 사유
  filteredText?: string; // 필터링된 텍스트 (욕설만 마스킹)
}

class ContentFilterService {
  // 욕설 단어 리스트 (한국어)
  private profanityWords: Set<string> = new Set([
    // 욕설 (일반적인 욕설만 포함, 실제로는 더 많은 단어 필요)
    '시발', '씨발', '개새끼', '병신', '미친', '좆', '젠장', '빡쳐', '빡치',
    '개같은', '개새', '새끼', '지랄', '좆같', '좆나', '좆만', '좆도',
    '자지', '보지',
    // 추가 욕설 (실제 서비스에서는 더 포괄적인 리스트 필요)
  ]);

  // 성매매 관련 키워드
  private prostitutionKeywords: Set<string> = new Set([
    '성매매', '조건만남', '유사성매매', '성매수', '매춘', '매매춘',
    '조건', '만남', '대가', '선불', '후불', '선입금', '후입금',
    '성인방', '룸', '오피', '안마', '마사지', '키스방', '립카페',
    '원나잇', '원나이트', '원샷', '원타임', '일회성',
    '돈받고', '돈받아', '돈받는', '돈받을', '돈받으면',
    '선물받고', '선물받아', '선물받는', '선물받을',
    '기프트콘', '기프티콘', '상품권', '현금', '송금', '이체',
    '만나서', '만나요', '만날', '만나고', '만나면',
    '성관계', '섹스', '성행위', '성적행위',
    '유흥', '유흥업소', '유흥주점',
  ]);

  // 불법 행위 관련 키워드
  private illegalKeywords: Set<string> = new Set([
    '마약', '대마', '필로폰', '암페타민', '코카인', '헤로인', '엑스터시',
    'LSD', '각성제', '신경안정제', '수면제', '진통제',
    '구매', '판매', '거래', '유통', '배달',
    '도박', '사행', '베팅', '경마', '경륜', '경정',
    '해킹', '크래킹', '피싱', '스캠', '사기',
    '폭행', '협박', '강도', '절도', '도난',
    '불법', '범죄', '수사', '경찰', '검찰',
  ]);

  // 스팸 패턴 (동일 메시지 반복 등)
  private spamPatterns: RegExp[] = [
    /(.)\1{10,}/g, // 같은 문자 10번 이상 반복
    /(.{1,5})\1{5,}/g, // 같은 단어/문구 5번 이상 반복
  ];

  /**
   * 텍스트 필터링
   * @param text 필터링할 텍스트
   * @param options 필터링 옵션
   */
  filterText(
    text: string,
    options: {
      maskProfanity?: boolean; // 욕설 마스킹 여부 (기본: false, 차단)
      allowSpam?: boolean; // 스팸 허용 여부 (기본: false)
    } = {}
  ): FilterResult {
    const { maskProfanity = false, allowSpam = false } = options;
    const lowerText = text.toLowerCase().trim();
    const normalizedText = this.normalizeText(lowerText);

    // 1. 성매매 관련 키워드 검사
    for (const keyword of this.prostitutionKeywords) {
      if (normalizedText.includes(keyword)) {
        return {
          passed: false,
          blocked: true,
          reason: '성매매 관련 내용이 포함되어 있습니다.',
        };
      }
    }

    // 2. 불법 행위 관련 키워드 검사
    for (const keyword of this.illegalKeywords) {
      if (normalizedText.includes(keyword)) {
        return {
          passed: false,
          blocked: true,
          reason: '불법 행위 관련 내용이 포함되어 있습니다.',
        };
      }
    }

    // 3. 스팸 패턴 검사
    if (!allowSpam) {
      for (const pattern of this.spamPatterns) {
        if (pattern.test(text)) {
          return {
            passed: false,
            blocked: true,
            reason: '스팸으로 의심되는 메시지입니다.',
          };
        }
      }
    }

    // 4. 욕설 검사
    let filteredText = text;
    let hasProfanity = false;

    for (const word of this.profanityWords) {
      if (normalizedText.includes(word)) {
        hasProfanity = true;
        
        if (maskProfanity) {
          // 욕설 마스킹
          const regex = new RegExp(word, 'gi');
          filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        } else {
          // 욕설 차단
          return {
            passed: false,
            blocked: true,
            reason: '부적절한 언어가 포함되어 있습니다.',
          };
        }
      }
    }

    return {
      passed: true,
      blocked: false,
      filteredText: hasProfanity ? filteredText : undefined,
    };
  }

  /**
   * 텍스트 정규화 (띄어쓰기 제거, 특수문자 제거 등)
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, '') // 공백 제거
      .replace(/[^\w가-힣]/g, ''); // 특수문자 제거 (한글, 영문, 숫자만)
  }

  /**
   * 게시글 필터링
   */
  filterPost(content: string): FilterResult {
    return this.filterText(content, {
      maskProfanity: false, // 게시글은 욕설 차단
      allowSpam: false,
    });
  }

  /**
   * 메시지 필터링
   */
  filterMessage(text: string): FilterResult {
    return this.filterText(text, {
      maskProfanity: false, // 메시지도 욕설 차단
      allowSpam: false,
    });
  }

  /**
   * 닉네임 필터링
   */
  filterNickname(nickname: string): FilterResult {
    return this.filterText(nickname, {
      maskProfanity: false,
      allowSpam: true, // 닉네임은 스팸 패턴 체크 안 함
    });
  }

  /**
   * 자기소개 필터링
   */
  filterBio(bio: string): FilterResult {
    return this.filterText(bio, {
      maskProfanity: false,
      allowSpam: false,
    });
  }

  /**
   * 키워드 추가 (관리자용)
   */
  addProfanityWord(word: string): void {
    this.profanityWords.add(word.toLowerCase());
  }

  /**
   * 키워드 제거 (관리자용)
   */
  removeProfanityWord(word: string): void {
    this.profanityWords.delete(word.toLowerCase());
  }

  /**
   * 성매매 키워드 추가 (관리자용)
   */
  addProstitutionKeyword(keyword: string): void {
    this.prostitutionKeywords.add(keyword.toLowerCase());
  }

  /**
   * 불법 키워드 추가 (관리자용)
   */
  addIllegalKeyword(keyword: string): void {
    this.illegalKeywords.add(keyword.toLowerCase());
  }
}

export const contentFilterService = new ContentFilterService();

