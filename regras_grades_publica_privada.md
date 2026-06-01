# 🛡️ Diretrizes Curriculares e Carga Horária — Pública vs. Privada & Monarch Engine

Este documento reúne a base legal das diretrizes do **Ministério da Educação (MEC)**, da **Lei de Diretrizes e Bases da Educação Nacional (LDB - Lei nº 9.394/1996)**, da regulamentação do **Piso do Magistério (Lei nº 11.738/2008)** e da **CLT (Artigo 318)**, aplicadas de forma automatizada pelo algoritmo de CSP **Monarch Engine v3**.

---

## 1. Distribuição de Horários por Nível de Ensino (Matriz Curricular)

Nas escolas públicas, as grades curriculares são engessadas e padronizadas pelas Secretarias de Educação. Nas escolas particulares, há plena autonomia de mercado para estruturar a jornada diária, possibilitando desmembrar disciplinas (ex: Língua Portuguesa dividida em Gramática, Literatura e Redação) e expandir a grade horária.

A tabela abaixo resume as regras aplicadas pelo **Monarch Engine v3** ao analisar o nome ou nível das turmas para alocação de horários padrões:

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
> **Heurística de Detecção do Nível (Monarch)**:
> - **Ensino Fundamental**: Identificado por dígitos de `5` a `9` no nome da turma ou nível `FUNDAMENTAL`.
> - **Ensino Médio Técnico**: Identificado por nível `MEDIO_TECNICO` ou palavras-chave (`tec`, `tecnico`).
> - **Ensino Médio Regular**: Identificado por nível `MEDIO` ou dígitos de `1` a `3`.

---

## 2. A Lei do Piso do Magistério, Regras REDA & CLT (Privada)

O **Monarch Engine v3** suporta as três categorias de contratação docente, aplicando regras específicas de limite de atuação em sala de aula e hora-atividade de acordo com o regime:

### A. Professores Concursados / Efetivos (Lei Federal nº 11.738)
A legislação federal determina que, no máximo, **2/3 (dois terços)** da carga horária de trabalho do professor concursado pode ser destinada à interação com os educandos em sala de aula. O **1/3 (um terço)** restante é protegido por lei como hora-atividade.

| Carga Horária Contratual | Sala de Aula (Máximo 2/3) | Hora-Atividade (Mínimo 1/3) | Conversão Prática (Aulas Semanais) |
| :---: | :---: | :---: | :---: |
| **20 horas** | 13,3 horas | 6,7 horas | **13 aulas** (de 50 min) |
| **40 horas** | 26,7 horas | 13,3 horas | **26 aulas** (de 50 min) |

### B. Professores REDA (Regime Especial de Direito Administrativo)
Para contratos sob o regime especial (REDA), aplica-se a regra de **80% de regência** de classe e **20% de hora-atividade**.

| Carga Horária Contratual | Sala de Aula (Máximo 80%) | Hora-Atividade (Mínimo 20%) | Conversão Prática (Aulas Semanais) |
| :---: | :---: | :---: | :---: |
| **20 horas** | 16,0 horas | 4,0 horas | **16 aulas** (de 50 min) |
| **40 horas** | 32,0 horas | 8,0 horas | **32 aulas** (de 50 min) |

### C. Regime CLT (Instituições Privadas)
Em instituições da rede privada (`PRIVADO`), a contratação segue o regime da **CLT**. Sob este regime, toda a carga horária contratual de trabalho do professor é alocável diretamente como regência/tempo em sala de aula (fator 1:1), sem a aplicação obrigatória de fatores redutores na plataforma.

| Carga Horária Contratual | Sala de Aula (Máximo 100%) | Conversão Prática (Aulas Semanais) |
| :---: | :---: | :---: |
| **20 horas** | 20,0 horas | **20 aulas** (de 50 min) |
| **40 horas** | 40,0 horas | **40 aulas** (de 50 min) |

---

## 3. Limites de Alocação e Regras de Negócio do Monarch Engine v3

### A. Limite Diário Flexível na Rede Privada (CLT Artigo 318)
O artigo 318 da CLT protege a saúde do professor regulamentando limites diários de aula na mesma instituição:
- O professor não deve ministrar mais de **4 aulas consecutivas** ou **6 intercaladas** no mesmo dia na mesma instituição, exceto mediante acordo coletivo.
- Desta forma, o **Monarch Engine v3** impõe limites diários de aulas por matéria:
  - **Rede Pública**: Máximo **2 aulas** da mesma matéria por dia por turma.
  - **Rede Privada**: Máximo **4 aulas** da mesma matéria por dia por turma (permitindo grades densas de 6 a 8 aulas semanais de Português ou Matemática).

### B. Bloqueio de Excedência
Ao tentar vincular um professor a turmas cujo somatório de aulas semanais ultrapasse o limite máximo contratual calculado com base no regime (ex: máximo 26 aulas para 40h Concursado, 32 aulas para 40h REDA ou 40 aulas para 40h CLT), o sistema dispara um bloqueio impeditivo, garantindo a conformidade regulatória.
