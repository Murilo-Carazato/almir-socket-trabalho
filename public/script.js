const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const cursorsContainer = document.getElementById('cursors-container');
const notificationsContainer = document.getElementById('notifications');
const colorIndicator = document.getElementById('my-color-indicator');
const colorPicker = document.getElementById('color-picker');
const btnClear = document.getElementById('btn-clear');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let isDrawing = false;
let myId = null;
let myColor = '#ffffff';
let lastX = 0;
let lastY = 0;

// Objeto para guardar os elementos DOM dos cursores dos outros usuários
const otherCursors = {};

// Redimensionar o canvas para o tamanho da tela
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Inicializa

// --- WebSockets ---
// Determina a URL do WebSocket (localhost no dev local, ou host dinâmico)
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;
const socket = new WebSocket(wsUrl);

socket.onopen = () => {
    console.log('Conectado ao servidor WebSocket');
    showNotification('Conectado ao servidor', '#4caf50');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init':
            myId = data.id;
            myColor = data.color;
            colorIndicator.style.backgroundColor = myColor;
            colorIndicator.style.boxShadow = `0 0 10px ${myColor}`;
            colorPicker.value = myColor;
            appendSystemMessage('Você entrou na sala.');
            break;

        case 'user_joined':
            showNotification('Novo usuário conectou!', data.color);
            appendSystemMessage(`Usuário conectou.`);
            createCursor(data.id, data.color);
            break;

        case 'user_left':
            showNotification('Um usuário desconectou.', '#ff5252');
            appendSystemMessage(`Usuário desconectou.`);
            removeCursor(data.id);
            break;

        case 'mouse_move':
            updateCursorPosition(data.id, data.x, data.y, data.color);
            break;

        case 'draw_line':
            drawLine(data.x0, data.y0, data.x1, data.y1, data.color, false);
            break;

        case 'clear_screen':
            clearCanvas();
            break;

        case 'chat_message':
            appendChatMessage(data.id.substr(0, 5), data.color, data.text);
            break;
    }
};

socket.onclose = () => {
    showNotification('Desconectado do servidor', '#ff5252');
};

// --- Lógica de Desenho e Mouse ---

function drawLine(x0, y0, x1, y1, color, emit) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    // Enviar dados de desenho para o servidor
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'draw_line',
            x0: x0,
            y0: y0,
            x1: x1,
            y1: y1
        }));
    }
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

canvas.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (isDrawing) {
        drawLine(lastX, lastY, currentX, currentY, myColor, true);
        lastX = currentX;
        lastY = currentY;
    }

    // Enviar movimento do mouse para o servidor (para os cursores alheios)
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'mouse_move',
            x: currentX,
            y: currentY
        }));
    }
});

// --- Lógica de Cursores e UI ---

function createCursor(id, color) {
    if (otherCursors[id]) return; // Já existe

    const cursorElement = document.createElement('div');
    cursorElement.className = 'cursor';
    cursorElement.id = `cursor-${id}`;
    
    // SVG de um cursor de mouse padrão, preenchido com a cor do usuário
    cursorElement.innerHTML = `
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L6.5 15L9 9L15 6.5L1 1Z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
    `;
    
    cursorsContainer.appendChild(cursorElement);
    otherCursors[id] = cursorElement;
}

function updateCursorPosition(id, x, y, color) {
    if (!otherCursors[id]) {
        createCursor(id, color);
    }
    const cursor = otherCursors[id];
    // Usar transform para performance (GPU) em vez de left/top
    cursor.style.transform = `translate(${x}px, ${y}px)`;
}

function removeCursor(id) {
    if (otherCursors[id]) {
        otherCursors[id].remove();
        delete otherCursors[id];
    }
}

function showNotification(message, color) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerText = message;
    notif.style.borderLeft = `3px solid ${color}`;
    
    notificationsContainer.appendChild(notif);
    
    // Remove do DOM após a animação
    setTimeout(() => {
        if(notif.parentNode) {
            notif.remove();
        }
    }, 3000);
}

// --- Lógica Extra (Toolbar e Chat) ---

// Atualiza a cor quando o usuário escolhe no picker
colorPicker.addEventListener('input', (e) => {
    myColor = e.target.value;
    colorIndicator.style.backgroundColor = myColor;
    colorIndicator.style.boxShadow = `0 0 10px ${myColor}`;
});

// Limpar canvas localmente
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Evento do botão Limpar Tela
btnClear.addEventListener('click', () => {
    clearCanvas();
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'clear_screen' }));
    }
});

// Envio de mensagem no chat
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    
    appendChatMessage('Você', myColor, text);
    chatInput.value = '';
    
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'chat_message',
            text: text
        }));
    }
});

// Adiciona uma mensagem de chat na tela
function appendChatMessage(author, color, text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message';
    msgEl.innerHTML = `<span class="author" style="color: ${color}">${escapeHtml(author)}:</span><span>${escapeHtml(text)}</span>`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Adiciona mensagem de sistema no chat
function appendSystemMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message system';
    msgEl.innerText = text;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Previne XSS básico
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
