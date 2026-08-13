# Manual de Implementação: Sistema de Gestão de Eletivas

Bem-vindo ao **Manual de Implementação do Sistema de Gestão de Eletivas**! Este guia foi feito especialmente para administradores escolares e professores que desejam automatizar o controle de frequência de forma moderna, utilizando o Google Sheets como banco de dados e um Web App para a interface dos professores. 

Siga os passos abaixo, sem pular nenhuma etapa, e você terá seu sistema funcionando rapidamente!

---

## 1. Preparação do Banco de Dados (Google Sheets)

O "coração" do nosso sistema é uma planilha do Google Sheets. É nela que os dados ficam salvos de forma segura.

### Passo a passo para criar o arquivo
1. Acesse o seu Google Drive.
2. Clique em **Novo > Planilhas Google > Planilha em branco**.
3. No canto superior esquerdo, renomeie o arquivo para algo como **"Sistema de Gestão de Eletivas"**.

### Criando as Abas (Páginas) Necessárias
No rodapé da planilha, você verá uma aba chamada `Página1`. Dê um duplo clique nela para renomeá-la. Você vai precisar criar as seguintes abas (use exatamente estes nomes, respeitando as letras maiúsculas):
1. **`BASE_ALUNOS`** (Cadastro mestre de todos os alunos da escola)
2. **`ENTURMACAO`** (Tabela de Enturmação: onde vinculamos a matrícula do aluno à sua Eletiva)
3. **`CONFIG_GERAL`** (Onde configuramos as turmas e professores)
3. **`RELATORIO_SECRETARIA`** (Onde o consolidado de faltas será gerado)
4. **Abas Dinâmicas** (ex: `12345`...): Você **NÃO** precisa criar as abas dinâmicas manualmente! O sistema as criará automaticamente (usando o `ID_Eletiva` como nome) quando o professor fizer a primeira chamada.

### Configurando os Cabeçalhos de Cada Aba
Na primeira linha de cada aba (Linha 1), preencha os cabeçalhos exatamente na ordem a seguir:

#### Aba: `BASE_ALUNOS` (Cadastro Mestre)
- **Coluna A:** Matricula
- **Coluna B:** Nome_Aluno
- **Coluna C:** Turma_Regular
> *(Atenção: Os dados de todos os alunos nesta aba devem ser **preenchidos manualmente** pela secretaria ou simplesmente copiados e colados a partir do sistema de gestão escolar existente. O nosso script NÃO cria alunos novos aqui automaticamente).*

#### Aba: `ENTURMACAO` (Antiga DB_ALUNOS)
- **Coluna A:** Matricula *(Preenchido automaticamente pelo Modal de Enturmação)*
- **Coluna B:** Nome *(Preenchido automaticamente pelo Modal de Enturmação)*
- **Coluna C:** Turma_Regular *(Preenchido automaticamente pelo Modal de Enturmação)*
- **Coluna D:** ID_Eletiva_Atual *(Preenchido automaticamente pelo Modal de Enturmação)*
> *(Atenção: Você não precisa digitar os alunos manualmente aqui! Utilize o menu superior "Gestão Eletivas > Enturmar Alunos" para abrir o formulário interativo. O script escreverá nesta aba de forma segura. Um mesmo aluno pode aparecer em várias linhas caso esteja matriculado em mais de uma eletiva).*

#### Aba: `CONFIG_GERAL`
> *(Atenção: A aba `CONFIG_GERAL` **NÃO DEVE** mais ser preenchida manualmente! Utilize o menu superior "Gestão Eletivas > Registrar Eletivas" para abrir o gerenciador interativo. O sistema cadastrará e formatará as eletivas com seus dias e períodos de forma automatizada e à prova de erros).*

#### Abas Dinâmicas de Chamada (ex: `ELET1`, `ELET2`, etc.)
> [!WARNING]
> **NÃO CRIE ESTAS ABAS MANUALMENTE!** O sistema se encarrega de criar automaticamente a aba de cada eletiva (usando o `ID_Eletiva` como nome) no momento em que o professor realiza a sua primeira chamada. Os cabeçalhos abaixo serão inseridos magicamente pelo script:

- **Coluna A:** ID_Aula UUID
- **Coluna B:** Data
- **Coluna C:** Periodo
- **Coluna D:** Qtd_Faltas
- **Coluna E:** Separador *(Serve apenas como um divisor visual na planilha, separando as informações gerais da aula, nas colunas à esquerda, das informações específicas do aluno faltoso, nas colunas à direita).*
- **Coluna F:** ID_Registro UUID
- **Coluna G:** Matricula
- **Coluna H:** Nome_Aluno
- **Coluna I:** Tipo_Ocorrencia *(Indica o status do aluno. O sistema preencherá automaticamente com "F" para Falta, "J" para Falta Justificada, ou "PRESENÇA TOTAL" caso a turma toda esteja presente).*

