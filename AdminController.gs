/**
 * Arquivo AdminController.gs
 * Controla as ações dos administradores / secretaria.
 */

/**
 * Gera um relatório consolidado (Pivot Table) por Turma ou Eletiva em uma faixa de datas.
 * @param {Object} payload {tipo: 'TURMA'|'ELETIVA', valor: string, dataInicio: string, dataFim: string}
 * @returns {string} Mensagem de sucesso.
 */
function gerarRelatorioSecretaria(payload) {
  var sheetRelatorio = getPlanilha('RELATORIO_SECRETARIA');
  if (!sheetRelatorio) throw new Error("Aba RELATORIO_SECRETARIA não encontrada.");
  
  var tipo = payload.tipo;
  var valor = payload.valor;
  function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    var parts = dateStr.split('-');
    return new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
  }
  
  var dtInicio = parseLocalDate(payload.dataInicio);
  var dtFim = parseLocalDate(payload.dataFim);
  // Normalizar horários
  dtInicio.setHours(0,0,0,0);
  dtFim.setHours(23,59,59,999);
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var entData = getPlanilha('ENTURMACAO').getDataRange().getValues();
  
  // 0. Mapear Nomes das Eletivas
  var configGeralData = getPlanilha('CONFIG_GERAL').getDataRange().getValues();
  var eletivaNomes = {};
  for (var i = 1; i < configGeralData.length; i++) {
    var id = configGeralData[i][1];
    var nome = configGeralData[i][2];
    if (id) eletivaNomes[id] = nome;
  }
  
  // 1. Mapear Alunos
  var alunosMap = {}; 
  var abasNecessarias = {};
  
  for (var i = 1; i < entData.length; i++) {
    var matricula = entData[i][0] ? entData[i][0].toString() : null;
    if (!matricula) continue;
    
    var turma = entData[i][2];
    var idEletiva = entData[i][3];
    var notaFinal = (entData[i][4] !== undefined && entData[i][4] !== null) ? entData[i][4].toString().trim() : '';
    
    var incluir = false;
    if (tipo === 'TURMA' && turma === valor) incluir = true;
    if (tipo === 'ELETIVA' && idEletiva == valor) incluir = true;
    
    if (incluir) {
      var key = matricula;
      if (!alunosMap[key]) {
        alunosMap[key] = {
          matricula: matricula,
          nome: entData[i][1],
          turma: turma,
          eletivas: [], // Array de eletivas que o aluno cursa (e que passaram no filtro)
          notasMap: {}, // Mapeia idEletiva -> Nota
          faltas: 0,
          presencas: 0,
          dias: {},
          diasEletiva: {}
        };
      }
      if (alunosMap[key].eletivas.indexOf(idEletiva) === -1) {
        alunosMap[key].eletivas.push(idEletiva);
      }
      if (notaFinal !== '') {
        alunosMap[key].notasMap[idEletiva] = notaFinal;
      }
      abasNecessarias[idEletiva] = true;
    }
  }
  
  if (Object.keys(alunosMap).length === 0) {
    throw new Error("Nenhum aluno encontrado para este filtro de " + tipo + " = " + valor);
  }
  
  // 2. Processar Abas Dinâmicas
  var datasUnicasMap = {};
  var diasDaEletiva = {}; 
  var totalAulasEletiva = {}; 
  
  var idsEletiva = Object.keys(abasNecessarias);
  for (var k = 0; k < idsEletiva.length; k++) {
    var idEletiva = idsEletiva[k];
    diasDaEletiva[idEletiva] = {};
    totalAulasEletiva[idEletiva] = 0;
    
    var aba = ss.getSheetByName(idEletiva.toString());
    if (!aba) continue; // Aba ainda não criada
    
    var maxRow = aba.getLastRow();
    if (maxRow < 2) continue;
    
    var dataRows = aba.getRange(2, 1, maxRow - 1, 9).getValues();
    var aulasProcessadas = {}; 
    
    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      var rawDate = row[1];
      if (!rawDate) continue;
      
      var rowData = new Date(rawDate);
      if (isNaN(rowData.getTime())) continue;
      
      if (rowData >= dtInicio && rowData <= dtFim) {
        var idAula = row[0];
        
        var dd = String(rowData.getDate()).padStart(2, '0');
        var mm = String(rowData.getMonth() + 1).padStart(2, '0');
        var dateStr = dd + '/' + mm; 
        
        datasUnicasMap[dateStr] = rowData;
        
        if (!aulasProcessadas[idAula]) {
          aulasProcessadas[idAula] = true;
          totalAulasEletiva[idEletiva]++;
          diasDaEletiva[idEletiva][dateStr] = (diasDaEletiva[idEletiva][dateStr] || 0) + 1;
        }
        
        var tipoOcorrencia = row[8];
        if (tipoOcorrencia === "F") {
          var mat = row[6] ? row[6].toString() : null;
          if (mat && alunosMap[mat]) {
            // Só conta se o aluno está filtrado para cursar ESSA eletiva
            if (alunosMap[mat].eletivas.indexOf(idEletiva) !== -1) {
              alunosMap[mat].dias[dateStr] = (alunosMap[mat].dias[dateStr] || 0) + 1;
              var dEletivaKey = idEletiva + "_" + dateStr;
              alunosMap[mat].diasEletiva[dEletivaKey] = (alunosMap[mat].diasEletiva[dEletivaKey] || 0) + 1;
              alunosMap[mat].faltas++;
            }
          }
        }
      }
    }
  }
  
  // 3. Calcular Presenças
  var chavesAlunos = Object.keys(alunosMap);
  for (var i = 0; i < chavesAlunos.length; i++) {
    var al = alunosMap[chavesAlunos[i]];
    var totalAulasDoAluno = 0;
    for (var e = 0; e < al.eletivas.length; e++) {
      totalAulasDoAluno += (totalAulasEletiva[al.eletivas[e]] || 0);
    }
    al.presencas = totalAulasDoAluno - al.faltas;
  }
  
  // 4. Construir Array do Pivot
  var sortedDates = Object.keys(datasUnicasMap).sort(function(a, b) {
    return datasUnicasMap[a] - datasUnicasMap[b];
  });
  
  var pivot = [];
  var notes = [];
  var header = ["Matrícula", "Nome", "Turma", "Nota Final", "Faltas", "Presenças", "Total de Aulas"];
  for (var d = 0; d < sortedDates.length; d++) {
    header.push(sortedDates[d]);
  }
  pivot.push(header);
  
  var headerNotes = new Array(header.length).fill("");
  notes.push(headerNotes);
  
  chavesAlunos.sort(function(a, b) {
    return alunosMap[a].nome.localeCompare(alunosMap[b].nome);
  });
  
  for (var i = 0; i < chavesAlunos.length; i++) {
    var al = alunosMap[chavesAlunos[i]];
    var totalAulas = al.presencas + al.faltas; // Soma de presenças e faltas
    
    // Obter Nota Final
    var notaFinalStr = "";
    if (tipo === 'ELETIVA') {
      notaFinalStr = al.notasMap[valor] || "-";
    } else {
      var notasLista = [];
      for (var e = 0; e < al.eletivas.length; e++) {
        var elId = al.eletivas[e];
        var n = al.notasMap[elId];
        if (n) {
          var nomeEl = eletivaNomes[elId] || elId;
          notasLista.push(al.eletivas.length > 1 ? nomeEl + ": " + n : n);
        }
      }
      notaFinalStr = notasLista.length > 0 ? notasLista.join(" | ") : "-";
    }
    
    var row = [al.matricula, al.nome, al.turma, notaFinalStr, al.faltas, al.presencas, totalAulas];
    var rowNotes = ["", "", "", "", "", "", ""]; // 7 colunas estáticas
    
    for (var d = 0; d < sortedDates.length; d++) {
      var dStr = sortedDates[d];
      var periodosNoDia = 0;
      var nomesEletivasDoDia = [];
      
      for (var e = 0; e < al.eletivas.length; e++) {
        var elId = al.eletivas[e];
        if (diasDaEletiva[elId] && diasDaEletiva[elId][dStr]) {
          periodosNoDia += diasDaEletiva[elId][dStr];
          var faltasNestaEletiva = al.diasEletiva[elId + "_" + dStr] || 0;
          var nomeEl = eletivaNomes[elId] || elId;
          nomesEletivasDoDia.push(nomeEl + "(" + faltasNestaEletiva + "F)");
        }
      }
      
      if (periodosNoDia === 0) {
        row.push("-"); // Não teve aula para este aluno neste dia
        rowNotes.push("");
      } else {
        var faltasNoDia = al.dias[dStr] || 0;
        if (faltasNoDia === 0) {
          row.push(0); // Presente
        } else {
          row.push(faltasNoDia + " F"); 
        }
        rowNotes.push(nomesEletivasDoDia.join(", "));
      }
    }
    pivot.push(row);
    notes.push(rowNotes);
  }
  
  // 5. Limpa a aba completamente antes de inserir os novos dados
  // Apaga todos os conteúdos, formatos e quaisquer comentários/anotações na aba inteira
  sheetRelatorio.clear(); 
  sheetRelatorio.clearNotes(); 
  var maxR = sheetRelatorio.getMaxRows();
  var maxC = sheetRelatorio.getMaxColumns();
  if (maxR > 0 && maxC > 0) {
    sheetRelatorio.getRange(1, 1, maxR, maxC).clearNote();
  }
  
  // Escreve os novos dados e notas
  sheetRelatorio.getRange(1, 1, pivot.length, header.length).setValues(pivot);
  sheetRelatorio.getRange(1, 1, notes.length, header.length).setNotes(notes);
  
  var headerRange = sheetRelatorio.getRange(1, 1, 1, header.length);
  headerRange.setBackground("#1a73e8").setFontColor("white").setFontWeight("bold");
  sheetRelatorio.autoResizeColumns(1, header.length);
  
  return "Relatório gerado com sucesso (" + (pivot.length - 1) + " alunos)!";
}

