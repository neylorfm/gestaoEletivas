/**
 * Arquivo ConfigEletivaController.gs
 * Lida com as ações do Web App para gerenciamento das configurações de eletivas (aba CONFIG_GERAL).
 */

/**
 * Lê a aba CONFIG_GERAL e retorna todas as eletivas cadastradas com seus respectivos status.
 * @returns {Array} Array de objetos de eletivas
 */
function getConfigEletivas() {
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var resultados = [];
  
  // Pula cabeçalho (linha 1)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var idEletiva = row[1];
    if (!idEletiva) continue;
    
    var rawStatus = row[0] ? row[0].toString().trim().toUpperCase() : '';
    var status = (rawStatus === 'INATIVA') ? 'INATIVA' : 'ATIVA';
    
    var eletiva = {
      rowIndex: i + 1,
      status: status,
      idEletiva: idEletiva.toString().trim(),
      nomeEletiva: row[2] ? row[2].toString() : '',
      nomeProfessor: row[3] ? row[3].toString() : '',
      emailProfessor: row[4] ? row[4].toString() : '',
      dias: []
    };
    
    var qtdDias = parseInt(row[5]) || 0;
    var index = 6; // Coluna G (0-based = 6)
    for (var j = 0; j < qtdDias; j++) {
      var dia = row[index] ? row[index].toString().trim() : '';
      var periodosStr = row[index+1] ? row[index+1].toString().trim() : '';
      
      if (dia) {
        eletiva.dias.push({
          dia: dia,
          periodos: periodosStr
        });
      }
      index += 2;
    }
    resultados.push(eletiva);
  }
  return resultados;
}

/**
 * Salva ou Atualiza uma eletiva na aba CONFIG_GERAL.
 * Suporta definição de status (ATIVA ou INATIVA).
 * Para eletivas inativas, professor/e-mail são limpos para manter a integridade do catálogo.
 * @param {Object} eletiva Dados da eletiva
 * @returns {string} Mensagem de retorno
 */
function salvarConfigEletiva(eletiva) {
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) return "Erro: Aba CONFIG_GERAL não encontrada.";
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  if (eletiva.idEletiva) {
    // Verifica se a eletiva já existe (Edição)
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim().toUpperCase() === eletiva.idEletiva.toString().trim().toUpperCase()) {
        rowIndex = i + 1;
        break;
      }
    }
  } else {
    // Cria um ID novo e garante unicidade
    var isUnique = false;
    var novoId = "";
    while (!isUnique) {
      novoId = 'ELET' + Math.floor(Math.random() * 90000 + 10000);
      isUnique = true;
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === novoId) {
          isUnique = false;
          break;
        }
      }
    }
    eletiva.idEletiva = novoId;
  }
  
  var status = (eletiva.status || 'ATIVA').toString().trim().toUpperCase();
  if (status !== 'INATIVA') status = 'ATIVA';
  
  var nomeProf = status === 'INATIVA' ? '' : (eletiva.nomeProfessor ? eletiva.nomeProfessor.toString().trim() : '');
  var emailProf = status === 'INATIVA' ? '' : (eletiva.emailProfessor ? eletiva.emailProfessor.toString().trim() : '');
  var dias = eletiva.dias || [];
  
  // Monta a nova linha
  var novaLinha = [
    status, // Coluna A: Status (ATIVA / INATIVA)
    eletiva.idEletiva.toUpperCase(), // Coluna B: ID da Eletiva
    eletiva.nomeEletiva, // Coluna C: Nome da Eletiva
    nomeProf, // Coluna D: Nome do Professor
    emailProf, // Coluna E: Email do Professor
    dias.length // Coluna F: Quantidade de Dias
  ];
  
  // Achata os dias e períodos nas colunas subsequentes
  for (var d = 0; d < dias.length; d++) {
    novaLinha.push(dias[d].dia);
    novaLinha.push(dias[d].periodos);
  }
  
  // Se encontrou a linha, atualiza
  if (rowIndex !== -1) {
    // Primeiro limpamos a linha inteira para evitar que dados velhos sobrem no final
    var lastCol = Math.max(sheet.getLastColumn(), novaLinha.length);
    sheet.getRange(rowIndex, 1, 1, lastCol).clearContent();
    sheet.getRange(rowIndex, 1, 1, novaLinha.length).setValues([novaLinha]);
    return "Eletiva " + eletiva.idEletiva + " salva com sucesso (" + status + ")!";
  } else {
    // Se não encontrou, insere no final
    sheet.appendRow(novaLinha);
    return "Eletiva " + eletiva.idEletiva + " cadastrada com sucesso (" + status + ")!";
  }
}

