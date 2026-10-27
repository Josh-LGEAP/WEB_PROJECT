# 원본 Dashboard 링크 관리 방식 조사

조사 기준: OneDrive의 `portal_v1_source.zip` 원본. Dashboard 관련 구현 파일은 조사만 했으며 최종본에서 변경하지 않았다.

## 결론: 혼합 방식

현재 Dashboard 링크는 **런타임 API 레지스트리를 우선 사용하고, 실패 시 프런트엔드 하드코딩 목록으로 폴백하는 혼합 방식**이다.

- 정상 런타임 우선순위: SharePoint List 또는 OneDrive/SharePoint Excel Table → Microsoft Graph → `/api/registry` → 브라우저
- API가 실패하거나 비어 있는 경우: `app/app.js`의 하드코딩 상수 `EMBEDDED`
- Azure Blob JSON/CSV는 Dashboard 링크 레지스트리로 사용되지 않는다.
- `app/registry.json` 스냅샷은 존재하지만 현재 `app/app.js`는 이 파일을 fetch하지 않는다.

## 프런트엔드 하드코딩 폴백

### 파일과 변수

- 파일: `app/app.js`
- 변수: `const EMBEDDED = [...]`
- 실제 항목 수: 17
- 각 항목의 주요 필드: `order`, `name`, `category`, `description`, `url`, `image`, `owner`, `workspaceId`, `datasetId`, `visible`, `archived`
- `url` 17개는 모두 `https://app.powerbi.com/...` 링크다.

### 호출 흐름

1. `main()`이 `loadRegistry()`와 `/api/refreshes`를 병렬 호출한다.
2. `loadRegistry()`는 먼저 `fetch('/api/registry')`를 수행한다.
3. HTTP 응답이 성공하고 `live.dashboards.length > 0`이면 API 응답을 사용하며 `live: true`를 반환한다.
4. API 호출 실패, 비정상 응답 또는 빈 목록이면 `{ dashboards: EMBEDDED }`를 반환한다.
5. `render(reg.dashboards, ref?.items || {})`가 카테고리별 타일을 만든다.
6. `tile(d, refresh)`가 `<a class="tile" href="${d.url}">`을 생성하고, `d.image`를 `assets/tiles/<파일명>`에서 읽는다.
7. `setInterval(main, 5 * 60 * 1000)`으로 동일 흐름을 5분마다 반복한다.

`/api/refreshes`는 `datasetId`별 상태 표시를 위한 별도 호출이며 Dashboard URL의 출처가 아니다.

## 런타임 API 레지스트리

### HTTP 함수

- 파일: `api/src/functions/registry.js`
- Azure Functions 이름: `registry`
- 경로: 기본 규칙상 `/api/registry`
- 인증: `principalFrom(request)`가 없으면 401
- 호출: `getRegistry({ force: request.query.get('refresh') === '1' })`
- 응답: `generatedAt`, `count`, `dashboards`

### 레지스트리 로더

- 파일: `api/src/registry.js`
- 핵심 함수: `getRegistry()`, `fromSharePoint()`, `fromExcel()`, `normalise()`
- 캐시: `TTL_MS = 5 * 60 * 1000`, 프로세스 메모리의 `cache`

소스 선택식은 다음과 같다.

```js
process.env.REGISTRY_SOURCE === 'excel'
  ? await fromExcel()
  : await fromSharePoint()
```

즉, `REGISTRY_SOURCE`가 정확히 `excel`일 때만 Excel을 사용하고, 그 외에는 SharePoint List가 기본이다.

### SharePoint List 경로

`fromSharePoint()`는 Microsoft Graph의 다음 경로를 호출한다.

```text
/sites/{SP_SITE_ID}/lists/{SP_LIST_ID}/items?expand=fields&$top=200
```

주요 필드 매핑:

