# 📱 PWA - Progressive Web App

O ATLAS é um Progressive Web App (PWA) completo, oferecendo uma experiência nativa em dispositivos móveis e desktop.

## 🚀 Recursos PWA

- ✅ **Instalável** - Pode ser instalado na tela inicial do dispositivo
- ✅ **Offline First** - Funciona mesmo sem conexão à internet
- ✅ **Service Worker** - Cache inteligente de recursos
- ✅ **Responsivo** - Adapta-se perfeitamente a qualquer tamanho de tela
- ✅ **Rápido** - Carregamento instantâneo com cache
- ✅ **Seguro** - Requer HTTPS para instalação
- ✅ **Atalhos** - Acesso rápido ao Dashboard e páginas principais

## 📲 Como Instalar

### Android (Chrome)

1. Abra o site no Chrome
2. Um banner de instalação aparecerá automaticamente
3. Clique em **"Instalar Agora"**
4. Ou toque no menu ⋮ e selecione **"Instalar app"**
5. Confirme a instalação

### iOS (Safari)

1. Abra o site no Safari
2. Toque no ícone de **Compartilhar** (□↑)
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Confirme tocando em **"Adicionar"**

### Desktop (Chrome/Edge)

1. Abra o site no navegador
2. Clique no ícone ⊕ na barra de endereços
3. Ou vá em Menu → **"Instalar ATLAS"**
4. Confirme a instalação

## 🛠️ Configuração Técnica

### Service Worker

O Service Worker está configurado com estratégias de cache otimizadas:

- **APIs Supabase**: Network First (5min cache)
- **Imagens**: Cache First (30 dias)
- **Fontes**: Cache First (1 ano)
- **Assets JS/CSS**: Precaching automático

### Manifest

Configurado em `public/site.webmanifest`:
- Nome: ATLAS - Agende Serviços de Beleza e Bem-Estar
- Orientação: Portrait
- Display: Standalone
- Idioma: pt-BR
- Ícones: 192x192, 512x512 (com maskable)
- Atalhos: Dashboard, Agendar

### Meta Tags PWA

Meta tags otimizadas para iOS e Android em `index.html`:
```html
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="mobile-web-app-capable" content="yes" />
```

## 🧪 Testar Localmente

### Desenvolvimento

```bash
npm run dev
```

⚠️ **Nota**: O Service Worker está desabilitado em desenvolvimento para facilitar o debug.

### Build de Produção

```bash
npm run build
npm run preview
```

Para testar o PWA completo com Service Worker, use o preview após o build.

### Lighthouse

Execute o Lighthouse para validar o PWA:

1. Abra o DevTools (F12)
2. Vá para a aba **Lighthouse**
3. Selecione **Progressive Web App**
4. Clique em **Analyze page load**
5. Objetivo: Score 100/100 ✅

## 🔧 Troubleshooting

### O banner de instalação não aparece

- Verifique se está usando HTTPS
- Certifique-se que o Service Worker está registrado
- Limpe o cache do navegador
- Verifique se já não está instalado

### App não funciona offline

- Verifique se o Service Worker está ativo (DevTools → Application → Service Workers)
- Limpe o cache e recarregue
- Verifique a estratégia de cache no `vite.config.ts`

### Atualizações não aparecem

- O app usa `registerType: "prompt"` 
- Um prompt de atualização aparecerá quando houver nova versão
- Force a atualização indo em DevTools → Application → Service Workers → Update

### Ícones não aparecem corretamente

- Certifique-se que os arquivos PNG estão em `public/`
- Verifique os tamanhos: 192x192 e 512x512
- Para Android, use purpose: "maskable" para ícones adaptativos

## 📊 Monitoramento

### Verificar Instalação

Para rastrear instalações, monitore o evento `beforeinstallprompt`:

```javascript
window.addEventListener('beforeinstallprompt', (e) => {
  // Analytics: usuário elegível para instalação
});

window.addEventListener('appinstalled', () => {
  // Analytics: app foi instalado
});
```

### Service Worker Status

Verifique o status em DevTools:
- Chrome: DevTools → Application → Service Workers
- Firefox: about:debugging → This Firefox → Service Workers

## 🌐 Deploy

### Requisitos

- ✅ HTTPS obrigatório
- ✅ Certificado SSL válido
- ✅ Headers de cache configurados
- ✅ Gzip/Brotli compressão ativada

### Headers Recomendados

```
Cache-Control: public, max-age=31536000, immutable  # Assets estáticos
Cache-Control: no-cache                              # HTML
```

### Lovable Deploy

O PWA funciona automaticamente ao publicar via Lovable:
1. Clique em **Publish**
2. O app já estará disponível como PWA
3. HTTPS e certificado SSL incluídos

## 📚 Recursos Adicionais

- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

## 🎯 Checklist PWA

- [x] Manifest configurado
- [x] Service Worker registrado
- [x] Ícones em múltiplos tamanhos
- [x] Meta tags PWA
- [x] HTTPS configurado
- [x] Responsivo
- [x] Prompt de instalação customizado
- [x] Estratégias de cache otimizadas
- [x] Suporte iOS e Android
- [x] Offline fallback
- [x] Lighthouse score 100
