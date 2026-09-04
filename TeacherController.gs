/**
 * Arquivo TeacherController.gs
 * Lida com as ações do Web App para a visão do professor.
 */

/**
 * Lê a aba CONFIG_GERAL e retorna as informações do professor logado e suas eletivas vinculadas.
 * @returns {Object} { usuario: { email, nome }, eletivas: Array }
 */
function getAulasDoProfessor() {
  var email = Session.getActiveUser().getEmail() || '';
  var userEmail = email.toString().trim().toLowerCase();
  var sheet = getPlanilha('CONFIG_GERAL');
  
  if (!sheet) {
    return {
      usuario: { email: email, nome: formatNomeFromEmail(email) },
      eletivas: []
    };
  }
  
  var data = sheet.getDataRange().getValues();
  var resultados = [];
  var nomeProfessorEncontrado = '';
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = row[0] ? row[0].toString().trim().toUpperCase() : 'ATIVA';
    if (status === 'INATIVA') continue; // Eletivas inativas não possuem professor nem chamada ativa
    
    var nomeProfessorCell = row[3] ? row[3].toString() : '';
    var emailProfessorCell = row[4] ? row[4].toString() : ''; 
    var emailsList = emailProfessorCell.split(',').map(function(e) {
      return e.trim().toLowerCase();
    }).filter(String);
    var nomesList = nomeProfessorCell.split(',').map(function(n) {
      return n.trim();
    }).filter(String);
    
    var emailIndex = userEmail ? emailsList.indexOf(userEmail) : -1;
    if (userEmail && emailIndex !== -1) {
      // Identifica o nome do professor baseado na posição do e-mail
      if (!nomeProfessorEncontrado) {
        if (nomesList[emailIndex]) {
          nomeProfessorEncontrado = nomesList[emailIndex];
        } else if (nomesList.length > 0) {
          nomeProfessorEncontrado = nomesList[0];
        } else if (nomeProfessorCell) {
          nomeProfessorEncontrado = nomeProfessorCell.trim();
        }
      }

      var idEletiva = row[1];
      var nomeEletiva = row[2];
      var qtdDias = parseInt(row[5]) || 0;
      
      var todosDiasArr = [];
      var index = 6;
      for (var j = 0; j < qtdDias; j++) {
        var dia = row[index] ? row[index].toString().trim() : '';
        var periodosStr = row[index+1] ? row[index+1].toString().trim() : '';
        var periodos = periodosStr.split(',').map(function(p) { return p.trim(); }).filter(String);
        
        if (dia && periodos.length > 0) {
          var periodosFormatados = periodos.map(function(p) {
            return p.toUpperCase().replace(/\s+/g, '');
          }).join(',');
          
          todosDiasArr.push({
            dia: dia,
            periodos: periodos,
            formatado: dia.toUpperCase() + '(' + periodosFormatados + ')'
          });
        }
        index += 2;
      }
      
      var diasAulasInfoStr = todosDiasArr.map(function(d) { return d.formatado; }).join(' : ');
      
      for (var k = 0; k < todosDiasArr.length; k++) {
        var itemDia = todosDiasArr[k];
        resultados.push({
          idUnico: idEletiva + "_" + itemDia.dia,
          idEletiva: idEletiva,
          nome: nomeEletiva,
          dia: itemDia.dia,
          periodos: itemDia.periodos,
          diasAulasInfo: diasAulasInfoStr
        });
      }
    }
  }

  if (!nomeProfessorEncontrado && email) {
    nomeProfessorEncontrado = formatNomeFromEmail(email);
  }

  return {
    usuario: {
      email: email,
      nome: nomeProfessorEncontrado || "Professor(a)"
    },
    eletivas: resultados
  };
}

/**
 * Formata um nome amigável a partir do e-mail do usuário caso não haja nome cadastrado.
 */
