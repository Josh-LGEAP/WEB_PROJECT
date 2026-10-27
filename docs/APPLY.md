# 적용 방법

최종 ZIP은 상위 폴더 없이 `app`, `api`, `.github`, `docs`, `qa`가 루트에 있어 `C:\portal_v1`에 그대로 병합할 수 있다.

## 권장 절차

1. 실행 중인 로컬 서버를 중지하고 기존 폴더를 백업한다.

   ```powershell
   Copy-Item C:\portal_v1 C:\portal_v1_backup_20261027 -Recurse
   ```

2. 최종 ZIP을 기존 폴더에 덮어쓴다.

   ```powershell
   Expand-Archive -Path .\portal_v1_merged_final.zip -DestinationPath C:\portal_v1 -Force
   ```

3. ZIP에 포함되지 않지만 기존 폴더에 남을 수 있는 제외 대상을 삭제한다.

   ```powershell
   Remove-Item C:\portal_v1\api\node_modules -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item C:\portal_v1\api\local.settings.json -Force -ErrorAction SilentlyContinue
   Remove-Item C:\portal_v1\.git -Recurse -Force -ErrorAction SilentlyContinue
   Get-ChildItem C:\portal_v1 -Recurse -Force -Filter .env | Remove-Item -Force
   ```

4. 로컬 API가 필요하면 Node.js 20 이상에서 예제 설정을 복사하고 실제 값은 로컬에서만 입력한다.

   ```powershell
   Copy-Item C:\portal_v1\api\local.settings.json.example C:\portal_v1\api\local.settings.json
   Set-Location C:\portal_v1\api
   npm ci
   npm test
   ```

5. 정적 앱 루트는 기존과 동일하게 `app`, API 루트는 `api`로 배포한다.

## 배포 후 확인

- 첫 화면이 기존 Dashboard이며 기존 17개 타일, 검색, Power BI 링크가 그대로 동작하는지 확인한다.
- AI Insights 또는 Analytics Hub로 이동한 뒤 Dashboard를 클릭하면 기존 Dashboard가 복원되는지 확인한다.
- KAM 탭에 `KAM BSR Traffic Light`가 한 행으로 표시되는지 확인한다.
- Tutorial HTML만 활성화되고 Report HTML/Raw Excel은 비활성인지 확인한다.
- GTM 탭이 빈 상태를 표시하는지 확인한다.
- `npm test`의 Dashboard 회귀 테스트가 통과하는지 확인한다.
