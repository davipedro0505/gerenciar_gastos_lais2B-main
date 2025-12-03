const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "gastos.db");

async function initDb() {
  // tenta carregar better-sqlite3 (nativo) — se disponível, usamos diretamente
  try {
    const Database = require("better-sqlite3");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");

    function initializeDatabase() {
      // Tabela de Usuários
      db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL UNIQUE,
          email TEXT,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Tabela de Cartões
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

      // Tabela de Categorias
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
      const stmt = db.prepare("SELECT COUNT(*) as count FROM categorias");
      const result = stmt.get();
      if (result.count === 0) {
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

      // Tabela de Gastos
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
          FOREIGN KEY (cartao_id) REFERENCES cartoes(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON SET NULL
        );
      `);

      // Tabela de Orçamentos
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

      // Tabela de Resumos
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

      console.log("✅ Banco (better-sqlite3) inicializado com sucesso!");
    }

    initializeDatabase();
    return db;
  } catch (err) {
    // fallback para sql.js (WASM) — inicialização assíncrona
    console.log("better-sqlite3 não disponível, usando sql.js como fallback (WASM). Isso pode ser mais lento em produção.");
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs({ locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file) });

    // carregar banco existente se houver
    let sqlDB;
    if (fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      sqlDB = new SQL.Database(new Uint8Array(filebuffer));
    } else {
      sqlDB = new SQL.Database();
    }

    // função para persistir em disco
    function persist() {
      try {
        const binaryArray = sqlDB.export();
        const buffer = Buffer.from(binaryArray);
        fs.writeFileSync(dbPath, buffer);
      } catch (e) {
        console.error('Erro ao persistir banco sql.js:', e);
      }
    }

    // wrapper compatível com API mínima usada no projeto
    const db = {
      exec(sql) {
        const res = sqlDB.exec(sql);
        // persistir sempre que houver modificações (CREATE/INSERT/UPDATE/DELETE)
        persist();
        return res;
      },
      pragma() {
        // noop para compatibilidade
        return null;
      },
      prepare(sql) {
        return {
          run(params) {
            const stmt = sqlDB.prepare(sql);
            if (params && params.length) stmt.bind(params);
            stmt.step();
            stmt.free();
            persist();
            return this;
          },
          get(...params) {
            const stmt = sqlDB.prepare(sql);
            if (params && params.length) stmt.bind(params);
            const row = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return row;
          },
          all(...params) {
            const stmt = sqlDB.prepare(sql);
            if (params && params.length) stmt.bind(params);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            stmt.free();
            return rows;
          },
          free() {
            // compat
          }
        };
      }
    };

    // Criar tabelas caso não existam (mesmo esquema usado anteriormente)
    db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        email TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cartoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        usuario_id INTEGER NOT NULL,
        limite REAL DEFAULT 5000,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        descricao TEXT,
        cor TEXT DEFAULT '#743014',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // inserir categorias padrão se não existirem
    const countCat = db.prepare("SELECT COUNT(*) as count FROM categorias").get();
    if (!countCat || countCat.count === 0) {
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

    db.exec(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        categoria_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        limite_gasto REAL NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS resumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        total_gasto REAL DEFAULT 0,
        total_orcado REAL DEFAULT 0,
        numero_transacoes INTEGER DEFAULT 0,
        categoria_maior_gasto TEXT
      );
    `);

    console.log('✅ Banco (sql.js) inicializado com sucesso (arquivo: ' + dbPath + ')');
    // persistir estado atual
    try { const binaryArray = sqlDB.export(); fs.writeFileSync(dbPath, Buffer.from(binaryArray)); } catch (e) {}
    return db;
  }
}

module.exports = initDb;

