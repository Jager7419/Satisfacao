# App de Satisfação (Atendimento)

Avaliação **somente do atendimento** (1–5 via emojis), com seleção de **colaborador** (Lucas, Cristian, José Neto, Augusto) e **número DAV/DAVOS** (referência). Inclui PWA para instalar no celular.

## Publicação rápida
1. **Planilha**: crie uma no Google Sheets (aba `Respostas`).   Se a aba estiver vazia, o script cria cabeçalho:    `timestamp | colaborador | dav | atendimento_rating | sug_atendimento | user_agent | page_url | timezone`.
2. **Apps Script**: cole `Code.gs`, ajuste `SHEET_ID`, implante como **Aplicativo da Web** (Você | Qualquer pessoa). Copie a URL `/exec`.
3. **HTML**: em `index.html`, ajuste `APPS_SCRIPT_URL` com a URL `/exec`.
4. **GitHub Pages**: suba **index.html**, `manifest.webmanifest`, `sw.js`, pasta `icons/`. Ative Pages (deploy from branch).

## Campos gravados
- `colaborador`, `dav`, `atendimento_rating`, `sug_atendimento` (+ metadados).

## PWA
- `manifest.webmanifest`, `sw.js` e ícones já prontos. No Android, aparece **Instalar no celular**.
