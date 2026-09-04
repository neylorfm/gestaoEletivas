/**
 * Arquivo Utils.gs
 * Utilitários gerais para o Sistema de Gestão de Eletivas.
 */

/**
 * Gera um UUID simples no formato 'xxxx-xxxx'
 * @returns {string} UUID
 */
function generateUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + '-' + s4();
}

/**
 * Retorna o objeto Sheet de forma segura pelo nome da aba.
 * @param {string} nome Nome da Aba/Planilha
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} O objeto Sheet ou null se não encontrar
 */
function getPlanilha(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return null;
  }
  return ss.getSheetByName(nome);
}

/**
 * Constante que mapeia os índices das colunas da Aba Dinâmica.
 * Os índices são baseados em 1 (1-based) para compatibilidade com os métodos do Google Sheets API.
 */
const COLUNAS = {
  ID_AULA: 1,         // A
  DATA: 2,            // B
  PERIODO: 3,         // C
  QTD_FALTAS: 4,      // D
  SEPARADOR: 5,       // E
  ID_REGISTRO: 6,     // F
  MATRICULA: 7,       // G
  NOME_ALUNO: 8,      // H
  TIPO_OCORRENCIA: 9  // I
};

/**
 * Atualiza o Controle de Turmas na célula K1 da aba dinâmica da Eletiva.
 * @param {string} idEletiva O ID da Eletiva Atual
 */
function atualizarControleTurmas(idEletiva) {
  // Garante que todas as modificações pendentes (como deleteRow e setValues) sejam efetivadas 
  // antes de lermos os dados novamente.
  SpreadsheetApp.flush();

  var sheetEletiva = getPlanilha(idEletiva.toString());
  if (!sheetEletiva) return; // A aba dinâmica ainda não foi criada, ignorar.
  
  var abaEnturmacao = getPlanilha('ENTURMACAO');
  if (!abaEnturmacao) return;
  
  var data = abaEnturmacao.getDataRange().getValues();
  var turmasMap = {};
  
  // Pula cabeçalho
  for (var i = 1; i < data.length; i++) {
    var idAtual = data[i][3]; // Coluna D
    if (idAtual == idEletiva) {
      var turma = data[i][2]; // Coluna C
      if (turma) turmasMap[turma] = true;
    }
  }
  
  var turmasUnicas = Object.keys(turmasMap).sort();
  var turmasString = turmasUnicas.join(', ');
  
  sheetEletiva.getRange("K1").setValue(turmasString);
}

/**
 * Sanitiza e formata um valor de nota vindo do Google Sheets.
 * Corrige o problema clássico onde valores decimais digitados com ponto (ex: 9.4 ou 1.9)
 * são convertidos automaticamente pelo Google Sheets brasileiro em datas (09/04 ou 01/09).
 * @param {*} raw Valor original da célula
 * @returns {string} Nota no formato "0.0" a "10.0" ou "" se vazia/inválida
 */
function sanitizarNotaFinal(raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  
  if (raw instanceof Date) {
    var dia = raw.getDate();
    var mes = raw.getMonth() + 1;
    var notaNum = parseFloat(dia + '.' + mes);
    if (!isNaN(notaNum) && notaNum >= 0 && notaNum <= 10) {
      return notaNum.toFixed(1);
    }
    return '';
  }
  
  var str = raw.toString().trim();
  if (str === '') return '';
  
  // Se contiver string de data previamente serializada (ex: "Thu Apr 09 2026...")
  if (str.includes('GMT') || str.includes('00:00:00') || /^[A-Za-z]{3}\s[A-Za-z]{3}\s\d{2}/.test(str)) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      var dia = d.getDate();
      var mes = d.getMonth() + 1;
      var notaNum = parseFloat(dia + '.' + mes);
      if (!isNaN(notaNum) && notaNum >= 0 && notaNum <= 10) {
        return notaNum.toFixed(1);
      }
    }
    return '';
  }
  
  var num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num) && num >= 0 && num <= 10) {
    return (Math.round(num * 10) / 10).toFixed(1);
  }
  
  return '';
}
