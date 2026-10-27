# Microsoft Entra ID 권한 확장 구조

## 현재 적용 범위

- 기존 `app/staticwebapp.config.json`은 원본 그대로 유지한다. 포털 및 `/api/*`는 기존과 같이 `authenticated` 역할을 요구한다.
- KAM/GTM 탭과 리포트의 UI 권한 메타데이터는 Dashboard와 분리된 `app/modules/report-hub/bop-report-hub.registry.json`에 있다.
- 브라우저 표시 제어는 보안 경계가 아니다. 향후 Report HTML, Raw Excel 또는 데이터 API를 연결할 때 API에서 동일한 정책을 반드시 다시 검사해야 한다.

## 권한 관련 파일 배치

| 위치 | 역할 | Dashboard 영향 |
|---|---|---|
| `app/staticwebapp.config.json` | 기존 포털/`/api/*` 인증 경계 | 원본과 바이트 동일 |
| `app/modules/report-hub/bop-report-hub.registry.json` | KAM/GTM 탭 및 리포트별 `authorization.policyId`, UI 역할 메타데이터 | 독립 모듈 전용 |
| `api/config/permissions/tabs.permissions.json` | 서버 측 탭 정책 기준 파일 | 기존 API에서 미참조 |
| `api/config/permissions/reports.permissions.json` | 서버 측 리포트 정책 기준 파일 | 기존 API에서 미참조 |
| `api/src/authorization/policy.js` | 역할/사용자 정책 평가기. 없는 정책은 거부 | 신규 API 연결 시 사용 |

## Entra ID 그룹 기반 확장

1. Entra 애플리케이션에 앱 역할을 만든다. 예: `portal-kam-reader`, `portal-gtm-reader`, `portal-kam-bsr-traffic-reader`.
2. Entra 보안 그룹을 앱 역할에 할당한다.
3. 역할이 `clientPrincipal.userRoles`에 전달되도록 Static Web Apps 역할 매핑을 구성한다.
4. Report Hub 레지스트리의 `allowedRoles`와 `api/config/permissions`의 동일 `policyId` 정책을 함께 갱신한다.
5. 향후 파일 프록시/API에서 `principalFrom(request)`와 `assertAccess(principal, scope, policyId)`를 사용한다.
6. Blob/Excel은 익명 공개하지 않고 Managed Identity 또는 짧은 수명의 SAS를 서버에서 반환한다.

## 새 리포트 추가

1. `app/modules/report-hub/bop-report-hub.registry.json`의 `reports` 배열에 객체 하나를 추가한다. 객체 하나가 화면의 한 행이다.
2. `tabId`, `order`, 세 링크, Raw Excel 후보 파일명, 고유 `authorization.policyId`를 지정한다.
3. 미확정 링크는 `null`로 유지한다. 모듈이 버튼을 비활성화한다.
4. `api/config/permissions/reports.permissions.json`에 같은 정책 ID를 추가한다.
5. 서버/API 연결 시 해당 정책을 통과한 사용자에게만 실제 파일이나 URL을 반환한다.

## 현재 KAM BSR 설정

- Tutorial HTML만 확정 URL로 활성화했다.
- Report HTML 및 Raw Excel URL은 `null`이다.
- Raw Excel 후보 파일명은 `LG AV NOVEMBER 2026 20-10-26.xlsx`이다.
- 데이터/API 연결은 다음 단계로 남겨 두었다.
