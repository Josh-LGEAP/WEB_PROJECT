# V3 변경 파일 목록

기준: `portal_v1_source.zip` 원본과 이번 덮어쓰기용 V3 비교.

## 결과 요약

- AI Insights와 Analytics Hub는 legacy handler 실행 전에 capture 단계에서 차단되어 중앙 Coming Soon만 표시한다.
- KAM BSR Tutorial은 직접 Blob URL이 아니라 인증·report policy 검사를 거치는 `/api/report-resource`를 사용한다.
- Report/Tutorial HTML은 `target="_blank"` + `rel="noopener noreferrer"`로 새 탭 렌더링되며, Raw Excel은 `download` 동작을 유지한다.
- Report HTML은 실제 registry의 `links.reportHtml`이 `null`이고 서버 resource도 없어서 의도적으로 비활성이다.
- Dashboard 핵심 파일·17개 타일·URL·검색·스타일은 원본과 동일하며 브라우저 회귀 검증 PASS다.

## 수정된 기존 파일 — 1개

| 파일 | 변경 |
|---|---|
| `app/index.html` | 기존 Dashboard DOM을 유지한 채 Report Hub 및 Coming Soon namespaced CSS/JS 로드, KAM/GTM hidden root 추가, 손상된 Chart.js 태그 교정 |

## 추가: Coming Soon 모듈

| 파일 | 목적 |
|---|---|
| `app/modules/coming-soon/bop-coming-soon.js` | `nav-ai`, `nav-analytics`만 capture 단계에서 가로채 legacy 렌더/API 호출 방지 |
| `app/modules/coming-soon/bop-coming-soon.css` | 중앙 Coming Soon 전용 시각 요소. `bop-coming-soon*` namespace |
| `app/modules/coming-soon/README.md` | Dashboard 비침해 계약 |

## 추가/수정: KAM/GTM Report Hub

| 파일 | 목적 |
|---|---|
| `app/modules/report-hub/bop-report-hub.js` | registry 기반 한 행/리포트 렌더링, same-origin 보안 API 링크 허용, HTML 새 탭과 Excel 다운로드 동작 분리 |
| `app/modules/report-hub/bop-report-hub.css` | `bop-report-hub*` 전용 스타일 |
| `app/modules/report-hub/bop-report-hub.registry.json` | Tutorial을 `/api/report-resource`로 전환, Report HTML/Raw Excel은 `null` 유지 |
| `app/modules/report-hub/README.md` | 모듈 namespace 및 확장 규칙 |

## 추가: Blob 리소스 서버 보안

| 파일 | 목적 |
|---|---|
| `api/config/report-resources.json` | report/resource→정확한 private Blob allowlist |
| `api/config/permissions/reports.permissions.json` | 리포트별 서버 권한 원본 |
| `api/config/permissions/tabs.permissions.json` | 탭별 서버 정책 확장 위치 |
| `api/src/authorization/policy.js` | role/user/trusted group claim 평가, 미등록 정책 fail closed |
| `api/src/report-resources.js` | 식별자 검증 및 리소스 조회 |
| `api/src/functions/reportResource.js` | principal 및 report policy 검사 후 5분 HTTPS/read-only user-delegation SAS redirect |

## 추가: 테스트

| 파일 | 검증 |
|---|---|
| `api/test/dashboard-regression.test.js` | Dashboard 파일·DOM·자산·URL 및 namespace 무충돌 |
| `api/test/authorization.test.js` | 역할/사용자/거부/trusted group claim 정책 |
| `api/test/registry-contract.test.js` | KAM/GTM, Tutorial API URL, Report HTML `null` 계약 |
| `api/test/report-resources.test.js` | private Blob allowlist, Report HTML 미등록, path traversal 거부 |
| `qa/dashboard-baseline-manifest.json` | 원본 Dashboard SHA-256·URL·타일 기준 |
| `qa/dashboard-browser-regression-results.json` | 원본/최종 Chromium 비교 PASS 결과 |
| `qa/screenshots/*.png` | Dashboard, Coming Soon, KAM 시각 검증 캡처 |

## 추가: 문서

- `README.md`
- `docs/APPLY.md`
- `docs/AUTHORIZATION.md`
- `docs/REPORT_RESOURCE_ACCESS.md`
- `docs/DASHBOARD_LINK_SOURCES.md`
- `docs/DASHBOARD_REGRESSION.md`
- `docs/CHANGED_FILES.md`

## 원본과 바이트 동일하게 유지된 Dashboard 범위

- `app/app.js`
- `app/styles.css`
- `app/registry.json`
- `app/assets/logo.png`
- `app/assets/tiles/`의 17개 이미지 전체
- `api/src/registry.js`
- `api/src/functions/registry.js`
- `api/src/auth.js`
- Dashboard refresh 관련 API 파일
- `app/staticwebapp.config.json`, 루트 `staticwebapp.config.json`

## 제외/삭제

- `api/local.settings.json`
- `api/node_modules/`
- `.git/`
- `.env`

## 회귀 및 기능 검증

- 자동 테스트: 19개 PASS
- 초기 Dashboard: 원본과 동일
- Dashboard 타일: 17개, 이름·Power BI href 일치
- `Inventory` 검색 결과 일치
- Dashboard 핵심 computed style 일치
- AI/Analytics 클릭 후 legacy API 호출: 0건
- AI/Analytics: Coming Soon만 표시
- Coming Soon→Dashboard 복귀: 원본과 동일
- KAM→Dashboard 복귀: 원본과 동일
- Tutorial href: same-origin `/api/report-resource`
- Report HTML/Raw Excel: 2개 disabled
- 브라우저 page error: 0건
