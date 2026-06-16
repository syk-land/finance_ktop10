# 🎮 PROJECT 2100: 유라시아 폴아웃 (Eurasian Fallout RPG)

PROJECT 2100은 핵전쟁으로 멸망한 2100년 유라시아 대륙을 배경으로 하는 횡스크롤 자동전투 턴제 액션 RPG 시뮬레이터입니다. 유저는 방사능 변이 리스크를 통제하며 캐릭터를 육성하고, 14개 지역을 정복하는 여정을 떠나게 됩니다.

이 프로젝트에는 **Retro 16-bit JRPG 스타일의 스프라이트 애니메이션 모드**가 내장되어 있으며, 총 10가지 하이브리드 특성의 고유 스프라이트 시트가 완벽히 생성 및 통합되어 있습니다.

---

## 🧬 JRPG 스프라이트 모드 주요 아티팩트 (설계 및 디자인 문서)

개발 과정에서 정의되고 작성된 세부 설계 및 에셋 명세서는 아래의 로컬 문서 링크를 통해 바로 조회하실 수 있습니다.

*   **[🎮 스프라이트 연동 결과 & 테스트 검증 문서 (walkthrough.md)](file:///C:/Users/exbxda13/.gemini/antigravity-cli/brain/8b489a80-78dc-4485-82b0-b33b2733105b/walkthrough.md)**
    *   JRPG 스프라이트 애니메이션 4단 동작 프레임(대기/이동/공격/특수공격) 연동 상세, 실시간 코스튬 교체 구조, 테스트 매뉴얼 등이 정리되어 있습니다.
*   **[👾 10대 하이브리드 특성 스프라이트 쇼케이스 (traits_design.md)](file:///C:/Users/exbxda13/.gemini/antigravity-cli/brain/8b489a80-78dc-4485-82b0-b33b2733105b/traits_design.md)**
    *   플라즈마 거수부터 메카닉 타이탄까지 **10대 하이브리드 특성 캐릭터의 스프라이트 시트 이미지 및 파일 경로**가 모두 정리되어 있습니다.
*   **[👤 기본 캐릭터 디자인 명세 (character_design.md)](file:///C:/Users/exbxda13/.gemini/antigravity-cli/brain/8b489a80-78dc-4485-82b0-b33b2733105b/character_design.md)**
    *   초록색 트윈테일 헤어, 아냐의 머리뿔, 하루히의 노란 머리띠 등을 가진 플레이어 캐릭터의 비주얼 컨셉 설계 문서입니다.
*   **[📐 JRPG 스프라이트 연동 설계서 (implementation_plan.md)](file:///C:/Users/exbxda13/.gemini/antigravity-cli/brain/8b489a80-78dc-4485-82b0-b33b2733105b/implementation_plan.md)**
    *   기존 SVG 벡터 파츠 렌더링에서 스프라이트 시트 기반 렌더링으로 전환하기 위해 구성했던 아키텍처 설계도입니다.
*   **[📋 프로젝트 2100 통합 설계 명세서 (project_2100_design_spec.md)](file:///D:/workspace/newfolder/docs/project_2100_design_spec.md)**
    *   게임의 핵심 콘셉트, 14개 지역별 해금 콘텐츠, 다차원 복합 진화 트리 및 모듈형 리소스 명세 등이 통합된 마스터 설계서입니다.
*   **[🧬 Spine 2D 관절 리깅 및 애니메이션 개선 명세 (skeletal_rig_animation_updates.md)](file:///D:/workspace/newfolder/docs/skeletal_rig_animation_updates.md)**
    *   WebGL Skeletal Rig 시뮬레이터의 공격/특수 애니메이션 및 무기별 파티클 이펙트 조절 가이드라인 문서입니다.

---

## 🚀 시작하기 (How to Run)

프로젝트는 **Vite**를 빌드 도구로 사용하며, 아래 명령어를 통해 실행 및 테스트할 수 있습니다.

### 의존성 설치
```bash
npm install
```

### 개발 서버 구동 (Local Dev Server)
```bash
npm run dev
```
*   서버 실행 후 브라우저에서 `http://localhost:5174/` 로 접속하십시오.

### 프로덕션 빌드 (Production Build)
```bash
npm run build
```
*   빌드 결과물은 `/dist` 폴더에 생성됩니다.

---

## 🕹️ 스프라이트 모드 테스트 방법

1.  게임 실행 후 타이틀 화면에서 **🎮 게임 시작 (START GAME)**을 클릭합니다.
2.  캐릭터 영입 맵 화면에서 요원을 영입하고 쉘터(기지)에 진입합니다.
3.  우측 상단의 **⚙️ 시스템 설정 (SETTINGS)**을 클릭한 후, **👾 JRPG 스프라이트 모드** 체크박스를 활성화합니다.
4.  설정 하단에서 대기(Idle), 걷기(Walk), 공격(Attack) 상태의 프레임 속도와 실시간 애니메이션 미리보기를 조작할 수 있습니다.
5.  특성 연구 단말기에서 **5단계 하이브리드 특성**을 구입하면, 구매 즉시 해당 특성의 전용 스프라이트 아머 스킨으로 캐릭터 비주얼이 **실시간 변경**되며 흰색 배경이 투명하게 제거되어 렌더링됩니다.
6.  전투에 진입하여 스킬을 시전할 경우, 4행에 배치된 **특수공격(앞점프/팔들기) 모션**이 500ms 동안 역동적으로 재생됩니다.
