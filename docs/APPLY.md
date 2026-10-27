# V4 적용 방법

## 덮어쓰기

```powershell
Copy-Item C:\portal_v1 C:\portal_v1_backup_20261027 -Recurse
Expand-Archive -Path .\portal_v1_merged_final_v4.zip -DestinationPath C:\portal_v1 -Force
```

기존 잔여 제외 파일 정리:

```powershell
Remove-Item C:\portal_v1\api\node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item C:\portal_v1\api\local.settings.json -Force -ErrorAction SilentlyContinue
Remove-Item C:\portal_v1\.git -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem C:\portal_v1 -Recurse -Force -Filter .env | Remove-Item -Force
```

## 설치·테스트

```powershell
Set-Location C:\portal_v1\api
npm ci
npm test
```

## 현재 링크 확인

파일:

```text
C:\portal_v1\app\modules\report-hub\bop-report-hub.registry.json
```

`kam-bsr-traffic-light`의 현재 상태:

- `links.tutorialHtml`: 확정된 공개 Blob 전체 URL
- `links.reportHtml`: 사용자가 제공한 공개 Blob 전체 URL
- `links.rawExcel`: `null`

Report HTML과 Tutorial HTML은 활성화되어 공개 Blob을 새 탭에서 직접 연다. Raw Excel은 전체 URL이 확정되기 전까지 회색 disabled가 정상이다. 파일명 후보만으로 URL을 만들지 않는다.

## 배포 후 확인

1. 초기 화면이 기존 Dashboard인지 확인한다.
2. 17개 타일/Power BI 링크/검색이 기존과 같은지 확인한다.
3. AI Insights와 Analytics Hub가 Coming Soon만 표시하는지 확인한다.
4. KAM 카드 제목이 `BSR Traffic Light`인지 확인한다.
5. `Created by JohnPaul OConnor`가 정확히 표시되고 상태 배지가 없는지 확인한다.
6. Report HTML과 Tutorial HTML이 Function JSON 오류 없이 각각 공개 Blob을 새 탭에서 직접 여는지 확인한다.
7. 브라우저 주소가 `/api/report-resource`가 아니라 `https://lgeapbop.blob.core.windows.net/...`인지 확인한다.
8. 두 HTML이 다운로드되지 않고 렌더링되는지 확인한다.
9. Raw Excel만 회색 disabled인지 확인한다.
10. KAM에서 Dashboard로 돌아온 뒤 17개 타일과 링크가 유지되는지 확인한다.

Tutorial Blob의 현재 헤더는 계속 유지한다.

- `Content-Type=text/html`
- `Content-Disposition=inline`

## 향후 URL 입력

`bop-report-hub.registry.json`에서 다음 필드에 **확정된 전체 URL**을 입력한다.

```json
"links": {
  "reportHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR Traffic Light Report.html",
  "tutorialHtml": "https://lgeapbop.blob.core.windows.net/bi-portal/kam/bsr-traffic/BSR_TrafficLight_Report_Video_Tutorial.html",
  "rawExcel": "https://<full-raw-excel-url>"
}
```

HTML은 새 탭, Raw Excel은 다운로드로 동작한다. 비공개 Blob 전환 절차는 `docs/AUTHORIZATION.md`와 `docs/REPORT_RESOURCE_ACCESS.md`를 따른다.
