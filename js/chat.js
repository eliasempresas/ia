// Módulo de Chat Elias Empresas
class ChatModule extends BaseModule {
    constructor(config) {
        super(config);
        this.messages = [];
        this.wsConnection = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = null;
        this.messageQueue = [];
        
        this.init();
    }
    
    init() {
        super.init();
        this.setupEventListeners();
        this.loadChatHistory();
    }
    
    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chat-input-field');
        const chatSendBtn = document.getElementById('chat-send-btn');
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
            
            chatInput.addEventListener('input', (e) => {
                this.handleInputChange(e);
            });
        }
        
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // WebSocket events
        this.setupWebSocket();
    }
    
    setupWebSocket() {
        try {
            const wsUrl = CONFIG.MODULES.CHAT.wsUrl;
            this.wsConnection = new WebSocket(wsUrl);
            
            this.wsConnection.onopen = () => {
                this.onWebSocketOpen();
            };
            
            this.wsConnection.onmessage = (event) => {
                this.onWebSocketMessage(event);
            };
            
            this.wsConnection.onclose = () => {
                this.onWebSocketClose();
            };
            
            this.wsConnection.onerror = (error) => {
                this.onWebSocketError(error);
            };
            
        } catch (error) {
            logger.error('Erro ao configurar WebSocket', error);
            this.handleConnectionError();
        }
    }
    
    onWebSocketOpen() {
        logger.info('Conexão WebSocket estabelecida');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Enviar mensagens em fila
        this.sendQueuedMessages();
        
        // Enviar mensagem de boas-vindas
        this.addSystemMessage('Conectado ao Chat EE');
    }
    
    onWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
        } catch (error) {
            logger.error('Erro ao processar mensagem WebSocket', error);
        }
    }
    
    onWebSocketClose() {
        logger.warn('Conexão WebSocket fechada');
        this.isConnected = false;
        this.handleConnectionError();
    }
    
    onWebSocketError(error) {
        logger.error('Erro na conexão WebSocket', error);
        this.handleConnectionError();
    }
    
    handleConnectionError() {
        this.isConnected = false;
        this.addSystemMessage('Conexão perdida. Tentando reconectar...');
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        } else {
            this.addSystemMessage('Não foi possível conectar. Verifique sua conexão.');
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        
        this.reconnectInterval = setTimeout(() => {
            logger.info(`Tentativa de reconexão ${this.reconnectAttempts}`);
            this.setupWebSocket();
        }, delay);
    }
    
    handleIncomingMessage(data) {
        switch (data.type) {
            case 'message':
                this.addBotMessage(data.message, data.timestamp);
                break;
            case 'typing':
                this.showTypingIndicator(data.user);
                break;
            case 'status':
                this.handleStatusUpdate(data);
                break;
            case 'error':
                this.handleChatError(data);
                break;
            default:
                logger.warn('Tipo de mensagem desconhecido', data);
        }
    }
    
    handleInputChange(event) {
        const input = event.target;
        const value = input.value.trim();
        
        // Enviar indicador de digitação
        if (value && this.isConnected) {
            this.sendTypingIndicator();
        }
    }
    
    async sendMessage() {
        const chatInput = document.getElementById('chat-input-field');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Adicionar mensagem do usuário
        this.addUserMessage(message);
        
        // Limpar input
        chatInput.value = '';
        
        // Enviar mensagem
        await this.sendMessageToServer(message);
    }
    
    async sendMessageToServer(message) {
        try {
            const messageData = {
                type: 'message',
                message: message,
                deviceId: CONFIG.DEVICE.deviceId,
                timestamp: Date.now()
            };
            
            if (this.isConnected && this.wsConnection) {
                this.wsConnection.send(JSON.stringify(messageData));
            } else {
                // Adicionar à fila se não conectado
                this.messageQueue.push(messageData);
                this.addSystemMessage('Mensagem será enviada quando a conexão for restabelecida');
            }
            
        } catch (error) {
            logger.error('Erro ao enviar mensagem', error);
            this.addSystemMessage('Erro ao enviar mensagem');
        }
    }
    
    sendQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const messageData = this.messageQueue.shift();
            if (this.isConnected && this.wsConnection) {
                this.wsConnection.send(JSON.stringify(messageData));
            }
        }
    }
    
    sendTypingIndicator() {
        if (this.isConnected && this.wsConnection) {
            const typingData = {
                type: 'typing',
                deviceId: CONFIG.DEVICE.deviceId,
                timestamp: Date.now()
            };
            
            this.wsConnection.send(JSON.stringify(typingData));
        }
    }
    
    addUserMessage(message) {
        const messageElement = this.createMessageElement('user', message);
        this.appendMessage(messageElement);
        this.messages.push({
            type: 'user',
            message: message,
            timestamp: Date.now()
        });
        
        this.saveChatHistory();
    }
    
    addBotMessage(message, timestamp = null) {
        const messageElement = this.createMessageElement('bot', message, timestamp);
        this.appendMessage(messageElement);
        this.messages.push({
            type: 'bot',
            message: message,
            timestamp: timestamp || Date.now()
        });
        
        this.saveChatHistory();
    }
    
    addSystemMessage(message) {
        const messageElement = this.createMessageElement('system', message);
        this.appendMessage(messageElement);
    }
    
    createMessageElement(type, message, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatar = this.getAvatar(type);
        const timeStr = timestamp ? this.formatTime(timestamp) : '';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${message}</p>
                ${timeStr ? `<span class="message-time">${timeStr}</span>` : ''}
            </div>
        `;
        
        return messageDiv;
    }
    
    getAvatar(type) {
        const avatars = {
            'user': '👤',
            'bot': '🤖',
            'system': 'ℹ️'
        };
        
        return avatars[type] || '❓';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    appendMessage(messageElement) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.appendChild(messageElement);
            this.scrollToBottom();
        }
    }
    
    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    showTypingIndicator(user) {
        // Remover indicador anterior
        this.removeTypingIndicator();
        
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot typing-indicator';
        typingElement.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.appendMessage(typingElement);
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    handleStatusUpdate(data) {
        switch (data.status) {
            case 'online':
                this.addSystemMessage('IA Elias Empresas está online');
                break;
            case 'offline':
                this.addSystemMessage('IA Elias Empresas está offline');
                break;
            case 'busy':
                this.addSystemMessage('IA Elias Empresas está ocupada');
                break;
        }
    }
    
    handleChatError(data) {
        logger.error('Erro no chat', data);
        this.addSystemMessage(`Erro: ${data.message}`);
    }
    
    loadChatHistory() {
        try {
            const history = localStorage.getItem('ee_chat_history');
            if (history) {
                const messages = JSON.parse(history);
                this.messages = messages;
                
                // Renderizar mensagens
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                    
                    messages.forEach(msg => {
                        const messageElement = this.createMessageElement(msg.type, msg.message, msg.timestamp);
                        chatMessages.appendChild(messageElement);
                    });
                    
                    this.scrollToBottom();
                }
            }
        } catch (error) {
            logger.error('Erro ao carregar histórico do chat', error);
        }
    }
    
    saveChatHistory() {
        try {
            // Manter apenas as últimas mensagens
            const maxMessages = CONFIG.MODULES.CHAT.maxMessages;
            if (this.messages.length > maxMessages) {
                this.messages = this.messages.slice(-maxMessages);
            }
            
            localStorage.setItem('ee_chat_history', JSON.stringify(this.messages));
        } catch (error) {
            logger.error('Erro ao salvar histórico do chat', error);
        }
    }
    
    clearChatHistory() {
        this.messages = [];
        localStorage.removeItem('ee_chat_history');
        
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        logger.info('Histórico do chat limpo');
    }
    
    // Métodos públicos
    isChatConnected() {
        return this.isConnected;
    }
    
    getMessageCount() {
        return this.messages.length;
    }
    
    getLastMessage() {
        return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
    }
    
    // Métodos de configuração
    setChatSettings(settings) {
        try {
            localStorage.setItem('ee_chat_settings', JSON.stringify(settings));
            logger.info('Configurações do chat atualizadas', settings);
        } catch (error) {
            logger.error('Erro ao salvar configurações do chat', error);
        }
    }
    
    getChatSettings() {
        try {
            const settings = localStorage.getItem('ee_chat_settings');
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            logger.error('Erro ao carregar configurações do chat', error);
            return {};
        }
    }
    
    // Métodos de comandos especiais
    handleSpecialCommand(command) {
        switch (command.toLowerCase()) {
            case '/clear':
                this.clearChatHistory();
                this.addSystemMessage('Histórico limpo');
                break;
            case '/status':
                this.addSystemMessage(`Status: ${this.isConnected ? 'Conectado' : 'Desconectado'}`);
                break;
            case '/help':
                this.addSystemMessage('Comandos disponíveis: /clear, /status, /help');
                break;
            default:
                this.addSystemMessage('Comando não reconhecido. Digite /help para ver os comandos disponíveis.');
        }
    }
    
    // Método para enviar mensagem programaticamente
    async sendSystemMessage(message) {
        await this.sendMessageToServer(message);
    }
    
    // Método para obter estatísticas
    getChatStats() {
        const userMessages = this.messages.filter(msg => msg.type === 'user').length;
        const botMessages = this.messages.filter(msg => msg.type === 'bot').length;
        
        return {
            totalMessages: this.messages.length,
            userMessages: userMessages,
            botMessages: botMessages,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts
        };
    }
    
    destroy() {
        super.destroy();
        
        if (this.wsConnection) {
            this.wsConnection.close();
        }
        
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }
        
        logger.info('Chat module destruído');
    }
}

// Instância global do ChatModule
window.chatModule = new ChatModule(CONFIG.MODULES.CHAT);