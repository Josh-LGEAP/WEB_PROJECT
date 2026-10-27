# V4 변경 파일 목록

기준: 배포된 V3에서 현재 public Tutorial 직접 접근 요구를 반영한 V4.

## 원인과 수정

### Tutorial JSON 오류

V3 registry가 Tutorial을 `/api/report-resource?...`로 연결했다. 이 Function은 Managed Identity로 user-delegation SAS를 생성하며, 해당 identity/RBAC가 준비되지 않으면 의도적으로 HTTP 502와 `Report resource is unavailable` JSON을 반환했다.

V4에서는 현재 공개 허용된 정확한 Blob URL을 registry에 직접 설정해 Function 프록시를 우회한다.

### Report HTML 활성 / Raw Excel 회색 버튼

Report HTML은 사용자가 제공한 정확한 전체 Blob URL을 registry에 반영해 활성화했다. Raw Excel만 실제 registry에서 `null`이다. `createAction()`은 URL이 없으면 disabled button을 생성하므로 Raw Excel의 회색 상태가 정상이다. Excel 파일명 후보는 URL이 아니며 임의 조합하지 않았다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| `app/modules/report-hub/bop-report-hub.registry.json` | Report/Tutorial의 정확한 공개 Blob 전체 URL, `BSR Traffic Light`, `Created by JohnPaul OConnor`, 상태 값 제거. Raw Excel은 `null` 유지 |
| `app/modules/report-hub/bop-report-hub.js` | 상태가 있을 때만 배지 표시, 정확한 제작자 문자열 표시, HTML 새 탭/Excel 다운로드 유지 |
| `api/test/registry-contract.test.js` | 공개 Report/Tutorial 직접 URL, 운영 메타데이터, Raw Excel null 계약 검증 |
| `api/test/report-resources.test.js` | API 리소스가 향후 private 전환용임을 명확화 |
| `README.md` | 현재 public 직접 URL과 향후 private SAS 구조 구분 |
| `docs/REPORT_RESOURCE_ACCESS.md` | V3 오류 경로, V4 직접 URL, URL 입력 필드, private 전환 설명 |
| `docs/AUTHORIZATION.md` | 현재 public 링크의 권한 한계, SWA/Entra 위치, Managed Identity RBAC 경로 |
| `docs/APPLY.md` | V4 덮어쓰기 및 검증 절차 |
| `docs/CHANGED_FILES.md` | 본 목록 |
| `qa/dashboard-browser-regression-results.json` | V4 브라우저 회귀 결과 갱신 |
| `qa/screenshots/*.png` | 최종 시각 검증 갱신 |

## 유지 파일/기능

- AI Insights / Analytics Hub: Coming Soon 유지
- Report/Tutorial HTML: 새 탭 `target="_blank"`, `rel="noopener noreferrer"`
- Raw Excel: URL 등록 시 `download` 유지
- 미래 private Blob 구조:
  - `api/config/report-resources.json`
  - `api/src/functions/reportResource.js`
  - `api/src/authorization/policy.js`
  - `api/config/permissions/*.permissions.json`

## Dashboard 무변경 범위

다음은 원본과 SHA-256/바이트 동일하다.

- `app/app.js`
- `app/styles.css`
- `app/registry.json`
- 17개 `app/assets/tiles/*`
- 기존 Dashboard registry/API/auth/static web app 설정

## 제외 항목

- `api/node_modules/`
- `api/local.settings.json`
- `.git/`
- `.env`
