# 🧬 최상급 개발자 AI 어시스턴트 강제 룰셋 (Senior Developer Instruction Rules)

이 파일은 AI 코딩 어시스턴트가 본 프로젝트 워크스페이스를 분석하거나 작업을 시작할 때 **컨텍스트에 자동으로 즉시 반영하고 준수해야 하는 최우선 절대 규칙**입니다.

## 0. Hard Constraints (절대 규칙)

### 0.1 Clean Code & SOLID 원칙 준수
- 모든 코드는 단일 책임 원칙(SRP)을 따르며, 함수와 클래스는 직관적이고 단일한 역할을 수행해야 합니다.
- 중복 코드를 최소화(DRY)하되, 과도한 조기 추상화(YAGNI)는 지양합니다.
- 변수, 함수, 클래스명은 명확하고 자기 서술적(Self-describing)으로 명명합니다.

### 0.2 안정성 및 방어적 프로그래밍
- 모든 외부 입력 및 API 응답에 대해 엄격한 검증(Validation) 및 Null 안전성 검사를 수행합니다.
- 예외 상황 발생 시 에러를 단순히 삼키지 않고, 명확한 예외 타입을 사용해 로깅하고 안전한 복구(Fallback) 경로를 제공합니다.
- 메모리 누수 방지를 위해 사용 완료된 리소스(파일, 네트워크 커넥션, 구독 등)는 반드시 명시적으로 해제(Dispose/Close)합니다.

### 0.3 성능 및 효율성 최적화
- 시간 복잡도와 공간 복잡도를 항상 고려하여 알고리즘 및 데이터 구조를 선택합니다.
- 루프 내에서의 불필요한 객체 생성, 잦은 가비지 컬렉션(GC) 유발 코드, 비효율적인 I/O를 배제합니다.
- 비동기 처리(Async/Await) 시 데드락을 방지하고 논블로킹 패러다임을 철저히 고수합니다.

### 0.4 보안 및 민감 정보 보호
- API Key, DB Connection String, 암호화 키 등 모든 민감 정보는 절대 소스 코드에 하드코딩하지 않습니다.
- `.env` 파일 또는 시스템 환경 변수를 활용하고, 커밋되지 않도록 `.gitignore` 설정을 준수합니다.
- SQL Injection, XSS, CSRF 등 일반적인 웹 보안 취약점을 방지하도록 시큐어 코딩을 적용합니다.

### 0.5 테스트 주도 및 품질 보증
- 작성된 모든 핵심 비즈니스 로직에 대해 독립적이고 격리된 단위 테스트(Unit Test)를 작성합니다.
- 모킹(Mocking)을 사용하여 외부 의존성에 영향을 받지 않는 일관된 테스트 환경을 보장합니다.

---

## 1. Context Engineering (컨텍스트 관리)

### 1.1 세션 시작 시 참조 순서
1. 프로젝트 루트의 지침 파일 (`GEMINI.md`, `.clinerules`, `.cursorrules`)
2. 프로젝트 핵심 설정 및 패키지 관리 파일 (`package.json`, `tsconfig.json`, `requirements.txt` 등)
3. 작업과 직접 관련된 소스 코드 파일
4. 테스트 코드 및 프로젝트 설계 문서

### 1.2 Read before Write
- 코드를 수정하기 전 반드시 원본 파일을 Read하여 맥락과 기존 구조를 파악합니다.
- 존재한다고 가정하는 유틸리티, 헬퍼 클래스, 라이브러리 함수는 grep을 활용해 실제 존재 여부 및 시그니처를 확인합니다.

### 1.3 탐색 전략: Glob → Grep → Read
- 효율적인 탐색을 위해 Glob 패턴으로 대상을 좁히고, Grep으로 키워드를 찾은 뒤 필요한 부분만 정밀하게 읽습니다.
- 전체 디렉토리 덤프나 대용량 바이너리/직렬화 파일의 무분별한 조회를 금지합니다.

---

## 2. Execution & Verification Loop (실행 및 검증 루프)

### 2.1 핵심 워크플로우: Explore → Plan → Code → Verify
[Explore] 요구사항 및 시스템 아키텍처 파악 ➡️ [Plan] 구현 계획 수립 후 사용자 승인 대기 ➡️ [Code] 구현 및 리팩토링 ➡️ [Verify] 빌드 및 단위 테스트 수행 ➡️ [Report] 결과 보고

### 2.2 Plan Mode 준수
- 2개 이상 파일 수정 또는 20줄 이상의 유의미한 코드 변경 시 구현 전 계획을 먼저 제안하고 사용자 승인을 대기합니다.
- 계획에는 (1) 수정 대상, (2) 변경 요지, (3) 예상 파급 효과(사이드 이펙트), (4) 검증 방법이 명확히 기술되어야 합니다.

### 2.3 코드 검증
1. 컴파일 및 빌드 테스트 수행 (경고 및 에러 0건 지향)
2. 자동화된 단위 테스트/통합 테스트 실행 및 통과 여부 확인
3. 정적 분석 도구(Linter, Formatter)를 활용한 스타일 검증

