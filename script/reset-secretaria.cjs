/**
 * Repõe (ou cria) a conta da SECRETÁRIA directamente na base de dados apontada
 * por DATABASE_URL. A password é guardada com hash bcrypt (cost 12).
 *
 * Diferença para `reset-admin`: este script NUNCA promove a conta a admin.
 *   - Se a conta já existir, só actualiza a password (mantém o papel actual).
 *   - Se não existir, cria-a com o papel "secretaria".
 *
 * Uso:
 *   npm run reset-secretaria -- '<password>'                 (email default rhulany@gmail.com)
 *   npm run reset-secretaria -- <email> '<password>'
 *
 * Variáveis de ambiente (alternativa aos argumentos):
 *   SECRETARIA_EMAIL, SECRETARIA_PASSWORD, SECRETARIA_NAME, DATABASE_URL
 */
require("dotenv/config");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DEFAULT_EMAIL = "rhulany@gmail.com";

// ── argumentos: (email password) | (password) ──
const args = process.argv.slice(2).filter(Boolean);
let argEmail;
let argPassword;
if (args.length >= 2) {
  [argEmail, argPassword] = args;
} else if (args.length === 1) {
  argPassword = args[0];
}

const EMAIL = (argEmail || process.env.SECRETARIA_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
const PASSWORD = argPassword || process.env.SECRETARIA_PASSWORD;
const NAME = process.env.SECRETARIA_NAME || "Secretaria";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

(async () => {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL não definida. Corra no ambiente que tem a BD (ex.: .env local ou Render Shell).");
  }
  if (!PASSWORD) {
    fail("Falta a password. Uso: npm run reset-secretaria -- 'NovaPass@2026'");
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
    // NOTA: a query de UPDATE não toca no campo `role` — preserva o papel.
    const upd = await client.query(
      `UPDATE users
          SET password_hash = $2, active = true, updated_at = now()
        WHERE email = $1
        RETURNING id, role`,
      [EMAIL, hash],
    );

    if (upd.rowCount > 0) {
      console.log(`✓ Password reposta (papel mantido: ${upd.rows[0].role}).`);
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, active)
         VALUES ($1, $2, $3, 'secretaria', true)`,
        [EMAIL, hash, NAME],
      );
      console.log(`✓ Secretária criada (papel: secretaria).`);
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
