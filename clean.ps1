$utf8 = New-Object System.Text.UTF8Encoding($false)
$path = "C:\Users\dmsan\Documents\AppEcole\sis-mali-ui\apps"
$check = [char]0x2705
$dash = [char]0x2014
$quoteL = [char]0x201C
$quoteR = [char]0x201D
$apos = [char]0x2019
$middleDot = [char]0x00B7
$degree = [char]0x00B0

Get-ChildItem -Path $path -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $o = $c
    
    $c = $c.Replace("ÃƒÂ©","é").Replace("ÃƒÂ¨","è").Replace("ÃƒÂª","ê").Replace("ÃƒÂ§","ç").Replace("ÃƒÂ´","ô")
    $c = $c.Replace("Ã©","é").Replace("Ã¨","è").Replace("Ãª","ê").Replace("Ã¢","â").Replace("Ã®","î").Replace("Ã´","ô").Replace("Ã»","û").Replace("Ã§","ç")
    $c = $c.Replace("Ã‰","É").Replace("Ã€","À").Replace("Ã ","à")
    $c = $c.Replace("âÅ“", $check).Replace("ââ‚¬", $dash).Replace("â€”", $dash).Replace("â€™", $apos).Replace("â€œ", $quoteL).Replace("â€", $quoteR)
    $c = $c.Replace("Â·", $middleDot).Replace("NÂ°", "N" + $degree)
    
    if ($c -ne $o) {
        [System.IO.File]::WriteAllText($_.FullName, $c, $utf8)
        Write-Host "OK: $($_.Name)" -ForegroundColor Green
    }
}
