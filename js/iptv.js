// Módulo IPTV Elias Empresas
class IPTVModule extends BaseModule {
    constructor(config) {
        super(config);
        this.playlists = [];
        this.currentPlaylist = null;
        this.channels = [];
        this.currentChannel = null;
        this.favorites = [];
        this.player = null;
        this.isPlaying = false;
        
        this.init();
    }
    
    init() {
        super.init();
        this.setupEventListeners();
        this.loadFavorites();
        this.loadDefaultPlaylist();
    }
    
    setupEventListeners() {
        // IPTV Controls
        document.addEventListener('click', (e) => {
            const loadPlaylistBtn = e.target.closest('#load-playlist');
            if (loadPlaylistBtn) {
                this.loadPlaylistDialog();
            }
            
            const favoritesBtn = e.target.closest('#favorites');
            if (favoritesBtn) {
                this.showFavorites();
            }
            
            const settingsBtn = e.target.closest('#settings');
            if (settingsBtn) {
                this.showSettings();
            }
        });
        
        // Channel items
        document.addEventListener('click', (e) => {
            const channelItem = e.target.closest('.channel-item');
            if (channelItem) {
                const channelId = channelItem.dataset.channelId;
                this.playChannel(channelId);
            }
            
            const playBtn = e.target.closest('.play-btn');
            if (playBtn) {
                const channelId = playBtn.dataset.channelId;
                this.playChannel(channelId);
            }
        });
        
        // Video player events
        const iptvPlayer = document.getElementById('iptv-video-player');
        if (iptvPlayer) {
            iptvPlayer.addEventListener('play', () => {
                this.isPlaying = true;
                this.onChannelPlay();
            });
            
            iptvPlayer.addEventListener('pause', () => {
                this.isPlaying = false;
                this.onChannelPause();
            });
            
            iptvPlayer.addEventListener('ended', () => {
                this.isPlaying = false;
                this.onChannelEnded();
            });
            
            iptvPlayer.addEventListener('error', (e) => {
                this.onChannelError(e);
            });
            
            iptvPlayer.addEventListener('loadstart', () => {
                this.onChannelLoadStart();
            });
            
            iptvPlayer.addEventListener('canplay', () => {
                this.onChannelCanPlay();
            });
        }
    }
    
    async loadDefaultPlaylist() {
        try {
            logger.info('Carregando playlist padrão');
            
            // Simular carregamento de playlist padrão
            const defaultPlaylist = {
                id: 'default',
                name: 'Playlist Elias Empresas',
                url: CONFIG.MODULES.IPTV.defaultPlaylist,
                channels: await this.generateSampleChannels()
            };
            
            this.playlists.push(defaultPlaylist);
            this.currentPlaylist = defaultPlaylist;
            this.channels = defaultPlaylist.channels;
            
            this.updateChannelsList();
            
        } catch (error) {
            logger.error('Erro ao carregar playlist padrão', error);
        }
    }
    
    async generateSampleChannels() {
        // Simular canais IPTV
        return [
            {
                id: 'channel-1',
                name: 'Canal Principal',
                category: 'Entretenimento',
                logo: '📺',
                url: 'https://example.com/channel1.m3u8',
                description: 'Canal principal de entretenimento',
                language: 'pt-BR',
                quality: 'HD'
            },
            {
                id: 'channel-2',
                name: 'Canal Notícias',
                category: 'Notícias',
                logo: '📰',
                url: 'https://example.com/channel2.m3u8',
                description: 'Canal de notícias 24h',
                language: 'pt-BR',
                quality: 'HD'
            },
            {
                id: 'channel-3',
                name: 'Canal Esportes',
                category: 'Esportes',
                logo: '⚽',
                url: 'https://example.com/channel3.m3u8',
                description: 'Canal de esportes',
                language: 'pt-BR',
                quality: 'HD'
            },
            {
                id: 'channel-4',
                name: 'Canal Filmes',
                category: 'Filmes',
                logo: '🎬',
                url: 'https://example.com/channel4.m3u8',
                description: 'Canal de filmes',
                language: 'pt-BR',
                quality: 'HD'
            },
            {
                id: 'channel-5',
                name: 'Canal Música',
                category: 'Música',
                logo: '🎵',
                url: 'https://example.com/channel5.m3u8',
                description: 'Canal de música',
                language: 'pt-BR',
                quality: 'HD'
            }
        ];
    }
    