/**
 * Obtém ou cria a planilha de backup histórico no Google Drive (sem scripts).
 * @returns {Spreadsheet} Objeto Spreadsheet da planilha de backup
 */
function obterOuCriarPlanilhaBackup() {
  var props = PropertiesService.getScriptProperties();
  var backupId = props.getProperty('BACKUP_SPREADSHEET_ID');
  var backupSpreadsheet = null;
  
  if (backupId) {
    try {
      backupSpreadsheet = SpreadsheetApp.openById(backupId);
    } catch(e) {
      backupSpreadsheet = null;
    }
  }
  
  if (!backupSpreadsheet) {
    var ssAtual = SpreadsheetApp.getActiveSpreadsheet();
    var nomeBackup = "Backup - Histórico de Eletivas";
    
    // Tenta localizar na mesma pasta do Google Drive
    try {
      var fileAtual = DriveApp.getFileById(ssAtual.getId());
      var pastas = fileAtual.getParents();
      if (pastas.hasNext()) {
        var pastaDestino = pastas.next();
        var files = pastaDestino.getFilesByName(nomeBackup);
        if (files.hasNext()) {
          backupSpreadsheet = SpreadsheetApp.openById(files.next().getId());
        }
      }
    } catch(e) {}
    
    // Se não encontrou, cria a nova planilha estática (sem scripts)
    if (!backupSpreadsheet) {
      backupSpreadsheet = SpreadsheetApp.create(nomeBackup);
      try {
        var fileAtual = DriveApp.getFileById(ssAtual.getId());
        var pastas = fileAtual.getParents();
        if (pastas.hasNext()) {
          var pastaDestino = pastas.next();
          var fileBackup = DriveApp.getFileById(backupSpreadsheet.getId());
          pastaDestino.addFile(fileBackup);
          DriveApp.getRootFolder().removeFile(fileBackup);
        }
      } catch(e) {}
      
      var sheetPadrao = backupSpreadsheet.getSheets()[0];
      if (sheetPadrao) {
        sheetPadrao.setName("LEIA-ME");
        sheetPadrao.getRange("A1").setValue("📚 BACKUP HISTÓRICO DE FREQUÊNCIAS DE ELETIVAS");
        sheetPadrao.getRange("A2").setValue("Esta planilha contém o histórico de registros de chamadas das eletivas de semestres anteriores.");
        sheetPadrao.getRange("A3").setValue("Gerada automaticamente pelo Sistema de Gestão de Eletivas.");
        sheetPadrao.getRange("A1").setFontWeight("bold").setFontSize(13).setFontColor("#1a73e8");
        sheetPadrao.getRange("A2:A3").setFontColor("#5f6368").setFontSize(11);
      }
    }
    
    props.setProperty('BACKUP_SPREADSHEET_ID', backupSpreadsheet.getId());
  }
  
  return backupSpreadsheet;
}

/**
 * Obtém informações da planilha de backup atualmente configurada.
 * @returns {Object} { id, nome, url }
 */
function getInfoPlanilhaBackup() {
  try {
    var ssBackup = obterOuCriarPlanilhaBackup();
    return {
      status: 'SUCCESS',
      id: ssBackup.getId(),
      nome: ssBackup.getName(),
      url: ssBackup.getUrl()
    };
  } catch(e) {
    return { 
      status: 'ERROR',
      id: '', 
      nome: 'Backup - Histórico de Eletivas (será criada automaticamente)', 
      url: '',
      erro: e.message 
    };
  }
}

/**
 * Permite ao usuário escolher/definir uma planilha de backup customizada informando o link ou ID.
 * @param {string} urlOuId Link completo ou ID do Google Sheets
 * @returns {Object} { status: 'SUCCESS'|'ERROR', message: string, id: string, nome: string, url: string }
 */
