// Módulo de Mídia Elias Empresas
class MediaModule extends BaseModule {
    constructor(config) {
        super(config);
        this.currentCategory = 'live';
        this.mediaData = {};
        this.player = null;
        this.isPlaying = false;
        
        this.init();
    }
    
    init() {
        super.init();
        this.setupEventListeners();
        this.loadMediaCategories();
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.media-nav-btn');
            if (navBtn) {
                const category = navBtn.dataset.category;
                this.switchCategory(category);
            }
        });
        
        // Media items
        document.addEventListener('click', (e) => {
            const mediaItem = e.target.closest('.media-item');
            if (mediaItem) {
                const mediaData = mediaItem.dataset;
                this.playMedia(mediaData);
            }
        });
        
        // Video player events
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.addEventListener('play', () => {
                this.isPlaying = true;
                this.onPlay();
            });
            
            videoPlayer.addEventListener('pause', () => {
                this.isPlaying = false;
                this.onPause();
            });
            
            videoPlayer.addEventListener('ended', () => {
                this.isPlaying = false;
                this.onEnded();
            });
            
            videoPlayer.addEventListener('error', (e) => {
                this.onError(e);
            });
        }
    }
    
    async loadMediaCategories() {
        try {
            logger.info('Carregando categorias de mídia');
            
            // Simular carregamento de categorias
            this.mediaData = {
                live: await this.loadLiveContent(),
                movies: await this.loadMoviesContent(),
                series: await this.loadSeriesContent(),
                anime: await this.loadAnimeContent()
            };
            
            this.updateMediaGrid();
            
        } catch (error) {
            logger.error('Erro ao carregar categorias de mídia', error);
        }
    }
    
    async loadLiveContent() {
        // Simular conteúdo TV ao vivo
        return [
            {
                id: 'live-1',
                title: 'Canal Principal',
                description: 'Transmissão ao vivo',
                thumbnail: '📺',
                url: 'https://example.com/live1.m3u8',
                type: 'live'
            },
            {
                id: 'live-2',
                title: 'Canal Secundário',
                description: 'Transmissão ao vivo',
                thumbnail: '📡',
                url: 'https://example.com/live2.m3u8',
                type: 'live'
            }
        ];
    }
    
    async loadMoviesContent() {
        // Simular conteúdo de filmes
        return [
            {
                id: 'movie-1',
                title: 'Filme Exemplo 1',
                description: 'Ação e aventura',
                thumbnail: '🎬',
                url: 'https://example.com/movie1.mp4',
                type: 'movie',
                duration: '120 min',
                year: '2024'
            },
            {
                id: 'movie-2',
                title: 'Filme Exemplo 2',
                description: 'Comédia',
                thumbnail: '😄',
                url: 'https://example.com/movie2.mp4',
                type: 'movie',
                duration: '95 min',
                year: '2023'
            }
        ];
    }
    
    async loadSeriesContent() {
        // Simular conteúdo de séries
        return [
            {
                id: 'series-1',
                title: 'Série Exemplo 1',
                description: 'Drama',
                thumbnail: '📺',
                url: 'https://example.com/series1.m3u8',
                type: 'series',
                episodes: 10,
                season: 1
            },
            {
                id: 'series-2',
                title: 'Série Exemplo 2',
                description: 'Ficção científica',
                thumbnail: '🚀',
                url: 'https://example.com/series2.m3u8',
                type: 'series',
                episodes: 8,
                season: 2
            }
        ];
    }
    
    async loadAnimeContent() {
        // Simular conteúdo de anime
        return [
            {
                id: 'anime-1',
                title: 'Anime Exemplo 1',
                description: 'Aventura',
                thumbnail: '🎌',
                url: 'https://example.com/anime1.m3u8',
                type: 'anime',
                episodes: 24,
                season: 1
            },
            {
                id: 'anime-2',
                title: 'Anime Exemplo 2',
                description: 'Ação',
                thumbnail: '⚔️',
                url: 'https://example.com/anime2.m3u8',
                type: 'anime',
                episodes: 12,
                season: 1
            }
        ];
    }
    
    switchCategory(category) {
        if (this.currentCategory === category) return;
        
        logger.info(`Alternando categoria de mídia: ${category}`);
        
        // Atualizar navegação
        document.querySelectorAll('.media-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-category="${category}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.currentCategory = category;
        this.updateMediaGrid();
    }
    
    updateMediaGrid() {
        const mediaGrid = document.getElementById('media-grid');
        if (!mediaGrid) return;
        
        const content = this.mediaData[this.currentCategory] || [];
        
        mediaGrid.innerHTML = '';
        
        content.forEach(item => {
            const mediaElement = this.createMediaElement(item);
            mediaGrid.appendChild(mediaElement);
        });
        
        logger.info(`Grid de mídia atualizado: ${content.length} itens`);
    }
    
    createMediaElement(item) {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.dataset.id = item.id;
        mediaElement.dataset.title = item.title;
        mediaElement.dataset.url = item.url;
        mediaElement.dataset.type = item.type;
        
        mediaElement.innerHTML = `
            <div class="media-thumbnail">${item.thumbnail}</div>
            <div class="media-info">
                <div class="media-title">${item.title}</div>
                <div class="media-meta">${item.description}</div>
                ${this.createMediaMeta(item)}
            </div>
        `;
        
        return mediaElement;
    }
    
    createMediaMeta(item) {
        let meta = '';
        
        switch (item.type) {
            case 'movie':
                meta = `<div class="media-duration">${item.duration} • ${item.year}</div>`;
                break;
            case 'series':
            case 'anime':
                meta = `<div class="media-episodes">${item.episodes} episódios • Temporada ${item.season}</div>`;
                break;
            case 'live':
                meta = `<div class="media-live">🔴 AO VIVO</div>`;
                break;
        }
        
        return meta;
    }
    
    async playMedia(mediaData) {
        try {
            logger.info(`Reproduzindo mídia: ${mediaData.title}`);
            
            const videoPlayer = document.getElementById('video-player');
            const mediaPlayer = document.getElementById('media-player');
            
            if (!videoPlayer || !mediaPlayer) {
                throw new Error('Player de vídeo não encontrado');
            }
            
            // Mostrar player
            mediaPlayer.style.display = 'block';
            
            // Configurar fonte do vídeo
            videoPlayer.src = mediaData.url;
            videoPlayer.load();
            
            // Tentar reproduzir
            try {
                await videoPlayer.play();
                this.isPlaying = true;
            } catch (playError) {
                logger.warn('Autoplay bloqueado, aguardando interação do usuário');
                // O usuário precisará clicar para reproduzir
            }
            
            // Scroll para o player
            mediaPlayer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            logger.error('Erro ao reproduzir mídia', error);
            this.showError('Erro ao reproduzir mídia');
        }
    }
    
    onPlay() {
        logger.info('Mídia iniciada');
        this.updatePlayButton(true);
    }
    
    onPause() {
        logger.info('Mídia pausada');
        this.updatePlayButton(false);
    }
    
    onEnded() {
        logger.info('Mídia finalizada');
        this.updatePlayButton(false);
        this.showNextMedia();
    }
    
    onError(error) {
        logger.error('Erro no player de vídeo', error);
        this.showError('Erro ao reproduzir vídeo');
    }
    
    updatePlayButton(isPlaying) {
        // Atualizar botão de play/pause se existir
        const playBtn = document.querySelector('.play-btn');
        if (playBtn) {
            playBtn.textContent = isPlaying ? '⏸️' : '▶️';
        }
    }
    
    showNextMedia() {
        // Sugerir próxima mídia
        const notification = document.createElement('div');
        notification.className = 'notification notification-info';
        notification.innerHTML = `
            <h4>Mídia finalizada</h4>
            <p>Deseja assistir a próxima?</p>
            <button onclick="this.parentElement.remove()">Não</button>
            <button onclick="window.mediaModule.playNext()">Sim</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    async playNext() {
        try {
            const currentContent = this.mediaData[this.currentCategory] || [];
            const currentIndex = currentContent.findIndex(item => 
                document.querySelector(`[data-id="${item.id}"]`)?.classList.contains('playing')
            );
            
            const nextIndex = (currentIndex + 1) % currentContent.length;
            const nextItem = currentContent[nextIndex];
            
            if (nextItem) {
                await this.playMedia(nextItem);
            }
        } catch (error) {
            logger.error('Erro ao reproduzir próxima mídia', error);
        }
    }
    
    showError(message) {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification notification-error';
        errorNotification.innerHTML = `
            <h4>Erro</h4>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">Fechar</button>
        `;
        
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.parentNode.removeChild(errorNotification);
            }
        }, 5000);
    }
    
    // Métodos públicos
    pause() {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer && !videoPlayer.paused) {
            videoPlayer.pause();
        }
    }
    
    resume() {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer && videoPlayer.paused) {
            videoPlayer.play();
        }
    }
    
    stop() {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.src = '';
        }
        
        const mediaPlayer = document.getElementById('media-player');
        if (mediaPlayer) {
            mediaPlayer.style.display = 'none';
        }
        
        this.isPlaying = false;
    }
    
    setVolume(volume) {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.volume = volume / 100;
        }
    }
    
    seekTo(time) {
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) {
            videoPlayer.currentTime = time;
        }
    }
    
    getCurrentTime() {
        const videoPlayer = document.getElementById('video-player');
        return videoPlayer ? videoPlayer.currentTime : 0;
    }
    
    getDuration() {
        const videoPlayer = document.getElementById('video-player');
        return videoPlayer ? videoPlayer.duration : 0;
    }
    
    isMediaPlaying() {
        return this.isPlaying;
    }
    
    getCurrentMedia() {
        const videoPlayer = document.getElementById('video-player');
        if (!videoPlayer || !videoPlayer.src) return null;
        
        return {
            src: videoPlayer.src,
            currentTime: videoPlayer.currentTime,
            duration: videoPlayer.duration,
            paused: videoPlayer.paused
        };
    }
    
    // Métodos de busca
    async searchMedia(query) {
        try {
            logger.info(`Buscando mídia: ${query}`);
            
            // Simular busca
            const results = [];
            
            Object.keys(this.mediaData).forEach(category => {
                const content = this.mediaData[category] || [];
                const matches = content.filter(item => 
                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.description.toLowerCase().includes(query.toLowerCase())
                );
                results.push(...matches);
            });
            
            return results;
        } catch (error) {
            logger.error('Erro na busca de mídia', error);
            return [];
        }
    }
    
    // Métodos de favoritos
    addToFavorites(mediaId) {
        try {
            const favorites = this.getFavorites();
            if (!favorites.includes(mediaId)) {
                favorites.push(mediaId);
                localStorage.setItem('ee_media_favorites', JSON.stringify(favorites));
                logger.info(`Mídia ${mediaId} adicionada aos favoritos`);
            }
        } catch (error) {
            logger.error('Erro ao adicionar aos favoritos', error);
        }
    }
    
    removeFromFavorites(mediaId) {
        try {
            const favorites = this.getFavorites();
            const index = favorites.indexOf(mediaId);
            if (index > -1) {
                favorites.splice(index, 1);
                localStorage.setItem('ee_media_favorites', JSON.stringify(favorites));
                logger.info(`Mídia ${mediaId} removida dos favoritos`);
            }
        } catch (error) {
            logger.error('Erro ao remover dos favoritos', error);
        }
    }
    
    getFavorites() {
        try {
            const favorites = localStorage.getItem('ee_media_favorites');
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            logger.error('Erro ao obter favoritos', error);
            return [];
        }
    }
    
    isFavorite(mediaId) {
        return this.getFavorites().includes(mediaId);
    }
}

// Instância global do MediaModule
window.mediaModule = new MediaModule(CONFIG.MODULES.MEDIA);