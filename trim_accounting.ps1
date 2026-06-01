$f = 'frontend\src\pages\dashboards\AccountingDashboard.tsx'
$lines = Get-Content $f -Encoding UTF8
$keep = $lines | Select-Object -First 1122
$keep | Set-Content $f -Encoding UTF8
Write-Host "Done. Lines: $($keep.Count)"