function definirPlanilhaBackupCustomizada(urlOuId) {
  if (!urlOuId) throw new Error("Por favor, cole o Link (URL) ou ID da planilha do Google Sheets.");
  
  var idExtraido = urlOuId.toString().trim();
  // Se for uma URL do tipo https://docs.google.com/spreadsheets/d/XXXXX/edit
  var match = idExtraido.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    idExtraido = match[1];
  }
  
  try {
    var ss = SpreadsheetApp.openById(idExtraido);
    PropertiesService.getScriptProperties().setProperty('BACKUP_SPREADSHEET_ID', idExtraido);
    return {
      status: 'SUCCESS',
      message: 'Planilha de backup configurada com sucesso: "' + ss.getName() + '"!',
      id: idExtraido,
      nome: ss.getName(),
      url: ss.getUrl()
    };
  } catch(e) {
    throw new Error("Não foi possível acessar a planilha. Verifique se o link/ID está correto e se sua conta tem permissão de edição nela: " + e.message);
  }
}

/**
 * Desativa uma eletiva, arquivando suas frequências para uma planilha de backup externa.
 * Adiciona ao nome da aba arquivada o sufixo _Ano.Semestre (ex: ELET99536_2026.2).
 * Remove 100% automaticamente os alunos vinculados na aba ENTURMACAO.
 * @param {Object} payload { idEletiva, anoLetivo, semestre, moverBackup, novaUrlBackup }
 * @returns {Object} { status, message, backupUrl, nomeAbaBackup }
 */