| SharePoint 필드 | Dashboard 필드 |
|---|---|
| `Order0` | `order` |
| `Title` | `name` |
| `Category` | `category` |
| `Description` | `description` |
| `PowerBILink` | `url` |
| `TileImage` | `image` |
| `Owner`/`OwnerLookupId` | `owner` |
| `WorkspaceId` | `workspaceId` |
| `DatasetId` | `datasetId` |
| `ShowonPage` | `visible` |
| `Archived` | `archived` |

### Excel Table 경로

`fromExcel()`은 Microsoft Graph에서 다음 리소스를 사용한다.

```text
/drives/{GRAPH_DRIVE_ID}/items/{GRAPH_ITEM_ID}/workbook/tables/{REGISTRY_TABLE_NAME}
```

호출:

- `/columns?$select=name`
- `/rows?$select=values&$top=500`

주요 Excel 열: `Order`, `Dashboard Name`, `Category`, `Description`, `Power BI Link (URL)`, `Tile Image File Name`, `Owner`, `Workspace Id`, `Dataset Id`, `Show on Page`, `Archived`.

### 환경 변수

- 파일: `api/local.settings.json.example`
- 기본 예시: `REGISTRY_SOURCE = sharepoint`
- SharePoint: `SP_SITE_ID`, `SP_LIST_ID`
- Excel: `GRAPH_DRIVE_ID`, `GRAPH_ITEM_ID`, `REGISTRY_TABLE_NAME` (`DashboardRegistry`)
- Graph 인증: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` 또는 Managed Identity/`DefaultAzureCredential`
- Graph scope: `GRAPH_SCOPE`, 기본 `https://graph.microsoft.com/.default`

`api/local.settings.json` 실제 파일은 최종 패키지에서 제외한다.

### 정규화 및 필터

`normalise()`가 문자열/Boolean/순서를 정규화한 뒤 `getRegistry()`가 다음 조건을 적용한다.

- `visible`이 true
- `archived`가 false
- `name`이 비어 있지 않음
- `url`이 `https://app.powerbi.com/`으로 시작함
- `order`, 다음 `name` 순으로 정렬

## `app/registry.json`의 실제 역할

- 파일은 `source: "snapshot"`으로 존재한다.
- `dashboards` 배열은 `app/app.js`의 `EMBEDDED` 17개 항목과 완전히 동일하다.
- 메타데이터 `count`는 15이지만 실제 배열은 17개다.
- 현재 `app/app.js`에는 `fetch('registry.json')` 호출이 없다.
- 따라서 현재 실행 경로에서는 링크 소스로 사용되지 않는 비활성 스냅샷/참조 파일이다. 주석의 설명과 실제 구현이 다르지만, Dashboard 보존 요구에 따라 수정하지 않았다.

## Azure Blob 사용 여부

Azure Blob 사용 코드는 있으나 Dashboard 링크와 무관하다.

- 파일: `api/src/functions/analytics.js`
- 용도: Analytics Hub용 CSV(`store_sellout_au.csv`) 다운로드·집계
- 관련 변수: `ANALYTICS_STORAGE_ACCOUNT`, `ANALYTICS_CONTAINER`, `ANALYTICS_BLOB_NAME`

따라서 **Dashboard URL 레지스트리는 Blob JSON/CSV를 읽지 않는다**.

## 최종본의 보존 및 KAM/GTM 분리

다음 기존 Dashboard 파일은 원본과 SHA-256이 동일하다.

- `app/app.js`
- `app/styles.css`
- `app/registry.json`
- `api/src/registry.js`
- `api/src/functions/registry.js`
- `api/src/auth.js`
- `app/staticwebapp.config.json`
- 루트 `staticwebapp.config.json`
- 17개 Dashboard 타일 이미지 전체

KAM/GTM은 별도 `app/modules/report-hub/` 모듈과 `bop-report-hub.registry.json`을 사용한다. 이 레지스트리는 기존 `/api/registry`, `EMBEDDED`, `app/registry.json`, SharePoint/Excel Dashboard 레지스트리 흐름을 읽거나 수정하지 않는다.