    async loadPlaylistDialog() {
        try {
            // Criar dialog para carregar playlist
            const dialog = document.createElement('div');
            dialog.className = 'iptv-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>Carregar Playlist IPTV</h3>
                    <div class="dialog-body">
                        <label for="playlist-url">URL da Playlist:</label>
                        <input type="url" id="playlist-url" placeholder="https://example.com/playlist.m3u8">
                        <label for="playlist-name">Nome da Playlist:</label>
                        <input type="text" id="playlist-name" placeholder="Minha Playlist">
                    </div>
                    <div class="dialog-actions">
                        <button id="cancel-playlist" class="btn-secondary">Cancelar</button>
                        <button id="load-playlist-confirm" class="btn-primary">Carregar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            // Event listeners
            document.getElementById('cancel-playlist').addEventListener('click', () => {
                document.body.removeChild(dialog);
            });
            
            document.getElementById('load-playlist-confirm').addEventListener('click', () => {
                this.loadPlaylistFromUrl();
                document.body.removeChild(dialog);
            });
            
            // Focus no input
            setTimeout(() => {
                document.getElementById('playlist-url').focus();
            }, 100);
            
        } catch (error) {
            logger.error('Erro ao mostrar dialog de playlist', error);
        }
    }
    
    async loadPlaylistFromUrl() {
        try {
            const url = document.getElementById('playlist-url').value.trim();
            const name = document.getElementById('playlist-name').value.trim() || 'Nova Playlist';
            
            if (!url) {
                this.showError('URL da playlist é obrigatória');
                return;
            }
            
            logger.info(`Carregando playlist: ${url}`);
            
            // Simular carregamento de playlist
            const playlist = await this.parsePlaylist(url, name);
            
            this.playlists.push(playlist);
            this.currentPlaylist = playlist;
            this.channels = playlist.channels;
            
            this.updateChannelsList();
            this.showSuccess(`Playlist "${name}" carregada com sucesso!`);
            
        } catch (error) {
            logger.error('Erro ao carregar playlist', error);
            this.showError('Erro ao carregar playlist');
        }
    }
    
    async parsePlaylist(url, name) {
        try {
            // Simular parsing de playlist M3U
            const response = await fetch(url);
            const content = await response.text();
            
            const channels = this.parseM3UContent(content);
            
            return {
                id: 'playlist-' + Date.now(),
                name: name,
                url: url,
                channels: channels,
                loadedAt: Date.now()
            };
            
        } catch (error) {
            logger.error('Erro ao fazer parse da playlist', error);
            throw error;
        }
    }
    