function desativarConfigEletiva(payload) {
  var idEletiva = payload && payload.idEletiva ? payload.idEletiva.toString().trim() : (typeof payload === 'string' ? payload : '');
  var anoLetivo = (payload && payload.anoLetivo) ? payload.anoLetivo.toString().trim() : new Date().getFullYear().toString();
  var semestre = (payload && payload.semestre) ? payload.semestre.toString().trim() : "1";
  var moverBackup = payload && payload.moverBackup !== undefined ? payload.moverBackup : true;
  
  // Se informou uma nova planilha de backup no payload, atualiza
  if (payload && payload.novaUrlBackup) {
    definirPlanilhaBackupCustomizada(payload.novaUrlBackup);
  }
  
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) throw new Error("Aba CONFIG_GERAL não encontrada.");
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var nomeEletiva = idEletiva;
  var professoresStr = "";
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim().toUpperCase() === idEletiva.toUpperCase()) {
      rowIndex = i + 1;
      nomeEletiva = data[i][2] || idEletiva;
      professoresStr = data[i][3] || "";
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error("Eletiva não encontrada na CONFIG_GERAL.");
  
  // Extrai lista de professores separados por vírgula
  var profsList = [];
  if (professoresStr) {
    profsList = professoresStr.toString().split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
  }

  // 1. Marca como INATIVA e limpa professores
  sheet.getRange(rowIndex, 1).setValue("INATIVA");
  sheet.getRange(rowIndex, 4).setValue(""); // Coluna D: Nome Professor
  sheet.getRange(rowIndex, 5).setValue(""); // Coluna E: Email Professor
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetEletiva = ss.getSheetByName(idEletiva);
  var abaBackupNome = idEletiva + "_" + anoLetivo + "." + semestre; // ex: ELET99536_2026.2
  var backupSpreadsheet = null;
  var backupMovido = false;
  
  // 2. Processa os dados dos alunos e frequências ANTES de mover e limpar
  var alunosEletiva = [];
  var alunosMap = {};
  
  // 2.1 Alunos enturmados na ENTURMACAO
  var entSheet = getPlanilha('ENTURMACAO');
  if (entSheet && entSheet.getLastRow() >= 2) {
    var entData = entSheet.getDataRange().getValues();
    for (var j = 1; j < entData.length; j++) {
      if (entData[j][3] && entData[j][3].toString().trim().toUpperCase() === idEletiva.toUpperCase()) {
        var mat = entData[j][0] ? entData[j][0].toString().trim() : '';
        var nome = entData[j][1] ? entData[j][1].toString().trim() : '';
        if (mat) {
          var objAluno = { matricula: mat, nome: nome, faltas: 0 };
          alunosMap[mat] = objAluno;
          alunosEletiva.push(objAluno);
        }
      }
    }
  }
  
  // 2.2 Total de aulas e faltas registradas na aba da eletiva
  var totalAulas = 0;
  var aulasContadas = {};
  
  if (sheetEletiva && sheetEletiva.getLastRow() >= 2) {
    var chamadasData = sheetEletiva.getDataRange().getValues();
    for (var r = 1; r < chamadasData.length; r++) {
      var cRow = chamadasData[r];
      var idAula = cRow[0] ? cRow[0].toString().trim() : '';
      var dataAula = cRow[1];
      var periodoAula = cRow[2] ? cRow[2].toString().trim() : '';
      
      var chaveAula = idAula || (dataAula + "_" + periodoAula);
      if (chaveAula && !aulasContadas[chaveAula]) {
        aulasContadas[chaveAula] = true;
        totalAulas++;
      }
      
      var tipoOcorrencia = cRow[8] ? cRow[8].toString().trim().toUpperCase() : '';
      if (tipoOcorrencia === 'F') {
        var matAluno = cRow[6] ? cRow[6].toString().trim() : '';
        var nomeAluno = cRow[7] ? cRow[7].toString().trim() : '';
        if (matAluno) {
          if (!alunosMap[matAluno]) {
            var novoObj = { matricula: matAluno, nome: nomeAluno, faltas: 0 };
            alunosMap[matAluno] = novoObj;
            alunosEletiva.push(novoObj);
          }
          alunosMap[matAluno].faltas++;
        }
      }
    }
  }
  
  // Ordena os alunos em ordem alfabética por nome
  alunosEletiva.sort(function(a, b) {
    return (a.nome || '').localeCompare(b.nome || '');
  });

  // 3. Move a aba para a planilha de backup e insere o resumo solicitado (Colunas K a N)
  if (sheetEletiva && moverBackup) {
    backupSpreadsheet = obterOuCriarPlanilhaBackup();
    
    // Se já existir aba com o mesmo nome na planilha de backup, renomeia a anterior para não sobrescrever
    var abaExistenteNoBackup = backupSpreadsheet.getSheetByName(abaBackupNome);
    if (abaExistenteNoBackup) {
      abaExistenteNoBackup.setName(abaBackupNome + "_antiga_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss"));
    }
    
    // Copia a aba com todas as linhas, formatações e dados para o backup
    var sheetCopiada = sheetEletiva.copyTo(backupSpreadsheet);
    sheetCopiada.setName(abaBackupNome);
    
    // --- Linha 1: Nome da Eletiva e Professores ---
    // Célula L1: Nome da Eletiva
    sheetCopiada.getRange("L1").setValue(nomeEletiva).setFontWeight("bold").setFontSize(11).setFontColor("#1a73e8");
    // Célula M1: "Professor: "
    sheetCopiada.getRange("M1").setValue("Professor: ").setFontWeight("bold").setHorizontalAlignment("right").setFontColor("#5f6368");
    // Células N1, O1, P1...: Um professor por célula
    if (profsList.length > 0) {
      for (var p = 0; p < profsList.length; p++) {
        var colProf = 14 + p; // Coluna N = 14, O = 15...
        sheetCopiada.getRange(1, colProf).setValue(profsList[p]).setFontWeight("bold").setFontColor("#202124");
        sheetCopiada.setColumnWidth(colProf, 160);
      }
    } else {
      sheetCopiada.getRange("N1").setValue("Não informado").setFontStyle("italic").setFontColor("#80868b");
    }

    // --- Linha 2: Total de aulas ---
    // Célula K2: "Total de aulas" | Célula L2: Quantidade total de aulas
    sheetCopiada.getRange("K2").setValue("Total de aulas");
    sheetCopiada.getRange("L2").setValue(totalAulas);
    sheetCopiada.getRange("K2:L2").setFontWeight("bold").setBackground("#e8f0fe");
    sheetCopiada.getRange("K2").setFontColor("#1967d2");
    sheetCopiada.getRange("L2").setHorizontalAlignment("center");
    
    // --- Linha 3: Cabeçalhos ---
    sheetCopiada.getRange("K3").setValue("MATRICULA");
    sheetCopiada.getRange("L3").setValue("ALUNO");
    sheetCopiada.getRange("M3").setValue("% de FALTAS");
    sheetCopiada.getRange("N3").setValue("Quantidade de Faltas");
    sheetCopiada.getRange("K3:N3").setFontWeight("bold").setBackground("#f1f3f4").setFontColor("#202124").setHorizontalAlignment("center");
    sheetCopiada.getRange("L3").setHorizontalAlignment("left");
    
    // --- A partir da Linha 4: Informações dos alunos ---
    if (alunosEletiva.length > 0) {
      var linhasResumo = [];
      for (var a = 0; a < alunosEletiva.length; a++) {
        var numLinha = 4 + a;
        // Fórmula de % de faltas usando ponto e vírgula ';' como separador: =IF($L$2>0; N{linha}/$L$2; 0)
        var formulaPct = "=IF($L$2>0; N" + numLinha + "/$L$2; 0)";
        linhasResumo.push([
          alunosEletiva[a].matricula,
          alunosEletiva[a].nome,
          formulaPct,
          alunosEletiva[a].faltas
        ]);
      }
      
      var rangeAlunos = sheetCopiada.getRange(4, 11, linhasResumo.length, 4);
      rangeAlunos.setValues(linhasResumo);
      
      // Formatações dos campos
      sheetCopiada.getRange(4, 11, linhasResumo.length, 1).setNumberFormat("@").setHorizontalAlignment("center"); // Matrícula
      sheetCopiada.getRange(4, 12, linhasResumo.length, 1).setHorizontalAlignment("left"); // Aluno
      sheetCopiada.getRange(4, 13, linhasResumo.length, 1).setNumberFormat("0.0%").setHorizontalAlignment("center"); // % de Faltas
      sheetCopiada.getRange(4, 14, linhasResumo.length, 1).setNumberFormat("0").setHorizontalAlignment("center"); // Quantidade de Faltas
      
      // Bordas da tabela
      sheetCopiada.getRange(3, 11, linhasResumo.length + 1, 4).setBorder(true, true, true, true, true, true, "#dadce0", SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Ajustar larguras das colunas principais
    sheetCopiada.setColumnWidth(11, 115); // K (MATRICULA)
    sheetCopiada.setColumnWidth(12, 260); // L (ALUNO)
    sheetCopiada.setColumnWidth(13, 115); // M (% de FALTAS)
    sheetCopiada.setColumnWidth(14, 160); // N (Quantidade de Faltas / Prof 1)
    
    // Deleta a aba da planilha ativa para manter a planilha principal limpa
    ss.deleteSheet(sheetEletiva);
    backupMovido = true;
  }
  
  // 4. Remove 100% automaticamente as enturmações de alunos desta eletiva na aba ENTURMACAO
  var qtdAlunosRemovidos = 0;
  if (entSheet && entSheet.getLastRow() >= 2) {
    var entData2 = entSheet.getDataRange().getValues();
    for (var k = entData2.length - 1; k >= 1; k--) {
      if (entData2[k][3] && entData2[k][3].toString().trim().toUpperCase() === idEletiva.toUpperCase()) {
        entSheet.deleteRow(k + 1);
        qtdAlunosRemovidos++;
      }
    }
  }
  
  var msg = "A Eletiva " + idEletiva + " (" + nomeEletiva + ") foi desativada e guardada no catálogo com sucesso!";
  if (backupMovido) {
    msg += "\n\n📁 A aba de frequência foi movida para a planilha de backup com o nome: " + abaBackupNome + " (contendo a consolidação em K2:N).";
  }
  if (qtdAlunosRemovidos > 0) {
    msg += "\n👥 " + qtdAlunosRemovidos + " enturmações de alunos foram liberadas automaticamente da aba ENTURMACAO.";
  }
  
  return msg;
}

/**
 * Exclui permanentemente uma eletiva da aba CONFIG_GERAL.
 * @param {string} idEletiva ID da Eletiva
 * @returns {string} Mensagem de retorno
 */
function excluirConfigEletiva(idEletiva) {
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) return "Erro: Aba CONFIG_GERAL não encontrada.";
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim().toUpperCase() === idEletiva.toString().trim().toUpperCase()) {
      sheet.deleteRow(i + 1);
      return "Eletiva excluída permanentemente das configurações!";
    }
  }
  
  return "Erro: Eletiva não encontrada.";
}
