# 코드 리뷰 보고서

## 📋 개요
전체 코드베이스를 검토하여 보일러플레이트 코드, 시간복잡도, 공간복잡도 문제를 분석했습니다.

---

## 🔴 심각한 문제 (즉시 수정 필요)

### 1. 시간복잡도 문제

#### 문제 1-1: StarTalkScreen의 sortedPosts에서 반복적인 find() 호출
**위치:** `screens/StarTalkScreen.tsx:119-193`

**문제:**
```typescript
// 현재 코드 - O(n*m) 시간복잡도
filtered = filtered.filter((post) => {
  const author = contacts.find((c) => c.id === post.authorId); // O(m)
  return author?.gender === genderFilter;
});
```

**영향:**
- 게시글이 n개, 연락처가 m개일 때 O(n*m) 시간복잡도
- 필터링마다 contacts.find()가 반복 호출됨
- 성별, BDSM, 나이 필터에서 각각 find() 호출

**해결방안:**
```typescript
// contactsMap을 사용하여 O(1) 조회로 최적화
const contactsMap = useMemo(() => {
  const map = new Map<string, User>();
  contacts.forEach((contact) => map.set(contact.id, contact));
  return map;
}, [contacts]);

// 사용 시
const author = contactsMap.get(post.authorId); // O(1)
```

#### 문제 1-2: ChatListScreen의 중복 제거 로직
**위치:** `screens/ChatListScreen.tsx:69-73`

**문제:**
```typescript
// O(n²) 시간복잡도
const uniqueRooms = chatRooms.filter((room, index, self) =>
  index === self.findIndex((r) => r.id === room.id) // O(n)
);
```

**영향:**
- 채팅방이 많을수록 성능 저하
- 매번 렌더링 시 실행됨

**해결방안:**
```typescript
// Set을 사용하여 O(n)으로 최적화
const uniqueRooms = useMemo(() => {
  const seen = new Set<string>();
  return chatRooms.filter((room) => {
    if (seen.has(room.id)) return false;
    seen.add(room.id);
    return true;
  });
}, [chatRooms]);
```

#### 문제 1-3: ChatContext의 중복 제거 로직
**위치:** `context/ChatContext.tsx:494-496`

**문제:**
```typescript
// O(n²) 시간복잡도
const uniqueRooms = rooms.filter((room, index, self) =>
  index === self.findIndex((r) => r.id === room.id)
);
```

**해결방안:** 위와 동일

---

### 2. 보일러플레이트 코드

#### 문제 2-1: 사용자 데이터 변환 로직 중복
**위치:** `services/FirebaseFirestoreService.ts` 여러 곳

**문제:**
- `getUser()`, `subscribeToUser()`, `getAllUsers()`, `subscribeToUsers()`에서 동일한 데이터 변환 로직 반복
- suspendedUntil 처리, bdsmPreference 정규화 등이 중복됨

**해결방안:**
```typescript
// 공통 메서드로 추출
private transformUserData(doc: DocumentSnapshot, data: DocumentData): User {
  // suspendedUntil 처리
  let suspendedUntil: number | undefined = undefined;
  if (data.suspendedUntil) {
    suspendedUntil = data.suspendedUntil.toMillis?.() || data.suspendedUntil;
  }
  
  return {
    id: doc.id,
    name: data.name,
    // ... 나머지 필드
    bdsmPreference: this.normalizeBdsmPreference(data.bdsmPreference),
    suspendedUntil,
    // ...
  };
}
```

#### 문제 2-2: contacts.find() 패턴 반복
**위치:** 여러 화면 컴포넌트

**문제:**
- `StarTalkScreen`, `ChatScreen`, `UserProfileScreen` 등에서 `contacts.find()` 반복 사용
- `ChatContext`에 `contactsMap`이 있지만 활용되지 않음

**해결방안:**
- `ChatContext`에서 `contactsMap`을 export하여 모든 컴포넌트에서 사용
- 또는 헬퍼 함수 제공: `getContactById(id: string): User | undefined`

---

### 3. 공간복잡도 및 메모리 최적화

#### 문제 3-1: 불필요한 배열 복사
**위치:** `screens/StarTalkScreen.tsx:120`

**문제:**
```typescript
let filtered = [...posts]; // 전체 배열 복사
```

**영향:**
- 게시글이 많을 때 불필요한 메모리 사용

**해결방안:**
- 필터링을 직접 수행하거나, 필요한 경우에만 복사

#### 문제 3-2: 메시지 배열의 불필요한 복사
**위치:** `context/ChatContext.tsx:944`

**문제:**
```typescript
[chatRoomId]: roomMessages.map((message) => ({ ...message, read: true }))
```

**영향:**
- 읽지 않은 메시지가 많을 때 메모리 사용 증가

**해결방안:**
- 읽지 않은 메시지만 업데이트 (이미 부분적으로 구현됨)

---

## 🟡 개선 권장 사항

### 4. React 최적화

#### 문제 4-1: 불필요한 리렌더링 가능성
**위치:** 여러 컴포넌트

