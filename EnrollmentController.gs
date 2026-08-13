/**
 * Arquivo EnrollmentController.gs
 * Backend para a interface interativa de Enturmação da Secretaria.
 */

/**
 * Coleta os dados essenciais das abas para alimentar o Front-end.
 * @returns {Object} { eletivas: [], turmas: [], alunos: [] }
 */
function getDadosEnturmacaoUI() {
  var configSheet = getPlanilha('CONFIG_GERAL');
  var baseSheet = getPlanilha('BASE_ALUNOS');
  
  if (!configSheet || !baseSheet) {
    throw new Error("Planilhas de configuração (CONFIG_GERAL) ou base de alunos (BASE_ALUNOS) não encontradas.");
  }
  
  // 1. Coleta Eletivas
  var configData = configSheet.getDataRange().getValues();
  var eletivas = [];
  for (var i = 1; i < configData.length; i++) {
    var idEletiva = configData[i][1]; // Coluna B
    var nomeEletiva = configData[i][2]; // Coluna C
    if (idEletiva) {
      eletivas.push({
        id: idEletiva,
        nome: nomeEletiva
      });
    }
  }
  
  // 2. Coleta Alunos e Turmas
  var baseData = baseSheet.getDataRange().getValues();
  var turmasMap = {};
  var alunos = [];
  
  for (var j = 1; j < baseData.length; j++) {
    var matricula = baseData[j][0]; // Coluna A
    var nome = baseData[j][1];      // Coluna B
    var turma = baseData[j][2];     // Coluna C
    
    if (matricula) {
      matricula = matricula.toString();
      turmasMap[turma] = true;
      alunos.push({
        matricula: matricula,
        nome: nome,
        turma: turma
      });
    }
  }
  
  // Transforma o mapa de turmas em array ordenado
  var turmasUnicas = Object.keys(turmasMap).filter(String).sort();
  
  return {
    eletivas: eletivas,
    turmas: turmasUnicas,
    alunos: alunos
  };
}

/**
 * Lê a aba ENTURMACAO e retorna a lista de enturmações atuais para a tabela.
 * @returns {Array} [{matricula, nome, turma, idEletiva}]
 */
function getAlunosEnturmados() {
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var enturmacoes = [];
  
  for (var i = 1; i < data.length; i++) {
    var matricula = data[i][0];
    if (matricula) {
      enturmacoes.push({
        matricula: matricula.toString(),
        nome: data[i][1], // Fórmula
        turma: data[i][2], // Fórmula
        idEletiva: data[i][3]
      });
    }
  }
  return enturmacoes;
}

/**
 * Salva ou atualiza a enturmação de um aluno.
 * Escreve na coluna A, B, C e D (abandonando fórmulas PROCV).
 */
function salvarEnturmacao(matricula, idEletiva, oldIdEletiva) {
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) throw new Error("Aba ENTURMACAO não encontrada.");
  
  var baseSheet = getPlanilha('BASE_ALUNOS');
  if (!baseSheet) throw new Error("Aba BASE_ALUNOS não encontrada.");
  
  var stringMatricula = matricula.toString();
  
  // 1. Busca Nome e Turma na BASE_ALUNOS
  var baseData = baseSheet.getDataRange().getValues();
  var nomeAluno = "";
  var turmaAluno = "";
  for (var j = 1; j < baseData.length; j++) {
    if (baseData[j][0].toString() === stringMatricula) {
      nomeAluno = baseData[j][1];
      turmaAluno = baseData[j][2];
      break;
    }
  }
  
  var data = sheet.getDataRange().getValues();
  
  // Verifica se já existe na mesma eletiva (impede duplicação)
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === stringMatricula && data[i][3] == idEletiva) {
      throw new Error("Aluno já está matriculado nesta eletiva.");
    }
  }
  
  // Se está trocando de eletiva (oldIdEletiva foi informado)
  if (oldIdEletiva && oldIdEletiva !== idEletiva) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === stringMatricula && data[i][3] == oldIdEletiva) {
        var rowIndex = i + 1;
        sheet.getRange(rowIndex, 1, 1, 4).setValues([[stringMatricula, nomeAluno, turmaAluno, idEletiva]]);
        if (typeof atualizarControleTurmas === 'function') {
          atualizarControleTurmas(oldIdEletiva);
          atualizarControleTurmas(idEletiva);
        }
        return "Eletiva do aluno " + stringMatricula + " atualizada com sucesso!";
      }
    }
  }
  
  // Inserção (Aluno em nova eletiva)
  // Descobre a primeira linha vazia da coluna A
  var columnA = sheet.getRange("A:A").getValues();
  var novaLinha = 1;
  for (var i = 0; i < columnA.length; i++) {
    if (columnA[i][0] === "") {
      novaLinha = i + 1;
      break;
    }
  }
  if (novaLinha === 1) novaLinha = columnA.length + 1; // Fallback
  
  // Escreve os 4 dados na nova linha
  sheet.getRange(novaLinha, 1, 1, 4).setValues([[stringMatricula, nomeAluno, turmaAluno, idEletiva]]);
  
  if (typeof atualizarControleTurmas === 'function') {
    atualizarControleTurmas(idEletiva);
  }
  
  return "Aluno " + stringMatricula + " matriculado na eletiva com sucesso!";
}

