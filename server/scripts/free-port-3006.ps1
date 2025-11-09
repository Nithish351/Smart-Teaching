$ErrorActionPreference = 'SilentlyContinue'
$conn = Get-NetTCPConnection -LocalPort 3006 -State Listen
if ($null -eq $conn) {
  Write-Host "No process is listening on port 3006"
  exit 0
}

$pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  try {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "Killing PID $pid ($($proc.ProcessName)) on port 3006" -ForegroundColor Yellow
      Stop-Process -Id $pid -Force
    } else {
      Write-Host "Killing PID $pid on port 3006" -ForegroundColor Yellow
      Stop-Process -Id $pid -Force
    }
  } catch {
    Write-Host "Failed to kill PID $pid: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host "Done."