**문제:**
- `useCallback`, `useMemo`가 적절히 사용되었지만, 일부 의존성 배열이 불완전할 수 있음

**확인 필요:**
- `ChatContext`의 모든 콜백 함수 의존성 배열 확인
- 컴포넌트 props의 참조 안정성 확인

#### 문제 4-2: FlatList 최적화
**위치:** `screens/ChatListScreen.tsx`, `screens/StarTalkScreen.tsx`

**현재 상태:**
- `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize` 설정됨 ✅

**추가 개선:**
- `getItemLayout` 제공 (고정 높이인 경우)
- `keyExtractor` 최적화 확인

---

### 5. 코드 구조 개선

#### 문제 5-1: ChatContext 파일 크기
**위치:** `context/ChatContext.tsx` (약 1900줄)

**문제:**
- 단일 파일이 너무 큼
- 유지보수 어려움

**해결방안:**
- 기능별로 분리:
  - `useChatRooms.ts`
  - `useContacts.ts`
  - `usePosts.ts`
  - `usePoints.ts`

#### 문제 5-2: 매직 넘버
**위치:** 여러 파일

**문제:**
- 하드코딩된 값들 (예: `100`, `50`, `20` 등)

**해결방안:**
```typescript
// constants.ts
export const POINTS = {
  INITIAL: 100,
  ATTENDANCE_REWARD: 50,
  POST_REWARD: 20,
  CHAT_COST: 50,
} as const;
```

---

## ✅ 잘 구현된 부분

1. **useMemo/useCallback 적절한 사용**
   - `ChatContext`에서 대부분의 함수가 `useCallback`으로 메모이제이션됨
   - `contactsMap`을 `useMemo`로 최적화함

2. **Firestore 쿼리 최적화**
   - 인덱스 없이 작동하도록 쿼리 설계됨
   - 실시간 구독 적절히 사용됨

3. **에러 핸들링**
   - try-catch 블록 적절히 사용됨
   - 사용자 친화적인 에러 메시지

4. **타입 안정성**
   - TypeScript 적절히 사용됨
   - 타입 정의가 명확함

---

## 📊 우선순위별 수정 계획

### 즉시 수정 (P0)
1. ✅ StarTalkScreen의 contacts.find() → contactsMap 사용
2. ✅ ChatListScreen의 중복 제거 로직 최적화
3. ✅ ChatContext의 중복 제거 로직 최적화

### 단기 수정 (P1)
4. FirebaseFirestoreService의 중복 코드 추출
5. contactsMap을 모든 컴포넌트에서 사용하도록 전파
6. 매직 넘버를 상수로 추출

### 중기 개선 (P2)
7. ChatContext 파일 분리
8. 추가적인 React 최적화
9. 성능 모니터링 강화

---

## 📈 예상 성능 개선

### 시간복잡도 개선
- **StarTalkScreen 필터링:** O(n*m) → O(n) (약 10-100배 개선, 연락처 수에 따라)
- **중복 제거:** O(n²) → O(n) (약 10-1000배 개선, 채팅방 수에 따라)

### 메모리 사용량
- **불필요한 배열 복사 제거:** 약 10-30% 감소 예상
- **Map 사용으로 조회 최적화:** 메모리 사용량 약간 증가하지만 성능 대폭 개선

---

## 🔧 수정 예시 코드

### 예시 1: StarTalkScreen 최적화
```typescript
// contactsMap 추가
const contactsMap = useMemo(() => {
  const map = new Map<string, User>();
  contacts.forEach((contact) => map.set(contact.id, contact));
  return map;
}, [contacts]);

// sortedPosts에서 사용
const sortedPosts = useMemo(() => {
  let filtered = posts.filter((post) => !isBlocked(post.authorId));

  if (genderFilter !== 'all') {
    filtered = filtered.filter((post) => {
      const author = post.authorId === currentUser.id 
        ? currentUser 
        : contactsMap.get(post.authorId);
      return author?.gender === genderFilter;
    });
  }
  // ... 나머지 필터도 동일하게 수정
}, [posts, genderFilter, contactsMap, currentUser, isBlocked]);
```

### 예시 2: 중복 제거 최적화
```typescript
// ChatListScreen
const sortedRooms = useMemo(() => {
  const seen = new Set<string>();
  const uniqueRooms = chatRooms.filter((room) => {
    if (seen.has(room.id)) return false;
    seen.add(room.id);
    return true;
  });
  
  // ... 나머지 로직
}, [chatRooms, currentUser.id, isPinned]);
```

---

## 📝 결론

전반적으로 코드 품질이 좋지만, 몇 가지 성능 최적화가 필요합니다. 특히:
1. **시간복잡도 개선**이 가장 중요 (즉시 수정 권장)
2. **보일러플레이트 코드 제거**로 유지보수성 향상
3. **메모리 최적화**로 앱 안정성 향상

이러한 개선을 통해 사용자 수가 증가해도 안정적인 성능을 유지할 수 있습니다.



