// server.js - Back-end e Banco de Dados SQLite
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // Permite que o HTML converse com o servidor
app.use(express.json()); // Permite receber dados no formato JSON

// Redireciona a raiz do servidor para a dashboard
app.get('/', (req, res) => {
    res.redirect('/pages/dashboard.html');
});

// Serve os arquivos estáticos (HTML, imagens) da pasta atual
app.use(express.static(path.join(__dirname)));

// 1. Conectar ao Banco de Dados SQLite (cria o arquivo clinica.db se não existir)
const db = new sqlite3.Database('./clinica.db', (err) => {
    if (err) console.error('Erro ao abrir o banco de dados:', err.message);
    else console.log('Conectado ao banco de dados SQLite.');
});

// 2. Criar a tabela de agendamentos (se ainda não existir)
db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente TEXT NOT NULL,
    procedimento TEXT NOT NULL,
    data TEXT NOT NULL,
    horaInicio TEXT NOT NULL,
    horaFim TEXT NOT NULL
)`);

// 3. Criar a tabela de pacientes (se ainda não existir)
db.run(`CREATE TABLE IF NOT EXISTS pacientes (
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

// --- ROTAS DO SERVIDOR (API) ---

// ROTA 0: Buscar dias que possuem agendamentos num mês
app.get('/api/agendamentos/datas/:ano/:mes', (req, res) => {
    const { ano, mes } = req.params;
    const mesPad = String(mes).padStart(2, '0');
    const likeStr = `${ano}-${mesPad}%`;
    const sql = `SELECT DISTINCT data FROM agendamentos WHERE data LIKE ?`;

    db.all(sql, [likeStr], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const datas = rows.map(r => r.data);
        res.json(datas);
    });
});

// ROTA 1: Buscar agendamentos de uma data específica
app.get('/api/agendamentos/:data', (req, res) => {
    const dataConsulta = req.params.data;
    const sql = `SELECT * FROM agendamentos WHERE data = ? ORDER BY horaInicio ASC`;

    db.all(sql, [dataConsulta], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ROTA 2: Criar um novo agendamento
app.post('/api/agendamentos', (req, res) => {
    const { paciente, procedimento, data, horaInicio, horaFim } = req.body;
    const sql = `INSERT INTO agendamentos (paciente, procedimento, data, horaInicio, horaFim) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [paciente, procedimento, data, horaInicio, horaFim], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, mensagem: 'Agendamento salvo com sucesso!' });
    });
});

// ROTA 3: Deletar um agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM agendamentos WHERE id = ?`;

    db.run(sql, id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensagem: 'Agendamento removido!' });
    });
});

// ROTA 4: Listar pacientes
app.get('/api/pacientes', (req, res) => {
    const sql = `SELECT * FROM pacientes ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const pacientes = rows.map(p => ({
            ...p,
            termoAssinado: Boolean(p.termoAssinado)
        }));
        res.json(pacientes);
    });
});

// ROTA 5: Criar novo paciente
app.post('/api/pacientes', (req, res) => {
    const { nome, cpf, whatsapp, dataNascimento, foto, termoAssinado, queixaPrincipal, alergias, historicoProcedimentos, observacoesMedicas } = req.body;
    const sql = `INSERT INTO pacientes (nome, cpf, whatsapp, dataNascimento, foto, termoAssinado, queixaPrincipal, alergias, historicoProcedimentos, observacoesMedicas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const termo = termoAssinado ? 1 : 0;

    db.run(sql, [nome, cpf, whatsapp, dataNascimento, foto || '', termo, queixaPrincipal || '', alergias || '', historicoProcedimentos || '', observacoesMedicas || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, mensagem: 'Paciente salvo com sucesso!' });
    });
});

// ==========================================
// ASSISTENTE LOCAL (SEM API EXTERNA)
// ==========================================
app.post('/api/assistente-local', (req, res) => {
    // 1. Recebemos a mensagem e colocamos em letras minúsculas para facilitar a pesquisa
    const mensagemOriginal = req.body.mensagem || "";
    const mensagem = mensagemOriginal.toLowerCase();

    // 2. REGRA 1: Pedido de Resumo Geral
    if (mensagem.includes("resumo") || mensagem.includes("tudo") || mensagem.includes("geral")) {

        // Fazemos duas contagens no banco de dados
        db.get("SELECT COUNT(*) AS totalPacientes FROM pacientes", (err1, rowPacientes) => {
            db.get("SELECT COUNT(*) AS totalAgendamentos FROM agendamentos", (err2, rowAgendamentos) => {

                // Tratamos possíveis erros de tabelas vazias
                const pac = rowPacientes ? rowPacientes.totalPacientes : 0;
                const age = rowAgendamentos ? rowAgendamentos.totalAgendamentos : 0;

                const resposta = `📋 **Resumo Geral da Clínica:**<br><br>Atualmente temos **${pac} pacientes** registados na base de dados e um histórico de **${age} agendamentos** no sistema.`;
                res.json({ resultado: resposta });
            });
        });

        // 3. REGRA 2: Pedido sobre Pacientes
    } else if (mensagem.includes("quantos") && mensagem.includes("pacientes")) {

        db.get("SELECT COUNT(*) AS totalPacientes FROM pacientes", (err, row) => {
            const pac = row ? row.totalPacientes : 0;
            res.json({ resultado: `Temos exatamente **${pac} pacientes** cadastrados no momento.` });
        });

        // 4. REGRA 3: Pedido sobre Agendamentos de Hoje
    } else if (mensagem.includes("hoje") && (mensagem.includes("agenda") || mensagem.includes("consulta"))) {

        // Pega a data de hoje no formato YYYY-MM-DD
        const dataHoje = new Date().toISOString().split('T')[0];

        db.get("SELECT COUNT(*) AS totalHoje FROM agendamentos WHERE data = ?", [dataHoje], (err, row) => {
            const hoje = row ? row.totalHoje : 0;
            if (hoje === 0) {
                res.json({ resultado: `A agenda está livre! Não temos consultas marcadas para hoje.` });
            } else {
                res.json({ resultado: `Hoje temos um dia movimentado: **${hoje} consultas** marcadas para hoje.` });
            }
        });

        // 5. REGRA PADRÃO (Quando o assistente não entende)
    } else {
        const ajuda = `Ainda estou a aprender! 🤖<br><br>Tente perguntar coisas como:<br>- "Faz um <strong>resumo</strong> do sistema"<br>- "<strong>Quantos pacientes</strong> temos?"<br>- "Como está a <strong>agenda hoje</strong>?"`;
        res.json({ resultado: ajuda });
    }
});

// Iniciar o servidor na porta 3002
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Acesse http://localhost:${PORT}/agenda.html no seu navegador.`);
});