function formatNomeFromEmail(email) {
  if (!email) return "Professor(a)";
  var usuario = email.split('@')[0];
  var partes = usuario.split(/[._-]/).filter(String);
  if (partes.length === 0) return usuario;
  return partes.map(function(p) {
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Lê a aba ENTURMACAO e retorna os alunos vinculados a uma Eletiva específica.
 * @param {string|number} idEletiva O ID da Eletiva Atual
 * @returns {Array} Array de objetos {matricula, nome}
 */
function getAlunosDaEletiva(idEletiva) {
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var resultados = [];
  
  // Pula a primeira linha (cabeçalho)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var idEletivaAtual = row[3]; // Coluna D (índice 3: A=0, B=1, C=2, D=3)
    
    if (idEletivaAtual == idEletiva) {
      var nota = (row[4] !== undefined && row[4] !== null) ? row[4].toString() : "";
      resultados.push({
        matricula: row[0], // Coluna A (índice 0)
        nome: row[1],      // Coluna B (índice 1)
        turma: row[2],     // Coluna C (índice 2)
        notaFinal: nota    // Coluna E (índice 4)
      });
    }
  }
  return resultados;
}

/**
 * Salva as notas finais dos alunos de uma eletiva específica na aba ENTURMACAO.
 * Valida se o professor logado tem permissão para a eletiva correspondente.
 * @param {string|number} idEletiva ID da Eletiva
 * @param {Array} listaNotas Array de objetos { matricula, nota }
 * @returns {Object} { status, message }
 */
function salvarNotasFinais(idEletiva, listaNotas) {
  var email = Session.getActiveUser().getEmail() || '';
  var userEmail = email.toString().trim().toLowerCase();
  
  // 1. Validação de Permissão do Professor
  if (userEmail) {
    var configSheet = getPlanilha('CONFIG_GERAL');
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      var temPermissao = false;
      for (var c = 1; c < configData.length; c++) {
        if (configData[c][1] && configData[c][1].toString().trim().toUpperCase() === idEletiva.toString().trim().toUpperCase()) {
          var status = configData[c][0] ? configData[c][0].toString().trim().toUpperCase() : 'ATIVA';
          if (status === 'INATIVA') {
            throw new Error("Esta eletiva está inativa no catálogo e não aceita lançamento de notas.");
          }
          
          var emailsList = (configData[c][4] || '').toString().toLowerCase().split(',').map(function(e) { 
            return e.trim(); 
          });
          if (emailsList.indexOf(userEmail) !== -1) {
            temPermissao = true;
            break;
          }
        }
      }
      if (!temPermissao) {
        throw new Error("Você não possui permissão para lançar notas nesta eletiva.");
      }
    }
  }
  
  var sheet = getPlanilha('ENTURMACAO');
  if (!sheet) throw new Error("Aba ENTURMACAO não encontrada.");
  
  // Garante cabeçalho na coluna E se não existir
  if (!sheet.getRange(1, 5).getValue()) {
    sheet.getRange(1, 5).setValue("Nota_Final");
  }
  
  var notasMap = {};
  for (var n = 0; n < listaNotas.length; n++) {
    var item = listaNotas[n];
    if (item && item.matricula) {
      var raw = (item.nota !== undefined && item.nota !== null) ? item.nota.toString().trim() : '';
      var finalNota = '';
      
      if (raw !== '') {
        var normalized = raw.replace(',', '.');
        var num = parseFloat(normalized);
        
        if (isNaN(num) || num < 0 || num > 10) {
          throw new Error("Nota inválida para o aluno (matrícula: " + item.matricula + "). A nota final deve ser um número entre 0.0 e 10.0.");
        }
        
        // Garante 1 casa decimal (ex: 8.5, 10.0, 7.0)
        finalNota = (Math.round(num * 10) / 10).toFixed(1);
      }
      
      notasMap[item.matricula.toString()] = finalNota;
    }
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { status: 'SUCCESS', message: 'Nenhum aluno encontrado na enturmação.' };
  }
  
  var colENotas = [];
  var qtdAtualizados = 0;
  
  for (var i = 1; i < data.length; i++) {
    var mat = data[i][0] ? data[i][0].toString() : '';
    var el = data[i][3];
    var notaAtual = (data[i][4] !== undefined && data[i][4] !== null) ? data[i][4].toString() : '';
    
    if (mat && el == idEletiva && notasMap.hasOwnProperty(mat)) {
      colENotas.push([notasMap[mat]]);
      qtdAtualizados++;
    } else {
      colENotas.push([notaAtual]);
    }
  }
  
  sheet.getRange(2, 5, colENotas.length, 1).setValues(colENotas);
  
  return {
    status: 'SUCCESS',
    message: qtdAtualizados + ' nota(s) final(is) salva(s) com sucesso!'
  };
}

/**
 * Salva os dados de uma chamada (presenças ou faltas) na Aba Dinâmica da Eletiva.
 * @param {Object} dadosChamada Objeto contendo abaDestino, data, periodo, e listaFaltosos.
 * @returns {boolean} Sucesso da operação
 */
function salvarChamada(dadosChamada) {
  var idEletiva = dadosChamada.idEletiva;
  var data = dadosChamada.data;
  var periodosTotais = dadosChamada.periodosTotais; // Array com todos os períodos da aula
  var faltasPorPeriodo = dadosChamada.faltasPorPeriodo; // Objeto { "M1": [alunos...], "M2": [alunos...] }
  var forceOverwrite = dadosChamada.forceOverwrite || false;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getPlanilha(idEletiva.toString());
  
  // Cria aba automaticamente se não existir
  if (!sheet) {
    sheet = ss.insertSheet(idEletiva.toString());
    sheet.appendRow(["ID_Aula", "Data", "Periodo", "Qtd_Faltas", "Separador", "ID_Registro", "Matricula", "Nome_Aluno", "Tipo_Ocorrencia"]);
    // Atualizar controle de turmas na primeira criação
    if (typeof atualizarControleTurmas === 'function') {
      atualizarControleTurmas(idEletiva);
    }
  } else {
    // Verifica duplicação de chamada (mesma data e período)
    var sheetData = sheet.getDataRange().getValues();
    var hasDuplicate = false;
    var rowsToDelete = [];
    
    for (var i = 1; i < sheetData.length; i++) {
      var rowDate = sheetData[i][1];
      if (!rowDate) continue;
      
      var rowDateStr = "";
      if (rowDate instanceof Date) {
        rowDateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        rowDateStr = rowDate.toString().split('T')[0].substring(0, 10);
      }
      
      if (rowDateStr === data) {
        var rowPeriodo = sheetData[i][2];
        if (periodosTotais.indexOf(rowPeriodo) !== -1) {
          hasDuplicate = true;
          rowsToDelete.push(i + 1); // Salva o índice da linha (1-based)
        }
      }
    }
    
    if (hasDuplicate && !forceOverwrite) {
      return { 
        status: 'CONFIRM_OVERWRITE', 
        message: 'Já existe uma chamada registrada para esta Data e Período(s) selecionados. Deseja sobrescrevê-la?' 
      };
    }
    
    if (hasDuplicate && forceOverwrite) {
      // Deleta as linhas de baixo para cima para não quebrar os índices
      for (var j = rowsToDelete.length - 1; j >= 0; j--) {
        sheet.deleteRow(rowsToDelete[j]);
      }
    }
  }
  
  for (var p = 0; p < periodosTotais.length; p++) {
    var periodo = periodosTotais[p];
    var listaFaltosos = faltasPorPeriodo[periodo] || [];
    var uuid_aula = generateUUID();
    var qtdFaltas = listaFaltosos.length;
    
    if (qtdFaltas === 0) {
      // Regra 2: 0 faltas (Presença Total)
      sheet.appendRow([uuid_aula, data, periodo, 0, "", "", "", "", "PRESENÇA TOTAL"]);
    } else {
      // Regra 3: Loop para cada faltoso
      for (var i = 0; i < qtdFaltas; i++) {
        var faltoso = listaFaltosos[i];
        var uuid_registro = generateUUID();
        
        sheet.appendRow([
          uuid_aula,
          data,
          periodo,
          qtdFaltas,
          "",
          uuid_registro,
          faltoso.matricula,
          faltoso.nome,
          "F"
        ]);
      }
    }
  }

  // Persistir Atividades e Anotações da chamada
  try {
    var temAtiv = dadosChamada.temAtividade === true;
    var ativAlunos = dadosChamada.atividadesPorAluno || {};
    var anotAlunos = dadosChamada.anotacoesPorAluno || {};
    salvarAtividadesEAnotacoes(idEletiva, data, temAtiv, ativAlunos, anotAlunos);
  } catch (errAtiv) {
    Logger.log("Erro ao persistir atividades/anotações: " + errAtiv.message);
  }

  return { status: 'SUCCESS' };
}

/**
 * Garante e retorna o objeto Sheet da aba REGISTRO_ATIVIDADES_NOTAS.
 */
function obterOuCriarAbaAtividadesNotas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('REGISTRO_ATIVIDADES_NOTAS');
  if (!sheet) {
    sheet = ss.insertSheet('REGISTRO_ATIVIDADES_NOTAS');
    sheet.appendRow(["ID_Eletiva", "Data", "Matricula", "Tem_Atividade_Aula", "Fez_Atividade", "Anotacao", "Atualizado_Em"]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f1f3f4");
  }
  return sheet;
}

/**
 * Garante e retorna o objeto Sheet da aba CONFIG_NOTAS.
 */
function obterOuCriarAbaConfigNotas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CONFIG_NOTAS');
  if (!sheet) {
    sheet = ss.insertSheet('CONFIG_NOTAS');
    sheet.appendRow(["ID_Eletiva", "Ativo_Freq", "Max_Pontos_Freq", "Ativo_Ativ", "Max_Pontos_Ativ"]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f1f3f4");
  }
  return sheet;
}

/**
 * Salva se a aula teve atividade e os status/anotações individuais de cada aluno na data.
 */
function salvarAtividadesEAnotacoes(idEletiva, dataStr, temAtividade, atividadesPorAluno, anotacoesPorAluno) {
  var sheet = obterOuCriarAbaAtividadesNotas();
  var sheetData = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  var idEletivaNorm = idEletiva.toString().trim();

  // Limpa registros anteriores para a mesma eletiva e data
  for (var i = 1; i < sheetData.length; i++) {
    var rowId = sheetData[i][0] ? sheetData[i][0].toString().trim() : '';
    var rowDate = sheetData[i][1];
    var rDateStr = "";
    if (rowDate instanceof Date) {
      rDateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (rowDate) {
      rDateStr = rowDate.toString().split('T')[0].substring(0, 10);
    }

    if (rowId === idEletivaNorm && rDateStr === dataStr) {
      rowsToDelete.push(i + 1);
    }
  }

  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var rowsToAdd = [];

  // Registro geral da aula indicando se houve atividade
  var temAtivStr = temAtividade ? "SIM" : "NAO";
  rowsToAdd.push([idEletivaNorm, dataStr, "__AULA__", temAtivStr, "", "", nowStr]);

  // Coleta todas as matrículas informadas
  var todasMatriculas = {};
  if (atividadesPorAluno) {
    Object.keys(atividadesPorAluno).forEach(function(m) { todasMatriculas[m] = true; });
  }
  if (anotacoesPorAluno) {
    Object.keys(anotacoesPorAluno).forEach(function(m) { todasMatriculas[m] = true; });
  }

  var mats = Object.keys(todasMatriculas);
  for (var k = 0; k < mats.length; k++) {
    var mat = mats[k];
    var fezAtiv = "";
    if (temAtividade) {
      fezAtiv = (atividadesPorAluno && atividadesPorAluno[mat] === false) ? "NAO" : "SIM";
    }
    var anotacao = (anotacoesPorAluno && anotacoesPorAluno[mat]) ? anotacoesPorAluno[mat].toString().trim() : "";

    if (temAtividade || anotacao !== "") {
      rowsToAdd.push([
        idEletivaNorm,
        dataStr,
        mat,
        temAtivStr,
        fezAtiv,
        anotacao,
        nowStr
      ]);
    }
  }

  if (rowsToAdd.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAdd.length, 7).setValues(rowsToAdd);
  }
}

/**
 * Exclui a falta de um aluno usando TextFinder. Verifica se há outras faltas na mesma aula.
 * @param {string} idRegistro O ID do registro de falta (Coluna F)
 * @param {string} abaDestino Nome da aba onde a falta foi registrada
 * @returns {boolean} Retorna true se a operação for realizada com sucesso.
 */
function excluirFalta(idRegistro, abaDestino) {
  var sheet = getPlanilha(abaDestino);
  if (!sheet) throw new Error("Aba não encontrada: " + abaDestino);
  
  // Acha o registro da falta
  var finderRegistro = sheet.createTextFinder(idRegistro).matchEntireCell(true).findNext();
  if (!finderRegistro) return false; // Registro não encontrado
  
  var linhaRegistro = finderRegistro.getRow();
  
  // Pega o ID da Aula (Coluna A, com base na constante configurada em Utils)
  var idAula = sheet.getRange(linhaRegistro, COLUNAS.ID_AULA).getValue();
  
  // Acha todos os registros com o mesmo ID_Aula
  var finderAula = sheet.createTextFinder(idAula).matchEntireCell(true).findAll();
  
  // Filtra apenas os matches que caíram na coluna de ID_AULA
  var linhasAula = finderAula.filter(function(r) {
    return r.getColumn() === COLUNAS.ID_AULA;
  });
  
  if (linhasAula.length > 1) {
    // Há mais de uma falta para essa aula, podemos simplesmente apagar essa linha.
    sheet.deleteRow(linhaRegistro);
  } else {
    // Foi a última falta. Não deleta a linha. Modifica para "PRESENÇA TOTAL".
    sheet.getRange(linhaRegistro, COLUNAS.ID_REGISTRO).clearContent();
    sheet.getRange(linhaRegistro, COLUNAS.MATRICULA).clearContent();
    sheet.getRange(linhaRegistro, COLUNAS.NOME_ALUNO).clearContent();
    
    sheet.getRange(linhaRegistro, COLUNAS.TIPO_OCORRENCIA).setValue("PRESENÇA TOTAL");
    sheet.getRange(linhaRegistro, COLUNAS.QTD_FALTAS).setValue(0);
  }
  
  return true;
}

/**
 * Retorna os dados completos da chamada para uma data: faltas por período, se houve atividade,
 * status de atividade de cada aluno e anotações da aula.
 * @returns {Object} { faltas: {}, temAtividade: boolean, atividades: {}, anotacoes: {} }
 */
function getDadosDaChamada(idEletiva, dataStr) {
  var resultado = {
    faltas: {},
    temAtividade: false,
    atividades: {},
    anotacoes: {}
  };

  var idEletivaNorm = idEletiva.toString().trim();

  // 1. Faltas registradas na aba dinâmica da Eletiva
  var sheet = getPlanilha(idEletivaNorm);
  if (sheet) {
    var sheetData = sheet.getDataRange().getValues();
    for (var i = 1; i < sheetData.length; i++) {
      var rowDate = sheetData[i][1];
      if (!rowDate) continue;

      var rowDateStr = "";
      if (rowDate instanceof Date) {
        rowDateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        rowDateStr = rowDate.toString().split('T')[0].substring(0, 10);
      }

      if (rowDateStr === dataStr) {
        var periodo = sheetData[i][2];
        var tipoOcorrencia = sheetData[i][8]; // Coluna I (índice 8)

        if (!resultado.faltas[periodo]) resultado.faltas[periodo] = [];

        if (tipoOcorrencia === "F") {
          var matricula = sheetData[i][6] ? sheetData[i][6].toString() : null; // Coluna G
          if (matricula) {
            resultado.faltas[periodo].push(matricula);
          }
        }
      }
    }
  }

  // 2. Atividades e Anotações na aba REGISTRO_ATIVIDADES_NOTAS
  var ativSheet = getPlanilha('REGISTRO_ATIVIDADES_NOTAS');
  if (ativSheet && ativSheet.getLastRow() >= 2) {
    var ativData = ativSheet.getDataRange().getValues();
    for (var j = 1; j < ativData.length; j++) {
      var rId = ativData[j][0] ? ativData[j][0].toString().trim() : '';
      var rDate = ativData[j][1];
      var rDateStr = "";
      if (rDate instanceof Date) {
        rDateStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else if (rDate) {
        rDateStr = rDate.toString().split('T')[0].substring(0, 10);
      }

      if (rId === idEletivaNorm && rDateStr === dataStr) {
        var rMat = ativData[j][2] ? ativData[j][2].toString().trim() : '';
        var rTemAtiv = ativData[j][3] ? ativData[j][3].toString().toUpperCase() : '';
        var rFezAtiv = ativData[j][4] ? ativData[j][4].toString().toUpperCase() : '';
        var rAnotacao = ativData[j][5] ? ativData[j][5].toString() : '';

        if (rMat === '__AULA__') {
          resultado.temAtividade = (rTemAtiv === 'SIM' || rTemAtiv === 'TRUE');
        } else if (rMat !== '') {
          // Status da atividade do aluno: true para SIM/fez, false para NAO/não fez
          if (rFezAtiv === 'SIM') {
            resultado.atividades[rMat] = true;
          } else if (rFezAtiv === 'NAO') {
            resultado.atividades[rMat] = false;
          }
          if (rAnotacao.trim() !== '') {
            resultado.anotacoes[rMat] = rAnotacao;
          }
        }
      }
    }
  }

  return resultado;
}

/**
 * Mantido para compatibilidade retroativa. Retorna o mapa de faltas por período.
 */
function getFaltasDaChamada(idEletiva, dataStr) {
  var dados = getDadosDaChamada(idEletiva, dataStr);
  return dados.faltas || {};
}

/**
 * Lê a configuração de notas da Eletiva (Pontuação Máxima de Frequência e Atividades).
 */
function getConfigNotas(idEletiva) {
  var sheet = obterOuCriarAbaConfigNotas();
  var data = sheet.getDataRange().getValues();
  var idNorm = idEletiva.toString().trim();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === idNorm) {
      return {
        ativoFreq: data[i][1] === true || data[i][1].toString().toUpperCase() === 'TRUE',
        maxPontosFreq: parseFloat(data[i][2]) || 2.0,
        ativoAtiv: data[i][3] === true || data[i][3].toString().toUpperCase() === 'TRUE',
        maxPontosAtiv: parseFloat(data[i][4]) || 2.0
      };
    }
  }

  return {
    ativoFreq: false,
    maxPontosFreq: 2.0,
    ativoAtiv: false,
    maxPontosAtiv: 2.0
  };
}

