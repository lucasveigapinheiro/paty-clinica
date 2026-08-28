// Sistema de Notificações
let toastTimeout;

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function cleanNumber(value) {
    return String(value || '').replace(/\D/g, '');
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

function aplicarMascaraWhatsappConfig(event) {
    event.target.value = formatWhatsapp(event.target.value);
}

window.addEventListener('DOMContentLoaded', () => {
    const whatsappInput = document.getElementById('input-config-whatsapp');
    if (whatsappInput) whatsappInput.addEventListener('input', aplicarMascaraWhatsappConfig);
});

// Função para simular o ato de guardar
function salvarConfiguracoes() {
    // Aqui entraria a lógica de gravar na base de dados
    const btn = document.querySelector('.btn-primary');
    const textoOriginal = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';
    btn.style.opacity = '0.8';

    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.style.opacity = '1';
        showToast('Alterações guardadas com sucesso!');
    }, 1000);
}
