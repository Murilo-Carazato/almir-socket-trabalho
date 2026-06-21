# Documentação do Trabalho Prático: Whiteboard Colaborativo Distribuído

**Objetivo do Trabalho**
O objetivo deste projeto foi desenvolver uma aplicação distribuída de "Whiteboard Colaborativo" (Lousa Compartilhada) em tempo real. A aplicação permite que múltiplos usuários se conectem simultaneamente, desenhem livremente na tela, movimentem seus respectivos cursores (vistos por todos) e conversem através de um chat integrado. A finalidade principal foi aplicar e visualizar na prática os conceitos de computação distribuída abordados em aula.

## Estrutura e Arquitetura Adotada

A arquitetura escolhida foi o modelo **Cliente/Servidor**, adotando **WebSockets** como estratégia de comunicação.

1. **Servidor (Backend)**: Desenvolvido utilizando `Node.js` com a biblioteca nativa `ws` (WebSockets). Ele tem a responsabilidade de gerenciar o estado efêmero das conexões ativas, atuando como um *Message Broker* (Middleware Orientado a Mensagens simplificado). Ele recebe ações individuais (movimento de mouse, traços desenhados, mensagens de chat) e realiza o *broadcast* para os demais nós distribuídos na rede.
2. **Cliente (Frontend)**: Construído com `Vanilla JS`, `HTML5 Canvas` e `CSS`. O cliente abre um *Socket* de comunicação persistente com o servidor, consome os eventos que chegam de forma assíncrona e redesenha a tela de acordo com os dados recebidos dos outros clientes.

## Conceitos de Computação Distribuída Aplicados

A nossa aplicação abordou de forma direta os seguintes tópicos da ementa:

- **Conceitos de Sockets**: Toda a base da aplicação se dá na abertura de Sockets (neste caso, `WebSockets` que começam como HTTP e dão um *upgrade* para TCP puro através do protocolo `ws://`). Isso permite uma via de comunicação bidirecional de baixa latência (full-duplex), essencial para o tráfego do movimento do mouse em tempo real, eliminando o *overhead* tradicional do HTTP (onde o cliente precisaria fazer *polling* constante).
- **Comunicação e Middleware Orientado a Mensagens**: O backend age de forma semelhante a um roteador de mensagens (conceito fundamental em ferramentas como RabbitMQ, mas aqui de forma customizada). Os clientes não conversam diretamente entre si (P2P); todos enviam uma mensagem padronizada no formato `JSON` contendo um `type` (`mouse_move`, `chat_message`, `draw_line`). O servidor processa e a distribui (Broadcast) para a "fila" dos outros clientes conectados.
- **Conceitos de Threads e Concorrência**: Embora o `Node.js` seja *Single-Threaded* para processamento JavaScript, ele utiliza a `libuv` (um pool de *Threads* em C++) e um *Event Loop* assíncrono altamente concorrente para lidar com o I/O das requisições de Sockets. O servidor consegue gerenciar dezenas de clientes emitindo milhares de mensagens (os movimentos do mouse) de forma concorrente sem bloquear a execução do servidor principal.

---

## Guia de Execução

### Pré-requisitos
- Ter o [Node.js](https://nodejs.org/) instalado na máquina.

### Passo a Passo

1. Extraia a pasta do projeto ou abra o terminal no diretório da aplicação.
2. No terminal, instale as dependências executando:
   ```bash
   npm install
   ```
3. Inicie o servidor distribuído executando:
   ```bash
   node server.js
   ```
   *Você verá a mensagem: `Servidor rodando em http://localhost:3000`*.
4. Abra o seu navegador web (Google Chrome, Edge, etc) e acesse a URL: `http://localhost:3000`.
5. Abra uma segunda aba, ou solicite para um colega na mesma rede local acessar o IP da sua máquina na porta `3000`.
6. Desenhe no *Canvas*, mova o mouse ou mande uma mensagem no chat na primeira janela e observe a sincronização ocorrer instantaneamente na segunda janela.

### Evidências e Capturas de Tela

*(Nota para o aluno: Tire 2 ou 3 "prints" da sua tela com duas janelas do Whiteboard abertas, mostrando um desenho na tela e o chat funcionando, e anexe logo abaixo nesta seção antes de enviar o arquivo PDF ao professor).*
