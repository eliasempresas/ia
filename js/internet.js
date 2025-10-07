// Módulo de Monitoramento de Internet Elias Empresas
class InternetModule extends BaseModule {
    constructor(config) {
        super(config);
        this.speedHistory = [];
        this.currentSpeed = { download: 0, upload: 0 };
        this.dataUsage = { used: 0, limit: 100 };
        this.connectionStatus = 'unknown';
        this.connectionType = 'unknown';
        this.updateInterval = null;
        this.chart = null;
        
        this.init();
    }
    
    init() {
        super.init();
        this.setupEventListeners();
        this.startMonitoring();
        this.initializeChart();
    }
    
    setupEventListeners() {
        // Event listeners para atualizações em tempo real
        window.addEventListener('online', () => {
            this.handleConnectionChange('online');
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionChange('offline');
        });
        
        // Event listeners para controles de tempo
        this.setupTimeControls();
    }
    
    setupTimeControls() {
        // Adicionar controles para seleção de período
        const internetContent = document.querySelector('#module-internet .internet-content');
        if (internetContent) {
            const timeControls = document.createElement('div');
            timeControls.className = 'time-controls';
            timeControls.innerHTML = `
                <div class="time-selector">
                    <label>Período:</label>
                    <select id="time-period">
                        <option value="realtime">Tempo Real</option>
                        <option value="hour">Última Hora</option>
                        <option value="day">Último Dia</option>
                        <option value="week">Última Semana</option>
                        <option value="month">Último Mês</option>
                    </select>
                </div>
                <div class="refresh-controls">
                    <button id="refresh-speed" class="btn-primary">Atualizar</button>
                    <button id="speed-test" class="btn-secondary">Teste de Velocidade</button>
                </div>
            `;
            
            internetContent.insertBefore(timeControls, internetContent.firstChild);
            
            // Event listeners
            document.getElementById('time-period').addEventListener('change', (e) => {
                this.changeTimePeriod(e.target.value);
            });
            
            document.getElementById('refresh-speed').addEventListener('click', () => {
                this.refreshSpeedData();
            });
            
            document.getElementById('speed-test').addEventListener('click', () => {
                this.runSpeedTest();
            });
        }
    }
    
    startMonitoring() {
        logger.info('Iniciando monitoramento de internet');
        
        // Atualização imediata
        this.updateInternetData();
        
        // Atualização periódica
        this.updateInterval = setInterval(() => {
            this.updateInternetData();
        }, CONFIG.MODULES.INTERNET.updateInterval);
        
        // Carregar dados históricos
        this.loadSpeedHistory();
    }
    
    async updateInternetData() {
        try {
            // Obter status da conexão
            await this.updateConnectionStatus();
            
            // Obter velocidade atual
            await this.updateCurrentSpeed();
            
            // Atualizar uso de dados
            await this.updateDataUsage();
            
            // Atualizar UI
            this.updateUI();
            
            // Salvar histórico
            this.saveSpeedHistory();
            
        } catch (error) {
            logger.error('Erro ao atualizar dados de internet', error);
        }
    }
    
