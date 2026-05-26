# 🛡️ Solen High-Fidelity UI & Architecture Guidelines

Este documento reúne todas as diretrizes de design, paleta de cores, componentes e regras de arquitetura que estruturam o aplicativo **Solen (Solo Learning)**. Ele serve como o guia oficial de contexto para que novas funcionalidades sempre sigam a identidade premium inspirada no sistema de "Solo Leveling".

---

## 🎨 1. Paleta de Cores e Temática Visual
O aplicativo adota estritamente o tema de **ficção científica cibernética** com tons profundos e contrastes de neon. Cores genéricas (como roxo, rosa neon, vermelho/verde básicos) **são proibidas**.

*   **Cor de Energia Primária (Neon Cyan)**: `#00f3ff` (`neonBlue`).
    *   Utilizada em bordas ativas, textos de destaque, ícones de status ativos e brilhos neon.
*   **Fundo de Tela Base**: Um gradiente ou estilo azul escuro e profundo:
    *   Backgrounds gerais de cards e containers: `#0a1128` com opacidade de 90% (`bg-[#0a1128]/90`).
    *   Containers gerais seguros do aplicativo devem usar fundos escuros transparentes ou opacos.
*   **Painéis de Contraste Escuro**: Células de listas, sub-containers ou inputs devem usar `#000000` com 50% ou 60% de opacidade (`bg-black/50` ou `bg-black/60`).
*   **Placeholders Vibrantes**: Todos os placeholders de inputs de texto devem usar a cor cyan translúcida: `#00f3ff80` ou `rgba(0, 243, 255, 0.5)`.

---

## 📐 2. Layouts e Estrutura de Componentes
Para manter a consistência visual em todos os dashboards (Superadmin/Matrix, Mestre, Arquiteto, Aluno):

### A. Containers de Cards Principais
Toda seção lógica importante é agrupada dentro de um container com borda neon e fundo translúcido:
```typescript
<View className="bg-[#0a1128]/90 border border-neonBlue p-6 rounded-sm mb-6">
  <View className="flex-row items-center gap-2 mb-6">
    <Feather name="shield" size={18} color="#00f3ff" />
    <Text className="text-white text-base font-bold uppercase tracking-widest">
      Título da Seção
    </Text>
  </View>
  {/* Conteúdo */}
</View>
```

### B. Blocos de Itens Individuais (Listagens)
Cada item listado (turma, professor, disciplina) não deve usar simples divisórias, mas sim blocos independentes e robustos:
```typescript
<View className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
  {/* Conteúdo com tipografia monospaced e ícones */}
</View>
```

### C. Inputs de Texto Padronizados
Todos os campos de texto seguem um padrão visual centralizado, com borda neon e fonte monoespaçada:
```typescript
<TextInput
  placeholder="Nome do Caçador..."
  placeholderTextColor="#00f3ff80"
  className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-4 font-mono"
/>
```

---

## 💾 3. Diretrizes de Desenvolvimento e DRY
*   **Evitar Repetição de Código**: Reutilize sempre as classes utilitárias do Nativewind/Tailwind já declaradas e estabelecidas no projeto.
*   **Componentes Compartilhados**:
    *   **Alertas**: Utilize sempre o componente `<SystemAlert />` importado de `../../components/SystemAlert` para exibir avisos e modais customizados com o visual Solo Leveling, evitando `Alert.alert` do SO.
    *   **Submissões**: Utilize `<CyberSubmitButton />` importado de `../../components/CyberSubmitButton` para garantir loaders integrados e estilo cibernético nos botões de salvamento.

---

## ⚙️ 4. Regras de Negócio e Arquitetura de Dados

### A. Multi-tenant (Instituição)
A separação de dados escolares é realizada através da coluna string `instituicao` nas tabelas `User`, `Turma` e `Disciplina`.
*   O **Arquiteto** possui a coluna `instituicao` populada com a escola correspondente.
*   Ao logar, o Arquiteto e o Mestre filtram automaticamente turmas, alunos e disciplinas baseados estritamente na instituição da qual fazem parte.

### B. Permissões de Perfis (Roles)
*   `ADMIN` (Superadmin/Diretor da Matrix): Acesso global.
*   `ARQUITETO` (Coordenação Acadêmica): Responsável por criar turmas, professores, matérias e configurar a grade de horários.
*   `PROFESSOR` (Mestre): Responsável por gerar quests e visualizar sua agenda.
*   `ALUNO` (Caçador/Player): Consome as quests e visualiza o cronograma escolar.

### C. Posicionamento de Horários (Timetable Slots)
Para acomodar turnos na mesma tabela sem precisar de migrations, utilizamos índices de posição (`posicao` de 1 a 15) na tabela `TimetableSlot`:
*   **MATUTINO**: Posições `1` a `5`.
*   **VESPERTINO**: Posições `6` a `10` (Exibido no front como 1º ao 5º horário da tarde).
*   **NOTURNO**: Posições `11` a `15` (Exibido no front como 1º ao 5º horário da noite).

---

Sempre que criar telas ou fluxos novos, **garanta a aderência estrita a estes padrões!** 🛡️
