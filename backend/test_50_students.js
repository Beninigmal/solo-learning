const fs = require('fs');
let text = "Crie esses alunos:\n";
for(let i=1; i<=50; i++) {
  text += `Aluno ${i}, Matricula ${i}, Turma 1, Matutino\n`;
}

async function run() {
  const login = await fetch("http://127.0.0.1:3333/auth/login", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({matricula: "web01", password: "1234"})
  }).then(r => r.json());
  
  console.log("Got token");
  const res = await fetch("http://127.0.0.1:3333/ordinator/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + login.token
    },
    body: JSON.stringify({ message: text })
  });
  console.log("Status:", res.status);
  const data = await res.text();
  console.log("Data:", data.substring(0, 500));
}
run();
