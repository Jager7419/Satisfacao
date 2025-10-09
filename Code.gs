/** CONFIGURAÇÃO **/
const SHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
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

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ping: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
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
