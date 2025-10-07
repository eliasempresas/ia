# Launcher EE - Build Script para Windows 11
# Versão: 1.0.0
# Descrição: Empacota o aplicativo para LG webOS TV

# Configurar para parar em caso de erro
$ErrorActionPreference = "Stop"

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║     LAUNCHER EE - BUILD SCRIPT        ║" -ForegroundColor Red
Write-Host "║     Elias Empresas - LG webOS TV      ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# Diretório do projeto
$ProjectDir = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectDir

Write-Host "📁 Diretório do projeto: $ProjectDir" -ForegroundColor Cyan
Write-Host ""

# Verificar se ares-cli está instalado
$aresInstalled = $null -ne (Get-Command ares-package -ErrorAction SilentlyContinue)

if (-not $aresInstalled) {
    Write-Host "⚠️  ares-cli não encontrado!" -ForegroundColor Yellow
    Write-Host "📦 Instalando @webos-tools/cli..." -ForegroundColor Cyan
    
    npm install -g @webos-tools/cli
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar ares-cli!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ ares-cli instalado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

# Verificar versão
$aresVersion = & ares-package --version 2>&1 | Select-Object -First 1
Write-Host "🔧 ares-cli: $aresVersion" -ForegroundColor Cyan
Write-Host ""

# Obter versão do manifest.json
if (-not (Test-Path "manifest.json")) {
    Write-Host "❌ Erro: manifest.json não encontrado!" -ForegroundColor Red
    exit 1
}

$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$appId = $manifest.id
$appTitle = $manifest.title

Write-Host "📋 Informações do App:" -ForegroundColor Cyan
Write-Host "   ID: $appId"
Write-Host "   Título: $appTitle"
Write-Host "   Versão: $version"
Write-Host ""

# Limpar builds anteriores
Write-Host "🧹 Limpando builds anteriores..." -ForegroundColor Yellow
Get-ChildItem -Filter *.ipk -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "✅ Limpeza concluída" -ForegroundColor Green
Write-Host ""

# Validar estrutura do projeto
Write-Host "🔍 Validando estrutura do projeto..." -ForegroundColor Yellow

$requiredFiles = @(
    "index.html",
    "manifest.json",
    "css\main.css",
    "js\main.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Arquivos obrigatórios faltando:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "   - $file"
    }
    exit 1
}

Write-Host "✅ Estrutura validada" -ForegroundColor Green
Write-Host ""

# Empacotar aplicativo
Write-Host "📦 Empacotando aplicativo..." -ForegroundColor Yellow
& ares-package .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao empacotar aplicativo!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Empacotamento concluído" -ForegroundColor Green
Write-Host ""

# Renomear para versão específica
$ipkFile = Get-ChildItem -Filter *.ipk | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($null -eq $ipkFile) {
    Write-Host "❌ Erro: Nenhum arquivo .ipk gerado!" -ForegroundColor Red
    exit 1
}

$newName = "launcher-ee-v$version.ipk"
Rename-Item $ipkFile.Name $newName -Force

Write-Host "✅ Pacote criado: $newName" -ForegroundColor Green
Write-Host ""

# Mostrar informações do pacote
$fileSize = (Get-Item $newName).Length / 1MB
$fileSizeFormatted = "{0:N2} MB" -f $fileSize

Write-Host "📊 Informações do Pacote:" -ForegroundColor Cyan
Write-Host "   Nome: $newName"
Write-Host "   Tamanho: $fileSizeFormatted"
Write-Host "   Localização: $ProjectDir\$newName"
Write-Host ""

# Perguntar se deseja instalar na TV
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
$install = Read-Host "📺 Deseja instalar na TV agora? (s/n)"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

if ($install -eq "s" -or $install -eq "S") {
    # Listar dispositivos disponíveis
    Write-Host "🔍 Dispositivos configurados:" -ForegroundColor Cyan
    & ares-setup-device --list
    Write-Host ""
    
    # Solicitar nome do dispositivo
    $tvDevice = Read-Host "📱 Digite o nome do dispositivo (ex: lg-tv)"
    
    if ([string]::IsNullOrWhiteSpace($tvDevice)) {
        Write-Host "❌ Nome do dispositivo não pode estar vazio!" -ForegroundColor Red
        exit 1
    }
    
    # Verificar se dispositivo existe
    $deviceInfo = & ares-device-info -d $tvDevice 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Dispositivo '$tvDevice' não encontrado!" -ForegroundColor Red
        Write-Host "💡 Configure o dispositivo com: ares-setup-device" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "📺 Informações da TV:" -ForegroundColor Cyan
    Write-Host $deviceInfo
    Write-Host ""
    
    # Desinstalar versão anterior
    Write-Host "🗑️  Desinstalando versão anterior..." -ForegroundColor Yellow
    & ares-install --device $tvDevice --remove $appId 2>$null
    Write-Host "✅ Desinstalação concluída" -ForegroundColor Green
    Write-Host ""
    
    # Instalar nova versão
    Write-Host "📥 Instalando nova versão..." -ForegroundColor Yellow
    & ares-install --device $tvDevice $newName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar aplicativo!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Instalação concluída" -ForegroundColor Green
    Write-Host ""
    
    # Perguntar se deseja iniciar
    $launch = Read-Host "🚀 Deseja iniciar o aplicativo? (s/n)"
    
    if ($launch -eq "s" -or $launch -eq "S") {
        Write-Host "🚀 Iniciando aplicativo..." -ForegroundColor Yellow
        & ares-launch --device $tvDevice $appId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Aplicativo iniciado com sucesso!" -ForegroundColor Green
            Write-Host ""
            
            # Perguntar se deseja abrir DevTools
            $devtools = Read-Host "🔍 Deseja abrir o Developer Tools? (s/n)"
            
            if ($devtools -eq "s" -or $devtools -eq "S") {
                Write-Host "🔍 Abrindo Developer Tools..." -ForegroundColor Cyan
                & ares-inspect --device $tvDevice --app $appId --open
            }
        }
        else {
            Write-Host "❌ Erro ao iniciar aplicativo!" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✨ Build concluído com sucesso! ✨" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Comandos úteis:" -ForegroundColor Cyan
Write-Host "   • Listar apps: ares-install -d $tvDevice --list"
Write-Host "   • Ver logs: ares-inspect -d $tvDevice -a $appId"
Write-Host "   • Fechar app: ares-launch -d $tvDevice --close $appId"
Write-Host "   • Desinstalar: ares-install -d $tvDevice --remove $appId"
Write-Host ""
Write-Host "🔴 Launcher EE - Elias Empresas" -ForegroundColor Red
Write-Host ""
