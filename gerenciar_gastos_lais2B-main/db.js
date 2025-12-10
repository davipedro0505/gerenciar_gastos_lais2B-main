const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "gastos.db");

async function initDb() {
  try {
    const Database = require("better-sqlite3");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    function initializeDatabase() {

      // ===========================
      //   TABELA DE USUÁRIOS
      // ===========================
      db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE
        );
      `);

      // ===========================
      //   TABELA DE CARTÕES
      // ===========================
      db.exec(`
        CREATE TABLE IF NOT EXISTS cartoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          usuario_id INTEGER NOT NULL,
          limite REAL DEFAULT 5000,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );
      `);

      // ===========================
      //   TABELA DE CATEGORIAS
      // ===========================
      db.exec(`
        CREATE TABLE IF NOT EXISTS categorias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE,
          descricao TEXT,
          cor TEXT DEFAULT '#743014',
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Inserir categorias padrão
      const count = db.prepare("SELECT COUNT(*) AS c FROM categorias").get().c;
      if (count === 0) {
        db.exec(`
          INSERT INTO categorias (nome, descricao, cor) VALUES
          ('Alimentação', 'Gastos com comida e bebida', '#FF6B6B'),
          ('Transporte', 'Combustível, táxi, metrô', '#4ECDC4'),
          ('Saúde', 'Medicamentos, consultas, academia', '#45B7D1'),
          ('Entretenimento', 'Lazer, cinema, games', '#96CEB4'),
          ('Educação', 'Cursos, livros, mensalidade', '#FFEAA7'),
          ('Compras', 'Roupas, eletrônicos, diversos', '#DDA0DD'),
          ('Utilidades', 'Contas, internet, telefone', '#87CEEB'),
          ('Outros', 'Despesas diversas', '#D3D3D3');
        `);
      }

      // ===========================
      //   TABELA DE GASTOS
      // ===========================
      db.exec(`
        CREATE TABLE IF NOT EXISTS gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          descricao TEXT NOT NULL,
          valor REAL NOT NULL,
          cartao_id INTEGER NOT NULL,
          usuario_id INTEGER NOT NULL,
          categoria_id INTEGER,
          data_gasto DATETIME DEFAULT CURRENT_TIMESTAMP,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cartao_id) REFERENCES cartoes(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        );
      `);

// ===========================
//   TABELA DE ORÇAMENTOS
// ===========================
db.exec(`
  CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    limite_gasto REAL NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, categoria_id, mes, ano)
  );
`);

// ===========================
//   TABELA DE RESUMOS
// ===========================
db.exec(`
  CREATE TABLE IF NOT EXISTS resumos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    total_gasto REAL DEFAULT 0,
    total_orcado REAL DEFAULT 0,
    numero_transacoes INTEGER DEFAULT 0,
    categoria_maior_gasto TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, mes, ano)
  );
`);


      console.log("✅ Banco inicializado com better-sqlite3");
    }

    initializeDatabase();
    return db;

  } catch (err) {
    console.log("⚠️ better-sqlite3 não encontrado, usando sql.js");

    const initSqlJs = require("sql.js");
    const SQL = await initSqlJs({
      locateFile: f => path.join(__dirname, "node_modules/sql.js/dist", f),
    });

    let sqlDB;

    if (fs.existsSync(dbPath)) {
      sqlDB = new SQL.Database(fs.readFileSync(dbPath));
    } else {
      sqlDB = new SQL.Database();
    }

    function persist() {
      const data = sqlDB.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }

    const db = {
      exec(sql) {
        sqlDB.exec(sql);
        persist();
      },
      prepare(sql) {
        return {
          run(params) {
            const stmt = sqlDB.prepare(sql);
            if (params) stmt.bind(params);
            stmt.step();
            stmt.free();
            persist();
          },
          get(params) {
            const stmt = sqlDB.prepare(sql);
            if (params) stmt.bind(params);
            const row = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return row;
          },
          all() {
            const stmt = sqlDB.prepare(sql);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
            return rows;
          }
        };
      }
    };

    // TABELA USUÁRIOS (sem email)
    db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
      );
    `);

    // TABELAS RESTANTES...
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        cor TEXT DEFAULT '#743014',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
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
    `);



    persist();
    console.log("✅ Banco inicializado com sql.js");
    return db;
  }
}

module.exports = initDb;
