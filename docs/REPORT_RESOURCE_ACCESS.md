# KAM BSR 리소스 접근 진단 및 안전 설계

## Tutorial HTML 권한 문제의 코드상 원인

이전 공개 레지스트리 `app/modules/report-hub/bop-report-hub.registry.json`의 `links.tutorialHtml`은 다음 Blob URL을 직접 가리켰다.

```text
https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html
```

`bop-report-hub.js`는 이 값을 그대로 `<a href>`로 만들었다. 링크에는 SAS가 없고 브라우저는 Blob에 Azure Authorization 헤더를 붙이지 않으므로 요청은 익명 요청이다. Storage account/container에서 anonymous read를 허용하지 않으면 접근이 거부된다. 이번 패키지는 Azure의 현재 임시 Public Access 설정 자체를 변경하지 않으며, 직접 public HTTPS URL과 안전한 Function+단기 SAS URL을 모두 처리한다.

실행 환경의 URL 정책 때문에 여기서 Blob의 실제 HTTP 오류 본문을 직접 재현할 수는 없었지만, 코드상 요청 방식이 anonymous인 것은 확정적이다. Microsoft의 `PublicAccessNotPermitted` 설명도 anonymous 요청과 public access 비허용 조합을 원인으로 규정하고 Entra ID 또는 SAS를 권장한다.

## 반영한 안전 접근 흐름

```text
사용자
  → /api/report-resource?reportId=kam-bsr-traffic-light&resource=tutorialHtml
  → Static Web Apps의 authenticated 경계
  → x-ms-client-principal 확인
  → reports.permissions.json의 report 정책 검사
  → api/config/report-resources.json의 allowlist 조회
  → Function Managed Identity로 user delegation key 발급
  → HTTPS/read-only/5분/단일 Blob SAS 생성
  → 302 redirect
  → private Blob 접근
```

### 관련 파일

| 파일 | 역할 |
|---|---|
| `app/modules/report-hub/bop-report-hub.registry.json` | Tutorial 버튼을 직접 Blob URL이 아닌 same-origin API URL로 연결 |
| `api/config/report-resources.json` | 서버 전용 report/resource→account/container/blob allowlist |
| `api/config/permissions/reports.permissions.json` | 리포트별 서버 권한 정책 |
| `api/src/authorization/policy.js` | 역할·사용자·신뢰된 group claim 검사 |
| `api/src/report-resources.js` | 식별자 검증 및 서버 리소스 설정 조회 |
| `api/src/functions/reportResource.js` | 인증/정책 검사 후 user delegation SAS 생성 및 redirect |

브라우저는 account/container/blobName을 선택해서 보낼 수 없다. `reportId`와 `resource`는 서버 allowlist에 정확히 등록된 조합만 허용되며, 미등록 요청은 404로 실패한다.

## 필수 Azure 설정

1. API가 실제 배포되는 Function App 또는 Static Web Apps managed API의 System Assigned Managed Identity를 활성화한다.
2. Storage account `lgeapbop` 범위에서 해당 identity에 **Storage Blob Delegator**를 부여한다.
3. `bi-portal` container 범위에서 해당 identity에 **Storage Blob Data Reader**를 부여한다.
4. 네트워크 제한이 있으면 Function outbound가 Storage firewall/private endpoint에 도달하도록 구성한다.
5. API 배포 후 인증된 사용자가 endpoint를 호출했을 때 302와 짧은 SAS가 반환되는지 확인한다.
6. SAS는 HTTPS, read-only, 5분, 정확히 하나의 Blob으로 제한되어 있다.

`deploy-production.yml`의 별도 API 배포 job은 현재 `if: false`이므로, 운영 Function App 배포 방식이 따로 없다면 이 job을 환경·OIDC·`FUNCTION_APP_NAME` 설정 후 명시적으로 활성화해야 한다. 필요한 Azure 값이 확인되지 않은 상태에서 자동 활성화하지 않았다.

## HTML 파일 조건

현재 방식은 HTML 파일 하나에 필요한 자산이 내장된 self-contained 문서에 가장 안전하고 단순하다. HTML이 상대 경로의 영상·CSS·JS 파일을 참조한다면 해당 파일에는 HTML Blob의 SAS가 자동 전달되지 않는다. 그 경우에는 다음 중 하나를 선택해야 한다.

- 튜토리얼을 self-contained HTML로 다시 생성한다.
- 모든 자산을 개별 resource로 서버 allowlist에 등록하고 HTML 링크를 API URL로 재작성한다.
- 인증된 Static Web Apps 콘텐츠로 튜토리얼을 배포한다.

현재 임시 Public Access 범위를 코드가 확대하지 않으며 장기 SAS를 레지스트리에 저장하지 않는다. Function+단기 SAS 전환이 운영 검증된 뒤에는 별도 승인 절차로 Public Access를 축소할 수 있다.

## 새 탭 렌더링과 Blob HTTP 헤더

Report Hub는 Report HTML 및 Tutorial HTML을 `target="_blank"`와 `rel="noopener noreferrer"`로 연다. 이 동작은 다음 두 형태를 모두 지원한다.

- 임시 direct public HTTPS Blob URL
- 권장 same-origin `/api/report-resource` → Function → short-lived SAS

브라우저가 HTML을 렌더링하려면 Blob의 `Content-Type`이 `text/html`이어야 한다. `Content-Disposition`이 `attachment`이면 브라우저는 다운로드할 수 있으므로 값을 제거하거나 `inline`으로 설정한다. Function SAS 설정도 HTML 리소스에 `contentType: text/html; charset=utf-8`, `contentDisposition: inline`을 override한다.

Azure Portal과 Storage Explorer의 구체적인 헤더 변경 절차는 `docs/AUTHORIZATION.md`의 "HTML은 다운로드가 아니라 새 탭에서 렌더링" 절을 따른다.

Raw Excel은 HTML preview 로직을 사용하지 않는다. 프런트엔드는 `download` 속성을 사용하고, 향후 server resource를 추가할 때는 `Content-Disposition: attachment`를 설정한다.

## Report HTML이 비활성인 정확한 이유

실제 레지스트리를 확인한 결과:

```json
"links": {
  "reportHtml": null,
  "tutorialHtml": "/api/report-resource?reportId=kam-bsr-traffic-light&resource=tutorialHtml",
  "rawExcel": null
}
```

`bop-report-hub.js`의 `createAction()`은 URL이 falsy/null이면 `<button disabled>`를 생성한다. 또한 서버 allowlist `api/config/report-resources.json`에도 `reportHtml` 리소스가 없다. 따라서 Report HTML은 권한 오류나 렌더링 오류가 아니라 **확정 URL/서버 리소스가 등록되지 않았기 때문에 의도적으로 비활성**이다.

활성화하려면 추측한 URL을 넣지 말고 다음 두 곳을 동시에 갱신해야 한다.

1. `app/modules/report-hub/bop-report-hub.registry.json`의 `links.reportHtml`을 `/api/report-resource?reportId=...&resource=reportHtml`로 설정
2. `api/config/report-resources.json`에 실제 account/container/blobName과 동일 report policy를 등록
