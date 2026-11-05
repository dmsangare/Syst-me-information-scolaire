$files = @(
    "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui\apps\api\src\assessments\assessments.service.ts",
    "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui\apps\api\src\grades\grades.service.ts",
    "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui\apps\api\src\assessments\utils\assessment-export.util.ts",
    "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui\packages\shared\src\schemas.ts"
)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$checkMark = [char]0x2705
$emDash = [char]0x2014
foreach ($f in $files) {
    if (Test-Path $f) {
        $c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
        $c = $c.Replace("âÅ“", $checkMark)
        $c = $c.Replace("ÃƒÂ ", "à ")
        $c = $c.Replace("ÃƒÂ", "à")
        $c = $c.Replace("Ã ", "à")
        $c = $c.Replace("Â·", "·")
        $c = $c.Replace("NÂ°", "N°")
        $c = $c.Replace("ââ‚¬", $emDash)
        $c = $c.Replace("â€", '"')
        [System.IO.File]::WriteAllText($f, $c, $utf8NoBom)
        Write-Host "Nettoye : $f" -ForegroundColor Green
    }
}
