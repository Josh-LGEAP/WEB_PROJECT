# Dashboard 회귀 검증 결과

## 보존 전략

KAM/GTM을 기존 `app/app.js` 또는 `app/styles.css`에 합치지 않았다. 기존 Dashboard의 코드, 스타일, 레지스트리, 로고 및 타일 이미지는 원본 그대로 유지하고, `app/modules/report-hub/` 아래의 독립 IIFE/CSS/JSON 모듈로 추가했다.

## 정적 회귀 기준

`qa/dashboard-baseline-manifest.json`은 원본 `portal_v1_source.zip`에서 계산한 SHA-256과 Dashboard 계약을 보관한다.

검증 대상:

- `app/app.js` 바이트 동일성
- `app/styles.css` 바이트 동일성
- `app/registry.json` 바이트 동일성
- `api/src/registry.js`, `api/src/functions/registry.js`, `api/src/auth.js`와 Dashboard 새로고침 관련 API 파일 바이트 동일성
- 기존 Static Web Apps 설정 및 `api/local.settings.json.example` 바이트 동일성
- 로고와 17개 타일 이미지 바이트 동일성
- 17개 Dashboard의 순서, 이름, 카테고리, Power BI URL, 이미지명, Workspace ID, Dataset ID, 표시/보관 상태 동일성
- 기존 `index.html`의 Dashboard 상태바·검색·콘텐츠 DOM 블록 동일성
- 기존 `nav-dashboard` 컨트롤 유지
- Report Hub DOM/CSS/JS 네임스페이스 충돌 없음
- KAM/GTM 루트가 초기에는 `hidden`이고 Dashboard 소스 뒤에 추가 모듈이 로드됨

## 브라우저 회귀 시나리오

원본 비교본(원본의 손상된 Chart.js 태그만 수정)과 최종본을 동일한 Chromium 환경에서 각각 실행하여 다음을 비교한다.

1. 초기 진입 시 Dashboard 표시
2. 타일 수 17개
3. 타일 이름과 Power BI `href` 17개 완전 일치
4. 검색어 `Inventory` 입력 시 표시 타일 집합 일치
5. AI Insights 진입 후 Dashboard 복귀 시 콘텐츠/상태바/검색창 표시 상태 일치
6. Dashboard 타일의 핵심 computed style(배경색, 테두리, radius, display, grid columns) 일치
7. 최종본에서 KAM/GTM 이동 후 Dashboard 복귀 시 기존 Dashboard 타일과 링크 재확인
8. 브라우저 page error 없음

## 자동화

`api/test/dashboard-regression.test.js`가 정적 회귀 기준을 자동 검사한다. 최종 패키지를 다시 압축 해제한 뒤에도 전체 테스트를 반복한다.

## 영향 없음의 근거

- 기존 Dashboard 이벤트 구현과 전역 함수는 `app/app.js` 해시 동일성으로 원본과 완전 동일함을 확인한다.
- 기존 Dashboard CSS는 `app/styles.css` 해시 동일성으로 완전 동일함을 확인한다.
- URL/타일/Power BI 메타데이터는 `app/registry.json`과 원본 projection의 완전 일치로 확인한다.
- 신규 CSS는 `bop-report-hub*`만 사용하며 기존 `.tile`, `.grid`, `.topnav`, `.toolbar`, `.statusbar`, `#content`, `#search`를 선택하지 않는다.
- 신규 JavaScript는 IIFE 내부에 있고 일반 전역 함수/변수를 만들지 않는다.
- 기존 Dashboard 버튼을 누르면 기존 이벤트 핸들러가 그대로 실행되며, 모듈은 자기 뷰만 숨긴다.
