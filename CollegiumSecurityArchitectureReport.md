# 🛡️ Relatório de Análise Arquitetural, Segurança e LGPD: Collegium

Este relatório apresenta um diagnóstico aprofundado do aplicativo **Collegium** sob quatro pilares estratégicos: **Propósito do Aplicativo**, **Arquitetura de Dados**, **Conformidade com a LGPD e Segurança**, e **Recomendações de Novas Funcionalidades / Fluxos**.

---

## 🏛️ 1. O Propósito e Diferencial do Collegium
O **Collegium** não é apenas mais um LMS (Learning Management System). Seu verdadeiro propósito é a **revolução do engajamento estudantil através da gamificação profunda (High-Fidelity Gamification)**. 

Ao traduzir o cotidiano escolar (tarefas, horários, avaliações) na linguagem cultural dos estudantes modernos (Status Windows, Ranks, Quests, Caçadores e Mestres), o app remove a barreira psicológica do "estudo obrigatório" e a substitui pela dopamina do progresso contínuo e conquistas compartilhadas.

---

## 🔒 2. Avaliação de Segurança e LGPD
Ao lidar com ambientes escolares, a conformidade legal e a proteção de dados são fatores críticos de sobrevivência do produto. No modelo atual, identificamos pontos de atenção importantes sob a **LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)**:

### ⚠️ A. O Gargalo de Dados de Menores (Artigo 14 da LGPD)
*   **O Risco**: A grande maioria dos alunos (*Caçadores*) em escolas de ensino fundamental e médio são **menores de idade**.
*   **O que diz a LGPD**: O tratamento de dados pessoais de crianças e adolescentes exige o **consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal**.
*   **Implementação**: No Collegium, o aceite de termos (`acceptedTermsAt`) e a identificação do responsável (`parentConsentName`) são exigidos na primeira inicialização e salvos na conta do usuário.

### ⚠️ B. Direito ao Esquecimento e Transparência (Artigo 18 da LGPD)
*   **O Risco**: Usuários (especialmente pais ou alunos que saem da instituição) têm o direito de solicitar a confirmação do tratamento, acesso aos seus dados e a **exclusão definitiva** de suas informações pessoais.
*   **Implementação**: O sistema disponibiliza o fluxo de solicitação de exclusão de conta via tabela `DeleteAccountRequest`, garantindo suporte ao direito ao esquecimento.

### ⚠️ C. Segurança e Vulnerabilidades Arquiteturais (IDOR & Multi-tenancy)
*   **Isolamento por Instituição (`institutionId` e `instituicao`)**:
    *   O backend utiliza validação rigorosa de tenant (`fastify.validateInstitution`) em todas as rotas protegidas para garantir isolamento estrito entre escolas.
*   **Prevenção de Vulnerabilidade IDOR (Insecure Direct Object Reference)**:
    *   No backend, as rotas que acessam recursos (alunos, turmas, disciplinas, quests) realizam validações cruzadas da instituição do usuário autenticado contra a instituição do recurso.

---

## 🛠️ 3. Recomendações Arquiteturais e Multi-tenant
*   **Uso da entidade `Institution`**: Centralização de configurações específicas da escola na tabela `Institution`, conectando relacionalmente `User`, `Turma` e `Disciplina`.
*   **Segurança de Tráfego**: Comunicação via HTTPS/WSS e biometria local via `expo-local-authentication`.

---

## ⚔️ 4. Funcionalidades e Mecânicas de Gamificação
*   **Inventário & Artefatos**: Consumo de itens consumíveis para bônus estratégicos e pedagógicos.
*   **Party & Raids**: Masmorras cooperativas com combates contra Mega Bosses e Mini Bosses.
*   **Devolutivas por IA**: Auxílio pedagógico com respostas estruturadas e dicas personalizadas sem revelar o gabarito.

---

## ⚖️ 5. Conformidade Pedagógica e Isenção de Cunho Religioso
O Collegium declara formalmente que todas as nomenclaturas, títulos, conquistas, nomes de itens e mecânicas de RPG presentes na plataforma possuem caráter exclusivamente fictício, lúdico e educacional. Foram criados com a única finalidade de engajar e motivar os alunos no processo de aprendizado, sendo livres de qualquer vínculo, conotação ou cunho religioso, espiritual ou ideológico, estando aptos para adoção por instituições de ensino públicas, privadas e confessionais.
