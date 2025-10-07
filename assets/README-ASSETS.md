# 📦 Assets - Recursos do Aplicativo

Esta pasta contém todos os recursos estáticos necessários para o aplicativo Launcher EE.

## 🎨 Ícones Necessários

Para o aplicativo funcionar corretamente, você precisa adicionar os seguintes arquivos nesta pasta:

### 1. `icon.png`
- **Tamanho**: 80x80px (mínimo) - Recomendado: 80x80px
- **Formato**: PNG com transparência
- **Uso**: Ícone pequeno do app (lista de apps, notificações)
- **Peso máximo**: 50KB

### 2. `largeIcon.png`
- **Tamanho**: 130x130px (recomendado) - Pode ser até 256x256px
- **Formato**: PNG com transparência
- **Uso**: Ícone grande do app (launcher, destaque)
- **Peso máximo**: 100KB

### 3. `splash.png` (opcional)
- **Tamanho**: 1920x1080px (Full HD)
- **Formato**: PNG ou JPG
- **Uso**: Tela de splash inicial
- **Peso máximo**: 500KB

## 🎨 Diretrizes de Design

### Cores
- Use a identidade visual da Elias Empresas
- Cor principal: **#FF0000** (Vermelho)
- Fundo pode ser transparente ou branco

### Estilo
- Mantenha simplicidade e legibilidade
- Evite detalhes muito pequenos (TV é vista de longe)
- Use contraste adequado
- Teste em fundo escuro e claro

### Formato
- **PNG** com transparência é preferível
- Use compressão sem perda de qualidade
- Otimize o tamanho dos arquivos

## 🛠️ Como Criar os Ícones

### Opção 1: Design Manual

Você pode criar os ícones usando:
- Adobe Photoshop
- Adobe Illustrator
- Figma
- Inkscape (gratuito)
- GIMP (gratuito)

### Opção 2: Ferramenta Online

Use geradores de ícones online:
- https://icon.kitchen/
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

### Opção 3: Redimensionar Logo Existente

Se você já tem um logo:

```bash
# Usando ImageMagick (Linux/Mac)
convert logo.png -resize 80x80 icon.png
convert logo.png -resize 130x130 largeIcon.png
convert logo.png -resize 1920x1080 splash.png

# Ou usando Python com Pillow
pip install Pillow
python3 << EOF
from PIL import Image

# Abrir logo original
img = Image.open('logo.png')

# Criar ícones
img.resize((80, 80), Image.LANCZOS).save('icon.png')
img.resize((130, 130), Image.LANCZOS).save('largeIcon.png')
img.resize((1920, 1080), Image.LANCZOS).save('splash.png')
EOF
```

## 📁 Estrutura Completa

```
assets/
├── README-ASSETS.md     # Este arquivo
├── icon.png            # Ícone pequeno (80x80)
├── largeIcon.png       # Ícone grande (130x130)
├── splash.png          # Splash screen (1920x1080)
├── fonts/              # Fontes customizadas (opcional)
│   └── custom-font.ttf
└── images/             # Imagens adicionais (opcional)
    └── logo.svg
```

## ✅ Checklist

Antes de fazer o build, certifique-se de que você tem:

- [ ] `icon.png` (80x80px)
- [ ] `largeIcon.png` (130x130px)
- [ ] `splash.png` (1920x1080px) - opcional mas recomendado
- [ ] Todos os ícones estão otimizados (< 50KB cada)
- [ ] Testou os ícones em fundo escuro e claro
- [ ] Os ícones representam bem a marca Elias Empresas

## 🎯 Exemplo de Ícone

Um bom ícone para Launcher EE poderia conter:
- Logo/símbolo da Elias Empresas
- Cor vermelha (#FF0000) como destaque
- Texto "EE" ou "Launcher EE" (se couber)
- Design minimalista e moderno

## 🔴 Identidade Visual

**Cores Oficiais Elias Empresas:**
- Vermelho: #FF0000
- Preto: #000000
- Branco: #FFFFFF
- Cinza claro: #f8f9fa

## 📞 Precisa de Ajuda?

Se precisar de ajuda com design:
- Contate o departamento de marketing da Elias Empresas
- Email: suporte@eliasempresas.com
- Portal: https://portal.oliveira.eliasempresas.com

---

**Nota**: O aplicativo funcionará mesmo sem esses arquivos, mas os ícones padrão do webOS serão usados, o que não é ideal para um produto profissional.
