const msg = {
  tool_calls: [
    {
      function: {
        name: "batchRegisterStudents",
        arguments: "{\"alunos\":\"[{'nome': 'John'}, {'nome': 'Doe'}]\"}"
      }
    }
  ]
};

let widget = null;
const toolCallsToProcess = msg.tool_calls.map(tc => tc.function);

for (const tc of toolCallsToProcess) {
  const callName = tc.name;
  let callArgs = tc.arguments;
  if (typeof callArgs === 'string') {
    try { callArgs = JSON.parse(callArgs); } catch (e) { callArgs = {}; }
  }
  callArgs = callArgs || {};

  if (callName === 'batchRegisterStudents') {
    let { alunos } = callArgs;
    console.log("Original alunos:", alunos);
    if (typeof alunos === 'string') {
      try {
        // Fix single quotes to double quotes for JSON.parse
        alunos = alunos.replace(/'/g, '"');
        alunos = JSON.parse(alunos);
      } catch(e){
        console.error("JSON parse failed", e);
      }
    }
    console.log("Parsed alunos:", alunos);
    if (alunos && Array.isArray(alunos)) {
      widget = {
        type: 'BATCH_CONFIRM',
        data: {
          role: 'ALUNO',
          items: alunos.map(a => ({
            nome: a.nome,
            matricula: a.matricula || 'ALU123456',
            turma: a.turma || '',
            turno: a.turno || 'MATUTINO'
          }))
        }
      };
    }
  }
}
console.log("Widget:", JSON.stringify(widget, null, 2));