    async updateConnectionStatus() {
        try {
            // Verificar conectividade com timeout adequado usando AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://api.eliasempresas.com/ping', {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.connectionStatus = 'connected';
            } else {
                this.connectionStatus = 'limited';
            }
            
            // Detectar tipo de conexão
            this.connectionType = this.detectConnectionType();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                logger.warn('Timeout ao verificar conectividade');
            }
            this.connectionStatus = 'offline';
            this.connectionType = 'unknown';
        }
    }
    
    detectConnectionType() {
        // Integrar com webOS API
        if (typeof webOS !== 'undefined') {
            return new Promise((resolve) => {
                webOS.service.request('luna://com.webos.service.connectionmanager', {
                    method: 'getStatus',
                    parameters: {},
                    onSuccess: (response) => {
                        // Detectar tipo baseado na resposta
                        if (response.wired) {
                            resolve('Ethernet');
                        } else if (response.wifi) {
                            resolve('WiFi');
                        } else {
                            resolve('Unknown');
                        }
                    },
                    onFailure: () => {
                        resolve('Unknown');
                    }
                });
            });
        } else {
            // Fallback para desenvolvimento
            const types = ['WiFi', 'Ethernet'];
            return types[Math.floor(Math.random() * types.length)];
        }
    }
    
    async updateCurrentSpeed() {
        try {
            // Simular medição de velocidade
            // Em uma implementação real, isso seria feito via webOS APIs ou testes de velocidade
            const downloadSpeed = Math.random() * 100; // Mbps
            const uploadSpeed = Math.random() * 50; // Mbps
            
            this.currentSpeed = {
                download: downloadSpeed,
                upload: uploadSpeed,
                timestamp: Date.now()
            };
            
            // Adicionar ao histórico
            this.speedHistory.push({
                ...this.currentSpeed,
                timestamp: Date.now()
            });
            
            // Manter apenas os últimos 100 registros
            if (this.speedHistory.length > 100) {
                this.speedHistory = this.speedHistory.slice(-100);
            }
            
        } catch (error) {
            logger.error('Erro ao atualizar velocidade', error);
        }
    }
    
    async updateDataUsage() {
        try {
            // Simular atualização de uso de dados
            // Em uma implementação real, isso seria feito via webOS APIs
            const used = Math.random() * this.dataUsage.limit;
            this.dataUsage.used = used;
            
        } catch (error) {
            logger.error('Erro ao atualizar uso de dados', error);
        }
    }
    
    updateUI() {
        // Atualizar velocidade
        this.updateSpeedDisplay();
        
        // Atualizar uso de dados
        this.updateDataUsageDisplay();
        
        // Atualizar status da conexão
        this.updateConnectionStatusDisplay();
        
        // Atualizar gráfico
        this.updateChart();
    }
    
    updateSpeedDisplay() {
        const downloadElement = document.getElementById('download-speed');
        const uploadElement = document.getElementById('upload-speed');
        
        if (downloadElement) {
            downloadElement.textContent = this.currentSpeed.download.toFixed(1) + ' Mbps';
        }
        
        if (uploadElement) {
            uploadElement.textContent = this.currentSpeed.upload.toFixed(1) + ' Mbps';
        }
    }
    
    updateDataUsageDisplay() {
        const usageFill = document.getElementById('usage-fill');
        const usageText = document.getElementById('usage-text');
        
        if (usageFill && usageText) {
            const percentage = (this.dataUsage.used / this.dataUsage.limit) * 100;
            usageFill.style.width = percentage + '%';
            usageText.textContent = `${this.dataUsage.used.toFixed(1)} GB / ${this.dataUsage.limit} GB`;
        }
    }
    
    updateConnectionStatusDisplay() {
        const connectionStatus = document.getElementById('connection-status');
        const connectionType = document.getElementById('connection-type');
        
        if (connectionStatus) {
            connectionStatus.textContent = this.getConnectionStatusText();
            connectionStatus.className = `connection-status ${this.connectionStatus}`;
        }
        
        if (connectionType) {
            connectionType.textContent = this.connectionType;
        }
    }
    
    getConnectionStatusText() {
        const statusTexts = {
            'connected': 'Conectado',
            'limited': 'Conexão Limitada',
            'offline': 'Desconectado',
            'unknown': 'Status Desconhecido'
        };
        
        return statusTexts[this.connectionStatus] || 'Desconhecido';
    }
    
    initializeChart() {
        const canvas = document.getElementById('speed-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Configurar gráfico
        this.chart = {
            canvas: canvas,
            ctx: ctx,
            data: [],
            maxPoints: 50
        };
        
        this.updateChart();
    }
    
    updateChart() {
        if (!this.chart) return;
        
        const ctx = this.chart.ctx;
        const canvas = this.chart.canvas;
        
        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Obter dados para o gráfico
        const chartData = this.getChartData();
        
        if (chartData.length < 2) return;
        
        // Desenhar gráfico
        this.drawChart(ctx, canvas, chartData);
    }
    
    getChartData() {
        const now = Date.now();
        const period = this.getCurrentTimePeriod();
        
        let filteredData = this.speedHistory;
        
        switch (period) {
            case 'hour':
                filteredData = this.speedHistory.filter(point => 
                    now - point.timestamp <= 60 * 60 * 1000
                );
                break;
            case 'day':
                filteredData = this.speedHistory.filter(point => 
                    now - point.timestamp <= 24 * 60 * 60 * 1000
                );
                break;
            case 'week':
                filteredData = this.speedHistory.filter(point => 
                    now - point.timestamp <= 7 * 24 * 60 * 60 * 1000
                );
                break;
            case 'month':
                filteredData = this.speedHistory.filter(point => 
                    now - point.timestamp <= 30 * 24 * 60 * 60 * 1000
                );
                break;
        }
        
        return filteredData.slice(-this.chart.maxPoints);
    }
    
    drawChart(ctx, canvas, data) {
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        // Encontrar valores máximos
        const maxDownload = Math.max(...data.map(d => d.download));
        const maxUpload = Math.max(...data.map(d => d.upload));
        const maxValue = Math.max(maxDownload, maxUpload);
        
        // Configurar cores
        ctx.strokeStyle = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.lineWidth = 2;
        
        // Desenhar linha de download
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - (point.download / maxValue) * (height - 2 * padding);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Desenhar linha de upload
        ctx.strokeStyle = '#0066cc';
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - (point.upload / maxValue) * (height - 2 * padding);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Desenhar eixos
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        // Eixo Y
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // Eixo X
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Desenhar labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Label Download
        ctx.fillStyle = '#FF0000';
        ctx.fillText('Download', width - 60, 20);
        
        // Label Upload
        ctx.fillStyle = '#0066cc';
        ctx.fillText('Upload', width - 60, 35);
        
        // Valor máximo
        ctx.fillStyle = '#666';
        ctx.textAlign = 'right';
        ctx.fillText(`${maxValue.toFixed(1)} Mbps`, padding - 10, padding + 5);
    }
    
    getCurrentTimePeriod() {
        const select = document.getElementById('time-period');
        return select ? select.value : 'realtime';
    }
    
    changeTimePeriod(period) {
        logger.info(`Período alterado para: ${period}`);
        this.updateChart();
    }
    
    async refreshSpeedData() {
        logger.info('Atualizando dados de velocidade');
        await this.updateInternetData();
        this.showNotification('Dados atualizados!', 'success');
    }
    
    async runSpeedTest() {
        try {
            logger.info('Iniciando teste de velocidade');
            this.showNotification('Executando teste de velocidade...', 'info');
            
            // Simular teste de velocidade
            await Utils.sleep(2000);
            
            const testResult = {
                download: Math.random() * 100,
                upload: Math.random() * 50,
                ping: Math.random() * 50,
                timestamp: Date.now()
            };
            
            this.currentSpeed = testResult;
            this.speedHistory.push(testResult);
            
            this.updateUI();
            this.showNotification('Teste de velocidade concluído!', 'success');
            
        } catch (error) {
            logger.error('Erro no teste de velocidade', error);
            this.showNotification('Erro no teste de velocidade', 'error');
        }
    }
    
    handleConnectionChange(status) {
        logger.info(`Status da conexão alterado: ${status}`);
        this.connectionStatus = status;
        this.updateConnectionStatusDisplay();
        
        if (status === 'online') {
            this.showNotification('Conexão restabelecida!', 'success');
        } else {
            this.showNotification('Conexão perdida!', 'error');
        }
    }
    
    loadSpeedHistory() {
        try {
            const history = localStorage.getItem('ee_internet_speed_history');
            if (history) {
                this.speedHistory = JSON.parse(history);
            }
        } catch (error) {
            logger.error('Erro ao carregar histórico de velocidade', error);
            this.speedHistory = [];
        }
    }
    
    saveSpeedHistory() {
        try {
            localStorage.setItem('ee_internet_speed_history', JSON.stringify(this.speedHistory));
        } catch (error) {
            logger.error('Erro ao salvar histórico de velocidade', error);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Métodos públicos
    getCurrentSpeed() {
        return this.currentSpeed;
    }
    
    getSpeedHistory() {
        return this.speedHistory;
    }
    
    getDataUsage() {
        return this.dataUsage;
    }
    
    getConnectionStatus() {
        return {
            status: this.connectionStatus,
            type: this.connectionType
        };
    }
    
    // Métodos de configuração
    setDataLimit(limit) {
        this.dataUsage.limit = limit;
        this.updateDataUsageDisplay();
        this.saveSettings();
    }
    
    getSettings() {
        try {
            const settings = localStorage.getItem('ee_internet_settings');
            return settings ? JSON.parse(settings) : {};
        } catch (error) {
            logger.error('Erro ao carregar configurações', error);
            return {};
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                dataLimit: this.dataUsage.limit,
                updateInterval: CONFIG.MODULES.INTERNET.updateInterval
            };
            
            localStorage.setItem('ee_internet_settings', JSON.stringify(settings));
        } catch (error) {
            logger.error('Erro ao salvar configurações', error);
        }
    }
    
    // Métodos de estatísticas
    getSpeedStats() {
        if (this.speedHistory.length === 0) return null;
        
        const downloads = this.speedHistory.map(h => h.download);
        const uploads = this.speedHistory.map(h => h.upload);
        
        return {
            avgDownload: downloads.reduce((a, b) => a + b, 0) / downloads.length,
            avgUpload: uploads.reduce((a, b) => a + b, 0) / uploads.length,
            maxDownload: Math.max(...downloads),
            maxUpload: Math.max(...uploads),
            minDownload: Math.min(...downloads),
            minUpload: Math.min(...uploads),
            totalTests: this.speedHistory.length
        };
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        logger.info('Internet module destruído');
    }
}

// Instância global do InternetModule
window.internetModule = new InternetModule(CONFIG.MODULES.INTERNET);