/**
 * Salva a configuração de regras da Nota Geral da Eletiva na aba CONFIG_NOTAS.
 */
function salvarConfigNotas(idEletiva, config) {
  var sheet = obterOuCriarAbaConfigNotas();
  var data = sheet.getDataRange().getValues();
  var idNorm = idEletiva.toString().trim();
  var linhaEncontrada = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === idNorm) {
      linhaEncontrada = i + 1;
      break;
    }
  }

  var ativoFreq = config.ativoFreq === true;
  var maxPontosFreq = Math.round((parseFloat(config.maxPontosFreq) || 0) * 10) / 10;
  var ativoAtiv = config.ativoAtiv === true;
  var maxPontosAtiv = Math.round((parseFloat(config.maxPontosAtiv) || 0) * 10) / 10;

  if (linhaEncontrada !== -1) {
    sheet.getRange(linhaEncontrada, 2, 1, 4).setValues([[ativoFreq, maxPontosFreq, ativoAtiv, maxPontosAtiv]]);
  } else {
    sheet.appendRow([idNorm, ativoFreq, maxPontosFreq, ativoAtiv, maxPontosAtiv]);
  }

  return { status: 'SUCCESS', message: 'Configurações de notas salvas com sucesso!' };
}

/**
 * Retorna todas as anotações históricas de um aluno específico em uma Eletiva.
 * @returns {Array} Array de objetos { data, fezAtividade, anotacao }
 */
