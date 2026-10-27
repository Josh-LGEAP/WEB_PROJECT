# Microsoft Entra ID / Azure Static Web Apps 권한 관리

## 현재 권한 계층

권한은 다음 3개 층으로 분리한다.

1. **Static Web Apps route 경계** — 인증되지 않은 요청 차단
2. **프런트엔드 표시 정책** — 허용되지 않은 탭/리포트를 UI에서 숨김
3. **API 서버 정책** — URL을 직접 호출해도 리포트 리소스를 반환하지 않음

프런트엔드 숨김만으로 보안을 구현하지 않는다.

## 정확한 파일 위치

| 파일 | 관리 대상 | 보안 역할 |
|---|---|---|
| `app/staticwebapp.config.json` | `/.auth/login/aad`, `/api/*`, `/*` route의 `allowedRoles` | 1차 인증 경계. 현재 모두 `authenticated` |
| `app/modules/report-hub/bop-report-hub.registry.json` | KAM/GTM 탭 및 리포트의 `allowedRoles`, `allowedUsers`, `entraGroupObjectIds` | UI 표시 정책 |
| `api/config/permissions/tabs.permissions.json` | 탭별 서버 정책 원본 | 향후 탭 API에서 사용 |
| `api/config/permissions/reports.permissions.json` | 리포트별 서버 정책 원본 | `reportResource`가 현재 사용 |
| `api/config/report-resources.json` | 리포트 ID, 리소스, policyId, 실제 Blob allowlist | 서버 전용 리소스 매핑 |
| `api/src/authorization/policy.js` | role/user/trusted group claim 평가 | fail-closed 서버 검사 |
| `api/src/functions/reportResource.js` | principal 확인→report policy 확인→짧은 SAS 발급 | 실제 리소스 보안 경계 |

## 현재 기본 정책

현재 `tab.kam.read`, `tab.gtm.read`, `report.kam-bsr-traffic-light.read`는 `allowedRoles: ["authenticated"]`이므로 로그인한 사용자는 모두 허용된다. 제한하려면 별도 custom role을 사용해야 한다.

예시 역할:

- `portal-kam-reader`
- `portal-gtm-reader`
- `portal-kam-bsr-traffic-reader`

## 개별 사용자 추가 절차

### 방법 A — Static Web Apps custom role 권장

1. Azure Portal → 해당 Static Web App → **Role management**로 이동한다.
2. 사용자를 초대하고 identity provider를 Microsoft Entra ID로 선택한다.
3. 예: `portal-kam-bsr-traffic-reader` 역할을 부여한다.
4. `app/modules/report-hub/bop-report-hub.registry.json`에서 해당 report의 `allowedRoles`를 같은 역할명으로 바꾼다.
5. `api/config/permissions/reports.permissions.json`의 동일 `policyId`에도 같은 역할명을 넣는다.
6. 로그아웃/재로그인 후 `/.auth/me`의 `userRoles`에 역할이 보이는지 확인한다.
7. UI 표시뿐 아니라 `/api/report-resource?...` 직접 호출이 302(허용) 또는 403(거부)인지 검증한다.

### 방법 B — `allowedUsers`

사용자 이메일/UPN을 다음 두 파일에 동일하게 추가할 수 있다.

- UI: `app/modules/report-hub/bop-report-hub.registry.json`
- 서버: `api/config/permissions/reports.permissions.json` 또는 `tabs.permissions.json`

`allowedUsers`만 서버 파일에 넣으면 UI와 서버가 불일치할 수 있으므로 두 곳을 함께 관리한다. 이메일/UPN 변경 가능성을 고려하면 운영 규모가 커질수록 role 방식이 낫다.

## Entra 그룹 추가 절차

그룹 Object ID를 JSON의 `entraGroupObjectIds`에 적는 것만으로는 Static Web Apps custom role이 자동 생성되지 않는다.

### 권장: 그룹→SWA custom role 매핑

1. Static Web Apps Standard plan과 custom Microsoft Entra authentication을 준비한다.
2. `app/staticwebapp.config.json`의 `auth.rolesSource`에 역할 할당 Function 경로를 구성한다.
3. 역할 Function이 로그인 사용자의 Entra group membership을 Microsoft Graph로 확인한다.
4. 그룹 Object ID별로 `portal-kam-reader` 같은 custom role을 반환한다.
5. 그 역할명을 프런트엔드 registry와 서버 permission JSON의 `allowedRoles`에 동일하게 넣는다.
6. 역할 Function에는 필요한 최소 Graph 권한과 admin consent를 구성한다.

