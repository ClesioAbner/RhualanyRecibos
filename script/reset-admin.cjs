/**
 * Repõe (ou cria) a conta de administrador directamente na base de dados
 * apontada por DATABASE_URL. Útil quando a password do admin no servidor
 * (ex.: Render) não é a esperada, ou para criar o primeiro admin.
 *
 * A password é guardada com hash bcrypt (cost 12) — nunca em texto simples.
 *
 * Uso:
 *   npm run reset-admin                         (usa defaults / variáveis de ambiente)
 *   npm run reset-admin -- <email> <password>   (passa email e password)
 *   npm run reset-admin -- <password>           (só password, mantém o email default)
 *
 * Variáveis de ambiente (alternativa aos argumentos):
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, DATABASE_URL
 *
 * No Render: abrir a "Shell" do serviço (DATABASE_URL já está no ambiente) e
 * correr `npm run reset-admin -- 'NovaPass@2026'`.
 */
require("dotenv/config");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DEFAULT_EMAIL = "admin@rhulany.mz";

// ── argumentos da linha de comandos ──────────────────────────────────────
// Aceita:  (email password) | (password)  — ou cai para as variáveis/defaults.
const args = process.argv.slice(2).filter(Boolean);
let argEmail;
let argPassword;
if (args.length >= 2) {
  [argEmail, argPassword] = args;
} else if (args.length === 1) {
  argPassword = args[0];
}

const EMAIL = (argEmail || process.env.ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
const PASSWORD = argPassword || process.env.ADMIN_PASSWORD || "Rhulany@2026";
const NAME = process.env.ADMIN_NAME || "Administrador";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

(async () => {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL não definida. Corra no ambiente que tem a BD (ex.: .env local ou Render Shell).");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL)) {
    fail(`Email inválido: "${EMAIL}".`);
  }
  if (PASSWORD.length < 8) {
    fail("A password deve ter pelo menos 8 caracteres.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const hash = await bcrypt.hash(PASSWORD, 12);
    // Tenta actualizar uma conta existente; se não existir, cria-a como admin.
    const upd = await client.query(
      `UPDATE users
          SET password_hash = $2, active = true, role = 'admin', updated_at = now()
        WHERE email = $1
        RETURNING id`,
      [EMAIL, hash],
    );

    if (upd.rowCount > 0) {
      console.log(`✓ Password do admin reposta.`);
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, active)
         VALUES ($1, $2, $3, 'admin', true)`,
        [EMAIL, hash, NAME],
      );
      console.log(`✓ Admin criado.`);
    }

    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log(`\n  Guarde estas credenciais num local seguro e altere a password após entrar.`);
  } catch (err) {
    fail(`Erro: ${err.message}`);
  } finally {
    await client.end();
  }
})();
