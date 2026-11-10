Write-Host "--- Compilation TypeScript backend ---" -ForegroundColor Cyan
Push-Location apps\api
$out = npx tsc --noEmit 2>&1
$code = $LASTEXITCODE
Pop-Location
if ($code -eq 0) { Write-Host "[OK] Backend TS compile" -ForegroundColor Green }
else { Write-Host "[ERREUR] Backend TS :" -ForegroundColor Red; $out | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow } }

Write-Host ""
Write-Host "--- Compilation TypeScript frontend ---" -ForegroundColor Cyan
Push-Location apps\web
$out = npx tsc --noEmit 2>&1
$code = $LASTEXITCODE
Pop-Location
if ($code -eq 0) { Write-Host "[OK] Frontend TS compile" -ForegroundColor Green }
else { Write-Host "[ERREUR] Frontend TS :" -ForegroundColor Red; $out | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow } }

Write-Host ""
Write-Host "--- pdf-annual encore appele ? ---" -ForegroundColor Cyan
$r = Get-ChildItem -Path apps\web\src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "pdf-annual"
if ($r) { Write-Host "[ATTENTION] pdf-annual encore appele :" -ForegroundColor Yellow; $r | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" } }
else { Write-Host "[OK] pdf-annual n'est plus appele" -ForegroundColor Green }