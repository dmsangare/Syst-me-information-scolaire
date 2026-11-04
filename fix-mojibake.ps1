$ROOT = "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui"
$files = @(
  "$ROOT\apps\web\src\components\layout\Sidebar.tsx",
  "$ROOT\apps\web\src\routes\index.tsx"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($file in $files) {
  if (-not (Test-Path $file)) { Write-Host "Introuvable: $file" -ForegroundColor Red; continue }
  Write-Host "--- $(Split-Path $file -Leaf) ---" -ForegroundColor Yellow
  
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $content = [System.Text.Encoding]::UTF8.GetString($bytes)
  $original = $content
  
  # Remplacer les motifs mojibake par les caracteres corrects (codes Unicode)
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A9), [char]0x00E9  # é
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A8), [char]0x00E8  # è
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A0), [char]0x00E0  # à
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A2), [char]0x00E2  # â
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00AA), [char]0x00EA  # ê
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00AE), [char]0x00EE  # î
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00AF), [char]0x00EF  # ï
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00B4), [char]0x00F4  # ô
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00B9), [char]0x00F9  # ù
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00BB), [char]0x00FB  # û
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A7), [char]0x00E7  # ç
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x0083 + [char]0x00E2 + [char]0x0082 + [char]0x00AC), [char]0x20AC  # €
  
  # Remplacer les emojis corrompus
  $content = $content -replace [regex]::Escape([char]0x00C3 + [char]0x00A2 + [char]0x00C5 + [char]0x201C + [char]0x00E2 + [char]0x20AC + [char]0x00A6), [char]0x2705  # ✅
  
  if ($content -ne $original) {
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
    Write-Host "  Modifie" -ForegroundColor Green
  } else {
    Write-Host "  Aucun changement" -ForegroundColor Gray
  }
}

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
foreach ($file in $files) {
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $count = 0
  for ($i = 0; $i -lt $bytes.Length - 1; $i++) {
    if ($bytes[$i] -eq 0xC3 -and $bytes[$i+1] -eq 0x83) { $count++ }
  }
  $name = Split-Path $file -Leaf
  if ($count -eq 0) { Write-Host "  $name : PROPRE" -ForegroundColor Green }
  else { Write-Host "  $name : $count RESTANT(S)" -ForegroundColor Red }
}

Write-Host "`n=== Compilation ===" -ForegroundColor Yellow
Set-Location "$ROOT\apps\web"
npx tsc --noEmit
Write-Host "Exit code : $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })