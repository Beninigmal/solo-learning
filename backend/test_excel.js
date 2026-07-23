const XLSX = require('xlsx');

// Create a dummy workbook simulating the user's
const wsData = [
  ['Cadastro de Professores e Carga Horária'],
  ['Relação de docentes contratados'],
  [],
  ['TOTAL DE PROFESSORES', 'CONCURSADOS', 'REDA', 'CARGA HORÁRIA TOTAL'],
  ['10', '5', '5', '300'],
  ['Matrícula', 'Nome do Professor', 'Vínculo', 'Carga Horária (h)', 'Disciplina'],
  ['tw001', 'Ana Carolina da Silva', 'Concursado', '40 h', 'Matemática'],
  ['tw002', 'Lucas Eduardo Oliveira', 'REDA', '20 h', 'Português']
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const cleanNormalize = (name) => {
  if (typeof name !== 'string') return '';
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
};

const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
let headerRowIndex = -1;
let headers = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!Array.isArray(row)) continue;
  const normalizedCols = row.map(cell => cell !== undefined && cell !== null ? cleanNormalize(String(cell)) : '');
  if (normalizedCols.includes('nome') || normalizedCols.includes('nomedoprofessor') || normalizedCols.includes('matricula')) {
    headerRowIndex = i;
    headers = normalizedCols;
    break;
  }
}

console.log("Found headerRowIndex:", headerRowIndex);
console.log("Headers:", headers);

const parsedRows = [];
for (let i = headerRowIndex + 1; i < rows.length; i++) {
  const row = rows[i];
  if (!Array.isArray(row)) continue;
  const obj = {};
  let hasData = false;
  for (let j = 0; j < headers.length; j++) {
    if (headers[j]) {
      obj[headers[j]] = row[j];
      if (row[j] !== undefined && row[j] !== null && String(row[j]).trim() !== '') hasData = true;
    }
  }
  if (hasData) parsedRows.push(obj);
}

console.log("Parsed Rows:", parsedRows);

