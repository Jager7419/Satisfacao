/**
 * App de avaliação com link/QR e token
 * Abas: "Respostas" (a sua) e "Tokens" (criada automaticamente se não existir).
 */

const SHEET_TOKENS = "Tokens";
const SHEET_RESPOSTAS = "Respostas";
const DEFAULT_MAX_USES = 1;           // 1 resposta por link
const DEFAULT_EXPIRATION_MIN = 1440;  // 24h (minutos)

/** Roteador de páginas:
 *  - sem parâmetros -> abre "Index" (tela do vendedor)
 *  - ?page=avaliar&t=TOKEN -> abre "Avaliar" (tela do cliente)
 */
function doGet(e) {
  ensureSheets_();
  const page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : "issuer";

  if (page === "avaliar") {
    const t = (e && e.parameter && e.parameter.t) ? String(e.parameter.t) : "";
    const tpl = HtmlService.createTemplateFromFile("Avaliar");
    tpl.token = t;
    return tpl.evaluate()
      .setTitle("Avaliação")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  } else {
    const tpl = HtmlService.createTemplateFromFile("Index"); // usa seu index.html
    tpl.baseUrl = ScriptApp.getService().getUrl();
    return tpl.evaluate()
      .setTitle("Gerar link/QR da Avaliação")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }
}

/** Cria as abas necessárias se não existirem */
function ensureSheets_() {
  const ss = SpreadsheetApp.getActive();

  let shT = ss.getSheetByName(SHEET_TOKENS);
  if (!shT) {
    shT = ss.insertSheet(SHEET_TOKENS);
    shT.getRange(1,1,1,9).setValues([[
      "token","vendedor","dav","criadoEm","expiraEm","usos","maxUsos","status","ipCriacao"
    ]]);
  }

  let shR = ss.getSheetByName(SHEET_RESPOSTAS);
  if (!shR) {
    shR = ss.insertSheet(SHEET_RESPOSTAS);
    shR.getRange(1,1,1,9).setValues([[
      "timestamp","token","vendedor","dav","nota","observacao","userAgent","ipEnvio","statusTokenAposEnvio"
    ]]);
  }
}

/** Gera token + URL + QR e grava em "Tokens" */
function gerarConvite(vendedor, dav, maxUsos, expiraEmMin) {
  vendedor = (vendedor || "").trim();
  dav = (dav || "").trim();
  if (!vendedor) throw new Error("Informe o nome do vendedor.");
  if (!dav) throw new Error("Informe o número do DAV/OS.");

  maxUsos = Number(maxUsos || DEFAULT_MAX_USES);
  expiraEmMin = Number(expiraEmMin || DEFAULT_EXPIRATION_MIN);

  const token  = Utilities.getUuid();
  const criado = new Date();
  const expira = new Date(Date.now() + expiraEmMin*60*1000);
  const url    = ScriptApp.getService().getUrl() + "?page=avaliar&t=" + encodeURIComponent(token);

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  sh.appendRow([token, vendedor, dav, criado, expira, 0, maxUsos, "ativo", _getCallerIP_()]);

  const qr = "https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=" + encodeURIComponent(url);
  return { url, qr, token, expiraEm: expira, maxUsos };
}

/** Valida token antes de mostrar o formulário ao cliente */
function validarToken(token) {
  if (!token) return { ok:false, motivo:"Token ausente." };
  const row = _findTokenRow_(token);
  if (!row) return { ok:false, motivo:"Token inválido." };

  const v = row.values;
  const expira  = v[4];
  const usos    = Number(v[5] || 0);
  const maxUsos = Number(v[6] || DEFAULT_MAX_USES);
  const status  = String(v[7] || "");

  if (status !== "ativo") return { ok:false, motivo:"Token não está ativo." };
  if (new Date(expira) < new Date()) return { ok:false, motivo:"Token expirado." };
  if (usos >= maxUsos) return { ok:false, motivo:"Token já utilizado." };

  return { ok:true, vendedor: v[1], dav: v[2], usos, maxUsos, expiraEm: expira };
}

/** Recebe a avaliação do cliente e consome 1 uso do token */
function enviarAvaliacao(token, nota, observacao, userAgent) {
  if (!token) throw new Error("Token ausente.");
  const row = _findTokenRow_(token);
  if (!row) throw new Error("Token inválido.");

  const v = row.values;
  const expira  = v[4];
  const usos    = Number(v[5] || 0);
  const maxUsos = Number(v[6] || DEFAULT_MAX_USES);
  const status  = String(v[7] || "");

  if (status !== "ativo") throw new Error("Token não está ativo.");
  if (new Date(expira) < new Date()) throw new Error("Token expirado.");
  if (usos >= maxUsos) throw new Error("Token já utilizado.");

  const vendedor = v[1], dav = v[2];

  const shR = SpreadsheetApp.getActive().getSheetByName(SHEET_RESPOSTAS);
  shR.appendRow([new Date(), token, vendedor, dav, Number(nota), (observacao||""), String(userAgent||""), _getCallerIP_(), "ok"]);

  const shT = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  const novoUsos   = usos + 1;
  const novoStatus = (novoUsos >= maxUsos) ? "usado" : "ativo";
  shT.getRange(row.row, 6, 1, 2).setValues([[novoUsos, maxUsos]]);
  shT.getRange(row.row, 8).setValue(novoStatus);

  return { ok:true, vendedor, dav, restante: Math.max(0, maxUsos - novoUsos), status: novoStatus };
}

/** Encerrar um token manualmente (opcional) */
function encerrarToken(token) {
  const r = _findTokenRow_(token);
  if (!r) throw new Error("Token não encontrado.");
  SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS).getRange(r.row, 8).setValue("encerrado");
  return { ok:true };
}

/* ===== helpers ===== */
function _findTokenRow_(token) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(token)) return {row: i+1, values: data[i]};
  return null;
}
function _getCallerIP_(){ try { return Session.getActiveUserLocale() || ""; } catch(e){ return ""; } } // Apps Script não expõe IP real