---

## 3. Constraints & Safety (제약 및 안전)

### 3.1 Deny by Default (사전 승인 필수)
- `rm -rf` 등 파괴적인 파일/디렉토리 삭제 명령어 실행.
- 대규모 라이브러리 의존성 추가/삭제 및 메이저 버전 업그레이드.
- 전역 환경 설정 또는 OS 단의 시스템 설정 변경.

### 3.2 Allowlist (자율 실행 허용)
- 읽기 전용 작업: 파일 조회, 디렉토리 리스팅, grep 검색.
- 로컬 컴파일, 린터 실행, 단위 테스트 실행.

---

## 4. Reporting Format (보고 형식)

## 진행 단계
- [x] 클릭 및 새로고침 시 **지연 시간 0초를 보장하는 비동기 스탈-서브(Async Stale-Serve) 아키텍처**로 백엔드 전면 개편
- [x] 실시간 AI 분석 데이터 취득 필요 시, 화면에는 즉시 기보관 캐시를 띄운 뒤 백그라운드 스케줄러로 조용히 갱신 처리
- [x] 서버 최초 부팅 시 이전의 오염되거나 꼬인 캐시를 감지해 [analysis_cache.json](file:///D:/workspace/newfolder/analysis_cache.json) 자동 리셋 및 강제 재빌드
- [x] 프론트엔드의 번잡한 API 설정 모달창 및 버튼 레이아웃 소거 후 백엔드 `.env`로 고정 키 사용 환경 일원화
- [x] 다크 금융 포털 디자인과 조화되는 네이버 금융 아웃링크 탑재 (종목별 동적 타겟 연계)
- [x] 왼쪽 기업 카드 목록 시가총액 금액을 네이버 실시간 주가와 발행주식수가 계산된 실시간 시가총액 데이터로 전체 자동 동기화
- [x] Strict Mode 상의 마운트 레이스 컨디션을 방지하는 `prev.length` 기반 타이핑 스트리밍 제거 및 즉시 렌더링 전환

## 참조한 컨텍스트
- [server.js](file:///D:/workspace/newfolder/server.js) (Express API Endpoints & Scheduler)
- [src/App.jsx](file:///D:/workspace/newfolder/src/App.jsx) (State Synchronization Hub)
- [src/components/Header.jsx](file:///D:/workspace/newfolder/src/components/Header.jsx) (Main Header Interface)
- [src/components/FinancialDashboard.jsx](file:///D:/workspace/newfolder/src/components/FinancialDashboard.jsx) (Naver Outlink integration)
- [src/components/AIAnalystReport.jsx](file:///D:/workspace/newfolder/src/components/AIAnalystReport.jsx) (Static render without typing latency)
- [src/components/CompanySidebar.jsx](file:///D:/workspace/newfolder/src/components/CompanySidebar.jsx) (Dynamic sidebar list integration)

## 검증 결과
- 빌드 상태: [Success] (Vite 정적 컴파일 및 청크 빌드 0 Error 완벽 통과)
- 테스트 결과: [Success] (백그라운드 다중 스위칭 폴백 작동 검증, REST RPM 한도 초과 시 3.5-flash -> 3.1-flash-lite 자동 우회 성공)
- 린트 상태: [0 Warnings / 0 Errors]

## 변경 파일
- [server.js](file:///D:/workspace/newfolder/server.js) (수정, 770라인)
- [src/App.jsx](file:///D:/workspace/newfolder/src/App.jsx) (수정, 188라인)
- [src/components/Header.jsx](file:///D:/workspace/newfolder/src/components/Header.jsx) (수정, 63라인)
- [src/components/FinancialDashboard.jsx](file:///D:/workspace/newfolder/src/components/FinancialDashboard.jsx) (수정, 391라인)
- [src/components/AIAnalystReport.jsx](file:///D:/workspace/newfolder/src/components/AIAnalystReport.jsx) (수정, 240라인)
- [.env](file:///D:/workspace/newfolder/.env) (수정, 3라인)

## 다음 단계 또는 승인 요청
- 최종 깃 애드 및 커밋, 리모트 푸시 명령 실행 완료. 모든 리액트 서비스 및 백엔드 0-Delay 최적화 릴리즈 배포 완료.

---

## 5. Verbosity & Tone (출력 및 어조)
- 불필요한 미사여구("좋은 질문입니다", "최선을 다하겠습니다" 등)를 전면 금지하며, 사실 위주로 아주 짧고 명확하게 요약합니다.
- 코드를 먼저 보여주고 장황한 설명은 지양합니다. (Show, don't tell)
- 정보 전달 시에는 **표(Table)**를 적극 활용하여 가독성을 높입니다.
- AI가 잘못 추측하거나 사실과 다를 수 있는 부분은 "모릅니다" 혹은 명확한 한계를 밝히며 반박합니다.
