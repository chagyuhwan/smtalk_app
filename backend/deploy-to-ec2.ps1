# smtalk backend -> AWS EC2 배포 (Windows PowerShell)
#
# 사전 준비 (AWS 콘솔):
#   1. EC2 t3.micro Ubuntu 22.04 (서울 ap-northeast-2)
#   2. Elastic IP 할당 + 인스턴스 연결
#   3. 보안그룹: 22, 80, 443 인바운드
#   4. SSH 최초 접속 후: bash setup-ec2.sh
#
# 사용 예:
#   .\deploy-to-ec2.ps1 -ElasticIp "43.201.164.203" -KeyPath "C:\keys\smtalk.pem" -Email "you@email.com"

param(
    [Parameter(Mandatory = $true)]
    [string]$ElasticIp,

    [Parameter(Mandatory = $true)]
    [string]$KeyPath,

    [string]$SshUser = "ubuntu",

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [string]$NiceClientId = "NI3e27f2e2-2bae-4d2e-93d4-e477e915763b",

    [string]$NiceClientSecret = "",

    [string]$NiceUidSalt = "smtalk-prod-salt-v1"
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

if (-not (Test-Path $KeyPath)) {
    Write-Host "키 파일 없음: $KeyPath" -ForegroundColor Red
    exit 1
}

if (-not $NiceClientSecret) {
    $NiceClientSecret = Read-Host "NICE Client Secret 입력"
}

$SslipHost = ($ElasticIp -replace '\.', '-') + ".sslip.io"
$BackendUrl = "https://$SslipHost"
$SshTarget = "${SshUser}@${ElasticIp}"

Write-Host ""
Write-Host "=== AWS EC2 배포 ===" -ForegroundColor Cyan
Write-Host "Elastic IP:    $ElasticIp"
Write-Host "sslip.io URL:  $BackendUrl"
Write-Host "SSH:           $SshTarget"
Write-Host ""

# Firebase service account
$saPath = Join-Path $PSScriptRoot "serviceAccountKey.json"
if (-not (Test-Path $saPath)) {
    Write-Host "serviceAccountKey.json 없음 ($saPath)" -ForegroundColor Red
    exit 1
}
$sa = Get-Content $saPath -Raw | ConvertFrom-Json
$privateKeyEscaped = ($sa.private_key -replace "`n", '\n')

# .env 생성 (업로드용)
$envContent = @"
NODE_ENV=production
PORT=3000
NICE_CLIENT_ID=$NiceClientId
NICE_CLIENT_SECRET=$NiceClientSecret
NICE_API_URL=https://auth.niceid.co.kr
BACKEND_BASE_URL=$BackendUrl
NICE_UID_SALT=$NiceUidSalt
FIREBASE_PROJECT_ID=$($sa.project_id)
FIREBASE_CLIENT_EMAIL=$($sa.client_email)
FIREBASE_PRIVATE_KEY="$privateKeyEscaped"
ALLOWED_ORIGINS=$BackendUrl
"@

$envDeployPath = Join-Path $PSScriptRoot ".env.deploy"
Write-Utf8NoBom -Path $envDeployPath -Content $envContent

# nginx 설정 생성
$nginxTemplate = Get-Content (Join-Path $PSScriptRoot "nginx-smtalk.conf.template") -Raw
$nginxConf = $nginxTemplate -replace '__SSLIP_HOST__', $SslipHost
$nginxLocalPath = Join-Path $PSScriptRoot "nginx-smtalk.generated.conf"
Write-Utf8NoBom -Path $nginxLocalPath -Content $nginxConf

# eas.json 업데이트 (프로젝트 루트)
$easPath = Join-Path $PSScriptRoot "..\eas.json"
if (Test-Path $easPath) {
    $eas = Get-Content $easPath -Raw
    $eas = $eas -replace 'https://smtalk-backend-production\.up\.railway\.app', $BackendUrl
    $eas = $eas -replace 'https://43-201-164-203\.sslip\.io', $BackendUrl
    $eas = $eas -replace 'https://43-201-21-192\.sslip\.io', $BackendUrl
    Write-Utf8NoBom -Path $easPath -Content $eas
    Write-Host "eas.json URL -> $BackendUrl" -ForegroundColor Green
}

# 업로드할 파일
$files = @(
    "server.js", "security.js", "package.json", "package-lock.json",
    "privacy-policy.html", "terms.html", "delete-account.html", ".env.deploy"
)

Write-Host "코드 업로드 중..." -ForegroundColor Yellow
ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $SshTarget "mkdir -p ~/smtalk-backend"

foreach ($f in $files) {
    $local = Join-Path $PSScriptRoot $f
    if (-not (Test-Path $local)) { continue }
    $remoteName = if ($f -eq ".env.deploy") { ".env" } else { $f }
    scp -i $KeyPath -o StrictHostKeyChecking=accept-new $local "${SshTarget}:~/smtalk-backend/$remoteName"
}

# nginx conf + static html
scp -i $KeyPath $nginxLocalPath "${SshTarget}:/tmp/nginx-smtalk.conf"
scp -i $KeyPath (Join-Path $PSScriptRoot "privacy-policy.html") "${SshTarget}:/tmp/"
scp -i $KeyPath (Join-Path $PSScriptRoot "terms.html") "${SshTarget}:/tmp/"
scp -i $KeyPath (Join-Path $PSScriptRoot "delete-account.html") "${SshTarget}:/tmp/"

Write-Host "서버 설정 및 pm2 시작..." -ForegroundColor Yellow

$remoteScript = @"
set -e
cd ~/smtalk-backend
npm install --omit=dev
pm2 delete smtalk-api 2>/dev/null || true
pm2 start server.js --name smtalk-api
pm2 save

sudo mkdir -p /var/www/smtalk
sudo cp /tmp/privacy-policy.html /tmp/terms.html /tmp/delete-account.html /var/www/smtalk/ 2>/dev/null || true

if [ ! -d /etc/letsencrypt/live/$SslipHost ]; then
  echo "SSL 인증서 발급 중..."
  sudo systemctl stop nginx 2>/dev/null || true
  sudo certbot certonly --standalone -d $SslipHost --non-interactive --agree-tos -m $Email
fi

sudo cp /tmp/nginx-smtalk.conf /etc/nginx/sites-available/smtalk
sudo ln -sf /etc/nginx/sites-available/smtalk /etc/nginx/sites-enabled/smtalk
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "DONE"
"@

($remoteScript -replace "`r`n", "`n") | ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $SshTarget "bash -s"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "배포 완료" -ForegroundColor Green
Write-Host "백엔드 URL: $BackendUrl"
Write-Host ""
Write-Host "NICE 관리 페이지에 IP 등록: $ElasticIp"
Write-Host ""
Write-Host "테스트:"
Write-Host "  curl $BackendUrl/health"
Write-Host "  curl -X POST $BackendUrl/api/nice/token"
Write-Host ""
Write-Host "앱 재빌드: eas build --platform android --profile production"
Write-Host "========================================" -ForegroundColor Cyan

# 정리
Remove-Item $envDeployPath -Force -ErrorAction SilentlyContinue
