#!/data/data/com.termux/files/usr/bin/bash

###############################################################################
# Launcher EE - Build Script para Android (Termux)
# Versão: 1.0.0
# Descrição: Empacota o aplicativo para LG webOS TV em ambiente Android
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
║  LAUNCHER EE - BUILD (ANDROID/TERMUX) ║
║     Elias Empresas - LG webOS TV      ║
╚═══════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verificar se está rodando no Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${YELLOW}⚠️  Este script é otimizado para Termux (Android)${NC}"
    echo -e "${YELLOW}   Mas pode funcionar em outros ambientes Linux.${NC}"
    echo ""
fi

# Diretório do projeto
if [ -z "$1" ]; then
    PROJECT_DIR="$HOME/launcher-ee"
else
    PROJECT_DIR="$1"
fi

# Criar diretório se não existir
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📁 Diretório não encontrado, usando diretório atual...${NC}"
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

cd "$PROJECT_DIR"

echo -e "${BLUE}📁 Diretório do projeto: ${PROJECT_DIR}${NC}"
echo ""

# Verificar e instalar dependências
echo -e "${YELLOW}🔍 Verificando dependências...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Node.js...${NC}"
    pkg install -y nodejs
    echo -e "${GREEN}✅ Node.js instalado${NC}"
fi

# Git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Git...${NC}"
    pkg install -y git
    echo -e "${GREEN}✅ Git instalado${NC}"
fi

# ares-cli
if ! command -v ares-package &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando @webos-tools/cli...${NC}"
    npm install -g @webos-tools/cli
    echo -e "${GREEN}✅ ares-cli instalado${NC}"
fi

echo -e "${GREEN}✅ Todas as dependências instaladas${NC}"
echo ""

# Verificar versão
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
ARES_VERSION=$(ares-package --version 2>&1 | head -n1)

echo -e "${BLUE}🔧 Versões instaladas:${NC}"
echo -e "   Node.js: ${NODE_VERSION}"
echo -e "   NPM: ${NPM_VERSION}"
echo -e "   ares-cli: ${ARES_VERSION}"
echo ""

# Obter versão do manifest.json
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Erro: manifest.json não encontrado!${NC}"
    echo -e "${YELLOW}💡 Certifique-se de estar no diretório correto do projeto.${NC}"
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
echo -e "${BLUE}   (Isso pode levar alguns segundos no Android)${NC}"

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

# Informações sobre instalação
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Build concluído com sucesso! ✨${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📱 Como instalar na TV:${NC}"
echo ""
echo -e "${YELLOW}OPÇÃO 1: Via computador${NC}"
echo -e "   1. Transfira o arquivo .ipk para um computador:"
echo -e "      ${PROJECT_DIR}/${NEW_NAME}"
echo -e "   2. No computador, use:"
echo -e "      ares-install -d lg-tv ${NEW_NAME}"
echo ""

echo -e "${YELLOW}OPÇÃO 2: Via Termux (se na mesma rede)${NC}"
echo -e "   1. Configure o dispositivo TV:"
echo -e "      ares-setup-device"
echo -e "   2. Instale o app:"
echo -e "      ares-install -d lg-tv ${NEW_NAME}"
echo ""

echo -e "${YELLOW}OPÇÃO 3: Via compartilhamento${NC}"
echo -e "   1. Compartilhe o arquivo via:"
echo -e "      • Termux-share: termux-share ${NEW_NAME}"
echo -e "      • FTP/HTTP server no Termux"
echo -e "      • Cloud storage (Drive, Dropbox, etc)"
echo -e "   2. Baixe no computador e instale na TV"
echo ""

echo -e "${BLUE}📝 Comandos úteis (após configurar TV):${NC}"
echo -e "   • Configurar TV: ares-setup-device"
echo -e "   • Listar apps: ares-install -d lg-tv --list"
echo -e "   • Ver logs: ares-inspect -d lg-tv -a ${APP_ID}"
echo -e "   • Iniciar app: ares-launch -d lg-tv ${APP_ID}"
echo -e "   • Desinstalar: ares-install -d lg-tv --remove ${APP_ID}"
echo ""

echo -e "${BLUE}💡 Dicas para Android/Termux:${NC}"
echo -e "   • Use Termux-API para facilitar transferências"
echo -e "   • Configure SSH para acesso remoto"
echo -e "   • Use 'termux-wake-lock' para evitar suspensão"
echo -e "   • Monte armazenamento com 'termux-setup-storage'"
echo ""

echo -e "${BLUE}🔴 Launcher EE - Elias Empresas${NC}"
echo ""

# Perguntar se deseja compartilhar o arquivo
if command -v termux-share &> /dev/null; then
    read -p "📤 Deseja compartilhar o arquivo .ipk agora? (s/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}📤 Abrindo compartilhamento...${NC}"
        termux-share "$NEW_NAME"
    fi
fi

echo ""
echo -e "${GREEN}✅ Processo finalizado!${NC}"
echo ""
