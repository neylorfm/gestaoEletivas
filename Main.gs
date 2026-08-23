/**
 * Arquivo Main.gs
 * Responsável pela entrada do Web App e Menus da Planilha.
 */

/**
 * Função padrão do Google Apps Script que renderiza a interface HTML para o Web App.
 * @param {Object} e Objeto de evento (opcional)
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('TeacherUI')
    .setTitle('Sistema de Gestão de Eletivas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Gatilho simples executado ao abrir a planilha.
 * Cria o menu personalizado da Secretaria.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏫 Gestão Eletivas')
    .addItem('Registrar Eletivas', 'abrirModalConfigEletivas')
    .addItem('Enturmar Alunos', 'abrirModalEnturmacao')
    .addItem('Abrir Painel Diário', 'abrirSidebar')
    .addItem('Monitorar Frequências por Mês', 'abrirModalMonitoramentoFrequencias')
    .addToUi();
}

/**
 * Exibe a barra lateral (Sidebar) com o painel administrativo da secretaria.
 */
function abrirSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('AdminSidebar')
      .setTitle('Painel da Secretaria')
      .setWidth(300); // Largura padrão em pixels
      
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Abre o Modal HTML para gerenciamento de Enturmações.
 */
function abrirModalEnturmacao() {
  var html = HtmlService.createHtmlOutputFromFile('EnrollmentUI')
      .setWidth(850)
      .setHeight(650);
      
  SpreadsheetApp.getUi().showModalDialog(html, 'Gerenciador de Enturmação');
}

/**
 * Abre o Modal HTML para gerenciamento das Eletivas (CONFIG_GERAL).
 */
function abrirModalConfigEletivas() {
  var html = HtmlService.createHtmlOutputFromFile('ConfigEletivaUI')
      .setWidth(900)
      .setHeight(700);
      
  SpreadsheetApp.getUi().showModalDialog(html, 'Gerenciador de Eletivas');
}

/**
 * Abre o Modal HTML para monitoramento mensal de frequências registradas por eletiva ativa.
 */
function abrirModalMonitoramentoFrequencias() {
  var html = HtmlService.createHtmlOutputFromFile('MonitoramentoFrequenciasUI')
      .setWidth(960)
      .setHeight(680);
      
  SpreadsheetApp.getUi().showModalDialog(html, 'Monitoramento de Frequências - Eletivas Ativas');
}

