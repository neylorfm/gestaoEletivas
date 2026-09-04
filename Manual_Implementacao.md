# Manual de Implementação Técnica: Sistema de Gestão de Eletivas

Este manual destina-se aos **administradores de sistema, coordenadores de TI e gestores escolares** responsáveis por configurar, implantar e manter a infraestrutura do **Sistema de Gestão de Eletivas** integrado ao Google Workspace (Google Sheets + Google Apps Script Web App).

---

## 1. Arquitetura da Solução

O sistema foi desenvolvido sob uma arquitetura serverless nativa do Google Workspace:
- **Banco de Dados Relacional/NoSQL Leve:** Google Sheets (com integridade referencial mantida via scripts).
- **Backend & Regras de Negócio:** Google Apps Script (arquivos `.gs`).
- **Frontend dos Professores:** Web App responsivo em HTML5, CSS3 e JavaScript nativo (`TeacherUI.html`).
- **Frontend Administrativo da Secretaria:** Diálogos modais e barra lateral dentro da própria planilha (`AdminSidebar.html`, `ConfigEletivaUI.html`, `EnrollmentUI.html`, `MonitoramentoFrequenciasUI.html`).
- **Automação Externa:** Bookmarklet JavaScript para integração direta com o sistema estadual SIGE.

```
                  ┌──────────────────────────────────────────────┐
                  │           Google Sheets (Database)           │
                  │  BASE_ALUNOS | ENTURMACAO | CONFIG_GERAL     │
                  │  RELATORIO_SECRETARIA | Abas Dinâmicas (ELET) │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │        Google Apps Script (Backend)       │
                   │ Main.gs, Utils.gs, TeacherController.gs...│
                   └──────────┬─────────────────────┬──────────┘
                              │                     │
               ┌──────────────▼──────────┐   ┌──────▼─────────────────────┐
               │    Web App Professor    │   │  Painéis da Secretaria     │
               │    (TeacherUI.html)     │   │  (Modais / Sidebar HTML)   │
               └─────────────────────────┘   └────────────────────────────┘
```

---

## 2. Preparação da Planilha (Google Sheets)

