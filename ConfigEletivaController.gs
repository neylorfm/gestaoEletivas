/**
 * Arquivo ConfigEletivaController.gs
 * Lida com as ações do Web App para gerenciamento das configurações de eletivas (aba CONFIG_GERAL).
 */

/**
 * Lê a aba CONFIG_GERAL e retorna todas as eletivas cadastradas.
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
    
    var eletiva = {
      rowIndex: i + 1,
      idEletiva: idEletiva,
      nomeEletiva: row[2],
      nomeProfessor: row[3],
      emailProfessor: row[4],
      dias: []
    };
    
    var qtdDias = parseInt(row[5]) || 0;
    var index = 6; // Coluna G (0-based = 6)
    for (var j = 0; j < qtdDias; j++) {
      var dia = row[index] ? row[index].toString() : '';
      var periodosStr = row[index+1] ? row[index+1].toString() : '';
      
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
 * @param {Object} eletiva Dados da eletiva
 */
function salvarConfigEletiva(eletiva) {
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) return "Erro: Aba CONFIG_GERAL não encontrada.";
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  if (eletiva.idEletiva) {
    // Verifica se a eletiva já existe (Edição)
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === eletiva.idEletiva) {
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
  
  // Monta a nova linha
  var novaLinha = [
    "", // Coluna A vazia ou reservada
    eletiva.idEletiva.toUpperCase(), // Coluna B
    eletiva.nomeEletiva, // Coluna C
    eletiva.nomeProfessor, // Coluna D
    eletiva.emailProfessor, // Coluna E
    eletiva.dias.length // Coluna F
  ];
  
  // Achata os dias e períodos nas colunas subsequentes
  for (var d = 0; d < eletiva.dias.length; d++) {
    novaLinha.push(eletiva.dias[d].dia);
    novaLinha.push(eletiva.dias[d].periodos);
  }
  
  // Se encontrou a linha, atualiza
  if (rowIndex !== -1) {
    // Primeiro limpamos a linha inteira para evitar que dados velhos (dias deletados) sobrem no final
    var lastCol = Math.max(sheet.getLastColumn(), novaLinha.length);
    sheet.getRange(rowIndex, 1, 1, lastCol).clearContent();
    sheet.getRange(rowIndex, 1, 1, novaLinha.length).setValues([novaLinha]);
    return "Eletiva atualizada com sucesso!";
  } else {
    // Se não encontrou, insere no final
    sheet.appendRow(novaLinha);
    return "Eletiva cadastrada com sucesso!";
  }
}

/**
 * Exclui uma eletiva da aba CONFIG_GERAL.
 * @param {string} idEletiva ID da Eletiva
 */
function excluirConfigEletiva(idEletiva) {
  var sheet = getPlanilha('CONFIG_GERAL');
  if (!sheet) return "Erro: Aba CONFIG_GERAL não encontrada.";
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === idEletiva) {
      sheet.deleteRow(i + 1);
      return "Eletiva excluída com sucesso!";
    }
  }
  
  return "Erro: Eletiva não encontrada.";
}
