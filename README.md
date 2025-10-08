# App de Satisfação do Cliente (HTML + Google Apps Script)

Este pacote contém:
- `index.html` (publique via GitHub Pages)
- `Code.gs` (Google Apps Script para registrar respostas na planilha)

## Como publicar

1. **Planilha (Google Sheets)**
   - Crie uma planilha no Google Sheets.
   - Copie o **ID** (parte entre `/d/` e `/edit` na URL).
2. **Apps Script**
   - Acesse https://script.google.com → `Novo projeto`.
   - Cole o conteúdo de `Code.gs`.
   - Substitua `SHEET_ID` pelo ID da sua planilha.
   - `Implantar` → `Nova implantação` → Tipo: **Aplicativo da Web**.
   - **Executar como**: Você | **Quem tem acesso**: Qualquer pessoa com o link.
   - Copie a URL que termina com `/exec`.
3. **GitHub Pages**
   - Crie um repositório (ex.: `cliente-satisfacao-app`).
   - Envie o `index.html` para a raiz do repositório.
   - Em *Settings* → *Pages* → *Deploy from branch*, selecione a branch (ex.: `main`) e a pasta `/root`.
   - Acesse a URL `https://SEU_USUARIO.github.io/SEU_REPO/`.
4. **Configurar o HTML**
   - No `index.html`, substitua `APPS_SCRIPT_URL` pela URL do passo 2.

## Campos gravados
- `timestamp`, `colaborador`, `atendimento_rating` (1-5), `servico_rating` (1-5),
  `sug_atendimento`, `sug_servico`, `user_agent`, `page_url`, `timezone`.

## Observações
- A coleta é **anônima** (nenhum campo de identificação pessoal).
- Requisição usa `application/x-www-form-urlencoded` (evita problemas de CORS).
- Para reiniciar e enviar outra resposta, há um link pós-envio.