### 2.1. Criação do Arquivo
1. Acesse o [Google Drive](https://drive.google.com).
2. Clique em **Novo > Planilhas Google > Planilha em branco**.
3. Nomeie a planilha como: `Sistema de Gestão de Eletivas`.

---

### 2.2. Criação das Abas Obrigatórias
Crie rigorosamente as abas com os nomes abaixo (letras maiúsculas e sem espaços extras):

1. **`BASE_ALUNOS`** (Cadastro mestre de alunos da escola)
2. **`ENTURMACAO`** (Tabela de relacionamento entre alunos e disciplinas eletivas)
3. **`CONFIG_GERAL`** (Catálogo de eletivas, professores, horários e status)
4. **`RELATORIO_SECRETARIA`** (Aba de saída consolidada para relatórios pivot)

> [!WARNING]
> **NÃO crie as abas de chamadas das eletivas manualmente (ex: `ELET10001`, `ELET10002`...)!**
> O sistema cria automaticamente a aba de cada disciplina quando o primeiro registro de frequência for realizado pelo professor.

---

### 2.3. Configuração dos Cabeçalhos das Abas

#### Aba: `BASE_ALUNOS`
Preencha a Linha 1 com os seguintes cabeçalhos:
| Coluna A | Coluna B | Coluna C |
| :--- | :--- | :--- |
| **Matricula** | **Nome_Aluno** | **Turma_Regular** |

> **Observação:** Esta aba deve ser alimentada pela secretaria com o cadastro dos alunos da escola (importado ou copiado do sistema acadêmico).

---

#### Aba: `ENTURMACAO`
Preencha a Linha 1 com os seguintes cabeçalhos:
| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E |
| :--- | :--- | :--- | :--- | :--- |
| **Matricula** | **Nome** | **Turma_Regular** | **ID_Eletiva_Atual** | **Nota_Final** |

> **Observação:** O preenchimento e a manutenção desta aba são executados automaticamente através do modal de enturmação (`EnrollmentUI.html`) e pelo lançamento de notas do professor.

---

#### Aba: `CONFIG_GERAL`
Preencha a Linha 1 com os seguintes cabeçalhos:
| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E | Coluna F | Coluna G... |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Status** | **ID_Eletiva** | **Nome_Eletiva** | **Nome_Professor** | **Email_Professor** | **Qtd_Dias_Semana** | **Dia_1**, **Periodos_1**... |

- **Coluna A (Status):** `"ATIVA"` ou `"INATIVA"`
- **Coluna D e E:** Suportam múltiplos professores separados por vírgula (ex: `prof1@escola.ce.gov.br, prof2@escola.ce.gov.br`).
- **Coluna F em diante:** Pares dinâmicos de dia da semana e períodos (ex: `Segunda-feira`, `M1, M2`).

---

#### Abas Dinâmicas de Frequência (Criadas pelo Script)
Quando criadas pelo sistema, as abas das eletivas possuem a seguinte estrutura:
| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E | Coluna F | Coluna G | Coluna H | Coluna I |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ID_Aula UUID** | **Data** | **Periodo** | **Qtd_Faltas** | **Separador** | **ID_Registro UUID** | **Matricula** | **Nome_Aluno** | **Tipo_Ocorrencia** |

---

#### Aba de Apoio Pedagógico: `REGISTRO_ATIVIDADES_NOTAS` (Gerenciada Automaticamente)
Criada e atualizada automaticamente pelo Web App do Professor para registro de atividades e anotações individuais:
| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E | Coluna F | Coluna G |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ID_Eletiva** | **Data** | **Matricula** | **Tem_Atividade_Aula** | **Fez_Atividade** | **Anotacao** | **Atualizado_Em** |

- **`Matricula = "__AULA__"`**: Registro mestre informando se a aula teve atividade (`SIM` ou `NAO`).
- **`Fez_Atividade`**: Status do aluno naquela data (`SIM` [verde] ou `NAO` [vermelho]).
- **`Anotacao`**: Observações pedagógicas registradas pelo professor no modal da aula.

---

#### Aba de Apoio Pedagógico: `CONFIG_NOTAS` (Gerenciada Automaticamente)
Criada e mantida automaticamente pelo Web App do Professor com as regras de composição da Nota Geral:
| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E |
| :--- | :--- | :--- | :--- | :--- |
| **ID_Eletiva** | **Ativo_Freq** | **Max_Pontos_Freq** | **Ativo_Ativ** | **Max_Pontos_Ativ** |

- Permite que cada eletiva possua sua própria proporção de pontos extras por frequência e atividades sem afetar o lançamento final de notas pela secretaria.

---

## 3. Configuração do Google Apps Script

### 3.1. Acessando o Editor
1. Na planilha, clique no menu superior **Extensões > Apps Script**.
2. Renomeie o projeto para: `Gestão de Eletivas - Backend`.

---

### 3.2. Estrutura de Arquivos do Projeto
Crie exatamente os 12 arquivos a seguir no editor do Apps Script (respeitando tipos e maiúsculas/minúsculas):

| Arquivo | Tipo | Descrição Técnica |
| :--- | :---: | :--- |
| **`Main.gs`** | Script | Ponto de entrada (`onOpen`), rotas `doGet`, abertura de modais e sidebar |
| **`Utils.gs`** | Script | Funções utilitárias (UUID, datas, acesso a planilhas, validações) |
| **`TeacherController.gs`** | Script | Backend do Web App do professor (leitura de eletivas, gravação de frequência e notas) |
| **`TeacherUI.html`** | HTML | Interface do Web App do professor (frequência multi-período e notas) |
| **`AdminController.gs`** | Script | Backend do painel diário, relatórios cruzados (Pivot) e dados para o SIGE |
| **`AdminSidebar.html`** | HTML | Barra lateral administrativa (relatórios, filtros e integração SIGE) |
| **`ConfigEletivaController.gs`** | Script | Backend de CRUD de eletivas, catálogo permanente e backup automático |
| **`ConfigEletivaUI.html`** | HTML | Modal de gerenciamento do catálogo de eletivas |
| **`EnrollmentController.gs`** | Script | Backend de enturmação individual e em lote (Batch write) |
| **`EnrollmentUI.html`** | HTML | Modal de enturmação em tela cheia com busca dinâmica e grade multi-colunas |
| **`MonitoramentoFrequenciasUI.html`** | HTML | Modal de monitoramento mensal e KPIs de frequência |
| **`IntegrityController.gs`** | Script | Auditoria e integridade referencial entre abas |

---

## 4. Publicação e Deploy do Web App

Para disponibilizar o aplicativo aos professores:

1. No Editor do Apps Script, clique no botão azul **Implantar > Nova implantação**.
2. Clique no ícone de engrenagem e escolha **App da Web** (*Web App*).
3. Configure os seguintes parâmetros:
   - **Descrição:** `Versão de Produção 1.0`
   - **Executar como:** `Usuário que acessa o app da Web` *(Garante a identificação automática do e-mail do professor autenticado)*.
   - **Quem tem acesso:** `Qualquer pessoa com Conta do Google` (ou `Qualquer pessoa no domínio da escola`).
4. Clique em **Implantar**.
5. Conceda as autorizações de segurança solicitadas na primeira execução.
6. Guarde a **URL do Web App** gerada (ela será compartilhada com o corpo docente).

---

## 5. Configuração do Módulo de Backup Externo

O sistema possui backup automático ao desativar disciplinas ao final do semestre:
1. Por padrão, o sistema cria automaticamente uma planilha externa chamada `Backup - Histórico de Eletivas` no Google Drive.
2. Para apontar para outra planilha de histórico:
   - Acesse o menu **🏫 Gestão Eletivas > Registrar Eletivas**;
   - Clique em **📁 Planilha de Backup**;
   - Insira a URL ou o ID da planilha de destino e confirme.

---

## 6. Configuração da Integração com o SIGE

A integração é realizada por meio de um Bookmarklet JavaScript cliente que faz a ponte entre a planilha e o formulário do SIGE:
1. O código do bookmarklet é gerado dinamicamente dentro do painel da secretaria na aba **⚡ Exportar SIGE**.
2. Os administradores escolares e secretários instalam o botão na barra de favoritos do navegador conforme detalhado no [Manual de Uso](file:///c:/Users/T-GAMER/desenvolvimento/frequencia_eletivas/Manual_Uso.md).
