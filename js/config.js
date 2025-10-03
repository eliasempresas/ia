// Configurações do aplicativo Elias Empresas Launcher EE
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'https://api.eliasempresas.com/APIEE/familiaoliveiraEE/tv.php',
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // Authentication
    AUTH: {
        CODE_LENGTH: 6,
        CODE_EXPIRY: 5 * 60 * 1000, // 5 minutos
        CHECK_INTERVAL: 2000, // 2 segundos
        MAX_ATTEMPTS: 5
    },
    
    // TV Monitoring
    TV_MONITOR: {
        UPDATE_INTERVAL: 5000, // 5 segundos
        METRICS_ENABLED: true,
        LOG_ENABLED: true
    },
    
    // Modules Configuration
    MODULES: {
        TV_MANAGER: {
            enabled: true,
            autoStart: true,
            profiles: {
                cinema: {
                    brightness: 60,
                    contrast: 80,
                    volume: 70,
                    audioMode: 'cinema',
                    pictureMode: 'cinema'
                },
                games: {
                    brightness: 80,
                    contrast: 90,
                    volume: 60,
                    audioMode: 'game',
                    pictureMode: 'game'
                },
                music: {
                    brightness: 50,
                    contrast: 70,
                    volume: 80,
                    audioMode: 'music',
                    pictureMode: 'standard'
                },
                sports: {
                    brightness: 85,
                    contrast: 85,
                    volume: 75,
                    audioMode: 'standard',
                    pictureMode: 'sports'
                }
            }
        },
        
        MEDIA: {
            enabled: true,
            baseUrl: 'https://midia.eliasempresas.com',
            playerConfig: {
                autoplay: false,
                controls: true,
                preload: 'metadata'
            }
        },
        
        CHAT: {
            enabled: true,
            baseUrl: 'https://chat.eliasempresas.com',
            wsUrl: 'wss://chat.eliasempresas.com/ws',
            reconnectInterval: 3000,
            maxMessages: 100
        },
        
        CAMERAS: {
            enabled: true,
            baseUrl: 'https://streaming.eliasempresas.com/camera',
            refreshInterval: 10000, // 10 segundos
            maxCameras: 8
        },
        
        PAINEL: {
            enabled: true,
            baseUrl: 'https://portal.oliveira.eliasempresas.com',
            refreshInterval: 30000 // 30 segundos
        },
        
        IPTV: {
            enabled: true,
            baseUrl: 'https://iptv.eliasempresas.com',
            defaultPlaylist: '/playlist.m3u8',
            playerConfig: {
                autoplay: false,
                controls: true
            }
        },
        
        INTERNET: {
            enabled: true,
            speedTestUrl: 'https://api.eliasempresas.com/speedtest',
            updateInterval: 10000, // 10 segundos
            dataLimit: 100 // GB
        }
    },
    
    // UI Configuration
    UI: {
        THEME: {
            primaryColor: '#FF0000',
            textColor: '#000000',
            backgroundColor: '#f8f9fa',
            cardBackground: '#ffffff',
            borderColor: '#e9ecef'
        },
        
        ANIMATIONS: {
            enabled: true,
            duration: 300,
            easing: 'ease-in-out'
        },
        
        SPLASH_SCREEN: {
            duration: 3000, // 3 segundos
            logoAnimation: true
        }
    },
    
    // Logging
    LOGGING: {
        enabled: true,
        level: 'info', // debug, info, warn, error
        maxEntries: 1000,
        sendToServer: true
    },
    
    // Device Information
    DEVICE: {
        model: 'LG 55UP77',
        webOSVersion: '6.0.0',
        resolution: '1920x1080',
        deviceId: null // Será gerado automaticamente
    },
    
    // Storage Keys
    STORAGE: {
        AUTH_TOKEN: 'ee_auth_token',
        DEVICE_ID: 'ee_device_id',
        USER_PREFERENCES: 'ee_user_preferences',
        MODULE_STATES: 'ee_module_states',
        LOGS: 'ee_logs'
    }
};

// Gerar Device ID único se não existir
if (!CONFIG.DEVICE.deviceId) {
    let deviceId = localStorage.getItem(CONFIG.STORAGE.DEVICE_ID);
    if (!deviceId) {
        deviceId = 'ee_tv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(CONFIG.STORAGE.DEVICE_ID, deviceId);
    }
    CONFIG.DEVICE.deviceId = deviceId;
}

// Logger utility
class Logger {
    constructor() {
        this.logs = [];
        this.maxEntries = CONFIG.LOGGING.maxEntries;
    }
    
    log(level, message, data = null) {
        if (!CONFIG.LOGGING.enabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            deviceId: CONFIG.DEVICE.deviceId
        };
        
        this.logs.push(logEntry);
        
        // Manter apenas os últimos logs
        if (this.logs.length > this.maxEntries) {
            this.logs.shift();
        }
        
        // Salvar no localStorage
        localStorage.setItem(CONFIG.STORAGE.LOGS, JSON.stringify(this.logs));
        
        // Enviar para servidor se habilitado
        if (CONFIG.LOGGING.sendToServer) {
            this.sendToServer(logEntry);
        }
        
        // Console log para desenvolvimento
        console[level](`[EE Launcher] ${message}`, data || '');
    }
    
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    
    async sendToServer(logEntry) {
        try {
            await fetch(CONFIG.API.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': 'ee-tv-logger'
                },
                body: JSON.stringify({
                    action: 'log',
                    deviceId: CONFIG.DEVICE.deviceId,
                    log: logEntry
                })
            });
        } catch (error) {
            console.error('Erro ao enviar log para servidor:', error);
        }
    }
    
    getLogs() {
        return this.logs;
    }
    
    clearLogs() {
        this.logs = [];
        localStorage.removeItem(CONFIG.STORAGE.LOGS);
    }
}

// Instância global do logger
window.logger = new Logger();

// Utility functions
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Format bytes
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    // Format speed
    formatSpeed(bytesPerSecond) {
        return this.formatBytes(bytesPerSecond) + '/s';
    },
    
    // Generate random string
    generateRandomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};

// Export para uso global
window.CONFIG = CONFIG;
window.Utils = Utils;

// Log inicial
logger.info('Configuração carregada', {
    deviceId: CONFIG.DEVICE.deviceId,
    webOSVersion: CONFIG.DEVICE.webOSVersion,
    modules: Object.keys(CONFIG.MODULES).filter(key => CONFIG.MODULES[key].enabled)
});