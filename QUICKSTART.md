# 🚀 Guia Rápido - Launcher EE

Configuração rápida do Launcher EE para LG webOS TV em 5 minutos!

## ⚡ Setup Rápido

### 1. Pré-requisitos

```bash
# Instalar Node.js (se não tiver)
# Windows: https://nodejs.org/
# Linux: sudo apt install nodejs npm
# macOS: brew install node

# Verificar instalação
node --version  # >= v14.x
npm --version   # >= v6.x
```

### 2. Instalar webOS CLI

```bash
npm install -g @webos-tools/cli

# Verificar
ares --version
```

### 3. Configurar TV

**Na TV:**
1. Abra **Configurações** → **Geral** → **Sobre a TV**
2. Clique 5x no **número de série**
3. Instale **Developer Mode** da LG Store
4. Abra o app e ative **Dev Mode**
5. Pressione **Key Server**
6. Anote o **IP da TV**

**No Computador:**
```bash
ares-setup-device

# Preencher:
# name: lg-tv
# host: [IP da TV]
# port: 9922
# user: prisoner
```

### 4. Clonar e Preparar

```bash
git clone https://github.com/eliasempresas/launcher-ee.git
cd launcher-ee

# Opcional: Instalar dependências
npm install
```

### 5. Adicionar Ícones (Importante!)

Coloque seus ícones em `/assets/`:
- `icon.png` (80x80px)
- `largeIcon.png` (130x130px)
- `splash.png` (1920x1080px)

Ver `assets/README-ASSETS.md` para detalhes.

### 6. Build e Instalar

**Linux/macOS:**
```bash
./build/build.sh
# Responda 's' para instalar na TV
```

**Windows:**
```powershell
.\build\build.ps1
# Responda 's' para instalar na TV
```

**Android (Termux):**
```bash
./build/build-android.sh
# Siga as instruções para transferir o .ipk
```

## 🎯 Comandos Úteis

```bash
# Build
npm run build              # Linux/macOS
npm run build:win          # Windows
npm run build:android      # Android

# Instalar na TV
npm run install

# Iniciar app
npm run launch

# Ver logs
npm run logs

# DevTools (debug)
npm run inspect

# Desinstalar
npm run uninstall

# Info da TV
npm run device-info

# Listar apps instalados
npm run list
```

## 🔧 Customização Rápida

### Mudar Cores

Edite `css/main.css`:
```css
:root {
    --primary-color: #FF0000;  /* Sua cor */
    --text-color: #000000;
}
```

### Configurar APIs

Edite `js/config.js`:
```javascript
API: {
    BASE_URL: 'https://sua-api.com',
    API_KEY: 'sua-chave',
    // ...
}
```

### Mudar ID do App

Edite `manifest.json` e `appinfo.json`:
```json
{
  "id": "com.suaempresa.launcher",
  "version": "1.0.0",
  // ...
}
```

## 🐛 Problemas Comuns

### Erro ao conectar na TV
```bash
# Reconfigurar dispositivo
ares-setup-device

# Testar conexão
ping [IP-DA-TV]
```

### App não inicia
```bash
# Ver logs de erro
ares-inspect -d lg-tv -a com.eliasempresas.launcher

# Reinstalar
ares-install -d lg-tv --remove com.eliasempresas.launcher
ares-install -d lg-tv launcher-ee-v1.0.0.ipk
```

### Ícones não aparecem
1. Certifique-se que os arquivos estão em `/assets/`
2. Nomes corretos: `icon.png`, `largeIcon.png`
3. Tamanhos corretos (ver `assets/README-ASSETS.md`)
4. Reconstrua o app após adicionar ícones

### Erro de permissão
```bash
# Tornar scripts executáveis (Linux/macOS)
chmod +x build/*.sh
```

## 📱 Controle Remoto

- **Setas**: Navegação
- **OK/Enter**: Selecionar
- **Back**: Voltar
- **Home**: Sair
- **Números**: Atalhos (se configurado)

## 🔐 Autenticação

1. Abra o app na TV
2. Será exibido um código de 6 caracteres
3. Aprove via:
   - API: `POST /tv.php {function: "approve", code: "ABC123"}`
   - Portal admin
   - App mobile (se disponível)
4. Aguarde autorização (até 5 min)

## 📊 Monitoramento

O app envia métricas automaticamente:
- CPU, RAM, temperatura
- Status de rede
- Eventos de uso
- Erros e exceções

Visualize em: `https://portal.oliveira.eliasempresas.com`

## 🆘 Precisa de Ajuda?

- **Docs Completo**: Ver `README.md`
- **Assets**: Ver `assets/README-ASSETS.md`
- **Changelog**: Ver `CHANGELOG.md`
- **Suporte**: suporte@eliasempresas.com

## ⚡ Próximos Passos

1. ✅ Instalou e testou? 
2. Customize cores e ícones
3. Configure suas APIs
4. Teste todos os módulos
5. Configure autenticação
6. Monitore métricas

---

## 🔴 Pronto!

Seu Launcher EE está funcionando! 🎉

Para documentação completa, consulte `README.md`.

**Elias Empresas - Centralizando o futuro na sua TV**
