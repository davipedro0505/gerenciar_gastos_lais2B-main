const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

function rowsFromResult(result) {
  if (!result || result.length === 0) return [];
  const r = result[0];
  return r.values.map(vals => {
    const obj = {};
    r.columns.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}

(async () => {
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  const db = new SQL.Database();

  // Cria tabelas (mesmas colunas básicas do projeto)
  const schema = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cartoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  usuario_id INTEGER NOT NULL,
  limite REAL DEFAULT 5000,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#743014',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  cartao_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  categoria_id INTEGER,
  data_gasto DATETIME DEFAULT CURRENT_TIMESTAMP,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  categoria_id INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  limite_gasto REAL NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  total_gasto REAL DEFAULT 0,
  total_orcado REAL DEFAULT 0,
  numero_transacoes INTEGER DEFAULT 0,
  categoria_maior_gasto TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

  db.run(schema);

  // vou colocar alguns dados de teste, alice a prota
  const insertUsuario = db.prepare("INSERT INTO usuarios (nome, email) VALUES (?, ?);");
  insertUsuario.run(["Alice", "alice@example.com"]);
  insertUsuario.run(["Bob", "bob@example.com"]);
  insertUsuario.free();

  const insertCategoria = db.prepare("INSERT INTO categorias (nome, descricao, cor) VALUES (?, ?, ?);");
  insertCategoria.run(["Alimentação", "Comidas e refeições", "#FF6B6B"]);
  insertCategoria.run(["Transporte", "Combustível e táxi", "#4ECDC4"]);
  insertCategoria.free();

  const insertCartao = db.prepare("INSERT INTO cartoes (nome, usuario_id, limite) VALUES (?, ?, ?);");
  insertCartao.run(["Visa", 1, 3000]);
  insertCartao.run(["Mastercard", 2, 5000]);
  insertCartao.free();

  const insertGasto = db.prepare("INSERT INTO gastos (descricao, valor, cartao_id, usuario_id, categoria_id, data_gasto) VALUES (?, ?, ?, ?, ?, ?);");
  insertGasto.run(["Almoço", 25.5, 1, 1, 1, '2025-12-03']);
  insertGasto.run(["Uber", 18.75, 1, 1, 2, '2025-12-02']);
  insertGasto.free();

  const insertOrc = db.prepare("INSERT INTO orcamentos (usuario_id, categoria_id, mes, ano, limite_gasto) VALUES (?, ?, ?, ?, ?);");
  insertOrc.run([1, 1, 12, 2025, 200]);
  insertOrc.free();

  // consultas de verificação
  let res = db.exec("SELECT * FROM usuarios ORDER BY id");
  console.log('\n== Usuários ==');
  console.table(rowsFromResult(res));

  res = db.exec("SELECT * FROM categorias ORDER BY id");
  console.log('\n== Categorias ==');
  console.table(rowsFromResult(res));

  res = db.exec("SELECT g.*, c.nome as categoria_nome, ca.nome as cartao_nome FROM gastos g LEFT JOIN categorias c ON g.categoria_id = c.id LEFT JOIN cartoes ca ON g.cartao_id = ca.id ORDER BY g.data_gasto DESC");
  console.log('\n== Gastos (com join) ==');
  console.table(rowsFromResult(res));

  // gerar um resumo simples para Alice (usuario_id = 1) mês 12/2025
  const month = '12';
  const year = '2025';
  const totalGastoRes = db.exec("SELECT COALESCE(SUM(valor),0) as total FROM gastos WHERE usuario_id = 1 AND strftime('%m', data_gasto) = '12' AND strftime('%Y', data_gasto) = '2025'");
  const totalGasto = rowsFromResult(totalGastoRes)[0] ? rowsFromResult(totalGastoRes)[0].total : 0;

  console.log('\n== Resumo (usuario 1, 12/2025) ==');
  console.log({ totalGasto });

  // Exportar banco para arquivo .sqlite (opcional)
  const binaryArray = db.export();
  const buffer = Buffer.from(binaryArray);
  const outPath = path.join(__dirname, '..', 'gastos_sqljs_test.sqlite');
  fs.writeFileSync(outPath, buffer);
  console.log('\nBanco exportado para: ' + outPath);

  // liberar prepared statements e fechar (sql.js não tem close)
  console.log('\nTeste concluído.');
})();
