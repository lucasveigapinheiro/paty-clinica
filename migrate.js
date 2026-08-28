// migrate.js - Copia os dados do clinica.db local para o Turso.
// Uso:  TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run migrate
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN antes de rodar.');
    process.exit(1);
}

const origem = createClient({ url: 'file:clinica.db' });
const destino = createClient({ url, authToken });

async function main() {
    // Cria o schema no destino
    await require('./db').ensureReady();

    const tabelas = ['pacientes', 'agendamentos'];
    for (const t of tabelas) {
        const { rows } = await origem.execute(`SELECT * FROM ${t}`);
        if (rows.length === 0) { console.log(`${t}: nada a migrar`); continue; }

        for (const row of rows) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            await destino.execute({
                sql: `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`,
                args: cols.map(c => row[c])
            });
        }
        console.log(`${t}: ${rows.length} linha(s) migrada(s)`);
    }
    console.log('Migração concluída.');
}

main().catch(err => { console.error(err); process.exit(1); });