    parseM3UContent(content) {
        const channels = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const nextLine = lines[i + 1];
                if (nextLine && !nextLine.startsWith('#')) {
                    const channel = this.parseExtinfLine(line, nextLine);
                    if (channel) {
                        channels.push(channel);
                    }
                }
            }
        }
        
        return channels;
    }
    
    parseExtinfLine(extinfLine, urlLine) {
        try {
            // Parse EXTINF line: #EXTINF:-1 tvg-id="channel1" tvg-name="Channel 1" tvg-logo="logo.png" group-title="Entertainment",Channel 1
            const match = extinfLine.match(/#EXTINF:(-?\d+)(?:\s+(.+))?,(.+)/);
            if (!match) return null;
            
            const duration = match[1];
            const attributes = match[2] || '';
            const title = match[3];
            
            // Parse attributes
            const attrs = {};
            const attrMatches = attributes.match(/(\w+(?:-\w+)*)="([^"]*)"/g);
            if (attrMatches) {
                attrMatches.forEach(attr => {
                    const [key, value] = attr.split('=');
                    attrs[key.replace(/"/g, '')] = value.replace(/"/g, '');
                });
            }
            
            return {
                id: 'channel-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                name: title,
                category: attrs['group-title'] || 'Geral',
                logo: attrs['tvg-logo'] || '📺',
                url: urlLine.trim(),
                description: attrs['tvg-name'] || title,
                language: attrs['tvg-language'] || 'pt-BR',
                quality: 'HD'
            };
            
        } catch (error) {
            logger.error('Erro ao fazer parse da linha EXTINF', error);
            return null;
        }
    }
    
    updateChannelsList() {
        const channelsContainer = document.getElementById('iptv-channels');
        if (!channelsContainer) return;
        
        channelsContainer.innerHTML = '';
        
        this.channels.forEach(channel => {
            const channelElement = this.createChannelElement(channel);
            channelsContainer.appendChild(channelElement);
        });
        
        logger.info(`Lista de canais atualizada: ${this.channels.length} canais`);
    }
    
    createChannelElement(channel) {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';
        channelElement.dataset.channelId = channel.id;
        
        const isFavorite = this.favorites.includes(channel.id);
        
        channelElement.innerHTML = `
            <div class="channel-logo">${channel.logo}</div>
            <div class="channel-info">
                <span class="channel-name">${channel.name}</span>
                <span class="channel-category">${channel.category}</span>
            </div>
            <div class="channel-actions">
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-channel-id="${channel.id}">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
                <button class="play-btn" data-channel-id="${channel.id}">▶️</button>
            </div>
        `;
        
        // Event listeners para ações
        const favoriteBtn = channelElement.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(channel.id);
        });
        
        return channelElement;
    }
    
    async playChannel(channelId) {
        try {
            const channel = this.channels.find(c => c.id === channelId);
            if (!channel) {
                throw new Error('Canal não encontrado');
            }
            
            logger.info(`Reproduzindo canal: ${channel.name}`);
            
            this.currentChannel = channel;
            const iptvPlayer = document.getElementById('iptv-video-player');
            const iptvPlayerContainer = document.getElementById('iptv-player');
            
            if (!iptvPlayer || !iptvPlayerContainer) {
                throw new Error('Player IPTV não encontrado');
            }
            
            // Mostrar player
            iptvPlayerContainer.style.display = 'block';
            
            // Configurar fonte do vídeo
            iptvPlayer.src = channel.url;
            iptvPlayer.load();
            
            // Tentar reproduzir
            try {
                await iptvPlayer.play();
                this.isPlaying = true;
            } catch (playError) {
                logger.warn('Autoplay bloqueado, aguardando interação do usuário');
            }
            
            // Scroll para o player
            iptvPlayerContainer.scrollIntoView({ behavior: 'smooth' });
            
            // Atualizar UI
            this.updateChannelInfo(channel);
            
        } catch (error) {
            logger.error('Erro ao reproduzir canal', error);
            this.showError('Erro ao reproduzir canal');
        }
    }
    
    updateChannelInfo(channel) {
        // Atualizar informações do canal atual
        const channelInfo = document.querySelector('.current-channel-info');
        if (channelInfo) {
            channelInfo.innerHTML = `
                <h3>${channel.name}</h3>
                <p>${channel.description}</p>
                <span class="channel-quality">${channel.quality}</span>
            `;
        }
    }
    
    onChannelPlay() {
        logger.info('Canal iniciado');
        this.updatePlayButton(true);
    }
    
    onChannelPause() {
        logger.info('Canal pausado');
        this.updatePlayButton(false);
    }
    
    onChannelEnded() {
        logger.info('Canal finalizado');
        this.updatePlayButton(false);
    }
    
    onChannelError(error) {
        logger.error('Erro no canal', error);
        this.showError('Erro ao reproduzir canal');
    }
    
    onChannelLoadStart() {
        logger.info('Iniciando carregamento do canal');
        this.showLoadingIndicator();
    }
    
    onChannelCanPlay() {
        logger.info('Canal pronto para reprodução');
        this.hideLoadingIndicator();
    }
    
    updatePlayButton(isPlaying) {
        const playBtn = document.querySelector('.play-btn');
        if (playBtn) {
            playBtn.textContent = isPlaying ? '⏸️' : '▶️';
        }
    }
    
    showLoadingIndicator() {
        const iptvPlayer = document.getElementById('iptv-video-player');
        if (iptvPlayer) {
            iptvPlayer.style.opacity = '0.5';
        }
    }
    
    hideLoadingIndicator() {
        const iptvPlayer = document.getElementById('iptv-video-player');
        if (iptvPlayer) {
            iptvPlayer.style.opacity = '1';
        }
    }
    
    toggleFavorite(channelId) {
        const index = this.favorites.indexOf(channelId);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.removeFromFavorites(channelId);
        } else {
            this.favorites.push(channelId);
            this.addToFavorites(channelId);
        }
        
        // Atualizar UI
        this.updateFavoritesUI();
        this.saveFavorites();
    }
    
    addToFavorites(channelId) {
        logger.info(`Canal ${channelId} adicionado aos favoritos`);
    }
    
    removeFromFavorites(channelId) {
        logger.info(`Canal ${channelId} removido dos favoritos`);
    }
    
    updateFavoritesUI() {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            const channelId = btn.dataset.channelId;
            const isFavorite = this.favorites.includes(channelId);
            
            btn.classList.toggle('active', isFavorite);
            btn.textContent = isFavorite ? '❤️' : '🤍';
        });
    }
    
    showFavorites() {
        const favoriteChannels = this.channels.filter(channel => 
            this.favorites.includes(channel.id)
        );
        
        if (favoriteChannels.length === 0) {
            this.showInfo('Nenhum canal favorito encontrado');
            return;
        }
        
        // Criar dialog de favoritos
        const dialog = document.createElement('div');
        dialog.className = 'iptv-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Canais Favoritos</h3>
                <div class="dialog-body">
                    <div class="favorites-list">
                        ${favoriteChannels.map(channel => `
                            <div class="favorite-item" data-channel-id="${channel.id}">
                                <span class="channel-logo">${channel.logo}</span>
                                <span class="channel-name">${channel.name}</span>
                                <button class="play-btn">▶️</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="dialog-actions">
                    <button id="close-favorites" class="btn-primary">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        document.getElementById('close-favorites').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        // Play channel from favorites
        dialog.addEventListener('click', (e) => {
            const favoriteItem = e.target.closest('.favorite-item');
            if (favoriteItem) {
                const channelId = favoriteItem.dataset.channelId;
                this.playChannel(channelId);
                document.body.removeChild(dialog);
            }
        });
    }
    
    showSettings() {
        // Criar dialog de configurações
        const dialog = document.createElement('div');
        dialog.className = 'iptv-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Configurações IPTV</h3>
                <div class="dialog-body">
                    <div class="setting-group">
                        <label for="buffer-size">Tamanho do Buffer:</label>
                        <select id="buffer-size">
                            <option value="small">Pequeno</option>
                            <option value="medium" selected>Médio</option>
                            <option value="large">Grande</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="quality-preference">Qualidade Preferida:</label>
                        <select id="quality-preference">
                            <option value="auto" selected>Automática</option>
                            <option value="hd">HD</option>
                            <option value="sd">SD</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="auto-play">Reprodução Automática:</label>
                        <input type="checkbox" id="auto-play" checked>
                    </div>
                </div>
                <div class="dialog-actions">
                    <button id="cancel-settings" class="btn-secondary">Cancelar</button>
                    <button id="save-settings" class="btn-primary">Salvar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        document.getElementById('cancel-settings').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
            document.body.removeChild(dialog);
        });
    }
    
    saveSettings() {
        const settings = {
            bufferSize: document.getElementById('buffer-size').value,
            qualityPreference: document.getElementById('quality-preference').value,
            autoPlay: document.getElementById('auto-play').checked
        };
        
        localStorage.setItem('ee_iptv_settings', JSON.stringify(settings));
        logger.info('Configurações IPTV salvas', settings);
        this.showSuccess('Configurações salvas!');
    }
    
    loadFavorites() {
        try {
            const favorites = localStorage.getItem('ee_iptv_favorites');
            this.favorites = favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            logger.error('Erro ao carregar favoritos', error);
            this.favorites = [];
        }
    }
    
    saveFavorites() {
        try {
            localStorage.setItem('ee_iptv_favorites', JSON.stringify(this.favorites));
        } catch (error) {
            logger.error('Erro ao salvar favoritos', error);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
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
    getCurrentChannel() {
        return this.currentChannel;
    }
    
    getChannels() {
        return this.channels;
    }
    
    getFavorites() {
        return this.favorites;
    }
    
    isChannelPlaying() {
        return this.isPlaying;
    }
    
    stop() {
        const iptvPlayer = document.getElementById('iptv-video-player');
        if (iptvPlayer) {
            iptvPlayer.pause();
            iptvPlayer.src = '';
        }
        
        const iptvPlayerContainer = document.getElementById('iptv-player');
        if (iptvPlayerContainer) {
            iptvPlayerContainer.style.display = 'none';
        }
        
        this.isPlaying = false;
        this.currentChannel = null;
    }
}

// Instância global do IPTVModule
window.iptvModule = new IPTVModule(CONFIG.MODULES.IPTV);