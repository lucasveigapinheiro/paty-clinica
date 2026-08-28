// server.js - Back-end (Express + Turso/libSQL)
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, ensureReady } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Garante que as tabelas existem antes de qualquer rota da API
app.use('/api', async (req, res, next) => {
    try {
        await ensureReady();
        next();
    } catch (err) {
        console.error('Erro ao inicializar o banco:', err);
        res.status(500).json({ error: 'Falha ao conectar com o banco de dados.' });
    }
});

// Redireciona a raiz para a dashboard
app.get('/', (req, res) => {
    res.redirect('/pages/dashboard.html');
});

// Serve os arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname)));

// --- ROTAS DO SERVIDOR (API) ---

// ROTA 0: Dias com agendamentos num mês
app.get('/api/agendamentos/datas/:ano/:mes', async (req, res) => {
    try {
        const { ano, mes } = req.params;
        const likeStr = `${ano}-${String(mes).padStart(2, '0')}%`;
        const r = await db.execute({
            sql: `SELECT DISTINCT data FROM agendamentos WHERE data LIKE ?`,
            args: [likeStr]
        });
        res.json(r.rows.map(row => row.data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA 1: Agendamentos de uma data
app.get('/api/agendamentos/:data', async (req, res) => {
    try {
        const r = await db.execute({
            sql: `SELECT * FROM agendamentos WHERE data = ? ORDER BY horaInicio ASC`,
            args: [req.params.data]
        });
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA 2: Criar agendamento
app.post('/api/agendamentos', async (req, res) => {
    try {
        const { paciente, procedimento, data, horaInicio, horaFim } = req.body;
        const r = await db.execute({
            sql: `INSERT INTO agendamentos (paciente, procedimento, data, horaInicio, horaFim) VALUES (?, ?, ?, ?, ?)`,
            args: [paciente, procedimento, data, horaInicio, horaFim]
        });
        res.json({ id: Number(r.lastInsertRowid), mensagem: 'Agendamento salvo com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA 3: Deletar agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
    try {
        await db.execute({
            sql: `DELETE FROM agendamentos WHERE id = ?`,
            args: [req.params.id]
        });
        res.json({ mensagem: 'Agendamento removido!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA 4: Listar pacientes
app.get('/api/pacientes', async (req, res) => {
    try {
        const r = await db.execute(`SELECT * FROM pacientes ORDER BY id DESC`);
        res.json(r.rows.map(p => ({ ...p, termoAssinado: Boolean(p.termoAssinado) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA 5: Criar paciente
app.post('/api/pacientes', async (req, res) => {
    try {
        const { nome, cpf, whatsapp, dataNascimento, foto, termoAssinado,
            queixaPrincipal, alergias, historicoProcedimentos, observacoesMedicas } = req.body;
        const r = await db.execute({
            sql: `INSERT INTO pacientes (nome, cpf, whatsapp, dataNascimento, foto, termoAssinado, queixaPrincipal, alergias, historicoProcedimentos, observacoesMedicas)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [nome, cpf, whatsapp, dataNascimento, foto || '', termoAssinado ? 1 : 0,
                queixaPrincipal || '', alergias || '', historicoProcedimentos || '', observacoesMedicas || '']
        });
        res.json({ id: Number(r.lastInsertRowid), mensagem: 'Paciente salvo com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ASSISTENTE LOCAL (sem API externa)
app.post('/api/assistente-local', async (req, res) => {
    try {
        const mensagem = (req.body.mensagem || '').toLowerCase();

        if (mensagem.includes('resumo') || mensagem.includes('tudo') || mensagem.includes('geral')) {
            const p = await db.execute(`SELECT COUNT(*) AS c FROM pacientes`);
            const a = await db.execute(`SELECT COUNT(*) AS c FROM agendamentos`);
            const pac = p.rows[0].c, age = a.rows[0].c;
            return res.json({ resultado: `📋 **Resumo Geral da Clínica:**<br><br>Atualmente temos **${pac} pacientes** registados na base de dados e um histórico de **${age} agendamentos** no sistema.` });
        }

        if (mensagem.includes('quantos') && mensagem.includes('pacientes')) {
            const p = await db.execute(`SELECT COUNT(*) AS c FROM pacientes`);
            return res.json({ resultado: `Temos exatamente **${p.rows[0].c} pacientes** cadastrados no momento.` });
        }

        if (mensagem.includes('hoje') && (mensagem.includes('agenda') || mensagem.includes('consulta'))) {
            const dataHoje = new Date().toISOString().split('T')[0];
            const r = await db.execute({ sql: `SELECT COUNT(*) AS c FROM agendamentos WHERE data = ?`, args: [dataHoje] });
            const hoje = r.rows[0].c;
            return res.json({
                resultado: hoje === 0
                    ? `A agenda está livre! Não temos consultas marcadas para hoje.`
                    : `Hoje temos um dia movimentado: **${hoje} consultas** marcadas para hoje.`
            });
        }

        res.json({ resultado: `Ainda estou a aprender! 🤖<br><br>Tente perguntar coisas como:<br>- "Faz um <strong>resumo</strong> do sistema"<br>- "<strong>Quantos pacientes</strong> temos?"<br>- "Como está a <strong>agenda hoje</strong>?"` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inicia o servidor apenas em execução local (no Vercel o app é importado)
if (require.main === module) {
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;