/**
 * Coleta os dados consolidados de faltas de uma Eletiva específica para exportação ao SIGE.
 * @param {Object} payload { idEletiva: string, dataInicio: string, dataFim: string }
 * @returns {Object} Dados formatados { idEletiva, nomeEletiva, aulasDadas, totalAlunos, faltas: { [matricula]: qtdFaltas }, resumoAlunos: [{matricula, nome, turma, faltas}] }
 */
function obterDadosExportacaoSIGE(payload) {
  var idEletiva = payload.idEletiva;
  if (!idEletiva) {
    throw new Error("Selecione uma Eletiva válida.");
  }
  
  function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    var parts = dateStr.split('-');
    return new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
  }
  
  var dtInicio = parseLocalDate(payload.dataInicio);
  var dtFim = parseLocalDate(payload.dataFim);
  dtInicio.setHours(0,0,0,0);
  dtFim.setHours(23,59,59,999);
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Obter Nome da Eletiva
  var configSheet = getPlanilha('CONFIG_GERAL');
  var nomeEletiva = idEletiva;
  if (configSheet) {
    var configData = configSheet.getDataRange().getValues();
    for (var i = 1; i < configData.length; i++) {
      if (configData[i][1] == idEletiva) {
        nomeEletiva = configData[i][2] || idEletiva;
        break;
      }
    }
  }
  
  // 2. Obter Alunos Enturmados nesta Eletiva e suas Notas Finais
  var entSheet = getPlanilha('ENTURMACAO');
  if (!entSheet) throw new Error("Aba ENTURMACAO não encontrada.");
  var entData = entSheet.getDataRange().getValues();
  
  var alunosMap = {}; // matricula -> { matricula, nome, turma, faltas: 0, nota: '' }
  for (var i = 1; i < entData.length; i++) {
    var mat = entData[i][0] ? entData[i][0].toString().trim() : null;
    var elId = entData[i][3];
    if (mat && elId == idEletiva) {
      var rawNota = (entData[i][4] !== undefined && entData[i][4] !== null) ? entData[i][4].toString().trim() : '';
      alunosMap[mat] = {
        matricula: mat,
        nome: entData[i][1] || '',
        turma: entData[i][2] || '',
        faltas: 0,
        nota: rawNota
      };
    }
  }
  
  // 3. Processar Aba Dinâmica da Eletiva
  var abaEletiva = ss.getSheetByName(idEletiva.toString());
  var aulasDadas = 0;
  var aulasProcessadas = {};
  
  if (abaEletiva && abaEletiva.getLastRow() >= 2) {
    var maxRow = abaEletiva.getLastRow();
    var dataRows = abaEletiva.getRange(2, 1, maxRow - 1, 9).getValues();
    
    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      var rawDate = row[1];
      if (!rawDate) continue;
      
      var rowData = new Date(rawDate);
      if (isNaN(rowData.getTime())) continue;
      
      if (rowData >= dtInicio && rowData <= dtFim) {
        var idAula = row[0];
        if (!aulasProcessadas[idAula]) {
          aulasProcessadas[idAula] = true;
          aulasDadas++;
        }
        
        var tipoOcorrencia = row[8];
        if (tipoOcorrencia === "F") {
          var mat = row[6] ? row[6].toString().trim() : null;
          if (mat && alunosMap[mat]) {
            alunosMap[mat].faltas++;
          }
        }
      }
    }
  }
  
  var faltasMap = {};
  var notasMap = {};
  var totalComNota = 0;
  var listaResumo = [];
  var chavesMat = Object.keys(alunosMap).sort(function(a, b) {
    return alunosMap[a].nome.localeCompare(alunosMap[b].nome);
  });
  
  for (var i = 0; i < chavesMat.length; i++) {
    var m = chavesMat[i];
    faltasMap[m] = alunosMap[m].faltas;
    
    var notaStr = alunosMap[m].nota;
    if (notaStr !== '') {
      // Formata a nota para o padrão SIGE (com vírgula, ex: 7,5 ou 10,0)
      var numNota = parseFloat(notaStr.replace(',', '.'));
      if (!isNaN(numNota)) {
        var notaFmt = (Math.round(numNota * 10) / 10).toFixed(1).replace('.', ',');
        notasMap[m] = notaFmt;
        alunosMap[m].nota = notaFmt;
        totalComNota++;
      } else {
        notasMap[m] = notaStr;
      }
    }
    
    listaResumo.push(alunosMap[m]);
  }
  
  return {
    idEletiva: idEletiva,
    nomeEletiva: nomeEletiva,
    aulasDadas: aulasDadas,
    totalAlunos: listaResumo.length,
    totalComNota: totalComNota,
    faltas: faltasMap,
    notas: notasMap,
    resumoAlunos: listaResumo
  };
}

