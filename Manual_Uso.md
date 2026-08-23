# Manual de Uso: Sistema de Gestão de Eletivas

Guia operacional passo a passo para **Professores, Coordenadores e Equipe da Secretaria Escolar**.

---

## 🧭 Sumário
1. [Módulo do Professor (Web App)](#1-módulo-do-professor-web-app)
   - [Acesso ao Aplicativo](#11-acesso-ao-aplicativo)
   - [Registro de Frequência Diária](#12-registro-de-frequência-diária)
   - [Lançamento e Edição de Notas Finais](#13-lançamento-e-edição-de-notas-finais)
2. [Módulo da Secretaria e Coordenação (Planilha Google)](#2-módulo-da-secretaria-e-coordenação)
   - [Menu Gestão Eletivas](#21-menu-gestão-eletivas)
   - [Cadastro e Gestão de Eletivas (Catálogo Permanente)](#22-cadastro-e-gestão-de-eletivas)
   - [Enturmação de Alunos (Modal Inteligente)](#23-enturmação-de-alunos)
   - [Geração de Relatórios Cruzados (Pivot-Table)](#24-geração-de-relatórios-cruzados-pivot)
   - [Monitoramento Mensal de Frequências (KPIs)](#25-monitoramento-mensal-de-frequências)
3. [Exportação Automática para o SIGE](#3-exportação-automática-para-o-sige)
   - [Instalação do Botão Favorito no Navegador](#31-instalação-do-botão-favorito-no-navegador)
   - [Copiando os Dados da Planilha](#32-copiando-os-dados-da-planilha)
   - [Preenchimento em 1 Clique no SIGE](#33-preenchimento-em-1-clique-no-sige)

---

## 1. Módulo do Professor (Web App)

### 1.1. Acesso ao Aplicativo
1. Abra o link do Web App enviado pela coordenação escolar no celular ou computador.
2. Faça login com sua conta Google institucional autorizada.
3. O sistema identificará automaticamente seu e-mail e exibirá apenas as eletivas sob sua responsabilidade.

---

### 1.2. Registro de Frequência Diária
1. No menu superior, clique na aba **"📋 Frequência Diária"**.
2. Selecione a **Eletiva** desejada no seletor.
3. Escolha a **Data** da aula.
   > **Nota de Validação:** O sistema valida o dia da semana no calendário. Se a eletiva ocorre às segundas-feiras e você selecionar uma data de terça-feira, o salvamento será bloqueado para evitar inconsistências.
4. Na lista de alunos, cada estudante possui botões verdes correspondentes aos períodos daquele dia (ex: `M1`, `M2`):
   - **Verde = Aluno Presente**
   - **Vermelho = Aluno Ausente (Falta)**: Clique no botão do período em que o aluno faltou para deixá-lo vermelho.
5. Se o aluno faltou a todas as aulas do dia, desmarque todos os períodos.
6. Clique no botão **"💾 Salvar Chamada"**.
7. **Controle de Duplicidade:** Caso já exista uma chamada registrada para aquela data/período, um aviso abrirá perguntando se deseja sobrescrever. Ao confirmar, o registro anterior é atualizado com segurança.

---

### 1.3. Lançamento e Edição de Notas Finais
1. No menu superior, clique na aba **"📝 Lançamento de Notas Finais"**.
2. Selecione a sua Eletiva.
3. Digite a nota final de cada aluno no campo correspondente (valores entre **0.0 e 10.0** com 1 casa decimal, ex: `8.5`, `10.0`).
4. Alunos com notas alteradas receberão a etiqueta amarela **"MODIFICADA"**.
5. Use a barra de pesquisa rápida para localizar estudantes por nome ou matrícula.
6. Clique em **"💾 Salvar Todas as Notas"**.

---

## 2. Módulo da Secretaria e Coordenação

### 2.1. Menu Gestão Eletivas
Ao abrir a planilha no Google Sheets, localize o menu superior **"🏫 Gestão Eletivas"**.

---

### 2.2. Cadastro e Gestão de Eletivas
Clique em **Gestão Eletivas > Registrar Eletivas**:
1. **Painel de Indicadores:** Mostra o total de eletivas, ativas no semestre e inativas no catálogo.
2. **Criar Nova Eletiva:** Insira o nome, professores responsáveis (e-mails), dias da semana e horários/períodos.
3. **Desativar e Arquivar com Backup:** Ao término do semestre, clique em **⏸️ Desativar**:
   - O sistema move automaticamente a aba de chamadas para a planilha de backup com resumo consolidado (total de aulas, faltas e percentual);
   - Limpa a aba de enturmação para o próximo ciclo;
   - Guarda a eletiva no catálogo permanente pronta para ser reativada no futuro.
4. **Reativar Eletiva:** No catálogo, clique em **🚀 Reativar**, atualize os professores responsáveis e uma nova aba limpa será aberta para o novo semestre.

---

### 2.3. Enturmação de Alunos
Clique em **Gestão Eletivas > Enturmar Alunos**:

1. **Passo 1: Selecionar a Eletiva:** Digite qualquer parte do nome ou código da eletiva para filtrar instantaneamente.
2. **Passo 2: Filtrar Turma Regular:** Digite o nome da turma ou mantenha *Todas as Turmas*.
3. **Passo 3: Escolher Aluno(s):**
   - Clique no botão **"Escolher Aluno(s)"** para abrir o **Modal em Tela Cheia**.
   - O modal exibe os alunos em **grade multi-colunas**, facilitando a visualização de turmas com 40 ou mais alunos.
   - **Ocultação Automática:** Alunos que já estão enturmados na eletiva selecionada são ocultados automaticamente da lista.
   - Utilize a barra de busca rápida do modal para encontrar estudantes por nome ou matrícula.
   - Use o botão **"Marcar Todos"** / **"Desmarcar Todos"** para seleção rápida.
   - Clique em **"Confirmar Seleção"**.
4. **Finalizar:** Clique em **"Enturmar Aluno(s)"** para gravação rápida em lote.

#### 🔄 Troca / Transferência de Eletiva (Botão Lápis na Tabela):
1. Na tabela de enturmações abaixo, clique no ícone de **Lápis** do aluno que deseja transferir.
2. O sistema exibe a faixa de alerta indicando a troca e pré-seleciona o aluno.
3. No campo **"1. Selecione a Eletiva"**, a disciplina atual é ocultada automaticamente. Basta selecionar a **nova eletiva**.
4. Clique em **"Salvar Troca de Eletiva"**. A nota da disciplina anterior é limpa automaticamente e a nova enturmação é registrada.

---

### 2.4. Geração de Relatórios Cruzados (Pivot)
Clique em **Gestão Eletivas > Abrir Painel Diário**:
1. Na barra lateral direita, escolha a visão: por **Turma Regular** ou por **Eletiva**.
2. Selecione o período (**Por Mês** ou **Intervalo de Datas**).
3. Clique em **"Gerar Relatório (Pivot)"**.
4. A aba `RELATORIO_SECRETARIA` exibirá a tabela cruzada com presenças (`0`), faltas (`X F`) e notas finais.
5. Passe o mouse sobre as células das datas para ver detalhes da disciplina em comentários.

---

### 2.5. Monitoramento Mensal de Frequências
Clique em **Gestão Eletivas > Monitorar Frequências por Mês**:
1. Selecione o **Mês** e o **Ano** e clique em **Atualizar**.
2. Visualize os cartões com KPIs (Eletivas ativas, com chamadas realizadas, pendentes e total de aulas).
3. Consulte a quantidade exata de aulas registradas por professor.
4. Clique no botão **"Ver datas"** para inspecionar os dias e períodos de cada aula.
5. Use o botão **"🖨️ Imprimir / Salvar PDF"** para gerar um relatório formatado para a coordenação.

---

## 3. Exportação Automática para o SIGE

Transfira as **faltas** do mês e as **notas finais** para o SIGE estadual em segundos sem digitação manual.

### 3.1. Instalação do Botão Favorito no Navegador (Feito apenas uma vez)
1. No Google Chrome ou Microsoft Edge, pressione `Ctrl + Shift + O` para abrir o Gerenciador de Favoritos.
2. Clique com o botão direito na Barra de Favoritos e selecione **"Adicionar novo favorito"**.
3. **Nome:** `⚡ Preencher SIGE`
4. **URL:** Cole o código JavaScript fornecido na aba **"💡 Botão SIGE"** do painel lateral da planilha.
5. Salve o favorito.

---

### 3.2. Copiando os Dados da Planilha
1. Na planilha, abra **Gestão Eletivas > Abrir Painel Diário** e acesse a aba **"⚡ Exportar SIGE"**.
2. Selecione a **Eletiva** e o **Mês/Período**.
3. Clique em **"🔍 1. Carregar Dados para o SIGE"** para verificar a prévia.
4. Clique em **"📋 2. Copiar Dados para o SIGE (Faltas e Notas)"**.

---

### 3.3. Preenchimento em 1 Clique no SIGE
1. Acesse o portal do **SIGE** (`sige.seduc.ce.gov.br`) e vá na tela correspondente:
   - **Faltas:** *Acadêmico > Frequência Eletiva > Pesquisar*;
   - **Notas Finais:** *Acadêmico > Avaliações/Notas > Pesquisar*.
2. Selecione a disciplina e clique em **Buscar**.
3. Com a lista de estudantes na tela, clique no botão **`⚡ Preencher SIGE`** na sua barra de favoritos.
4. **Resultado Automático:**
   - As aulas dadas e as faltas/notas de todos os alunos são preenchidas instantaneamente com destaque visual em verde;
   - No módulo de notas, a situação (Aprovado/Reprovado) é calculada automaticamente pelo SIGE.
5. Clique em **Gravar/Salvar** no SIGE.
