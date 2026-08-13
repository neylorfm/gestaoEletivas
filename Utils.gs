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
