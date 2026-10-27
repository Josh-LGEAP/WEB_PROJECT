# KAM BSR 링크 원인 및 접근 설계

## v3 오류의 정확한 원인

v3의 실제 공개 registry는 Tutorial 버튼을 Blob으로 직접 연결하지 않고 다음 API로 연결했다.

```json
"tutorialHtml": "/api/report-resource?reportId=kam-bsr-traffic-light&resource=tutorialHtml"
```

`api/src/functions/reportResource.js`는 로그인 및 `report.kam-bsr-traffic-light.read` 정책을 확인한 뒤 `DefaultAzureCredential`로 user-delegation SAS를 생성했다. SAS 생성 과정에서 Function Managed Identity/자격 증명과 Blob RBAC가 준비되지 않으면 catch 블록이 HTTP 502와 다음 JSON을 반환하도록 구현되어 있었다.

```json
{
  "error": "Report resource is unavailable",
  "detail": "Verify the Function managed identity and Blob RBAC assignments."
}
```

따라서 표시된 오류는 HTML의 Content-Type 문제가 아니라 **버튼이 Function 프록시를 사용했고, Function이 SAS를 만들 수 없는 상태였기 때문**이다.

## V4에서 적용한 현재 임시 방식

사용자가 `bi-portal`의 Blob-level public access를 임시 허용하고 Tutorial Blob을 `Content-Type=text/html`, `Content-Disposition=inline`으로 설정했으므로 Tutorial registry를 정확한 공개 Blob URL로 되돌렸다.

```json
"tutorialHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html"
```

현재 Tutorial 클릭 흐름:

```text
Tutorial HTML 버튼
 → target=_blank + rel=noopener noreferrer
 → 공개 Blob URL 직접 GET
 → Content-Type=text/html / Content-Disposition=inline
 → 새 탭 렌더링
```

`/api/report-resource`를 호출하지 않으므로 v3의 Managed Identity/RBAC 502 오류 경로를 사용하지 않는다.

> 공개 Blob URL은 URL을 아는 사용자가 Portal 인증 없이 접근할 수 있다. 현재 `authorization`은 Portal UI 표시만 제어하며 공개 Blob 자체의 보안 경계가 아니다.

## Report HTML 활성 및 Raw Excel 비활성의 정확한 이유

파일: `app/modules/report-hub/bop-report-hub.registry.json`

현재 실제 값:

```json
"links": {
  "reportHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR Traffic Light Report.html",
  "tutorialHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html",
  "rawExcel": null
}
```

사용자가 제공한 Report HTML 전체 URL이 registry에 반영되어 Report HTML 버튼은 활성화된다. Report와 Tutorial은 공개 Blob을 Function 프록시 없이 직접 새 탭에서 연다.

`app/modules/report-hub/bop-report-hub.js`의 `createAction()`은 URL이 `null`/빈 값이거나 안전한 URL로 해석되지 않으면 `<button disabled>`를 만든다. Raw Excel만 **전체 URL이 registry에 없기 때문에 의도적으로 회색 비활성**이다. 권한 실패가 아니다.

파일명 후보 `LG AV NOVEMBER 2026 20-10-26.xlsx`는 `rawExcel.fileNameCandidate` 메타데이터일 뿐 URL이 아니다. 이 파일명으로 Blob 경로를 임의 조합하지 않았다.

## 전체 URL 입력 위치

파일:

```text
app/modules/report-hub/bop-report-hub.registry.json
```

대상 객체:

```text
reports 배열에서 id = "kam-bsr-traffic-light"
```

정확한 JSON 경로와 필드:

| 리소스 | JSON 경로 | 현재 값 |
|---|---|---|
| Report HTML | `$.reports[?(@.id=="kam-bsr-traffic-light")].links.reportHtml` | 사용자가 제공한 공개 Blob 전체 URL |
| Tutorial HTML | `$.reports[?(@.id=="kam-bsr-traffic-light")].links.tutorialHtml` | 공개 Blob 전체 URL |
| Raw Excel | `$.reports[?(@.id=="kam-bsr-traffic-light")].links.rawExcel` | `null` |
| Excel 후보명 | `$.reports[?(@.id=="kam-bsr-traffic-light")].rawExcel.fileNameCandidate` | 메타데이터만 |

확정된 전체 URL을 그대로 입력한다.

```json
"links": {
  "reportHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR Traffic Light Report.html",
  "tutorialHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html",
  "rawExcel": "https://<확정된-전체-Raw-Excel-URL>"
}
```

- Report/Tutorial HTML: 새 탭, `noopener noreferrer`
- Raw Excel: `download` 속성 유지
- 미확정 URL: `null` 유지

## 장기 비공개 Blob 전환

V3에서 만든 Function+단기 SAS 코드는 미래 전환용으로 유지한다.

- 리소스 allowlist: `api/config/report-resources.json`
- Function: `api/src/functions/reportResource.js`
- 서버 권한: `api/config/permissions/reports.permissions.json`
- 정책 평가: `api/src/authorization/policy.js`

전환 시 registry의 해당 링크를 다음 형식으로 바꾼다.

```text
/api/report-resource?reportId=kam-bsr-traffic-light&resource=tutorialHtml
```

### Function Managed Identity RBAC 위치

Azure Portal:

1. Function App 또는 실제 API 호스트 → **Identity** → System assigned → On
2. Storage account `lgeapbop` 또는 `bi-portal` container → **Access control (IAM)** → Add role assignment
3. 최소 Blob 읽기 권한: **Storage Blob Data Reader**
4. 대상 멤버: Managed identity → 해당 Function App/API identity
5. User-delegation SAS 생성도 사용할 경우 Storage account 범위에 **Storage Blob Delegator** 추가
6. 네트워크 제한 시 Function outbound가 Storage endpoint/private endpoint에 도달 가능한지 확인

Microsoft는 Blob 데이터 접근 역할을 Storage account 또는 container 범위에서 할당할 수 있도록 안내한다. 최소 권한 원칙상 읽기 권한은 `bi-portal` container 범위를 우선한다.<cite>turn1search195</cite>

전환 완료 후 Tutorial/Report 링크를 API URL로 바꾸고 public access를 별도 변경 승인으로 제거한다.