> **💡 Como funciona a lógica de repetição nestas abas?** 
> As colunas da esquerda (**A até D**) representam os **dados da aula**. Caso haja, por exemplo, 5 alunos ausentes em um mesmo dia e período, essas 4 colunas irão se **repetir 5 vezes** (uma linha para cada ausência). Já as colunas da direita (**F até I**) representam os **dados individuais** de cada aluno, ou seja, em cada uma dessas 5 linhas os nomes, matrículas e os IDs de registro (UUID) serão únicos e não se repetirão. Se ninguém faltar na aula, apenas uma linha será criada, constando as colunas A a D preenchidas e a coluna I com a tag "PRESENÇA TOTAL".

#### Aba: `RELATORIO_SECRETARIA` *(Atenção: A primeira linha conterá cabeçalhos dinâmicos no formato Pivot-Table gerados pelo Script)*
- **Coluna A:** Matrícula
- **Coluna B:** Nome *(Sem repetições. Um aluno aparece em apenas uma linha, mesmo matriculado em várias eletivas)*
- **Coluna C:** Turma
- **Coluna D:** Faltas *(Soma total no período selecionado)*
- **Coluna E:** Presenças *(Soma total no período selecionado)*
- **Colunas Seguintes (Datas):** São geradas automaticamente. Nas células, o sistema mostrará `0` se o aluno esteve presente nas eletivas daquele dia, `-` se não possuía aula, ou `X F` com a quantidade de faltas.
  - **Dica de Ouro:** Ao passar o mouse sobre as células das datas, um comentário aparecerá informando exatamente o nome da Eletiva e as faltas específicas daquela disciplina no dia! (ex: `Robótica(1F), Programação(0F)`).

> **💡 Dicas de Validação de Dados:** Para evitar erros, nossa arquitetura usa o `IntegrityController` para proteger a aba de Enturmação. Além disso, faça validações na aba `CONFIG_GERAL` para os dias da semana.

---

## 2. Configuração do Google Apps Script

Agora, vamos transformar essa planilha simples em um sistema inteligente.

1. Na sua planilha, clique no menu superior **Extensões > Apps Script**.
2. Uma nova guia do navegador será aberta. Este é o editor de códigos.
3. No painel esquerdo, você verá um arquivo chamado `Código.gs`. Renomeie-o e crie os outros arquivos necessários. Para criar novos arquivos, clique no botão de **"+" (Adicionar arquivo)** ao lado da palavra "Arquivos".

Você deve criar e colar os códigos gerados anteriormente **exatamente** nestes 9 arquivos:
1. `Utils.gs` (Arquivo do tipo Script)
2. `TeacherController.gs` (Arquivo do tipo Script)
3. `Main.gs` (Arquivo do tipo Script)
4. `TeacherUI.html` (Arquivo do tipo HTML)
5. `AdminController.gs` (Arquivo do tipo Script)
6. `AdminSidebar.html` (Arquivo do tipo HTML)
7. `IntegrityController.gs` (Arquivo do tipo Script)
8. `EnrollmentController.gs` (Arquivo do tipo Script)
9. `EnrollmentUI.html` (Arquivo do tipo HTML)
10. `ConfigEletivaController.gs` (Arquivo do tipo Script)
11. `ConfigEletivaUI.html` (Arquivo do tipo HTML)

*Atenção: Apenas copie e cole os códigos previamente elaborados dentro de seus respectivos arquivos. Salve tudo clicando no ícone de disquete (Salvar projeto) ou usando o atalho `Ctrl + S`.*

---

## 3. Publicação do Web App (Acesso do Professor)

Agora vamos colocar a interface do professor "no ar". Este é o link que você enviará para que eles façam a chamada pelo celular ou computador.

1. No Editor do Apps Script, olhe para o canto superior direito e clique no botão azul **Implantar** (ou Deploy) > **Nova implantação**.
2. Clique no ícone de engrenagem (Selecione o tipo) e marque **App da Web** (Web app).
3. Preencha as configurações rigorosamente desta forma:
   - **Descrição:** "Versão Inicial 1.0" (ou como preferir).
   - **Executar como:** Selecione **"Usuário que acessa o app da Web"**. (Isso garante que o sistema reconhecerá o e-mail individual de cada professor logado).
   - **Quem tem acesso:** Selecione **"Qualquer pessoa com Conta do Google"** (ou "Qualquer pessoa no domínio da sua escola", caso usem Google Workspace for Education).
4. Clique em **Implantar**.

