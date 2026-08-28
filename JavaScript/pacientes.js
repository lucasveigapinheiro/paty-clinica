// ==========================================
// LÓGICA DE DADOS E INTEGRAÇÃO API
// ==========================================

let pacientesDoBanco = [];
let pacientesFiltrados = [];
let paginaAtual = 1;
const itensPorPagina = 10;
const API_URL = 'http://localhost:3002/api/pacientes';

function cleanNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function formatCpf(value) {
    const digits = cleanNumber(value).slice(0, 11);
    return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatWhatsapp(value) {
    const digits = cleanNumber(value);
    if (!digits) return '';

    if (digits.startsWith('55')) {
        const rest = digits.slice(2);
        if (rest.length <= 2) return `+55 (${rest}`;
        if (rest.length <= 7) return `+55 (${rest.slice(0, 2)}) ${rest.slice(2)}`;
        return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7, 11)}`;
    }

    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function aplicarMascaraCPF(event) {
    event.target.value = formatCpf(event.target.value);
}

function aplicarMascaraWhatsapp(event) {
    event.target.value = formatWhatsapp(event.target.value);
}

async function buscarPacientesAPI() {
    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) throw new Error("Backend não está a responder.");
        pacientesDoBanco = await resposta.json();
    } catch (erro) {
        console.warn("Aviso: Falha ao ligar à API SQLite. O Banco pode estar vazio no momento.");
    }
    pacientesFiltrados = [...pacientesDoBanco].reverse();
    processarPaginacaoERenderizar();
}

function abrirModalPaciente() {
    document.getElementById('modal-paciente').classList.add('active');
}

function fecharModalPaciente() {
    document.getElementById('modal-paciente').classList.remove('active');
    document.getElementById('form-paciente').reset();
}

// --- FUNÇÃO PARA O AGENTE IA DO BACKEND LER ---
// Olá IA de Backend! A tabela 'pacientes' no SQLite precisará das seguintes colunas:
// id (PK), nome (TEXT), cpf (TEXT), whatsapp (TEXT), dataNascimento (TEXT), 
// termoAssinado (BOOLEAN), foto (TEXT - para URL ou Base64), 
// e colunas futuras para o relatório: queixaPrincipal, alergias, historicoProcedimentos, observacoesMedicas.

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function salvarPaciente(event) {
    event.preventDefault();

    // Lógica para capturar a foto de perfil selecionada
    const inputFoto = document.getElementById('input-pac-foto');
    let fotoPreviewURL = "";

    if (inputFoto.files && inputFoto.files[0]) {
        fotoPreviewURL = await convertFileToBase64(inputFoto.files[0]);
    }

    const cpfRaw = cleanNumber(document.getElementById('input-pac-cpf').value);
    const whatsappRaw = cleanNumber(document.getElementById('input-pac-whatsapp').value);

    const novoPaciente = {
        nome: document.getElementById('input-pac-nome').value,
        cpf: cpfRaw,
        whatsapp: whatsappRaw,
        dataNascimento: document.getElementById('input-pac-nascimento').value,
        foto: fotoPreviewURL,
        termoAssinado: document.getElementById('input-pac-termo').checked,

        // Estes campos estão em branco, pois serão preenchidos noutro momento (Formulário Clínico)
        queixaPrincipal: "",
        alergias: "",
        historicoProcedimentos: "",
        observacoesMedicas: ""
    };

    novoPaciente.id = Date.now(); // ID Temporário

    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPaciente)
        });

        if (resposta.ok) {
            const dadosDeVolta = await resposta.json();
            if (dadosDeVolta.id) novoPaciente.id = dadosDeVolta.id;
        }
    } catch (erro) {
        console.warn("API offline. O paciente foi adicionado apenas localmente na memória.");
    }

    pacientesDoBanco.unshift(novoPaciente);
    document.getElementById('searchInput').value = "";
    filtrarPacientes();
    fecharModalPaciente();
}

// --- PAGINAÇÃO E FILTRAGEM ---
function processarPaginacaoERenderizar() {
    const container = document.getElementById('lista-pacientes');
    const controls = document.getElementById('pagination-controls');
    const loading = document.getElementById('loading-state');

    if (loading) loading.style.display = 'none';

    if (pacientesFiltrados.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding: 4rem; background: white; border-radius: 16px; border: 1px dashed #ccc;">
                        <i class="fas fa-folder-open fa-3x" style="color: #ddd; margin-bottom: 15px;"></i>
                        <h3 class="serif-font" style="color: var(--primary-burgundy);">Nenhum paciente encontrado</h3>
                        <p style="color: #777; margin-top: 10px;">Utiliza o botão "Novo Paciente" para começar a tua base de dados!</p>
                    </div>`;
        controls.style.display = 'none';
        return;
    }

    const totalPaginas = Math.ceil(pacientesFiltrados.length / itensPorPagina);
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    const indexInicio = (paginaAtual - 1) * itensPorPagina;
    const indexFim = indexInicio + itensPorPagina;
    const pacientesDestaPagina = pacientesFiltrados.slice(indexInicio, indexFim);

    renderizarHTML(pacientesDestaPagina, container);

    controls.style.display = totalPaginas > 1 ? 'flex' : 'none';
    document.getElementById('page-info').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btn-prev').disabled = paginaAtual === 1;
    document.getElementById('btn-next').disabled = paginaAtual === totalPaginas;
}

