
// Função para atualizar a saudação baseada na hora do dia
function atualizarSaudacao() {
    // 1. Encontra o elemento HTML que criamos o ID
    const elementoSaudacao = document.getElementById('texto-saudacao');

    // 2. Pega a hora atual do sistema (retorna um número de 0 a 23)
    const horaAtual = new Date().getHours();

    let cumprimento = '';

    // 3. Faz a verificação das horas
    if (horaAtual >= 5 && horaAtual < 12) {
        cumprimento = 'Bom dia';
    } else if (horaAtual >= 12 && horaAtual < 18) {
        cumprimento = 'Boa tarde';
    } else {
        cumprimento = 'Boa noite';
    }

    // 4. Substitui o texto lá no HTML
    elementoSaudacao.textContent = `${cumprimento}, Doutora.`;
}

// 5. Executa a função assim que a página carregar
atualizarSaudacao();
// Função para simular a abertura de uma página e mostrar UX Avançada
function openPage(pageName) {
    // Em um sistema real, aqui você usaria:
    // window.location.href = 'pagina-destino.html';

    // Como as páginas ainda não existem, vamos mostrar um aviso elegante
    showToast(`Acessando módulo: ${pageName}... (Em desenvolvimento)`);
}

// Sistema de Notificações (Toast) Elegante
let toastTimeout;

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Define a mensagem
    toastMessage.textContent = message;

    // Mostra o toast
    toast.classList.add('show');

    // Limpa o timer anterior se houver múltiplos cliques
    clearTimeout(toastTimeout);

    // Esconde o toast após 3 segundos
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
