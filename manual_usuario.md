# 📜 Manual do Sistema Solen (Solo Learning)
*Guia completo para Professores, Administradores e Alunos*

Bem-vindo ao **Solen**, um sistema de aprendizagem gamificado onde o ensino se transforma em uma jornada de RPG (Role Playing Game). Aqui, professores são **Mestres**, alunos são **Players** (Caçadores) e as atividades são **Missões**.

Este guia foi feito para que você, Professor (Mestre), e sua equipe possam extrair o máximo do sistema.

---

## 👥 1. As Três Entidades do Sistema

O Solen divide-se em três níveis de acesso:

1. **Arquiteto (Administrador)**: O criador do mundo. Responsável por cadastrar os Mestres, criar as Turmas e fazer os vínculos (quem ensina o quê e para quem).
2. **Mestre (Professor)**: O mestre do jogo. Responsável por recrutar os alunos para suas turmas, criar missões personalizadas usando Inteligência Artificial e acompanhar o progresso.
3. **Player (Aluno)**: O herói da jornada. Recebe as missões, responde às perguntas, ganha XP (Experiência) e evolui de nível.

---

## 🛠️ 2. Guia do Arquiteto (Administrador)

Se você está assumindo o papel de Arquiteto, seu objetivo é preparar o terreno para os professores.

### Ações Principais:
*   **Forjar Mestre**: Cadastra um novo professor no sistema.
    *   *Campos*: Nome, Matrícula (Login), Nickname, Instituição e Nova Matéria (opcional).
*   **Forjar Turma**: Cria uma nova sala de aula.
    *   *Campos*: Nome (Ex: 3º Ano A), Ano Letivo e Código da Turma (opcional).
*   **Criar Vínculo**: Esta é a parte mais importante. Você deve unir um **Mestre**, uma **Disciplina** e uma **Turma**. Sem isso, o mestre não verá a turma em seu painel.

---

## 🧙‍♂️ 3. Guia do Mestre (Professor)

Como Mestre, você tem o poder de criar desafios e engajar seus alunos.

### 🔑 Primeiro Acesso
Ao ser cadastrado pelo Arquiteto, sua senha inicial será a sua **Matrícula**. No primeiro login, o sistema exigirá que você crie uma nova senha segura.

### 👥 Aba: Recrutar (Cadastrar Alunos)
Antes de enviar missões, você precisa colocar os alunos dentro das turmas.
1.  **Recrutamento Individual**: Digite o Nome Completo e a Matrícula do aluno.
2.  **Recrutamento em Lote (CSV)**: Ideal para turmas cheias. Você pode colar uma lista no formato `Nome;Matricula` (um por linha) e o sistema cadastrará todos de uma vez.
3.  **Seleção de Turno**: Escolha entre Matutino, Vespertino, Noturno ou Integral.
4.  **Vincular à Turma**: Selecione para qual turma esse aluno está sendo recrutado.

### ⚒️ Aba: Forja (Criar Missões com IA)
Aqui você usa o poder do Oráculo (Inteligência Artificial Gemini) para criar questões inéditas.
1.  **Semana**: Identificador da missão (Ex: Semana 1).
2.  **Turma**: Para quem vai a missão.
3.  **Disciplina**: Matéria da missão.
4.  **Complexidade**: Escolha entre Livre (ideal para pós-graduação ou temas abertos), Fácil, Médio ou Difícil.
5.  **Tipo de Questão**:
    *   *Prática (Cálculo)*: A IA gerará questões que exigem contas.
    *   *Teórica (Texto)*: Questões conceituais.
6.  **Tema**: Digite o assunto específico (Ex: "Freud e o Inconsciente", "Equações do 2º Grau").

O sistema gerará um lote de questões e as distribuirá automaticamente para os alunos da turma selecionada.

### 👹 Invocação Rápida de BOSS
Quer fazer um teste rápido ou um desafio surpresa? Use o botão vermelho **Invocação Rápida de BOSS**. Ele gerará uma missão especial de teste instantaneamente.

### 📊 Aba: Histórico
Acompanhe o rendimento da sua turma.
*   O sistema lista todas as missões criadas.
*   Exibe o **Tema**, o **Nível** e o **Enunciado** exato da pergunta que foi gerada.
*   Mostra uma barra de **Taxa de Sucesso** (porcentagem de alunos que acertaram a questão). Use isso para adaptar seu ensino!

---

## 🎮 4. Visão do Player (O que o Aluno faz?)

Para que você possa orientar seu amigo, aqui está o que o aluno faz no app:
1.  O aluno loga com a Matrícula e a Senha criada por ele (ou padrão no primeiro acesso).
2.  Ele vê as missões disponíveis enviadas pelo Mestre.
3.  Ao responder corretamente, ele ganha XP e sobe de nível no ranking da turma.

---

## 💡 Dicas para Testes
1.  **Fluxo de Teste Sugerido**:
    *   Arquiteto cria a Turma "Pós Freud".
    *   Arquiteto cria o Mestre (Você ou seu amigo).
    *   Arquiteto vincula o Mestre à Turma "Pós Freud" na matéria desejada.
    *   Mestre loga, vai em "Recrutar" e adiciona um aluno de teste.
    *   Mestre vai em "Forja", escolhe dificuldade "Livre" e digita o tema específico.
    *   Verifique no Histórico a questão gerada!

---
*Nota: Como sou uma IA de texto, não consigo gerar um arquivo `.pdf` diretamente para download automático, mas você pode copiar este texto e colá-lo no Word, Google Docs ou usar a função "Imprimir para PDF" do seu navegador/editor para gerar o arquivo perfeito para enviar pelo WhatsApp ou e-mail!*
