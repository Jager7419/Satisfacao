/** CONFIGURAÇÃO **/
const SHEET_ID = '1L8gfo_ceImSRrYtkm1O7vT9RjmYv0TSMc0jPqIU28RM';
const SHEET_NAME = 'Respostas';

/** Util: garante a aba e o cabeçalho **/
function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'timestamp', 'colaborador', 'dav',
      'atendimento_rating', 'sug_atendimento',
      'user_agent', 'page_url', 'timezone'
    ]);
  }
  return sh;
}

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
    const tpl = HtmlService.createTemplateFromFile("Issuer");
    tpl.baseUrl = ScriptApp.getService().getUrl();
    return tpl.evaluate()
      .setTitle("Gerar link/QR da Avaliação")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }
}


/** Recebe POST do formulário (application/x-www-form-urlencoded) **/
function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const row = [
      new Date(),
      (p.colaborador || '').toString(),
      (p.dav || p.davos || p.dav_os || '').toString(),
      Number(p.atendimento_rating || 0),
      (p.sug_atendimento || '').toString(),
      (p.ua || '').toString(),
      (p.pageUrl || '').toString(),
      (p.tz || '').toString()
    ];

    const sh = getSheet_();
    sh.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

const SHEET_TOKENS = "Tokens";
const SHEET_RESPOSTAS = "Respostas";
const DEFAULT_MAX_USES = 1;           // 1 resposta por link
const DEFAULT_EXPIRATION_MIN = 1440;  // 24h

function ensureSheets_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_TOKENS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_TOKENS);
    sh.getRange(1,1,1,9).setValues([[ "token","vendedor","dav","criadoEm","expiraEm","usos","maxUsos","status","ipCriacao" ]]);
  }
  let sr = ss.getSheetByName(SHEET_RESPOSTAS);
  if (!sr) {
    sr = ss.insertSheet(SHEET_RESPOSTAS);
    sr.getRange(1,1,1,9).setValues([[ "timestamp","token","vendedor","dav","nota","observacao","userAgent","ipEnvio","statusTokenAposEnvio" ]]);
  }
}

function _findTokenRow_(token) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(token)) return {row: i+1, values: data[i]};
  return null;
}
function _now_(){ return new Date(); }
function _futureMinutes_(m){ return new Date(_now_().getTime() + m*60*1000); }
function _getCallerIP_(){ try { return Session.getActiveUserLocale() || ""; } catch(e){ return ""; } } // Apps Script não expõe IP real

function gerarConvite(vendedor, dav, maxUsos, expiraEmMin) {
  vendedor = (vendedor || "").trim();
  dav = (dav || "").trim();
  if (!vendedor) throw new Error("Informe o nome do vendedor.");
  if (!dav) throw new Error("Informe o número do DAV/OS.");
  maxUsos = Number(maxUsos || DEFAULT_MAX_USES);
  expiraEmMin = Number(expiraEmMin || DEFAULT_EXPIRATION_MIN);

  const token = Utilities.getUuid();
  const criado = _now_();
  const expira = _futureMinutes_(expiraEmMin);
  const url = ScriptApp.getService().getUrl() + "?page=avaliar&t=" + encodeURIComponent(token);

  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  sh.appendRow([token, vendedor, dav, criado, expira, 0, maxUsos, "ativo", _getCallerIP_()]);

  const qr = "https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=" + encodeURIComponent(url);
  return { url, qr, token, expiraEm: expira, maxUsos };
}

function validarToken(token) {
  if (!token) return { ok:false, motivo:"Token ausente." };
  const row = _findTokenRow_(token);
  if (!row) return { ok:false, motivo:"Token inválido." };

  const v = row.values;
  const expira = v[4], usos = Number(v[5]||0), maxUsos = Number(v[6]||DEFAULT_MAX_USES), status = String(v[7]||"");
  if (status !== "ativo") return { ok:false, motivo:"Token não está ativo." };
  if (new Date(expira) < _now_()) return { ok:false, motivo:"Token expirado." };
  if (usos >= maxUsos) return { ok:false, motivo:"Token já utilizado." };

  return { ok:true, vendedor: v[1], dav: v[2], usos, maxUsos, expiraEm: expira };
}

function enviarAvaliacao(token, nota, observacao, userAgent) {
  if (!token) throw new Error("Token ausente.");
  const row = _findTokenRow_(token);
  if (!row) throw new Error("Token inválido.");

  const v = row.values;
  const expira = v[4], usos = Number(v[5]||0), maxUsos = Number(v[6]||DEFAULT_MAX_USES), status = String(v[7]||"");
  if (status !== "ativo") throw new Error("Token não está ativo.");
  if (new Date(expira) < _now_()) throw new Error("Token expirado.");
  if (usos >= maxUsos) throw new Error("Token já utilizado.");

  const vendedor = v[1], dav = v[2];

  const shR = SpreadsheetApp.getActive().getSheetByName(SHEET_RESPOSTAS);
  shR.appendRow([new Date(), token, vendedor, dav, Number(nota), (observacao||""), String(userAgent||""), _getCallerIP_(), "ok"]);

  const shT = SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS);
  const novoUsos = usos + 1;
  const novoStatus = (novoUsos >= maxUsos) ? "usado" : "ativo";
  shT.getRange(row.row, 6, 1, 2).setValues([[novoUsos, maxUsos]]);
  shT.getRange(row.row, 8).setValue(novoStatus);

  return { ok:true, vendedor, dav, restante: Math.max(0, maxUsos - novoUsos), status: novoStatus };
}

// Opcional: encerrar manualmente um token
function encerrarToken(token) {
  const r = _findTokenRow_(token);
  if (!r) throw new Error("Token não encontrado.");
  SpreadsheetApp.getActive().getSheetByName(SHEET_TOKENS).getRange(r.row, 8).setValue("encerrado");
  return { ok:true };
}
