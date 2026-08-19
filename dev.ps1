$port = 8000

Write-Host ""
Write-Host "Precifica+ - servidor local (Ctrl+C para parar)"
Write-Host "  Landing: http://localhost:$port/landing/"
Write-Host "  Painel:  http://localhost:$port/painel/login.html"
Write-Host ""

Start-Process "http://localhost:$port/landing/"

python -m http.server $port --bind 127.0.0.1