### Autorização de Permissões (Primeiro Acesso)
No primeiro deploy, o Google pedirá que você autorize o script a ler e editar sua planilha:
1. Clique em **Autorizar acesso**.
2. Selecione sua conta do Google.
3. Como o app foi feito por você mesmo e ainda não passou por auditoria oficial do Google, aparecerá uma tela de aviso "O Google não verificou este app". Clique em **Avançado** no canto inferior esquerdo e depois em **Acessar Projeto (não seguro)**.
4. Por fim, clique em **Permitir**.

Copie a **URL do App da Web** que será gerada. Este é o link que os professores utilizarão!

### Como o Professor faz a Chamada (Multi-Períodos)
1. O professor acessa o link do Web App e o sistema identifica as eletivas dele (e o respectivo dia da semana).
2. Ao selecionar uma eletiva, o cartão de cada aluno aparecerá na tela com botões verdes para cada período configurado naquele dia (ex: `M1`, `M2`).
3. Se um aluno faltar apenas no `M1`, basta o professor clicar no botão `M1` para desmarcá-lo (ele ficará vermelho indicando **Falta**). O botão `M2` continua verde (**Presente**).
4. Se o aluno faltar o dia todo, o professor desmarca todos os botões.
5. Ao clicar em **Salvar Chamada**, o sistema registrará no Google Sheets de forma inteligente as faltas apenas para os períodos que o professor deixou vermelhos!
6. **Validação de Data:** O Web App do professor garante a consistência dos dados bloqueando o registro de frequência em dias da semana em que a eletiva não ocorre. Se a eletiva for de Segunda-feira e o professor selecionar uma data de Terça, o botão de Salvar será desabilitado com um aviso.
7. **Controle de Duplicidade:** Caso o professor tente salvar uma chamada para uma Eletiva, Data e Período que já foram registrados, o sistema emitirá um alerta perguntando se ele deseja sobrescrever a chamada anterior. Ao confirmar, a chamada antiga será substituída pela nova de forma segura.

---

## 4. Uso da Secretaria

A Secretaria possui duas ferramentas principais operando direto da planilha: **Gestão de Enturmações** e **Geração de Relatórios**.

1. Volte para a guia da sua Planilha (Google Sheets) e atualize a página (`F5`).
2. Aguarde alguns segundos. Você notará que surgiu um novo menu na barra superior, chamado **"🏫 Gestão Eletivas"**.
3. *(Se for o primeiro acesso da secretaria, talvez o Google peça a autorização de segurança explicada no passo anterior. Basta permitir).*

### Registrar Eletivas (Modal Interativo)
1. Clique em **Gestão Eletivas > Registrar Eletivas**.
2. Uma janela vai se abrir. Aqui você insere o ID da Eletiva (ex: ELET1), o Nome, os dados do Professor responsável, e os dias de aula.
3. Clique em **Adicionar Dia** para colocar as configurações, como "Segunda-feira", períodos "M1, M2".
4. Salve e a eletiva já estará perfeitamente formatada na aba `CONFIG_GERAL`. Você também pode editar e excluir eletivas existentes por essa mesma tela.

### Enturmar Alunos (Modal Interativo)
1. Clique em **Gestão Eletivas > Enturmar Alunos**.
2. Um painel moderno se abrirá no centro da tela. 
3. Escolha a Eletiva, filtre a Turma Regular e selecione o Aluno desejado. Clique em **Enturmar Aluno**.
4. A tabela abaixo atualizará instantaneamente. Você pode buscar alunos pela barra de pesquisa, editá-los (botão de lápis) ou desmatriculá-los (botão de lixeira). 
   - *Nota: Caso o aluno tenha mais de uma eletiva, a ação de edição/exclusão afetará apenas a eletiva específica que foi clicada na tabela.*

### Gerar Relatório Cruzado (Pivot)
1. Clique em **Gestão Eletivas > Abrir Painel Diário**.
2. Uma barra lateral muito elegante aparecerá do lado direito da planilha. 
3. Escolha o filtro principal: **Por Turma Regular** ou **Por Eletiva**.
4. Selecione a Turma ou Eletiva desejada.
5. Insira a **Data Inicial** e a **Data Final** (as buscas agora são rigorosamente inclusivas para estes limites).
6. Clique em **Gerar Relatório (Pivot)**.
7. O script fará um processamento massivo em background e criará uma Tabela Cruzada achatada na aba **`RELATORIO_SECRETARIA`**, com as datas em colunas, mostrando presenças (`0`) e faltas (ex: `2 F`).
8. Passe o mouse sobre as células com registros para ver anotações detalhadas de qual Eletiva a presença ou falta se refere!

Pronto! Seu Sistema de Gestão de Eletivas está completo e operando de ponta a ponta. Parabéns pela implementação! 🚀
