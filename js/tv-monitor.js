// Sistema de Monitoramento da TV LG webOS
class TVMonitor {
    constructor() {
        this.isMonitoring = false;
        this.metrics = {
            cpu: 0,
            ram: 0,
            network: 'offline',
            temperature: 0,
            uptime: 0,
            devices: []
        };
        this.updateInterval = null;
        this.logInterval = null;
        
        this.init();
    }
    
    init() {
        logger.info('Inicializando monitoramento da TV');
        
        if (CONFIG.TV_MONITOR.METRICS_ENABLED) {
            this.startMonitoring();
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listener para mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
        
        // Listener para mudanças de foco
        window.addEventListener('focus', () => {
            this.resumeMonitoring();
        });
        
        window.addEventListener('blur', () => {
            this.pauseMonitoring();
        });
    }
    
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info('Iniciando monitoramento da TV');
        
        // Atualização imediata
        this.updateMetrics();
        
        // Atualização periódica
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, CONFIG.TV_MONITOR.UPDATE_INTERVAL);
        
        // Log periódico
        if (CONFIG.TV_MONITOR.LOG_ENABLED) {
            this.logInterval = setInterval(() => {
                this.logMetrics();
            }, 60000); // A cada minuto
        }
    }
    
    pauseMonitoring() {
        if (!this.isMonitoring) return;
        
        logger.info('Pausando monitoramento da TV');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        
        this.isMonitoring = false;
    }
    
    resumeMonitoring() {
        if (this.isMonitoring) return;
        
        logger.info('Retomando monitoramento da TV');
        this.startMonitoring();
    }
    
    async updateMetrics() {
        try {
            // Obter métricas do sistema webOS
            const systemMetrics = await this.getSystemMetrics();
            
            // Obter status da rede
            const networkStatus = await this.getNetworkStatus();
            
            // Obter dispositivos conectados
            const devices = await this.getConnectedDevices();
            
            // Atualizar métricas
            this.metrics = {
                ...this.metrics,
                ...systemMetrics,
                network: networkStatus,
                devices: devices,
                timestamp: Date.now()
            };
            
            // Atualizar UI
            this.updateUI();
            
            // Verificar alertas
            this.checkAlerts();
            
        } catch (error) {
            logger.error('Erro ao atualizar métricas', error);
        }
    }
    
    async getSystemMetrics() {
        try {
            // Integrar com APIs reais do webOS
            if (typeof webOS !== 'undefined') {
                return new Promise((resolve) => {
                    webOS.service.request('luna://com.webos.service.systemservice', {
                        method: 'getSystemInfo',
                        parameters: {
                            keys: ['cpuUsage', 'memUsage', 'temperature', 'uptime']
                        },
                        onSuccess: (response) => {
                            const metrics = {
                                cpu: response.cpuUsage || 0,
                                ram: response.memUsage || 0,
                                temperature: response.temperature || 0,
                                uptime: response.uptime || 0
                            };
                            resolve(metrics);
                        },
                        onFailure: (error) => {
                            logger.error('Erro ao obter métricas via webOS API', error);
                            // Fallback para valores simulados em caso de erro
                            resolve(this.getSimulatedMetrics());
                        }
                    });
                });
            } else {
                // Fallback para ambiente de desenvolvimento
                logger.warn('webOS API não disponível, usando métricas simuladas');
                return this.getSimulatedMetrics();
            }
        } catch (error) {
            logger.error('Erro ao obter métricas do sistema', error);
            return this.getSimulatedMetrics();
        }
    }
    
    getSimulatedMetrics() {
        // Métricas simuladas para desenvolvimento/teste
        return {
            cpu: Math.random() * 100,
            ram: Math.random() * 100,
            temperature: 35 + Math.random() * 15,
            uptime: Date.now() - Math.random() * 86400000
        };
    }
    
    async getNetworkStatus() {
        try {
            // Integrar com webOS API quando disponível
            if (typeof webOS !== 'undefined') {
                return new Promise((resolve) => {
                    webOS.service.request('luna://com.webos.service.connectionmanager', {
                        method: 'getStatus',
                        parameters: {},
                        onSuccess: (response) => {
                            if (response.isInternetConnectionAvailable) {
                                resolve('online');
                            } else {
                                resolve('offline');
                            }
                        },
                        onFailure: () => {
                            resolve('unknown');
                        }
                    });
                });
            } else {
                // Fallback para verificação via fetch com timeout adequado
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('https://api.eliasempresas.com/ping', {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return 'online';
                } else {
                    return 'limited';
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                logger.warn('Timeout ao verificar status de rede');
            }
            return 'offline';
        }
    }
    
    async getConnectedDevices() {
        try {
            // Simular dispositivos conectados
            // Em uma implementação real, isso seria feito via webOS APIs
            const devices = [
                {
                    id: 'tv-main',
                    name: 'TV LG 55UP77',
                    type: 'tv',
                    status: 'online',
                    connection: 'wired'
                }
            ];
            
            // Adicionar dispositivos HDMI se disponíveis
            if (Math.random() > 0.5) {
                devices.push({
                    id: 'hdmi-1',
                    name: 'PlayStation 5',
                    type: 'game-console',
                    status: 'online',
                    connection: 'hdmi'
                });
            }
            
            if (Math.random() > 0.7) {
                devices.push({
                    id: 'hdmi-2',
                    name: 'Apple TV',
                    type: 'streaming',
                    status: 'online',
                    connection: 'hdmi'
                });
            }
            
            return devices;
        } catch (error) {
            logger.error('Erro ao obter dispositivos conectados', error);
            return [];
        }
    }
    
    updateUI() {
        // Atualizar métricas no dashboard
        this.updateMetricDisplay('cpu-usage', Math.round(this.metrics.cpu) + '%');
        this.updateMetricDisplay('ram-usage', Math.round(this.metrics.ram) + '%');
        this.updateMetricDisplay('network-status', this.metrics.network);
        
        // Atualizar status da TV
        this.updateTVStatus();
        
        // Atualizar lista de dispositivos
        this.updateDevicesList();
    }
    
    updateMetricDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateTVStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            if (this.metrics.network === 'online') {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = 'TV Online';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusText.textContent = 'TV Offline';
            }
        }
    }
    
    updateDevicesList() {
        const devicesList = document.getElementById('devices-list');
        if (!devicesList) return;
        
        // Limpar lista atual
        devicesList.innerHTML = '';
        
        // Adicionar dispositivos
        this.metrics.devices.forEach(device => {
            const deviceElement = this.createDeviceElement(device);
            devicesList.appendChild(deviceElement);
        });
    }
    
    createDeviceElement(device) {
        const deviceItem = document.createElement('div');
        deviceItem.className = 'device-item';
        
        const icon = this.getDeviceIcon(device.type);
        
        deviceItem.innerHTML = `
            <span class="device-icon">${icon}</span>
            <span class="device-name">${device.name}</span>
            <span class="device-status ${device.status}">${device.status}</span>
        `;
        
        return deviceItem;
    }
    
    getDeviceIcon(type) {
        const icons = {
            'tv': '📺',
            'game-console': '🎮',
            'streaming': '📱',
            'audio': '🔊',
            'storage': '💾',
            'network': '🌐',
            'unknown': '❓'
        };
        
        return icons[type] || icons['unknown'];
    }
    
    checkAlerts() {
        // Verificar CPU alta
        if (this.metrics.cpu > 80) {
            this.showAlert('CPU alta', `CPU em ${Math.round(this.metrics.cpu)}%`, 'warning');
        }
        
        // Verificar RAM alta
        if (this.metrics.ram > 85) {
            this.showAlert('RAM alta', `RAM em ${Math.round(this.metrics.ram)}%`, 'warning');
        }
        
        // Verificar temperatura alta
        if (this.metrics.temperature > 60) {
            this.showAlert('Temperatura alta', `Temperatura: ${Math.round(this.metrics.temperature)}°C`, 'error');
        }
        
        // Verificar conectividade
        if (this.metrics.network === 'offline') {
            this.showAlert('Sem conexão', 'TV sem conexão com a internet', 'error');
        }
    }
    
    showAlert(title, message, type = 'info') {
        // Criar elemento de alerta de forma segura
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        
        const alertContent = document.createElement('div');
        alertContent.className = 'alert-content';
        
        const titleElement = document.createElement('h4');
        titleElement.textContent = title;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        
        alertContent.appendChild(titleElement);
        alertContent.appendChild(messageElement);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'alert-close';
        closeBtn.textContent = '×';
        
        alert.appendChild(alertContent);
        alert.appendChild(closeBtn);
        
        // Adicionar ao topo da página
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            mainApp.insertBefore(alert, mainApp.firstChild);
            
            // Auto-remover após 5 segundos
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 5000);
            
            // Listener para fechar
            closeBtn.addEventListener('click', () => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            });
        }
        
        logger.warn(`Alerta: ${title} - ${message}`);
    }
    
    logMetrics() {
        if (!CONFIG.TV_MONITOR.LOG_ENABLED) return;
        
        const logData = {
            timestamp: new Date().toISOString(),
            deviceId: CONFIG.DEVICE.deviceId,
            metrics: this.metrics
        };
        
        logger.info('Métricas da TV', logData);
        
        // Enviar para servidor
        this.sendMetricsToServer(logData);
    }
    
    async sendMetricsToServer(logData) {
        try {
            await fetch(CONFIG.API.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': 'ee-tv-metrics'
                },
                body: JSON.stringify({
                    action: 'metrics',
                    deviceId: CONFIG.DEVICE.deviceId,
                    data: logData
                })
            });
        } catch (error) {
            logger.error('Erro ao enviar métricas para servidor', error);
        }
    }
    
    // Métodos públicos para controle da TV
    async setVolume(volume) {
        try {
            logger.info(`Alterando volume para ${volume}%`);
            
            // Integrar com webOS API
            if (typeof webOS !== 'undefined') {
                return new Promise((resolve) => {
                    webOS.service.request('luna://com.webos.service.audio', {
                        method: 'setVolume',
                        parameters: {
                            volume: volume,
                            soundOutput: 'speaker'
                        },
                        onSuccess: () => {
                            this.updateVolumeUI(volume);
                            resolve(true);
                        },
                        onFailure: (error) => {
                            logger.error('Erro ao alterar volume via webOS API', error);
                            resolve(false);
                        }
                    });
                });
            } else {
                // Fallback para desenvolvimento
                logger.warn('webOS API não disponível, atualizando apenas UI');
                this.updateVolumeUI(volume);
                return true;
            }
        } catch (error) {
            logger.error('Erro ao alterar volume', error);
            return false;
        }
    }
    
    updateVolumeUI(volume) {
        const volumeValue = document.getElementById('volume-value');
        if (volumeValue) {
            volumeValue.textContent = volume + '%';
        }
    }
    
    async setBrightness(brightness) {
        try {
            logger.info(`Alterando brilho para ${brightness}%`);
            
            // Integrar com webOS API
            if (typeof webOS !== 'undefined') {
                return new Promise((resolve) => {
                    webOS.service.request('luna://com.webos.settingsservice', {
                        method: 'setSystemSettings',
                        parameters: {
                            category: 'picture',
                            settings: {
                                brightness: brightness
                            }
                        },
                        onSuccess: () => {
                            this.updateBrightnessUI(brightness);
                            resolve(true);
                        },
                        onFailure: (error) => {
                            logger.error('Erro ao alterar brilho via webOS API', error);
                            resolve(false);
                        }
                    });
                });
            } else {
                // Fallback para desenvolvimento
                logger.warn('webOS API não disponível, atualizando apenas UI');
                this.updateBrightnessUI(brightness);
                return true;
            }
        } catch (error) {
            logger.error('Erro ao alterar brilho', error);
            return false;
        }
    }
    
    updateBrightnessUI(brightness) {
        const brightnessValue = document.getElementById('brightness-value');
        if (brightnessValue) {
            brightnessValue.textContent = brightness + '%';
        }
    }
    
    async setContrast(contrast) {
        try {
            logger.info(`Alterando contraste para ${contrast}%`);
            
            // Integrar com webOS API
            if (typeof webOS !== 'undefined') {
                return new Promise((resolve) => {
                    webOS.service.request('luna://com.webos.settingsservice', {
                        method: 'setSystemSettings',
                        parameters: {
                            category: 'picture',
                            settings: {
                                contrast: contrast
                            }
                        },
                        onSuccess: () => {
                            this.updateContrastUI(contrast);
                            resolve(true);
                        },
                        onFailure: (error) => {
                            logger.error('Erro ao alterar contraste via webOS API', error);
                            resolve(false);
                        }
                    });
                });
            } else {
                // Fallback para desenvolvimento
                logger.warn('webOS API não disponível, atualizando apenas UI');
                this.updateContrastUI(contrast);
                return true;
            }
        } catch (error) {
            logger.error('Erro ao alterar contraste', error);
            return false;
        }
    }
    
    updateContrastUI(contrast) {
        const contrastValue = document.getElementById('contrast-value');
        if (contrastValue) {
            contrastValue.textContent = contrast + '%';
        }
    }
    
    async applyProfile(profileName) {
        try {
            const profile = CONFIG.MODULES.TV_MANAGER.profiles[profileName];
            if (!profile) {
                throw new Error(`Perfil ${profileName} não encontrado`);
            }
            
            logger.info(`Aplicando perfil ${profileName}`, profile);
            
            // Aplicar configurações do perfil
            await this.setBrightness(profile.brightness);
            await this.setContrast(profile.contrast);
            await this.setVolume(profile.volume);
            
            // Atualizar selects
            const audioModeSelect = document.getElementById('audio-mode');
            const pictureModeSelect = document.getElementById('picture-mode');
            
            if (audioModeSelect) {
                audioModeSelect.value = profile.audioMode;
            }
            
            if (pictureModeSelect) {
                pictureModeSelect.value = profile.pictureMode;
            }
            
            // Atualizar botões de perfil
            document.querySelectorAll('.profile-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeBtn = document.querySelector(`[data-profile="${profileName}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            
            return true;
        } catch (error) {
            logger.error('Erro ao aplicar perfil', error);
            return false;
        }
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    isMonitoringActive() {
        return this.isMonitoring;
    }
    
    destroy() {
        this.pauseMonitoring();
        logger.info('Monitoramento da TV finalizado');
    }
}

// Instância global do TVMonitor
window.tvMonitor = new TVMonitor();