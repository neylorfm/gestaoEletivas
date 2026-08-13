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
        if (configData[c][1] == idEletiva) {
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
  return { status: 'SUCCESS' };
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
    
    // (Opcional) A instrução foca na exclusão. Se fosse estritamente necessário atualizar
    // a quantidade de faltas (Qtd_Faltas) nas demais linhas, a lógica extra entraria aqui.
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
 * Retorna as faltas já registradas para uma data específica.
 * @returns {Object} Ex: { "M1": ["matricula1", "matricula2"] }
 */
function getFaltasDaChamada(idEletiva, dataStr) {
  var sheet = getPlanilha(idEletiva.toString());
  if (!sheet) return {}; // Não tem aba, não tem faltas.
  
  var sheetData = sheet.getDataRange().getValues();
  var faltas = {};
  
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
      
      if (!faltas[periodo]) faltas[periodo] = [];
      
      if (tipoOcorrencia === "F") {
        var matricula = sheetData[i][6] ? sheetData[i][6].toString() : null; // Coluna G (índice 6)
        if (matricula) {
          faltas[periodo].push(matricula);
        }
      }
    }
  }
  
  return faltas;
}