Microsoft의 group-based role function 방식은 preview이고 Standard plan이 필요하므로, Dashboard 인증 경계를 임의로 바꾸지 않기 위해 이번 ZIP에서 `rolesSource`를 자동 활성화하지 않았다.

### Trusted group claim 직접 검사

`api/src/authorization/policy.js`는 custom authentication이 신뢰된 principal의 `claims`에 `groups`/`groupsid`를 실제로 전달하는 경우 `entraGroupObjectIds`를 서버에서 검사할 수 있다. 그러나 기본 `/.auth/me`/`x-ms-client-principal`에 그룹 claim이 항상 제공된다고 가정해서는 안 된다. 따라서 운영 권장 방식은 group을 custom role로 매핑하는 것이다.

## 정책 변경 예시

KAM BSR을 특정 역할만 허용하려면 두 파일을 동일하게 변경한다.

```json
"authorization": {
  "policyId": "report.kam-bsr-traffic-light.read",
  "allowedRoles": ["portal-kam-bsr-traffic-reader"],
  "allowedUsers": [],
  "entraGroupObjectIds": []
}
```

```json
"report.kam-bsr-traffic-light.read": {
  "allowedRoles": ["portal-kam-bsr-traffic-reader"],
  "allowedUsers": [],
  "entraGroupObjectIds": []
}
```

SWA Role management 또는 `rolesSource`가 그 역할을 실제 사용자에게 부여하지 않으면 서버는 403을 반환한다.

## 운영 검증 체크리스트

- 비로그인 `/api/report-resource` → 401
- 로그인했지만 정책 미허용 → 403
- 미등록 report/resource → 404
- 허용 사용자 → 302 및 5분 read-only SAS
- SAS 만료 후 기존 URL → 접근 실패
- public registry에 Storage SAS/account key가 없음
- 현재 임시 Blob public access 설정은 이 패키지가 변경하지 않음; Function+SAS 전환 완료 후 별도 변경 승인으로 축소 가능

## HTML은 다운로드가 아니라 새 탭에서 렌더링

프런트엔드는 Report HTML과 Tutorial HTML 링크에 다음 속성을 적용한다.

```html
target="_blank" rel="noopener noreferrer"
```

Raw Excel에는 `download` 동작을 적용하고 새 HTML 탭으로 열지 않는다. 다만 브라우저가 HTML을 화면에 표시할지 파일로 다운로드할지는 링크 속성만이 아니라 Blob의 HTTP 헤더에도 달려 있다.

모든 Report/Tutorial HTML Blob은 다음과 같이 설정한다.

- `Content-Type`: `text/html` 또는 `text/html; charset=utf-8`
- `Content-Disposition`: 비워 두거나 `inline`
- `Content-Disposition: attachment`이면 제거하거나 `inline`으로 변경

### Azure Portal 절차

1. Azure Portal → Storage accounts → `lgeapbop`로 이동한다.
2. Data storage → Containers → `bi-portal`을 연다.
3. 대상 Report/Tutorial `.html` Blob을 선택한다.
4. Properties 또는 Edit properties에서 HTTP headers를 편집한다.
5. `Content-Type`을 `text/html`로 설정한다.
6. `Content-Disposition`이 `attachment`이면 지우거나 `inline`으로 설정한다.
7. 저장한 뒤 새 브라우저 탭에서 렌더링되는지 확인한다.

### Azure Storage Explorer 절차

1. Storage Explorer에서 Storage account → Blob Containers → `bi-portal`을 연다.
2. 대상 `.html` Blob을 우클릭하고 Properties를 선택한다.
3. HTTP Headers에서 Content Type을 `text/html`로 설정한다.
4. Content Disposition을 비우거나 `inline`으로 설정한다.
5. 저장하고 브라우저 캐시를 피하기 위해 새 탭/시크릿 창에서 다시 확인한다.

### 두 접근 방식 모두 적용

- **현재 임시 Public Access URL:** registry에 직접 HTTPS Blob URL이 있으면 새 탭으로 열리며, 위 Blob 헤더가 렌더링 여부를 결정한다.
- **향후/권장 Function + 단기 SAS:** `/api/report-resource`가 5분 read-only SAS를 생성하면서 `contentType=text/html`과 `contentDisposition=inline` 응답 override를 포함한다. 원본 Blob 헤더도 위 기준으로 맞춰 두는 것을 권장한다.

Raw Excel Blob은 반대로 `Content-Disposition: attachment; filename="...xlsx"`와 올바른 Excel MIME type을 사용해야 다운로드 동작이 일관적이다.
