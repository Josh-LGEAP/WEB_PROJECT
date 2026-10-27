# 최종 변경 파일 목록 및 Dashboard 영향 검증

기준: OneDrive의 `portal_v1_source.zip` 원본과 최종 병합본 비교.

## 결론

**Dashboard 회귀 검증 PASS.** 기존 Dashboard는 기본 탭/초기 진입 화면으로 유지되며 코드, 스타일, 레지스트리, 17개 타일 자산, Power BI 링크, 검색 및 복귀 동작이 원본과 동일하다.

Dashboard 링크 관리는 **혼합 방식**이다. 브라우저는 `/api/registry`를 우선 호출하고, API가 실패하거나 빈 목록이면 `app/app.js`의 `EMBEDDED` 17개 하드코딩 목록을 사용한다. API는 기본적으로 Microsoft Graph를 통해 SharePoint List를 읽고 `REGISTRY_SOURCE=excel`일 때 OneDrive/SharePoint Excel Table을 읽는다. `app/registry.json`은 하드코딩 목록과 같은 스냅샷이지만 현재 코드가 fetch하지 않으며, Azure Blob CSV는 Analytics Hub 전용으로 Dashboard 링크와 무관하다. 상세는 `docs/DASHBOARD_LINK_SOURCES.md`에 있다.

## 원본과 동일하게 유지된 Dashboard 핵심 파일

다음 파일은 SHA-256 기준으로 원본과 바이트 단위 동일하다.

- `app/app.js` — Dashboard 전역 함수, 라우팅, 렌더링, 이벤트 변경 없음
- `app/styles.css` — 기존 Dashboard CSS 선택자 및 스타일 변경 없음
- `app/registry.json` — Dashboard URL, 순서, 이름, Power BI/Workspace/Dataset ID 변경 없음
- `app/assets/logo.png`
- `app/assets/tiles/` 아래 17개 타일 이미지 전체
- `app/staticwebapp.config.json`, 루트 `staticwebapp.config.json`
- 기존 API/워크플로/패키지 파일 전체

## 수정된 기존 파일 — 1개만 해당

| 파일 | 제한된 변경 내용 |
|---|---|
| `app/index.html` | 기존 `nav-dashboard`와 Dashboard 상태바·검색·`content` DOM은 그대로 두고, namespaced CSS 링크, KAM/GTM 버튼 2개, 초기 `hidden` 모듈 루트 2개, Dashboard 스크립트 뒤의 모듈 스크립트만 추가. 손상된 Chart.js 태그를 정상 CDN 태그로 교정. |

## 추가 파일

| 파일 | 목적 |
|---|---|
| `.gitignore` | `node_modules`, `local.settings.json`, `.env`, `.git` 패키지 유입 방지 |
| `README.md` | Dashboard 보존 경계와 독립 모듈 구조 안내 |
| `app/modules/report-hub/bop-report-hub.js` | 전용 IIFE 안에서만 실행되는 KAM/GTM 모듈. 기존 전역 함수 생성 없음 |
| `app/modules/report-hub/bop-report-hub.css` | `bop-report-hub*` 전용 선택자만 사용하는 스타일 |
| `app/modules/report-hub/bop-report-hub.registry.json` | 탭/리포트 레지스트리, 3종 링크 및 개별 권한 메타데이터 |
| `app/modules/report-hub/README.md` | 모듈 네임스페이스 계약 |
| `api/config/permissions/tabs.permissions.json` | 향후 서버 측 탭 권한 정책 |
| `api/config/permissions/reports.permissions.json` | 향후 서버 측 리포트 권한 정책 |
| `api/src/authorization/policy.js` | Entra 역할/사용자 정책 평가기 |
| `api/test/authorization.test.js` | 권한 정책 테스트 |
| `api/test/registry-contract.test.js` | KAM/GTM 레지스트리·링크 null·튜토리얼 URL·파일명 후보 테스트 |
| `api/test/dashboard-regression.test.js` | Dashboard 소스/DOM/URL/자산/네임스페이스 회귀 테스트 |
| `qa/dashboard-baseline-manifest.json` | 원본 Dashboard SHA-256 및 17개 URL/타일 계약 |
| `qa/dashboard-browser-regression-results.json` | 원본·최종 브라우저 비교 결과(PASS) |
| `docs/DASHBOARD_REGRESSION.md` | 회귀 범위와 영향 없음 근거 |
| `docs/DASHBOARD_LINK_SOURCES.md` | 원본 Dashboard 링크의 혼합 관리 방식, 파일·변수·호출 흐름 조사 |
| `docs/AUTHORIZATION.md` | Entra ID 확장과 권한 파일 배치 위치 |
| `docs/APPLY.md` | `C:\portal_v1` 덮어쓰기 절차 |
| `docs/CHANGED_FILES.md` | 본 문서 |

## 삭제/최종 패키지 제외

| 파일/경로 | 처리 |
|---|---|
| `api/local.settings.json` | 로컬 비밀 설정이므로 제외 |
| `api/node_modules/` | 최종 ZIP 제외; 적용 후 `npm ci`로 재설치 |
| `.git/` | 최종 ZIP 제외 |
| `.env` | 최종 ZIP 제외 |

## Dashboard 회귀 검증 결과

### 정적 검증 — 12개 테스트 PASS

- `app/app.js`, `app/styles.css`, `app/registry.json`, 로고: 원본 SHA-256 일치
- 17개 타일 이미지: 원본 SHA-256 모두 일치
- 17개 Dashboard의 이름, 순서, 카테고리, Power BI URL, 이미지명, Workspace ID, Dataset ID, 표시/보관 상태: 모두 일치
- 기존 Dashboard DOM 블록 및 `nav-dashboard`: 원본과 일치
- 신규 모듈: 일반 전역 할당 없음, IIFE 사용, 기존 `.tile`, `.grid`, `.topnav`, `.toolbar`, `.statusbar`, `#content`, `#search` CSS 선택자 미사용

### Chromium 브라우저 전후 비교 — PASS

- 초기 Dashboard 표시: 동일
- 기존 타일 수: 17개 동일
- 타일 이름 및 Power BI `href`: 17개 모두 동일
- `Inventory` 검색 결과: `Inventory Dashboard`, `LTI Dashboard`로 동일
- AI Insights → Dashboard 복귀 상태: 동일
- 첫 타일의 배경색·테두리·radius·display와 Dashboard grid columns: 동일
- KAM → Dashboard 복귀 후 17개 타일/링크: 동일
- KAM: 리포트 1행, 버튼 3개, 미확정 버튼 2개 비활성, Tutorial URL 활성
- GTM: 0행 및 정상 빈 상태
- 브라우저 page error: 0건

상세 원시 결과는 `qa/dashboard-browser-regression-results.json`, 검증 방법은 `docs/DASHBOARD_REGRESSION.md`에 있다.
