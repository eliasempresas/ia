# ✅ Checklist Pré-Build - Launcher EE

Use esta lista para garantir que tudo está pronto antes de fazer o build do aplicativo.

## 📋 Verificação Obrigatória

### 1. Arquivos Essenciais
- [x] `index.html` existe
- [x] `manifest.json` existe  
- [x] `appinfo.json` existe
- [x] `package.json` existe
- [x] Diretório `css/` completo
- [x] Diretório `js/` completo
- [ ] **Diretório `assets/` com ícones** ⚠️ IMPORTANTE!

### 2. Ícones (CRÍTICO!)
- [ ] `assets/icon.png` (80x80px)
- [ ] `assets/largeIcon.png` (130x130px)
- [ ] `assets/splash.png` (1920x1080px) - opcional mas recomendado

**⚠️ ATENÇÃO**: O app funcionará sem ícones, mas não é recomendado para produção!

### 3. Configuração

#### manifest.json
```json
{
  "id": "com.eliasempresas.launcher",
  "version": "1.0.0",
  "vendor": "Elias Empresas",
  "title": "Launcher EE"
}
```
- [ ] ID correto
- [ ] Versão correta
- [ ] Título correto

#### js/config.js
- [ ] `API_KEY` configurada
- [ ] `BASE_URL` correta
- [ ] Endpoints validados
- [ ] Domínios permitidos (IPTV) configurados

### 4. Scripts de Build
- [x] `build/build.sh` (Linux/macOS)
- [x] `build/build.ps1` (Windows)
- [x] `build/build-android.sh` (Android/Termux)
- [ ] Scripts têm permissão de execução (Linux/macOS)

### 5. Documentação
- [x] `README.md` completo
- [x] `CHANGELOG.md` atualizado
- [x] `QUICKSTART.md` criado
- [x] `LICENSE` presente
- [x] `assets/README-ASSETS.md` criado

## 🔧 Verificação Técnica

### Estrutura de Pastas
```
✅ css/          - Todos os arquivos CSS
✅ js/           - Todos os arquivos JavaScript
⚠️ assets/       - ADICIONE OS ÍCONES!
✅ build/        - Scripts de build
✅ logs/         - Diretório vazio (ok)
```

### Dependências
```bash
# Verificar Node.js
node --version  # >= 14.0.0

# Verificar NPM
npm --version   # >= 6.0.0

# Verificar ares-cli
ares-package --version
```
- [ ] Node.js instalado
- [ ] NPM instalado
- [ ] ares-cli instalado

### Conectividade TV
```bash
# Testar conexão
ping [IP-DA-TV]

# Verificar dispositivo
ares-device-info -d lg-tv
```
- [ ] TV configurada no ares-cli
- [ ] Dev Mode ativo na TV
- [ ] Conexão de rede OK

## 🎨 Customização (Opcional)

- [ ] Cores alteradas em `css/main.css`
- [ ] Logo/marca customizada
- [ ] Splash screen personalizada
- [ ] Fontes customizadas em `assets/fonts/`

## 🔐 Segurança

- [ ] Chaves de API não estão commitadas no Git
- [ ] `.gitignore` configurado
- [ ] Variáveis sensíveis em `.env` (se usar)
- [ ] Whitelist de domínios IPTV configurada

## 🧪 Testes Recomendados

Antes do build final:
- [ ] Testou localmente com `http-server`
- [ ] Validou HTML (sem erros)
- [ ] Validou JSON (manifest, appinfo, package)
- [ ] Verificou links quebrados
- [ ] Testou responsividade

## 📦 Preparação para Build

### Linux/macOS
```bash
# Tornar scripts executáveis
chmod +x build/*.sh

# Limpar builds anteriores
rm -f *.ipk
```

### Windows
```powershell
# Configurar execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Limpar builds anteriores
Remove-Item *.ipk
```

### Android (Termux)
```bash
# Verificar permissões de armazenamento
termux-setup-storage

# Atualizar pacotes
pkg update
```

## ⚡ Verificação Rápida

Execute estes comandos para verificar:

```bash
# Verificar arquivos obrigatórios
ls -la index.html manifest.json appinfo.json package.json

# Verificar estrutura CSS/JS
ls css/*.css
ls js/*.js

# Verificar ícones (IMPORTANTE!)
ls assets/*.png

# Verificar scripts
ls -la build/*.sh build/*.ps1

# Verificar permissões (Linux/macOS)
ls -l build/
```

## 🚨 Erros Comuns

### ❌ "Ícones não encontrados"
**Solução**: Adicione os ícones em `assets/` antes do build

### ❌ "manifest.json inválido"
**Solução**: Valide JSON em https://jsonlint.com/

### ❌ "Permission denied" (Linux/macOS)
**Solução**: `chmod +x build/*.sh`

### ❌ "ares-package not found"
**Solução**: `npm install -g @webos-tools/cli`

## ✅ Pronto para Build?

Se você marcou **TODOS** os itens críticos (⚠️), pode prosseguir:

```bash
# Linux/macOS
./build/build.sh

# Windows
.\build\build.ps1

# Android
./build/build-android.sh
```

## 📝 Notas

- **Primeira vez**: Processo pode demorar 2-5 minutos
- **Builds subsequentes**: 30-60 segundos
- **Tamanho esperado**: ~500KB - 2MB (dependendo dos ícones)

## 🎯 Após o Build

- [ ] Arquivo `.ipk` gerado com sucesso
- [ ] Nome do arquivo: `launcher-ee-v1.0.0.ipk`
- [ ] Tamanho razoável (< 5MB)
- [ ] Instalado na TV sem erros
- [ ] App inicia corretamente
- [ ] Autenticação funciona
- [ ] Todos os módulos carregam

## 🆘 Precisa de Ajuda?

- **Build falha**: Veja logs de erro no terminal
- **Ícones**: Leia `assets/README-ASSETS.md`
- **TV não conecta**: Reconfigue com `ares-setup-device`
- **App não inicia**: Veja logs com `npm run logs`

**Suporte**: suporte@eliasempresas.com

---

## ✨ Tudo OK?

Se todos os itens críticos estão ✅, você está pronto para fazer o build!

**Boa sorte! 🚀**

---

**🔴 Launcher EE - Elias Empresas**
