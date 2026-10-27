# Entra ID·Static Web Apps·Blob 권한 관리

## 현재 V4 권한 상태

- Portal과 `/api/*`: `app/staticwebapp.config.json`의 `allowedRoles: ["authenticated"]`
- KAM/GTM UI 표시: `app/modules/report-hub/bop-report-hub.registry.json`
- 서버 리포트 정책: `api/config/permissions/reports.permissions.json`
- 현재 Tutorial: 공개 Blob 직접 URL이므로 Function 서버 정책을 거치지 않음

따라서 현재 Tutorial에 대한 `authorization`은 **Portal UI 표시 제어**이고 공개 Blob 자체의 접근 통제는 아니다. 비공개 전환 시 `/api/report-resource`를 사용해야 서버 검증이 적용된다.

## 사용자·역할 추가 위치

### UI 정책

```text
app/modules/report-hub/bop-report-hub.registry.json
```

탭별:

```text
$.tabs[?(@.id=="kam")].authorization
$.tabs[?(@.id=="gtm")].authorization
```

리포트별:

```text
$.reports[?(@.id=="kam-bsr-traffic-light")].authorization
```

지원 필드:

- `allowedRoles`
- `allowedUsers`
- `entraGroupObjectIds`
- `policyId`

### 서버 정책

```text
api/config/permissions/tabs.permissions.json
api/config/permissions/reports.permissions.json
```

KAM BSR 서버 정책 ID:

```text
report.kam-bsr-traffic-light.read
```

프런트엔드와 서버의 `policyId` 및 역할/사용자 설정을 함께 변경한다.

## Azure Static Web Apps 역할 부여

개별 사용자 방식:

1. Azure Portal → 해당 Static Web App → **Role management**
2. Microsoft Entra ID 사용자를 초대
3. `portal-kam-reader`, `portal-gtm-reader`, `portal-kam-bsr-traffic-reader` 같은 custom role 부여
4. 같은 역할명을 UI registry와 서버 permissions JSON의 `allowedRoles`에 입력
5. 재로그인 후 `/.auth/me`의 `userRoles` 확인

기본 로그인 사용자는 `authenticated` 역할을 받는다. custom role은 SWA 역할 관리 또는 역할 할당 Function을 통해 부여해야 한다.<cite>turn1search207</cite>

## Entra 그룹 권한

그룹 Object ID를 JSON에 입력하는 것만으로 Static Web Apps custom role이 자동 부여되지는 않는다.

권장 절차:

1. Static Web Apps Standard plan 및 custom Entra authentication 준비
2. `app/staticwebapp.config.json`의 `auth.rolesSource`에 역할 Function 경로 설정
3. 역할 Function이 Microsoft Graph에서 그룹 membership 조회
4. 그룹 Object ID를 `portal-kam-reader` 같은 custom role로 매핑
5. 반환되는 역할명을 UI `allowedRoles`와 서버 permission JSON에 입력
6. 로그아웃/재로그인 후 `userRoles` 확인

Microsoft의 공식 예제는 `rolesSource` Function이 Graph에서 그룹 membership을 조회해 custom roles를 반환하는 구조다.<cite>turn1search205</cite>

현재 `api/src/authorization/policy.js`는 신뢰된 principal에 실제 group claim이 포함된 경우 `entraGroupObjectIds`도 검사하지만, 기본 SWA principal에 그룹 claim이 항상 존재한다고 가정해서는 안 된다. 운영 권장은 그룹→custom role 매핑이다.

## 장기 비공개 Blob의 RBAC 위치

1. Function App/API 호스트 → **Identity** → System assigned 활성화
2. Storage account `lgeapbop` → Containers → `bi-portal` 또는 Storage account → **Access control (IAM)**
3. **Storage Blob Data Reader**를 Function Managed Identity에 할당
4. user-delegation SAS 생성 시 Storage account 범위에 **Storage Blob Delegator**도 할당
5. `api/config/report-resources.json`에서 정확한 Blob allowlist 유지
6. `app/modules/report-hub/bop-report-hub.registry.json`의 URL을 `/api/report-resource?...`로 전환
7. 전환 검증 뒤 public access 제거

Blob 데이터 역할은 Storage account 또는 container 범위로 할당할 수 있다.<cite>turn1search195</cite>

## HTML 및 Excel Blob 헤더

Report/Tutorial HTML을 새 탭에서 렌더링하려면:

- `Content-Type`: `text/html` 또는 `text/html; charset=utf-8`
- `Content-Disposition`: 비어 있음 또는 `inline`
- `attachment`이면 제거 또는 `inline`으로 변경

Azure Portal:

1. Storage accounts → `lgeapbop`
2. Containers → `bi-portal`
3. 대상 `.html` Blob → Properties/Edit properties
4. HTTP headers 수정 후 저장

Storage Explorer:

1. Blob Containers → `bi-portal`
2. 대상 `.html` 우클릭 → Properties
3. Content Type/Content Disposition 수정 후 저장

Raw Excel은 다운로드용이므로 올바른 Excel MIME type과 `Content-Disposition: attachment; filename="...xlsx"` 사용을 권장한다.
