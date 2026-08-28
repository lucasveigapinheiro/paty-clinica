let dataAtual = new Date();
let diaSelecionado = new Date();
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Dados guardados no navegador (ver JavaScript/store.js)

// 1. Função para formatar a data para o Banco de Dados (ex: "2026-05-15")
function formatarDataISO(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

// 2. BUSCAR DADOS NO SQLITE
async function buscarEventos() {
    const dataString = formatarDataISO(diaSelecionado);
    const container = document.getElementById('lista-eventos');
    container.innerHTML = '<p style="text-align:center; color:#999;">Carregando...</p>';

    try {
        const agendamentos = Store.agendamentos.listarPorData(dataString);

        container.innerHTML = '';

        if (agendamentos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding: 2rem;">Agenda livre!</p>';
            return;
        }

        // Desenha os cartões na tela
        agendamentos.forEach(apt => {
            const fimAgendamento = new Date(`${apt.data}T${apt.horaFim}:00`);
            const agora = new Date();
            const podeMarcarPresenca = agora >= fimAgendamento;

            const actionButtons = podeMarcarPresenca ? `
                <div class="apt-actions">
                    <button class="btn-presence" onclick="marcarPresenca(${apt.id}, true)">Compareceu</button>
                    <button class="btn-presence" onclick="marcarPresenca(${apt.id}, false)">Não compareceu</button>
                </div>
            ` : '';

            container.innerHTML += `
                        <div id="apt-${apt.id}" class="appointment-card">
                            <div class="apt-time">
                                ${apt.horaInicio} <span>${apt.horaFim}</span>
                            </div>
                            <div class="apt-details">
                                <h4 class="apt-title">${apt.procedimento}</h4>
                                <div class="apt-patient">
                                    <i class="fas fa-user-circle"></i> ${apt.paciente}
                                </div>
                                ${actionButtons}
                            </div>
                            <button class="btn-delete" onclick="deletarAgendamento(${apt.id})" title="Cancelar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;
        });
    } catch (error) {
        console.error("Erro ao ler os agendamentos:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">Erro ao carregar os agendamentos.</p>';
    }
}

// 3. SALVAR DADOS NO SQLITE
async function salvarNoBanco(event) {
    event.preventDefault();

    const novoAgendamento = {
        paciente: document.getElementById('input-paciente').value,
        procedimento: document.getElementById('input-procedimento').value,
        data: formatarDataISO(diaSelecionado),
        horaInicio: document.getElementById('input-hora-inicio').value,
        horaFim: document.getElementById('input-hora-fim').value
    };

    try {
        Store.agendamentos.adicionar(novoAgendamento);

        fecharModal();
        renderizarCalendario(); // Atualiza os pontinhos no calendário
        buscarEventos(); // Recarrega a lista do dia
    } catch (error) {
        alert("Erro ao salvar o agendamento.");
    }
}

// 4. EXCLUIR DADOS NO SQLITE
async function deletarAgendamento(id) {
    if (confirm("Tem certeza que deseja cancelar esta consulta?")) {
        try {
            Store.agendamentos.remover(id);
            renderizarCalendario(); // Atualiza os pontinhos no calendário
            buscarEventos(); // Recarrega a tela
        } catch (error) {
            alert("Erro ao deletar.");
        }
    }
}

// --- FUNÇÕES DE INTERFACE DO CALENDÁRIO ---
let datasComEvento = [];

async function buscarDatasComEvento() {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth() + 1;
    try {
        datasComEvento = Store.agendamentos.datasDoMes(ano, mes);
    } catch (error) {
        datasComEvento = [];
    }
}

async function renderizarCalendario() {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    document.getElementById('mes-ano').textContent = `${meses[mes]} ${ano}`;

    await buscarDatasComEvento();

    const grid = document.getElementById('dias-grid');
    grid.innerHTML = '';

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDia; i++) grid.innerHTML += `<div class="day-cell empty"></div>`;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const isSelecionado = dia === diaSelecionado.getDate() && mes === diaSelecionado.getMonth() && ano === diaSelecionado.getFullYear();
        const activeClass = isSelecionado ? 'active' : '';
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const hasEventClass = datasComEvento.includes(dataStr) ? 'has-event' : '';

        grid.innerHTML += `<div class="day-cell ${activeClass} ${hasEventClass}" onclick="selecionarDia(${dia}, ${mes}, ${ano})">${dia}</div>`;
    }
}

async function selecionarDia(dia, mes, ano) {
    diaSelecionado = new Date(ano, mes, dia);
    await renderizarCalendario();
    atualizarTituloData();
    buscarEventos(); // Busca no banco sempre que clica num dia
}

async function mudarMes(direcao) { dataAtual.setMonth(dataAtual.getMonth() + direcao); await renderizarCalendario(); }

function atualizarTituloData() {
    const titulo = diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('data-selecionada').textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

function marcarPresenca(id, compareceu) {
    const card = document.getElementById(`apt-${id}`);
    if (!card) return;

    const statusTexto = compareceu ? 'Compareceu' : 'Não compareceu';
    const details = card.querySelector('.apt-details');
    const existingStatus = card.querySelector('.apt-presence');

    if (existingStatus) {
        existingStatus.textContent = statusTexto;
    } else {
        details.insertAdjacentHTML('beforeend', `<div class="apt-presence">${statusTexto}</div>`);
    }

    const actions = card.querySelector('.apt-actions');
    if (actions) actions.remove();
}

function abrirModal() { document.getElementById('modal-agendamento').classList.add('active'); }
function fecharModal() { document.getElementById('modal-agendamento').classList.remove('active'); document.getElementById('form-agendamento').reset(); }

// Inicia a página
(async () => {
    await renderizarCalendario();
    atualizarTituloData();
    buscarEventos();
})();
