# Solen - Recursos do Aplicativo (Features)

Este documento descreve todas as funcionalidades implementadas no projeto **Solen** (Solo Learning), divididas pelos perfis de acesso e recursos técnicos.

---

## 🏛️ Perfil: O Arquiteto (Administrador)
O Arquiteto tem controle total sobre os usuários mestres e visualização geral do sistema.

*   **Autenticação Exclusiva:** Login com credenciais de administrador (case-insensitive).
*   **Gestão de Mestres (CRUD):** 
    *   Cadastrar novos Mestres (Professores) com Nome, Matrícula e Senha padrão.
    *   Listar, editar e excluir Mestres do sistema.
*   **Visualização de Alunos:** Lista geral de alunos cadastrados com busca e visualização de seus respectivos Mestres e Turmas.

---

## ⚔️ Perfil: O Mestre (Professor)
O Mestre é o comandante das masmorras, responsável por gerenciar turmas, recrutar alunos e forjar missões usando Inteligência Artificial.

*   **Gestão de Turmas:**
    *   Criar turmas definindo Nome, Ano e o **Código de Invocação** (senha inicial compartilhada para os alunos).
    *   Editar dados das turmas existentes.
*   **Recrutamento de Caçadores (Alunos):**
    *   **Individual:** Cadastro manual de aluno com Nome, Matrícula e Turno.
    *   **Em Lote (CSV):** Opção de colar texto no formato `Nome;Matricula` para cadastrar uma turma inteira de uma vez.
*   **A Forja (Geração de Missões via IA):**
    *   Geração de perguntas personalizadas usando a API do **DeepSeek**.
    *   O mestre define a Semana (número) e o Tema (ex: "Equações de 2º Grau") e o sistema gera e distribui a missão para todos os alunos da turma selecionada.
*   **Histórico de Missões:**
    *   Visualização de todas as missões geradas no passado.
    *   **Gráfico de Barras Horizontal** exibindo a taxa de sucesso da turma em cada missão (calculada em tempo real com base nos acertos dos alunos).
*   **Radar de Turmas:**
    *   Monitoramento em tempo real do XP de todos os alunos da turma.
    *   **Alerta de Risco:** Alunos com XP abaixo de um limite (ex: 600 XP) são destacados com um alerta de "Risco de Prova Física" (Recuperação).

---

## 🧑‍🚀 Perfil: O Player (Aluno)
O Player é o caçador que resolve as missões para subir de nível e ganhar recompensas visuais.

*   **Fluxo de Primeiro Acesso:**
    *   O aluno faz o primeiro login usando sua Matrícula e o **Código de Invocação** da turma.
    *   O sistema detecta o primeiro acesso e exige que ele defina um **Nickname** (Nome de Caçador) e uma senha definitiva.
*   **Janela de Sistema (Missões Diárias):**
    *   As missões aparecem em um modal estilizado que bloqueia a tela (estética inspirada em anime/RPG).
    *   O aluno pode responder imediatamente ou usar a opção de **Aguardar**.
*   **Fila de Espera (Wait Mode):**
    *   Ao clicar em "Aguardar", a missão vai para uma fila e o modal fecha.
    *   O aluno tem 40 minutos (TTL) para clicar no card de espera e resolver a questão antes que ela expire.
*   **O Baú de Quests Perdidas (Modo de Estudo):**
    *   Se o aluno errar uma resposta na missão diária, ela vai para o **Baú**.
    *   Na aba "Baú", ele pode visualizar todas as perguntas que errou e tentar respondê-las novamente.
    *   Se acertar uma pergunta do baú, ele recupera **10% do XP** original e a pergunta some da lista.
*   **Sistema de Ranks e Progressão:**
    *   Exibição do Rank atual baseado no XP acumulado:
        *   `0 - 499 XP`: **E-Rank** (Recruta)
        *   `500 - 1499 XP`: **D-Rank** (Guerreiro)
        *   `1500 - 2999 XP`: **C-Rank** (Elite)
        *   `3000 - 4999 XP`: **B-Rank** (Mestre das Sombras)
        *   `5000+ XP`: **A-Rank** (Lenda)
    *   Barra de progresso visual que calcula o percentual necessário para alcançar o próximo Rank.

---

## 🛠️ Recursos Técnicos e Arquitetura

*   **Backend:** Node.js com Fastify e Prisma ORM (conectado ao PostgreSQL no Render).
*   **Frontend:** React Native com Expo (Router) e NativeWind (TailwindCSS).
*   **IA:** Integração com DeepSeek para geração e validação de perguntas de forma dinâmica.
*   **Notificações:** Uso de `expo-notifications` para alertar o aluno quando uma nova missão estiver disponível (mesmo com o app em background).
*   **Segurança:** Autenticação via JWT com diferenciação de rotas por role (`ADMIN`, `PROFESSOR`, `ALUNO`).