/**
 * Exclui a linha de um aluno na aba ENTURMACAO.
 */
function removerEnturmacao(matricula, idEletiva) {
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) throw new Error("Aba ENTURMACAO não encontrada.");
  
  var stringMatricula = matricula.toString();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === stringMatricula && data[i][3] == idEletiva) {
      var rowIndex = i + 1;
      sheet.deleteRow(rowIndex);
      
      if (typeof atualizarControleTurmas === 'function') {
        atualizarControleTurmas(idEletiva);
      }
      return "Desmatriculado com sucesso!";
    }
  }
  throw new Error("Matrícula e Eletiva não encontradas na planilha de Enturmação.");
}

/**
 * Enturma todos os alunos de uma turma regular em uma eletiva em lote.
 * Ignora alunos que já estejam matriculados nesta mesma eletiva para evitar duplicações.
 * @param {string} turma Nome da Turma Regular
 * @param {string} idEletiva ID da Eletiva
 * @returns {string} Mensagem com o resultado
 */
function salvarEnturmacaoTurma(turma, idEletiva) {
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) throw new Error("Aba ENTURMACAO não encontrada.");
  
  var baseSheet = getPlanilha('BASE_ALUNOS');
  if (!baseSheet) throw new Error("Aba BASE_ALUNOS não encontrada.");
  
  // 1. Busca todos os alunos da turma na BASE_ALUNOS
  var baseData = baseSheet.getDataRange().getValues();
  var alunosTurma = [];
  for (var j = 1; j < baseData.length; j++) {
    var mat = baseData[j][0];
    var nome = baseData[j][1];
    var t = baseData[j][2];
    if (mat && t === turma) {
      alunosTurma.push({
        matricula: mat.toString(),
        nome: nome,
        turma: t
      });
    }
  }
  
  if (alunosTurma.length === 0) {
    throw new Error("Nenhum aluno encontrado para a turma " + turma + " na BASE_ALUNOS.");
  }
  
  // 2. Lê ENTURMACAO para checar duplicidades
  var entData = sheet.getDataRange().getValues();
  var jaMatriculadosMap = {};
  for (var i = 1; i < entData.length; i++) {
    var m = entData[i][0] ? entData[i][0].toString() : '';
    var el = entData[i][3];
    if (m && el == idEletiva) {
      jaMatriculadosMap[m] = true;
    }
  }
  
  // 3. Monta as novas linhas a inserir
  var novasLinhas = [];
  var qtdIgnorados = 0;
  
  for (var a = 0; a < alunosTurma.length; a++) {
    var al = alunosTurma[a];
    if (jaMatriculadosMap[al.matricula]) {
      qtdIgnorados++;
    } else {
      novasLinhas.push([al.matricula, al.nome, al.turma, idEletiva]);
      jaMatriculadosMap[al.matricula] = true;
    }
  }
  
  if (novasLinhas.length === 0) {
    return "Todos os " + alunosTurma.length + " alunos da turma " + turma + " já estão matriculados nesta eletiva.";
  }
  
  // 4. Descobre a primeira linha livre da coluna A
  var columnA = sheet.getRange("A:A").getValues();
  var startRow = 1;
  for (var i = 0; i < columnA.length; i++) {
    if (columnA[i][0] === "") {
      startRow = i + 1;
      break;
    }
  }
  if (startRow === 1) startRow = columnA.length + 1;
  
  // 5. Escreve em lote (Batch write)
  sheet.getRange(startRow, 1, novasLinhas.length, 4).setValues(novasLinhas);
  
  if (typeof atualizarControleTurmas === 'function') {
    atualizarControleTurmas(idEletiva);
  }
  
  var msg = novasLinhas.length + " aluno(s) da turma " + turma + " foram enturmados com sucesso na eletiva!";
  if (qtdIgnorados > 0) {
    msg += " (" + qtdIgnorados + " já estavam matriculados).";
  }
  return msg;
}
