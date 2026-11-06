// Crea (o cambia la contraseña de) tu usuario del panel.
// Uso:  npm run create-admin -- tu@correo.com tu-contraseña
import bcrypt from 'bcryptjs';
import { getPool, sql } from './db.js';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run create-admin -- tu@correo.com tu-contraseña');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  const pool = await getPool();
  const r = await pool.request()
    .input('email', sql.NVarChar(255), email.trim().toLowerCase())
    .input('hash', sql.NVarChar(100), hash)
    .query(`
      UPDATE dbo.Usuarios SET ClaveHash = @hash WHERE Correo = @email;
      IF @@ROWCOUNT = 0 INSERT INTO dbo.Usuarios (Correo, ClaveHash) VALUES (@email, @hash);
    `);
  console.log(`✔ Usuario ${email.trim().toLowerCase()} listo`, r.rowsAffected.length ? '' : '');
  await pool.close();
}

main().catch((e) => {
  console.error('✖ Error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
