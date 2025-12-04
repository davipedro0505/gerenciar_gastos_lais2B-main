// =================================================
// Servidor principal — versão corrigida

const express = require("express");
const exphbs = require("express-handlebars");
const initDb = require("./db");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configura Handlebars com helpers
const handlebars = exphbs.create({
  helpers: {
    ifEquals: function (a, b, options) {
      return (a == b) ? options.fn(this) : options.inverse(this);
    },
    formatCurrency: function (value) {
      try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
      } catch (e) {
        return value;
      }
    }
  }
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');

// Inicializa o banco e registra as rotas somente após o DB estar pronto
initDb().then((db) => {
  // rota da página principal
  app.get('/', (req, res) => res.render('home'));

  // CRUD Usuários
  app.get('/usuarios', (req, res) => {
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    res.render('usuarios/list', { usuarios });
  });

  app.get('/usuarios/add', (req, res) => {
  res.render('usuarios/add');
});

 app.post('/usuarios', (req, res) => {
  const { nome } = req.body; // pega do formulário
  if (!nome) return res.send("❌ Nome não enviado!");

  try {
    db.prepare('INSERT INTO usuarios (nome) VALUES (?)').run(nome);
    res.redirect('/usuarios');
  } catch (error) {
    res.send("❌ Erro ao criar usuário! <br><a href='/usuarios'>Voltar</a>");
  }
});


app.get('/usuarios/editar/:id', (req, res) => {
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
    if (!usuario) return res.send('❌ Usuário não encontrado!');
    res.render('usuarios/edit', { usuario });
  });

  app.post('/usuarios/editar/:id', (req, res) => {
    const { nome } = req.body;
    try {
      db.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').run(nome, req.params.id);
      res.redirect('/usuarios');
    } catch (error) {
      res.send("❌ Erro ao atualizar usuário! <br><a href='/usuarios'>Voltar</a>");
    }
  });

  app.post('/usuarios/delete/:id', (req, res) => {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
    res.redirect('/usuarios');
  });

  // CRUD Cartões
  app.get('/cartoes', (req, res) => {
    const usuarioId = req.query.usuarioId;
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();

    let cartoes;
    if (usuarioId) {
      cartoes = db.prepare(`SELECT c.*, u.nome as usuario_nome FROM cartoes c JOIN usuarios u ON c.usuario_id = u.id WHERE c.usuario_id = ? ORDER BY c.nome`).all(usuarioId);
    } else {
      cartoes = db.prepare(`SELECT c.*, u.nome as usuario_nome FROM cartoes c JOIN usuarios u ON c.usuario_id = u.id ORDER BY c.nome`).all();
    }

    const listaComNomes = cartoes.map(c => ({ ...c, usuarioNome: c.usuario_nome }));
    res.render('cartoes/list', { cartoes: listaComNomes, usuarios });
  });

  app.post('/cartoes', (req, res) => {
    const { nome, usuarioId, limite } = req.body;
    try {
      db.prepare('INSERT INTO cartoes (nome, usuario_id, limite) VALUES (?, ?, ?)').run(nome, usuarioId, limite || 5000);
      res.redirect('/cartoes?usuarioId=' + usuarioId);
    } catch (error) {
      res.send("❌ Erro ao criar cartão! <br><a href='/cartoes'>Voltar</a>");
    }
  });

  app.get('/cartoes/editar/:id', (req, res) => {
    const cartao = db.prepare('SELECT * FROM cartoes WHERE id = ?').get(req.params.id);
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    if (!cartao) return res.send('❌ Cartão não encontrado!');
    res.render('cartoes/edit', { cartao, usuarios });
  });

  app.post('/cartoes/editar/:id', (req, res) => {
    const { nome, usuarioId, limite } = req.body;
    try {
      db.prepare('UPDATE cartoes SET nome = ?, usuario_id = ?, limite = ? WHERE id = ?').run(nome, usuarioId, limite, req.params.id);
      res.redirect('/cartoes?usuarioId=' + usuarioId);
    } catch (error) {
      res.send("❌ Erro ao atualizar cartão! <br><a href='/cartoes'>Voltar</a>");
    }
  });

  app.post('/cartoes/delete/:id', (req, res) => {
    db.prepare('DELETE FROM cartoes WHERE id = ?').run(req.params.id);
    res.redirect('/cartoes');
  });

  // CRUD Categorias
  app.get('/categorias', (req, res) => {
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
    res.render('categorias/list', { categorias });
  });

  app.post('/categorias', (req, res) => {
    const { nome, descricao, cor } = req.body;
    try {
      db.prepare('INSERT INTO categorias (nome, descricao, cor) VALUES (?, ?, ?)').run(nome, descricao || '', cor || '#743014');
      res.redirect('/categorias');
    } catch (error) {
      res.send("❌ Erro ao criar categoria! <br><a href='/categorias'>Voltar</a>");
    }
  });

  app.get('/categorias/editar/:id', (req, res) => {
    const categoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
    if (!categoria) return res.send('❌ Categoria não encontrada!');
    res.render('categorias/edit', { categoria });
  });

  app.post('/categorias/editar/:id', (req, res) => {
    const { nome, descricao, cor } = req.body;
    try {
      db.prepare('UPDATE categorias SET nome = ?, descricao = ?, cor = ? WHERE id = ?').run(nome, descricao, cor, req.params.id);
      res.redirect('/categorias');
    } catch (error) {
      res.send("❌ Erro ao atualizar categoria! <br><a href='/categorias'>Voltar</a>");
    }
  });

  app.post('/categorias/delete/:id', (req, res) => {
    db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
    res.redirect('/categorias');
  });

  // CRUD Orçamentos
  app.get('/orcamentos', (req, res) => {
    const orcamentos = db.prepare(`SELECT o.*, u.nome as usuario_nome, c.nome as categoria_nome FROM orcamentos o JOIN usuarios u ON o.usuario_id = u.id JOIN categorias c ON o.categoria_id = c.id ORDER BY o.ano DESC, o.mes DESC`).all();
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
    res.render('orcamentos/list', { orcamentos, usuarios, categorias });
  });

  app.post('/orcamentos', (req, res) => {
    const { usuarioId, categoriaId, mes, ano, limite_gasto } = req.body;
    try {
      db.prepare('INSERT INTO orcamentos (usuario_id, categoria_id, mes, ano, limite_gasto) VALUES (?, ?, ?, ?, ?)').run(usuarioId, categoriaId, mes, ano, parseFloat(limite_gasto));
      res.redirect('/orcamentos');
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        res.send("❌ Orçamento para este usuário/categoria e mês já existe. <br><a href='/orcamentos'>Voltar</a>");
      } else {
        res.send("❌ Erro ao criar orçamento! <br><a href='/orcamentos'>Voltar</a>");
      }
    }
  });

  app.get('/orcamentos/editar/:id', (req, res) => {
    const orcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(req.params.id);
    if (!orcamento) return res.send('❌ Orçamento não encontrado!');
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
    res.render('orcamentos/edit', { orcamento, usuarios, categorias });
  });

  app.post('/orcamentos/editar/:id', (req, res) => {
    const { usuarioId, categoriaId, mes, ano, limite_gasto } = req.body;
    try {
      db.prepare('UPDATE orcamentos SET usuario_id = ?, categoria_id = ?, mes = ?, ano = ?, limite_gasto = ? WHERE id = ?').run(usuarioId, categoriaId, mes, ano, parseFloat(limite_gasto), req.params.id);
      res.redirect('/orcamentos');
    } catch (error) {
      res.send("❌ Erro ao atualizar orçamento! <br><a href='/orcamentos'>Voltar</a>");
    }
  });

  app.post('/orcamentos/delete/:id', (req, res) => {
    db.prepare('DELETE FROM orcamentos WHERE id = ?').run(req.params.id);
    res.redirect('/orcamentos');
  });

  // CRUD Resumos
  app.get('/resumos', (req, res) => {
    const resumos = db.prepare(`SELECT r.*, u.nome as usuario_nome FROM resumos r JOIN usuarios u ON r.usuario_id = u.id ORDER BY r.ano DESC, r.mes DESC`).all();
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    res.render('resumos/list', { resumos, usuarios });
  });

  app.post('/resumos', (req, res) => {
    const { usuarioId, mes, ano } = req.body;
    const mesStr = String(mes).padStart(2, '0');

    const totalGastoRow = db.prepare("SELECT COALESCE(SUM(valor),0) as total FROM gastos WHERE usuario_id = ? AND strftime('%m', data_gasto) = ? AND strftime('%Y', data_gasto) = ?").get(usuarioId, mesStr, ano);
    const total_orcado_row = db.prepare("SELECT COALESCE(SUM(limite_gasto),0) as total FROM orcamentos WHERE usuario_id = ? AND mes = ? AND ano = ?").get(usuarioId, mes, ano);
    const transacoesRow = db.prepare("SELECT COUNT(*) as cnt FROM gastos WHERE usuario_id = ? AND strftime('%m', data_gasto) = ? AND strftime('%Y', data_gasto) = ?").get(usuarioId, mesStr, ano);
    const categoriaRow = db.prepare(`SELECT c.nome, SUM(g.valor) as soma FROM gastos g JOIN categorias c ON g.categoria_id = c.id WHERE g.usuario_id = ? AND strftime('%m', g.data_gasto) = ? AND strftime('%Y', g.data_gasto) = ? GROUP BY c.id ORDER BY soma DESC LIMIT 1`).get(usuarioId, mesStr, ano);

    const total_gasto = totalGastoRow ? totalGastoRow.total : 0;
    const total_orcado = total_orcado_row ? total_orcado_row.total : 0;
    const numero_transacoes = transacoesRow ? transacoesRow.cnt : 0;
    const categoria_maior_gasto = categoriaRow ? categoriaRow.nome : null;

    const existing = db.prepare('SELECT id FROM resumos WHERE usuario_id = ? AND mes = ? AND ano = ?').get(usuarioId, mes, ano);
    if (existing) {
      db.prepare('UPDATE resumos SET total_gasto = ?, total_orcado = ?, numero_transacoes = ?, categoria_maior_gasto = ? WHERE id = ?').run(total_gasto, total_orcado, numero_transacoes, categoria_maior_gasto, existing.id);
    } else {
      db.prepare('INSERT INTO resumos (usuario_id, mes, ano, total_gasto, total_orcado, numero_transacoes, categoria_maior_gasto) VALUES (?, ?, ?, ?, ?, ?, ?)').run(usuarioId, mes, ano, total_gasto, total_orcado, numero_transacoes, categoria_maior_gasto);
    }

    res.redirect('/resumos');
  });

  app.post('/resumos/delete/:id', (req, res) => {
    db.prepare('DELETE FROM resumos WHERE id = ?').run(req.params.id);
    res.redirect('/resumos');
  });

  // CRUD Gastos
  app.get('/gastos', (req, res) => {
    const cartaoId = req.query.cartaoId;

    const cartoes = db.prepare('SELECT * FROM cartoes ORDER BY nome').all();

    let gastos;
    if (cartaoId) {
      gastos = db.prepare(`SELECT g.*, c.nome as cartao_nome FROM gastos g JOIN cartoes c ON g.cartao_id = c.id WHERE g.cartao_id = ? ORDER BY g.data_gasto DESC`).all(cartaoId);
    } else {
      gastos = db.prepare(`SELECT g.*, c.nome as cartao_nome FROM gastos g JOIN cartoes c ON g.cartao_id = c.id ORDER BY g.data_gasto DESC`).all();
    }

    const listaComCartao = gastos.map(g => ({ ...g, cartaoNome: g.cartao_nome }));
    res.render('gastos/list', { gastos: listaComCartao, cartoes });
  });

  app.post('/gastos', (req, res) => {
    const { descricao, valor, cartaoId, categoriaId } = req.body;
    const card = db.prepare('SELECT * FROM cartoes WHERE id = ?').get(cartaoId);
    if (!card) return res.send("❌ Cartão não encontrado! <br><a href='/gastos'>Voltar</a>");

    try {
      db.prepare('INSERT INTO gastos (descricao, valor, cartao_id, usuario_id, categoria_id) VALUES (?, ?, ?, ?, ?)').run(descricao, parseFloat(valor), cartaoId, card.usuario_id, categoriaId || null);
      res.redirect('/gastos?cartaoId=' + card.id);
    } catch (error) {
      res.send("❌ Erro ao criar gasto! <br><a href='/gastos'>Voltar</a>");
    }
  });

  app.get('/gastos/editar/:id', (req, res) => {
    const gasto = db.prepare('SELECT * FROM gastos WHERE id = ?').get(req.params.id);
    const cartoes = db.prepare('SELECT * FROM cartoes ORDER BY nome').all();
    if (!gasto) return res.send('❌ Gasto não encontrado!');
    res.render('gastos/edit', { gasto, cartoes });
  });

  app.post('/gastos/editar/:id', (req, res) => {
    const { descricao, valor, cartaoId, categoriaId } = req.body;
    const card = db.prepare('SELECT * FROM cartoes WHERE id = ?').get(cartaoId);
    if (!card) return res.send("❌ Cartão não encontrado! <br><a href='/gastos'>Voltar</a>");

    try {
      db.prepare('UPDATE gastos SET descricao = ?, valor = ?, cartao_id = ?, usuario_id = ?, categoria_id = ? WHERE id = ?').run(descricao, parseFloat(valor), card.id, card.usuario_id, categoriaId || null, req.params.id);
      res.redirect('/gastos?cartaoId=' + card.id);
    } catch (error) {
      res.send("❌ Erro ao atualizar gasto! <br><a href='/gastos'>Voltar</a>");
    }
  });

  app.post('/gastos/delete/:id', (req, res) => {
    db.prepare('DELETE FROM gastos WHERE id = ?').run(req.params.id);
    res.redirect('/gastos');
  });
  

  app.get('/dashboard', (req, res) => {
  // Totais rápidos
  const totalUsuarios = db.prepare("SELECT COUNT(*) AS total FROM usuarios").get().total;
  const totalCartoes = db.prepare("SELECT COUNT(*) AS total FROM cartoes").get().total;
  const totalCategorias = db.prepare("SELECT COUNT(*) AS total FROM categorias").get().total;
  const totalGastos = db.prepare("SELECT COUNT(*) AS total FROM gastos").get().total;

  // Total gasto no mês atual
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');
  const ano = new Date().getFullYear();

  const totalMes = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM gastos
    WHERE strftime('%m', data_gasto) = ? AND strftime('%Y', data_gasto) = ?
  `).get(mes, ano).total;

  // Orçamentos do mês
  const orcamentosMes = db.prepare(`
    SELECT o.*, u.nome AS usuario_nome, c.nome AS categoria_nome
    FROM orcamentos o
    JOIN usuarios u ON u.id = o.usuario_id
    JOIN categorias c ON c.id = o.categoria_id
    WHERE o.mes = ? AND o.ano = ?
  `).all(mes, ano);

  res.render('dashboard', {
    totalUsuarios,
    totalCartoes,
    totalCategorias,
    totalGastos,
    totalMes,
    orcamentosMes,
    mes,
    ano
  });
});

  // Inicia servidor
  app.listen(3000, () => console.log('Rodando em http://localhost:3000'));
}).catch(err => {
  console.error('Erro ao inicializar o banco de dados:', err);
  process.exit(1);
});
