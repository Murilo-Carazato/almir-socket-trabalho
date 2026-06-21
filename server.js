const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Estado da aplicação (em memória)
const clients = new Map(); // Armazena ws -> { id, color, x, y }

// Gera uma cor aleatória em formato hexadecimal
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Gera um ID único simples
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

wss.on('connection', (ws) => {
    const clientId = generateId();
    const clientColor = getRandomColor();

    console.log(`Novo cliente conectado: ${clientId}`);

    // Guarda informações deste cliente
    clients.set(ws, { id: clientId, color: clientColor, x: 0, y: 0 });

    // Envia os dados de inicialização para o próprio cliente
    ws.send(JSON.stringify({
        type: 'init',
        id: clientId,
        color: clientColor
    }));

    // Notifica os outros clientes sobre o novo usuário
    broadcast({
        type: 'user_joined',
        id: clientId,
        color: clientColor
    }, ws);

    // Envia a lista de clientes atuais para o novo usuário
    clients.forEach((clientData, clientWs) => {
        if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'user_joined',
                id: clientData.id,
                color: clientData.color
            }));
        }
    });

    // Lida com as mensagens recebidas do cliente
    ws.on('message', (messageAsString) => {
        try {
            const message = JSON.parse(messageAsString);
            
            if (message.type === 'mouse_move') {
                const clientData = clients.get(ws);
                if (clientData) {
                    clientData.x = message.x;
                    clientData.y = message.y;
                    
                    // Repassa o movimento para todos os outros
                    broadcast({
                        type: 'mouse_move',
                        id: clientId,
                        x: message.x,
                        y: message.y,
                        color: clientData.color
                    }, ws);
                }
            } else if (message.type === 'draw_line') {
                const clientData = clients.get(ws);
                // Repassa o comando de desenho para todos os outros
                broadcast({
                    type: 'draw_line',
                    id: clientId,
                    x0: message.x0,
                    y0: message.y0,
                    x1: message.x1,
                    y1: message.y1,
                    color: clientData.color
                }, ws);
            } else if (message.type === 'clear_screen') {
                // Repassa o comando de limpar tela para todos os outros
                broadcast({
                    type: 'clear_screen'
                }, ws);
            } else if (message.type === 'chat_message') {
                const clientData = clients.get(ws);
                // Repassa a mensagem do chat para todos os outros
                broadcast({
                    type: 'chat_message',
                    id: clientId,
                    text: message.text,
                    color: clientData.color
                }, ws);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });

    // Lida com a desconexão
    ws.on('close', () => {
        console.log(`Cliente desconectado: ${clientId}`);
        clients.delete(ws);
        
        // Notifica todos que o usuário saiu
        broadcast({
            type: 'user_left',
            id: clientId
        });
    });
});

// Função auxiliar para enviar mensagem para todos, exceto quem originou (opcional)
function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
