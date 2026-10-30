# ============================================================
# VERIFY_ENV.ps1 - SIS-MALI
# Verifie la coherence entre .env et .env.example
# Compare les NOMS de variables (pas les valeurs)
# ============================================================

Write-Host "=== Verification de la coherence .env <-> .env.example ===" -ForegroundColor Cyan

function Get-EnvKeys {
    param([string]$FilePath)
    $keys = @()
    if (Test-Path $FilePath) {
        $lines = Get-Content $FilePath
        foreach ($line in $lines) {
            if ($line -match '^\s*([A-Z_][A-Z0-9_]*)\s*=') {
                $keys += $matches[1]
            }
        }
    }
    return $keys | Sort-Object -Unique
}

$envPath = ".env"
$examplePath = ".env.example"

if (-not (Test-Path $envPath)) {
    Write-Host "ERREUR : .env introuvable" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $examplePath)) {
    Write-Host "ERREUR : .env.example introuvable" -ForegroundColor Red
    exit 1
}

$envKeys = Get-EnvKeys $envPath
$exampleKeys = Get-EnvKeys $examplePath

Write-Host ""
Write-Host "Variables dans .env         : $($envKeys.Count)" -ForegroundColor Yellow
Write-Host "Variables dans .env.example : $($exampleKeys.Count)" -ForegroundColor Yellow

$missingInExample = $envKeys | Where-Object { $_ -notin $exampleKeys }
$missingInEnv = $exampleKeys | Where-Object { $_ -notin $envKeys }

Write-Host ""
Write-Host "--- Variables dans .env mais ABSENTES de .env.example ---" -ForegroundColor Yellow
if ($missingInExample) {
    $missingInExample | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
} else {
    Write-Host "  Aucune (OK)" -ForegroundColor Green
}

Write-Host ""
Write-Host "--- Variables dans .env.example mais ABSENTES de .env ---" -ForegroundColor Yellow
if ($missingInEnv) {
    $missingInEnv | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
} else {
    Write-Host "  Aucune (OK)" -ForegroundColor Green
}

Write-Host ""
if ($missingInExample.Count -eq 0 -and $missingInEnv.Count -eq 0) {
    Write-Host "COHERENCE OK" -ForegroundColor Green
    exit 0
} else {
    Write-Host "INCOHERENCE DETECTEE" -ForegroundColor Red
    exit 1
}