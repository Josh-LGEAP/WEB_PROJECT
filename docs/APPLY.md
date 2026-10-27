# 적용 및 운영 설정

최종 ZIP은 상위 폴더 없이 구성되어 `C:\portal_v1`에 그대로 병합할 수 있다.

## 파일 적용

```powershell
Copy-Item C:\portal_v1 C:\portal_v1_backup_20261027 -Recurse
Expand-Archive -Path .\portal_v1_merged_final_v3.zip -DestinationPath C:\portal_v1 -Force
```

ZIP에 포함되지 않지만 기존 폴더에 남을 수 있는 항목을 삭제한다.

```powershell
Remove-Item C:\portal_v1\api\node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item C:\portal_v1\api\local.settings.json -Force -ErrorAction SilentlyContinue
Remove-Item C:\portal_v1\.git -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem C:\portal_v1 -Recurse -Force -Filter .env | Remove-Item -Force
```

## 의존성 및 테스트

```powershell
Set-Location C:\portal_v1\api
npm ci
npm test
```

로컬 API가 필요한 경우에만 `local.settings.json.example`을 복사해 실제 값을 입력한다. 실제 설정 파일은 커밋하거나 ZIP에 넣지 않는다.

## Tutorial private Blob 준비

1. API 실행 identity에 System Assigned Managed Identity를 활성화한다.
2. Storage account `lgeapbop`에 `Storage Blob Delegator` 역할을 할당한다.
3. Container `bi-portal`에 `Storage Blob Data Reader` 역할을 할당한다.
4. `api/config/report-resources.json`의 account/container/blob 경로가 실제 Blob과 일치하는지 확인한다.
5. API를 배포한다. 운영 workflow의 API job은 현재 `if: false`이므로 환경 설정 없이 자동 활성화되지 않는다.
6. 인증된 브라우저에서 Tutorial HTML을 눌러 same-origin API → 302 → private Blob 순서로 동작하는지 확인한다.

## HTML Blob 표시 헤더

Report/Tutorial HTML을 다운로드가 아닌 새 탭에서 표시하려면 Azure Portal 또는 Storage Explorer에서 각 `.html` Blob의 HTTP headers를 확인한다.

- `Content-Type`: `text/html`
- `Content-Disposition`: 비어 있음 또는 `inline`
- `attachment`이면 제거 또는 `inline`으로 변경

이 조건은 임시 public Blob URL과 Function+단기 SAS 방식 모두에 적용된다. 상세 단계는 `docs/AUTHORIZATION.md`에 있다. Raw Excel은 `attachment` 다운로드를 유지한다.

## 배포 후 기능 확인

- 초기 화면은 기존 Dashboard다.
- 기존 17개 타일 이름, Power BI 링크, 검색 결과와 스타일이 동일하다.
- AI Insights와 Analytics Hub는 각각 중앙의 Coming Soon만 표시하며 기존 API 호출을 시작하지 않는다.
- KAM BSR의 Tutorial HTML은 `/api/report-resource`를 사용하고 새 탭에서 연다.
- 향후 Report HTML URL이 등록되면 동일하게 새 탭에서 연다.
- Report HTML과 Raw Excel은 URL/서버 리소스가 없으므로 비활성이다.
- KAM/GTM 이동 후 Dashboard로 복귀해도 타일과 링크가 동일하다.
- `npm test` 및 `qa/dashboard-browser-regression-results.json`이 PASS다.

권한 구성은 `docs/AUTHORIZATION.md`, Blob 접근 설계는 `docs/REPORT_RESOURCE_ACCESS.md`를 따른다.
