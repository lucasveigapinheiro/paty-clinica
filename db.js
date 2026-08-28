// db.js - Cliente do banco de dados (Turso / libSQL, compatível com SQLite)
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('Falta a variável de ambiente TURSO_DATABASE_URL.');
}

// Em produção usa o Turso remoto. Em dev, se não houver URL, cai num arquivo local.
const db = createClient(
    url
        ? { url, authToken }
        : { url: 'file:clinica.db' }
);

// Cria as tabelas se ainda não existirem
async function init() {
    await db.execute(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente TEXT NOT NULL,
        procedimento TEXT NOT NULL,
        data TEXT NOT NULL,
        horaInicio TEXT NOT NULL,
        horaFim TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Agendado'
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        dataNascimento TEXT NOT NULL,
        foto TEXT,
        termoAssinado INTEGER NOT NULL DEFAULT 0,
        queixaPrincipal TEXT,
        alergias TEXT,
        historicoProcedimentos TEXT,
        observacoesMedicas TEXT
    )`);
}

// Garante init uma única vez por instância (serverless reusa entre invocações)
let ready;
function ensureReady() {
    if (!ready) ready = init().catch(err => { ready = null; throw err; });
    return ready;
}

module.exports = { db, ensureReady };
