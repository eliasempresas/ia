#!/bin/bash

###############################################################################
# Launcher EE - Build Script para Linux/macOS
# Versão: 1.0.0
# Descrição: Empacota o aplicativo para LG webOS TV
###############################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${RED}"
cat << "EOF"
╔═══════════════════════════════════════╗
║     LAUNCHER EE - BUILD SCRIPT        ║
║     Elias Empresas - LG webOS TV      ║
╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}📁 Diretório do projeto: ${PROJECT_DIR}${NC}"
echo ""

# Verificar se ares-cli está instalado
if ! command -v ares-package &> /dev/null; then
    echo -e "${YELLOW}⚠️  ares-cli não encontrado!${NC}"
    echo -e "${BLUE}📦 Instalando @webos-tools/cli...${NC}"
    npm install -g @webos-tools/cli
    echo -e "${GREEN}✅ ares-cli instalado com sucesso!${NC}"
    echo ""
fi

# Verificar versão
ARES_VERSION=$(ares-package --version 2>&1 | head -n1)
echo -e "${BLUE}🔧 ares-cli: ${ARES_VERSION}${NC}"
echo ""

# Obter versão do manifest.json
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Erro: manifest.json não encontrado!${NC}"
    exit 1
fi

VERSION=$(grep -oP '"version":\s*"\K[^"]+' manifest.json)
APP_ID=$(grep -oP '"id":\s*"\K[^"]+' manifest.json)
APP_TITLE=$(grep -oP '"title":\s*"\K[^"]+' manifest.json)

echo -e "${BLUE}📋 Informações do App:${NC}"
echo -e "   ID: ${APP_ID}"
echo -e "   Título: ${APP_TITLE}"
echo -e "   Versão: ${VERSION}"
echo ""

# Limpar builds anteriores
echo -e "${YELLOW}🧹 Limpando builds anteriores...${NC}"
rm -f *.ipk
echo -e "${GREEN}✅ Limpeza concluída${NC}"
echo ""

# Validar estrutura do projeto
echo -e "${YELLOW}🔍 Validando estrutura do projeto...${NC}"

REQUIRED_FILES=("index.html" "manifest.json" "css/main.css" "js/main.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo -e "${RED}❌ Arquivos obrigatórios faltando:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "   - $file"
    done
    exit 1
fi

echo -e "${GREEN}✅ Estrutura validada${NC}"
echo ""

# Empacotar aplicativo
echo -e "${YELLOW}📦 Empacotando aplicativo...${NC}"
ares-package .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao empacotar aplicativo!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Empacotamento concluído${NC}"
echo ""

# Renomear para versão específica
IPK_FILE=$(ls -t *.ipk 2>/dev/null | head -1)

if [ -z "$IPK_FILE" ]; then
    echo -e "${RED}❌ Erro: Nenhum arquivo .ipk gerado!${NC}"
    exit 1
fi

NEW_NAME="launcher-ee-v${VERSION}.ipk"
mv "$IPK_FILE" "$NEW_NAME"

echo -e "${GREEN}✅ Pacote criado: ${NEW_NAME}${NC}"
echo ""

# Mostrar informações do pacote
FILE_SIZE=$(du -h "$NEW_NAME" | cut -f1)
echo -e "${BLUE}📊 Informações do Pacote:${NC}"
echo -e "   Nome: ${NEW_NAME}"
echo -e "   Tamanho: ${FILE_SIZE}"
echo -e "   Localização: ${PROJECT_DIR}/${NEW_NAME}"
echo ""

# Perguntar se deseja instalar na TV
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
read -p "📺 Deseja instalar na TV agora? (s/n) " -n 1 -r
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $REPLY =~ ^[Ss]$ ]]; then
    # Listar dispositivos disponíveis
    echo -e "${BLUE}🔍 Dispositivos configurados:${NC}"
    ares-setup-device --list
    echo ""
    
    # Solicitar nome do dispositivo
    read -p "📱 Digite o nome do dispositivo (ex: lg-tv): " TV_DEVICE
    
    if [ -z "$TV_DEVICE" ]; then
        echo -e "${RED}❌ Nome do dispositivo não pode estar vazio!${NC}"
        exit 1
    fi
    
    # Verificar se dispositivo existe
    if ! ares-device-info -d "$TV_DEVICE" &>/dev/null; then
        echo -e "${RED}❌ Dispositivo '${TV_DEVICE}' não encontrado!${NC}"
        echo -e "${YELLOW}💡 Configure o dispositivo com: ares-setup-device${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}📺 Informações da TV:${NC}"
    ares-device-info -d "$TV_DEVICE"
    echo ""
    
    # Desinstalar versão anterior
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    ares-install --device "$TV_DEVICE" --remove "$APP_ID" 2>/dev/null || true
    echo -e "${GREEN}✅ Desinstalação concluída${NC}"
    echo ""
    
    # Instalar nova versão
    echo -e "${YELLOW}📥 Instalando nova versão...${NC}"
    ares-install --device "$TV_DEVICE" "$NEW_NAME"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao instalar aplicativo!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Instalação concluída${NC}"
    echo ""
    
    # Perguntar se deseja iniciar
    read -p "🚀 Deseja iniciar o aplicativo? (s/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}🚀 Iniciando aplicativo...${NC}"
        ares-launch --device "$TV_DEVICE" "$APP_ID"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Aplicativo iniciado com sucesso!${NC}"
            echo ""
            
            # Perguntar se deseja abrir DevTools
            read -p "🔍 Deseja abrir o Developer Tools? (s/n) " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                echo -e "${BLUE}🔍 Abrindo Developer Tools...${NC}"
                ares-inspect --device "$TV_DEVICE" --app "$APP_ID" --open
            fi
        else
            echo -e "${RED}❌ Erro ao iniciar aplicativo!${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Build concluído com sucesso! ✨${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 Comandos úteis:${NC}"
echo -e "   • Listar apps: ares-install -d $TV_DEVICE --list"
echo -e "   • Ver logs: ares-inspect -d $TV_DEVICE -a $APP_ID"
echo -e "   • Fechar app: ares-launch -d $TV_DEVICE --close $APP_ID"
echo -e "   • Desinstalar: ares-install -d $TV_DEVICE --remove $APP_ID"
echo ""
echo -e "${BLUE}🔴 Launcher EE - Elias Empresas${NC}"
echo ""
