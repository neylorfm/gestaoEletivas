/**
 * Arquivo IntegrityController.gs
 * Controla as rotinas de integridade e sincronização do banco de dados (Planilha).
 */

/**
 * Atualiza a regra de Validação de Dados (Dropdown) na coluna A da aba ENTURMACAO,
 * garantindo que apenas matrículas existentes na BASE_ALUNOS possam ser inseridas.
 */
function atualizarDropdownMatriculas() {
  var abaBase = getPlanilha('BASE_ALUNOS');
  if (!abaBase) throw new Error("Aba BASE_ALUNOS não encontrada.");
  
  var abaDb = getPlanilha('ENTURMACAO');
  if (!abaDb) throw new Error("Aba ENTURMACAO não encontrada.");
  
  // 1. Lê as matrículas da BASE_ALUNOS (coluna A), ignorando o cabeçalho na linha 1
  var lastRowBase = abaBase.getLastRow();
  if (lastRowBase < 2) return; // Nenhuma matrícula cadastrada na base
  
  var valoresBase = abaBase.getRange(2, 1, lastRowBase - 1, 1).getValues();
  var matriculasAtivas = [];
  
  // Remove valores vazios
  for (var i = 0; i < valoresBase.length; i++) {
    var matricula = valoresBase[i][0];
    if (matricula !== "") {
      matriculasAtivas.push(matricula);
    }
  }
  
  // 2. Constrói a regra de validação de dados
  var regraValidacao = SpreadsheetApp.newDataValidation()
    .requireValueInList(matriculasAtivas, true) // true para exibir como Dropdown
    .setAllowInvalid(false) // Impede a digitação de uma matrícula que não esteja na lista
    .setHelpText('Insira uma Matrícula válida cadastrada na aba BASE_ALUNOS.')
    .build();
    
  // 3. Aplica a validação na aba ENTURMACAO, coluna A, da linha 2 até o limite da planilha
  var maxRowsDb = abaDb.getMaxRows();
  if (maxRowsDb >= 2) {
    var rangeAlvo = abaDb.getRange(2, 1, maxRowsDb - 1, 1);
    rangeAlvo.setDataValidation(regraValidacao);
  }
}

/**
 * Função central para rodar rotinas de integridade no sistema.
 * Pode ser acionada por um Menu ou por um Gatilho de Tempo (Time-Driven Trigger).
 */
function sincronizarSistema() {
  // Chama a nova função de sincronização de Matrículas (Tarefa 8.2)
  atualizarDropdownMatriculas();
  
  // --- Espaço reservado para outras validações e sincronizações que possam existir ---
  // ex: atualizarDropdownTurmas();
  // ex: verificarConsistenciaEletivas();
  
  Logger.log("Sincronização do sistema executada com sucesso.");
}
