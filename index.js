const express = require("express");
const { Pool } = require("pg");

const session = require("express-session");
const app = express();

const ADMIN_USER = "admin";
const ADMIN_PASS = "lavaadmin";

app.use(express.json());

app.use(session({
  secret: "lavanderia-super-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true só com https
}));

app.use(express.static("public"));

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =========================
// MIGRAÇÃO
// =========================
app.get("/migrate", async (req, res) => {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS armarios (
        id SERIAL PRIMARY KEY,
        status TEXT DEFAULT 'livre',
        nome TEXT,
        telefone TEXT,
        data_entrega TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS historico_armarios (
        id SERIAL PRIMARY KEY,
        armario TEXT,
        nome TEXT,
        telefone TEXT,
        data_entrada TIMESTAMP DEFAULT NOW(),
        data_saida TIMESTAMP
      );
    `);

    res.send("Migração ok");

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message); // 👈 MOSTRA O ERRO REAL
  }
});

// =========================
// STATUS
// =========================
app.get("/status", async (req, res) => {
  const result = await db.query("SELECT * FROM armarios ORDER BY id");

  const data = {};

  result.rows.forEach(r => {
    data[r.id] = {
      status: r.status,
      nome: r.nome || null
    };
  });

  res.json(data);
});


app.get("/login", (req, res) => {
  res.send(`
    <h2>Login Admin</h2>
    <input id="user" placeholder="Usuário"><br><br>
    <input id="pass" type="password" placeholder="Senha"><br><br>
    <button onclick="login()">Entrar</button>

    <script>
      function login() {
        fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user: document.getElementById("user").value,
            pass: document.getElementById("pass").value
          })
        })
        .then(r => r.json())
        .then(d => {
          if (d.erro) return alert(d.erro);
          window.location = "/admin";
        });
      }
    </script>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.auth = true;
    return res.json({ ok: true });
  }

  res.status(401).json({ erro: "Credenciais inválidas" });
});



// =========================
// AÇÃO
// =========================
app.post("/acao", async (req, res) => {
  const { tipo, box, nome, telefone, codigo } = req.body;

  // ---------------- depositar
  if (tipo === "depositar") {
    const check = await db.query(
      "SELECT status FROM armarios WHERE id=$1",
      [box]
    );

    if (!check.rows.length) {
      return res.status(404).json({ erro: "Armário não existe" });
    }

    if (check.rows[0].status === "ocupado") {
      return res.status(400).json({ erro: "Armário já está ocupado" });
    } else{
    await db.query(`
      UPDATE armarios
      SET status='ocupado',
          nome=$1,
          telefone=$2,
          data_entrega=NOW()
      WHERE id=$3
    `, [nome, telefone, box]);
    }

    
    await db.query(`
      INSERT INTO historico_armarios (armario, nome, telefone, data_entrada)
      VALUES ($1,$2,$3,NOW())
    `, [box, nome, telefone]);

    return res.json({ ok: true });
  }

  // ---------------- retirar
  if (tipo === "retirar") {

    const result = await db.query(`
      SELECT telefone, status FROM armarios WHERE id=$1
    `, [box]);

    const arm = result.rows[0];

    const tel = (arm.telefone || "").replace(/\D/g, "");
    const ultimos4 = tel.slice(-4);

    if (String(codigo) !== String(ultimos4)) {
      return res.status(403).json({ erro: "Código inválido" });
    }

    await db.query(`
      UPDATE armarios
      SET status='livre',
          nome=NULL,
          telefone=NULL,
          data_entrega=NULL
      WHERE id=$1
    `, [box]);

    await db.query(`
      UPDATE historico_armarios
      SET data_saida = NOW()
      WHERE armario=$1 AND data_saida IS NULL
    `, [box]);

    return res.json({ ok: true });
  }

  res.status(400).json({ erro: "Tipo inválido" });
});


function auth(req, res, next) {
  if (!req.session.auth) {
    return res.redirect("/login");
  }
  next();
}

// =========================
// ADMIN
// =========================
app.get("/admin", auth, async (req, res) => {

  const atual = await db.query("SELECT * FROM armarios ORDER BY id");

  const historico = await db.query(`
    SELECT * FROM historico_armarios
    ORDER BY data_entrada DESC
  `);

  res.send(`
    <html>
    <head>
      <title>Admin</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .box { border:1px solid #ccc; padding:10px; margin:10px 0; }
        .ocupado { background:#ffe5e5; }
        .livre { background:#e5ffe5; }
      </style>
    </head>

    
    
    <body>

      <button onclick="logout()">Sair</button>

        <script>
        function logout() {
          fetch("/logout", { method: "POST" })
            .then(() => location.href = "/login");
        }
        </script>
      <h1>Admin Lavanderia</h1>

      <h2>Estado atual</h2>

      ${atual.rows.map(r => `
      <div class="box ${r.status}">
        <b>${r.id}</b><br>
        Status: ${r.status}<br>
        Nome: ${r.nome || "-"}<br>
        Telefone: ${r.telefone || "-"}<br>
        Entrada: ${r.data_entrega || "-"}
        
        ${r.status === "ocupado" ? `
        <br><button onclick="liberar('${r.id}')">Liberar</button>
      ` : `
        <br><button onclick="abrirDeposito('${r.id}')">Depositar</button>
      `}
      </div>
    `).join("")}

      <h2>Histórico</h2>

      ${historico.rows.map(r => `
        <div class="box">
          <b>${r.armario}</b><br>
          Nome: ${r.nome}<br>
          Telefone: ${r.telefone}<br>
          Entrada: ${r.data_entrada}<br>
          Saída: ${r.data_saida || "Ainda ocupado"}
        </div>
      `).join("")}

      <script>
        function abrirDeposito(box) {

          const nome = prompt("Nome do cliente:");
          if (!nome) return;

          const telefone = prompt("Telefone:");
          if (!telefone) return;

          fetch("/acao", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              tipo: "depositar",
              box: box,
              nome: nome,
              telefone: telefone
            })
          })
          .then(r => r.json())
          .then(d => {
            if (d.erro) {
              alert(d.erro);
              return;
            }

            location.reload();
          });
        }
      function liberar(box) {
        if (!confirm("Deseja liberar este armário?")) return;

        fetch("/liberar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ box })
        })
        .then(r => r.json())
        .then(d => {
          if (d.erro) {
            alert(d.erro);
            return;
          }

          location.reload();
        });
      }
    </script>

    </body>
    </html>
  `);
});

app.post("/liberar", auth, async (req, res) => {
  const { box } = req.body;

  try {
    await db.query(`
      UPDATE armarios
      SET status='livre',
          nome=NULL,
          telefone=NULL,
          data_entrega=NULL
      WHERE id=$1
    `, [box]);

    await db.query(`
      UPDATE historico_armarios
      SET data_saida = NOW()
      WHERE armario=$1 AND data_saida IS NULL
    `, [box]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao liberar" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// =========================
// START
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Rodando"));
