# 🛡️ Diretrizes Curriculares e Carga Horária — MEC / LDB & Monarch Engine

Este documento reúne a base legal das diretrizes do **Ministério da Educação (MEC)** e da **Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei nº 9.394/1996)**, juntamente com a regulamentação do **Piso do Magistério (Lei nº 11.738/2008)**, aplicadas de forma automatizada pelo algoritmo de CSP **Monarch Engine v3**.

---

## 1. Distribuição de Horários por Nível de Ensino (Matriz Curricular)

Com base nas diretrizes da **Base Nacional Comum Curricular (BNCC)** e nas atualizações legislativas recentes (como a **Lei nº 14.945/2024** para o Ensino Médio), as redes escolares brasileiras organizam suas matrizes horárias variando as aulas semanais conforme o segmento.

A tabela abaixo resume as regras aplicadas pelo **Monarch Engine v3** ao analisar o nome das turmas para deduzir o nível de ensino correspondente e alocar os horários padrões:

| Componente Curricular | Ensino Fundamental II <br>(6º ao 9º Ano) | Ensino Médio Regular <br>(1ª a 3ª Série) | Ensino Médio Técnico <br>(Profissionalizante) |
| :--- | :---: | :---: | :---: |
| **Língua Portuguesa / Redação** | **5 aulas** | **4 aulas** | **4 aulas** |
| **Matemática / Cálculo** | **5 aulas** | **2 aulas** | **3 aulas** |
| **História / Geografia / Ciências / Biologia** | **3 aulas** | **2 aulas** | **2 aulas** |
| **Física / Química** | **2 aulas** | **2 aulas** | **2 aulas** |
| **Inglês / Língua Estrangeira** | **2 aulas** | **2 aulas** | **2 aulas** |
| **Educação Física** | **2 aulas** | **2 aulas** | **2 aulas** |
| **Arte / Filosofia / Sociologia / Ensino Religioso** | **1 aula** | **1 aula** | **1 aula** |

> [!NOTE]
> **Heurística de Detecção do Monarch**:
> - **Ensino Fundamental**: Identificado por dígitos de `5` a `9` no nome da turma (ex: `5A`, `6B`, `9C`).
> - **Ensino Médio Técnico**: Identificado pelas palavras-chave `tec`, `tecnico`, `profissionalizante` ou `profes` (ex: `1º Técnico`, `Téc Informática`).
> - **Ensino Médio Regular**: Identificado por dígitos de `1` a `3` (ex: `1A`, `2B`, `3ª Série`).

---

## 2. A Lei do Piso do Magistério (Lei Federal nº 11.738) — Limite de Trabalho de Sala de Aula

A legislação federal determina que, no máximo, **2/3 (dois terços)** da carga horária de trabalho do professor pode ser destinada à interação com os educandos em sala de aula. O **1/3 (um terço)** restante é protegido por lei como hora-atividade (para planejamento, correção e reuniões).

O **Monarch Engine v3** calcula e valida automaticamente essa proporcionalidade na vinculação das matérias e na geração das grades:

| Carga Horária Contratual | Sala de Aula (Máximo 2/3) | Hora-Atividade (Mínimo 1/3) | Conversão Prática (Aulas Semanais) |
| :---: | :---: | :---: | :---: |
| **20 horas** | 13,3 horas | 6,7 horas | **13 aulas** (de 50 min) |
| **24 horas** | 16,0 horas | 8,0 horas | **16 aulas** (de 50 min) |
| **26 horas** | 17,3 horas | 8,7 horas | **17 aulas** (de 50 min) |
| **30 horas** | 20,0 horas | 10,0 horas | **20 aulas** (de 50 min) |
| **40 horas** | 26,7 horas | 13,3 horas | **26 aulas** (de 50 min) |

> [!IMPORTANT]
> **Bloqueio de Excedência**: Ao tentar vincular um professor a uma quantidade de turmas que ultrapasse o limite máximo de aulas semanais calculado com base no seu contrato, o sistema disparará um alerta impeditivo, protegendo a segurança jurídica da escola e a saúde do docente.

---

## 3. Aplicação Técnica no Código do Backend

O sistema aplica essas diretrizes em duas camadas complementares:

1. **Validação de Vínculos (`POST /disciplinas/professor`)**: Impede que a somatória das aulas semanais das turmas de um professor ultrapasse seu limite legal (ex: no máximo 13 aulas para contratos de 20h). O padrão de horas da matéria agora é dinâmico e varia conforme o nível de ensino de cada turma adicionada.
2. **Geração CSP do Monarch Engine (`monarchSolveTurma`)**: Utiliza as metas dinâmicas como fallback inteligente quando a turma não possui configurações manuais salvas, gerando calendários equilibrados e válidos.