function getTodasAnotacoesDoAluno(idEletiva, matricula) {
  var sheet = getPlanilha('REGISTRO_ATIVIDADES_NOTAS');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var idNorm = idEletiva.toString().trim();
  var matNorm = matricula.toString().trim();
  var anotacoes = [];

  for (var i = 1; i < data.length; i++) {
    var rId = data[i][0] ? data[i][0].toString().trim() : '';
    var rMat = data[i][2] ? data[i][2].toString().trim() : '';

    if (rId === idNorm && rMat === matNorm) {
      var rAnotacao = data[i][5] ? data[i][5].toString().trim() : '';
      if (rAnotacao !== '') {
        var rDate = data[i][1];
        var rDateStr = "";
        if (rDate instanceof Date) {
          rDateStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else if (rDate) {
          rDateStr = rDate.toString().split('T')[0].substring(0, 10);
        }

        var fezAtiv = data[i][4] ? data[i][4].toString().toUpperCase() : '';

        anotacoes.push({
          data: rDateStr,
          fezAtividade: fezAtiv,
          anotacao: rAnotacao
        });
      }
    }
  }

  // Ordena das datas mais recentes para as mais antigas
  anotacoes.sort(function(a, b) {
    return b.data.localeCompare(a.data);
  });

  return anotacoes;
}

/**
 * Consolida estatísticas de frequência, atividades e anotações para todos os alunos de uma Eletiva.
 * Usado pelo painel de Notas Finais do professor para compor a Nota Geral.
 * @param {string|number} idEletiva ID da Eletiva
 * @returns {Object} Estatísticas completas e mapa de notas
 */
function getEstatisticasEletiva(idEletiva) {
  var idNorm = idEletiva.toString().trim();
  var config = getConfigNotas(idNorm);
  var alunos = getAlunosDaEletiva(idNorm);

  var sheetEletiva = getPlanilha(idNorm);
  var aulasUnicasMap = {};
  var faltasPorAlunoMap = {};

  if (sheetEletiva && sheetEletiva.getLastRow() >= 2) {
    var dataRows = sheetEletiva.getDataRange().getValues();
    for (var i = 1; i < dataRows.length; i++) {
      var idAula = dataRows[i][0];
      if (idAula) aulasUnicasMap[idAula] = true;

      var tipoOcorrencia = dataRows[i][8];
      if (tipoOcorrencia === "F") {
        var mat = dataRows[i][6] ? dataRows[i][6].toString().trim() : null;
        if (mat) {
          faltasPorAlunoMap[mat] = (faltasPorAlunoMap[mat] || 0) + 1;
        }
      }
    }
  }

  var totalAulas = Object.keys(aulasUnicasMap).length;

  // 2. Mapear Atividades e Anotações
  var datasComAtividadeMap = {};
  var atividadesNaoFeitasMap = {}; // { matricula: { "dataStr": true } }
  var totalAnotacoesMap = {}; // { matricula: count }

  var ativSheet = getPlanilha('REGISTRO_ATIVIDADES_NOTAS');
  if (ativSheet && ativSheet.getLastRow() >= 2) {
    var ativData = ativSheet.getDataRange().getValues();
    for (var j = 1; j < ativData.length; j++) {
      var rId = ativData[j][0] ? ativData[j][0].toString().trim() : '';
      if (rId === idNorm) {
        var rDate = ativData[j][1];
        var rDateStr = "";
        if (rDate instanceof Date) {
          rDateStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else if (rDate) {
          rDateStr = rDate.toString().split('T')[0].substring(0, 10);
        }

        var rMat = ativData[j][2] ? ativData[j][2].toString().trim() : '';
        var rTemAtiv = ativData[j][3] ? ativData[j][3].toString().toUpperCase() : '';
        var rFezAtiv = ativData[j][4] ? ativData[j][4].toString().toUpperCase() : '';
        var rAnotacao = ativData[j][5] ? ativData[j][5].toString().trim() : '';

        if (rMat === '__AULA__' && (rTemAtiv === 'SIM' || rTemAtiv === 'TRUE')) {
          datasComAtividadeMap[rDateStr] = true;
        } else if (rMat !== '__AULA__' && rMat !== '') {
          if (rFezAtiv === 'NAO') {
            if (!atividadesNaoFeitasMap[rMat]) atividadesNaoFeitasMap[rMat] = {};
            atividadesNaoFeitasMap[rMat][rDateStr] = true;
          }
          if (rAnotacao !== '') {
            totalAnotacoesMap[rMat] = (totalAnotacoesMap[rMat] || 0) + 1;
          }
        }
      }
    }
  }

  var totalAtividades = Object.keys(datasComAtividadeMap).length;

  // 3. Compor métricas por aluno
  var alunosStats = {};
  for (var a = 0; a < alunos.length; a++) {
    var aluno = alunos[a];
    var matStr = aluno.matricula.toString().trim();
    var faltas = faltasPorAlunoMap[matStr] || 0;
    var presencas = Math.max(0, totalAulas - faltas);
    var pctPresenca = totalAulas > 0 ? (presencas / totalAulas) * 100 : 100;

    // Cálculo proporcional de pontos de frequência
    var pontosFreq = 0;
    if (config.ativoFreq && config.maxPontosFreq > 0) {
      pontosFreq = Math.round(((pctPresenca / 100) * config.maxPontosFreq) * 10) / 10;
    }

    // Atividades feitas
    var naoFeitasQtd = 0;
    if (atividadesNaoFeitasMap[matStr]) {
      var datasNao = Object.keys(atividadesNaoFeitasMap[matStr]);
      for (var d = 0; d < datasNao.length; d++) {
        if (datasComAtividadeMap[datasNao[d]]) {
          naoFeitasQtd++;
        }
      }
    }
    var atividadesFeitas = Math.max(0, totalAtividades - naoFeitasQtd);

    // Cálculo proporcional de pontos de atividades
    var pontosAtiv = 0;
    if (config.ativoAtiv && config.maxPontosAtiv > 0 && totalAtividades > 0) {
      pontosAtiv = Math.round(((atividadesFeitas / totalAtividades) * config.maxPontosAtiv) * 10) / 10;
    }

    alunosStats[matStr] = {
      matricula: matStr,
      nome: aluno.nome,
      turma: aluno.turma,
      notaFinal: aluno.notaFinal,
      totalAulas: totalAulas,
      faltas: faltas,
      presencas: presencas,
      pctPresenca: Math.round(pctPresenca * 10) / 10,
      pontosFreq: pontosFreq,
      totalAtividades: totalAtividades,
      atividadesFeitas: atividadesFeitas,
      pontosAtiv: pontosAtiv,
      totalAnotacoes: totalAnotacoesMap[matStr] || 0
    };
  }

  return {
    configNotas: config,
    totalAulas: totalAulas,
    totalAtividades: totalAtividades,
    alunosStats: alunosStats
  };
}