function mudarPagina(direcao) {
    paginaAtual += direcao;
    processarPaginacaoERenderizar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filtrarPacientes() {
    const termoOriginal = document.getElementById('searchInput').value;
    const termo = termoOriginal.toLowerCase();
    const termoNumero = cleanNumber(termoOriginal);

    pacientesFiltrados = pacientesDoBanco.filter(p => {
        const nomeMatch = p.nome && p.nome.toLowerCase().includes(termo);
        const cpfMatch = termoNumero && p.cpf && cleanNumber(p.cpf).includes(termoNumero);
        const whatsappMatch = termoNumero && p.whatsapp && cleanNumber(p.whatsapp).includes(termoNumero);
        return nomeMatch || cpfMatch || whatsappMatch;
    });
    paginaAtual = 1;
    processarPaginacaoERenderizar();
}

// --- RENDERIZAÇÃO NA TELA ---
function renderizarHTML(listaPagina, container) {
    container.innerHTML = '';

    listaPagina.forEach(paciente => {
        const nome = paciente.nome || 'Paciente sem nome';
        const whatsappRaw = paciente.whatsapp || '';
        const cpfRaw = paciente.cpf || '';
        const whatsapp = whatsappRaw ? formatWhatsapp(whatsappRaw) : 'N/A';
        const cpf = cpfRaw ? formatCpf(cpfRaw) : 'CPF Não Informado';

        const termoAssinado = paciente.termoAssinado ?
            '<span class="badge badge-signed"><i class="fas fa-check-circle"></i> Assinado</span>' :
            '<span class="badge badge-pending"><i class="fas fa-exclamation-circle"></i> Pendente</span>';

        const avatarHTML = paciente.foto && paciente.foto.startsWith('data:image') ?
            `<img src="${paciente.foto}" alt="${nome}" class="patient-avatar">` :
            `<div class="patient-avatar">${nome.charAt(0).toUpperCase()}</div>`;

        const html = `
                    <div class="patient-card">
                        
                        <div class="patient-header-row">
                            <div class="patient-info">
                                ${avatarHTML}
                                <div class="patient-details">
                                    <h4 class="serif-font">${nome}</h4>
                                    <p><i class="fas fa-id-card"></i> ${cpf}</p>
                                    <p><i class="fab fa-whatsapp"></i> ${whatsapp}</p>
                                </div>
                            </div>

                            <div class="status-col">
                                <span>Termo Anamnese</span>
                                ${termoAssinado}
                            </div>

                            <div class="patient-actions">
                                <button class="btn-action" onclick="window.open('https://wa.me/${cleanNumber(whatsappRaw)}', '_blank')" title="Mandar mensagem">
                                    <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                                </button>
                                <button class="btn-action primary" onclick="alternarRelatorio(${paciente.id})">
                                    <i class="fas fa-file-medical"></i> Abrir Relatório
                                </button>
                            </div>
                        </div>

                        <!-- SEÇÃO EXPANSÍVEL: Relatório Clínico -->
                        <div id="relatorio-${paciente.id}" class="clinical-report-section">
                            <h3 class="serif-font" style="color: var(--text-dark); margin-bottom: 1rem; border-bottom: 2px solid var(--accent-gold); padding-bottom: 5px; display: inline-block;">
                                Ficha de Anamnese & Relatório
                            </h3>
                            
                            <div class="report-grid">
                                <div class="report-box">
                                    <h5><i class="fas fa-clipboard-list"></i> Queixa Principal / Objetivo</h5>
                                    <p>${paciente.queixaPrincipal || '<span style="color:#aaa;">Pendente de preenchimento na consulta.</span>'}</p>
                                </div>
                                <div class="report-box">
                                    <h5><i class="fas fa-allergies"></i> Alergias / Contraindicações</h5>
                                    <p>${paciente.alergias || '<span style="color:#aaa;">Pendente de preenchimento na consulta.</span>'}</p>
                                </div>
                                <div class="report-box">
                                    <h5><i class="fas fa-syringe"></i> Histórico de Procedimentos</h5>
                                    <p>${paciente.historicoProcedimentos || '<span style="color:#aaa;">Sem histórico registado.</span>'}</p>
                                </div>
                                <div class="report-box" style="background-color: var(--text-light); border-left-color: var(--text-dark);">
                                    <h5><i class="fas fa-user-md"></i> Observações da Doutora</h5>
                                    <p>${paciente.observacoesMedicas || '<span style="color:#aaa;">Sem observações.</span>'}</p>
                                </div>
                            </div>
                            
                            <div style="margin-top: 15px; text-align: right;">
                                <button class="btn-action" style="display: inline-flex;" onclick="alert('Esta função abrirá o editor do relatório no futuro!')">
                                    <i class="fas fa-edit"></i> Editar Relatório Clínico
                                </button>
                            </div>
                        </div>

                    </div>
                `;
        container.innerHTML += html;
    });
}

function alternarRelatorio(id) {
    const secao = document.getElementById(`relatorio-${id}`);
    if (secao.style.display === 'block') {
        secao.style.display = 'none';
    } else {
        secao.style.display = 'block';
    }
}

function setupPacienteMasks() {
    const cpfInput = document.getElementById('input-pac-cpf');
    const whatsappInput = document.getElementById('input-pac-whatsapp');
    if (cpfInput) cpfInput.addEventListener('input', aplicarMascaraCPF);
    if (whatsappInput) whatsappInput.addEventListener('input', aplicarMascaraWhatsapp);
}

// Inicia a aplicação
window.addEventListener('DOMContentLoaded', () => {
    setupPacienteMasks();
    buscarPacientesAPI();
});
