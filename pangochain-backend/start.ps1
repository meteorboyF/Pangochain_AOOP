# start.ps1 — Kill any process on port 8080, then start the Spring Boot app
$listening = netstat -ano | Select-String ":8080\s.*LISTENING"
if ($listening) {
    $pid8080 = $listening.Line.Trim().Split()[-1]
    Write-Host "Stopping existing process on port 8080 (PID $pid8080)..."
    taskkill /PID $pid8080 /F | Out-Null
    Start-Sleep -Seconds 1
}
Write-Host "Starting Pangochain backend..."
./mvnw spring-boot:run -DskipTests
