#!/usr/bin/env bash

# iptv.sh - Script Unificado IPTV (corrigido)
# Autor: Elias Empresas (refatorado)
# Objetivo: Capturar URL M3U do lazerplay.io, baixar playlist, separar canais/VOD,
#           organizar saídas, opcionalmente instalar web stack e agendar sincronizações.
# Uso:
#   sudo bash iptv.sh [opções]
# Opções:
#   --no-capture           Não captura tráfego, usa M3U em $IPTV_DIR/playlist.m3u se existir
#   --install-deps         Instala dependências (tcpdump, tshark, curl, wget, ffmpeg)
#   --install-web          Instala e configura Nginx/PHP/MySQL e frontend básico
#   --download-media       Baixa mídia de FILMES/ANIMES/SÉRIES (cópia via ffmpeg -c copy)
#   --enable-cron          Agenda iptv-sync no cron
#   --interface IFACE      Interface para captura (padrão: autodetectar)
#   --timeout SECONDS      Tempo de captura tcpdump (padrão: 30)
#   --help                 Exibe ajuda

set -euo pipefail

# ============================
# Configurações padrão
# ============================
DOMINIO_IPTV="iptv.eliasempresas.com"
BASE_IPTV_DIR="/var/www/${DOMINIO_IPTV}"
IPTV_DIR="${BASE_IPTV_DIR}/lazerplay"
PASTA_WEB="${BASE_IPTV_DIR}/pasta"
ARQ_DIR="/var/www/arquivos.eliasempresas.com/ARQUIVOS"
PCAP_FILE="/tmp/lazerplay.pcap"
LOG_FILE="/var/log/iptv.log"
USER_AGENT="EliasEmpresas/1.1"
TIMEOUT_CAPTURE="${TIMEOUT_CAPTURE:-30}"
INTERFACE_AUTO=""
DO_CAPTURE=true
INSTALL_DEPS=false
INSTALL_WEB=false
DOWNLOAD_MEDIA=false
ENABLE_CRON=false

# DB (para sync opcional)
DB_NAME="iptv_db"
DB_USER="iptv_user"
DB_PASS="elias1@#$2Telefone"

# ============================
# Utilitários
# ============================
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $*" | tee -a "$LOG_FILE"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $*" | tee -a "$LOG_FILE" >&2; }
err() { echo "$(date '+%Y-%m-%d %H:%M:%S') [ERRO] $*" | tee -a "$LOG_FILE" >&2; exit 1; }
need_cmd() { command -v "$1" >/dev/null 2>&1 || err "Dependência ausente: $1"; }

autodetect_interface() {
	# Tenta detectar interface UP que não seja loopback
	local iface
	iface=$(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | grep -Ev '^lo$' | head -n1 || true)
	if [[ -n "${iface:-}" ]]; then
		INTERFACE_AUTO="$iface"
	else
		INTERFACE_AUTO="wlan0"  # fallback
	fi
}

usage() {
	cat <<EOF
Uso: sudo bash iptv.sh [opções]

--no-capture           Não captura tráfego; usa M3U existente em ${IPTV_DIR}/playlist.m3u
--install-deps         Instala tcpdump, tshark, curl, wget, ffmpeg
--install-web          Instala e configura Nginx/PHP/MySQL e frontend/analytics básicos
--download-media       Baixa VOD (FILMES/ANIMES/SÉRIES) com ffmpeg (cópia)
--enable-cron          Agenda iptv-sync no cron (05:55 e 15:55)
--interface IFACE      Interface para captura (auto se omitido)
--timeout SECONDS      Tempo de captura (padrão: ${TIMEOUT_CAPTURE})
--help                 Exibe esta ajuda
EOF
}

# ============================
# Parse de argumentos
# ============================
while [[ $# -gt 0 ]]; do
	case "$1" in
		--no-capture) DO_CAPTURE=false; shift ;;
		--install-deps) INSTALL_DEPS=true; shift ;;
		--install-web) INSTALL_WEB=true; shift ;;
		--download-media) DOWNLOAD_MEDIA=true; shift ;;
		--enable-cron) ENABLE_CRON=true; shift ;;
		--interface) INTERFACE_AUTO="$2"; shift 2 ;;
		--timeout) TIMEOUT_CAPTURE="$2"; shift 2 ;;
		--help|-h) usage; exit 0 ;;
		*) err "Opção desconhecida: $1" ;;
	esac
done

# ============================
# Pré-checagens e diretórios
# ============================
if [[ $EUID -ne 0 ]]; then
	err "Execute como root (sudo)."
fi

mkdir -p "$IPTV_DIR" "$PASTA_WEB" \
	"$ARQ_DIR/IMAGENS/FILMES" "$ARQ_DIR/IMAGENS/SERIES" "$ARQ_DIR/IMAGENS/ANIMES" \
	"$ARQ_DIR/VIDEOS/FILMES" "$ARQ_DIR/VIDEOS/SERIES" "$ARQ_DIR/VIDEOS/ANIMES" \
	"$(dirname "$LOG_FILE")"

# ============================
# Instalação de dependências (opcional)
# ============================
if $INSTALL_DEPS; then
	log "Instalando dependências base..."
	apt update -y
	DEBIAN_FRONTEND=noninteractive apt install -y tcpdump tshark curl wget ffmpeg
fi

# ============================
# Captura do tráfego e extração da URL M3U
# ============================
M3U_URL=""
if $DO_CAPTURE; then
	autodetect_interface
	local_iface="${INTERFACE_AUTO}"
	log "Interface detectada: ${local_iface}"

	need_cmd tcpdump
	need_cmd tshark

	log "[1/6] Capturando tráfego em ${local_iface} (host lazerplay.io) por ${TIMEOUT_CAPTURE}s..."
	set +e
	timeout "${TIMEOUT_CAPTURE}" tcpdump -i "${local_iface}" host lazerplay.io -w "${PCAP_FILE}" >/dev/null 2>&1
	cap_rc=$?
	set -e
	if [[ $cap_rc -ne 0 ]]; then
		warn "Captura finalizada com RC=${cap_rc}. Prosseguindo com a análise..."
	fi

	log "[2/6] Extraindo URL M3U da captura..."
	# Tenta extrair URI completo das requisições HTTP
	M3U_URL=$(tshark -r "${PCAP_FILE}" -Y 'http.request && http.request.method == "GET"' -T fields -e http.request.full_uri 2>/dev/null \
		| grep -Eo 'https?://[^ ]+\.m3u8?([?][^ ]*)?' | head -n1 || true)

	if [[ -z "${M3U_URL}" ]]; then
		# Tentativa alternativa: host + uri
		M3U_URL=$(tshark -r "${PCAP_FILE}" -Y 'http.request && http.request.method == "GET"' -T fields -e http.host -e http.request.uri -E separator=/ 2>/dev/null \
			| sed 's#^#http://#' | grep -Eo 'https?://[^ ]+\.m3u8?([?][^ ]*)?' | head -n1 || true)
	fi

	if [[ -z "${M3U_URL}" ]]; then
		err "URL M3U não encontrada na captura. Utilize --no-capture se já tiver uma playlist."
	fi
	log "[INFO] URL M3U encontrada: ${M3U_URL}"

	log "[3/6] Baixando lista M3U..."
	curl -fLs -A "${USER_AGENT}" "${M3U_URL}" -o "${IPTV_DIR}/playlist.m3u"
	cp -f "${IPTV_DIR}/playlist.m3u" "${IPTV_DIR}/playlist_lazerplay.m3u"
else
	if [[ ! -s "${IPTV_DIR}/playlist.m3u" ]]; then
		err "--no-capture usado, mas ${IPTV_DIR}/playlist.m3u não existe."
	fi
	log "Usando playlist existente em ${IPTV_DIR}/playlist.m3u"
fi

# ============================
# Processamento da M3U
# ============================
M3U_SOURCE_FILE="${IPTV_DIR}/playlist.m3u"
[[ -s "$M3U_SOURCE_FILE" ]] || err "Arquivo M3U vazio: ${M3U_SOURCE_FILE}"

log "[4/6] Processando M3U e separando saídas..."

# Saídas
TV_TXT="${IPTV_DIR}/tv.txt"
FILMES_TXT="${IPTV_DIR}/filmes.txt"
SERIES_TXT="${IPTV_DIR}/series.txt"
ANIMES_TXT="${IPTV_DIR}/animes.txt"

: > "$TV_TXT"; : > "$FILMES_TXT"; : > "$SERIES_TXT"; : > "$ANIMES_TXT"

# Parser: lê #EXTINF e próxima URL; detecta group-title
awk -v tv_out="$TV_TXT" -v filmes_out="$FILMES_TXT" -v series_out="$SERIES_TXT" -v animes_out="$ANIMES_TXT" '
	BEGIN { FS="\n"; RS="\r?\n" }
	{
		line=$0
		if (line ~ /^#EXTINF/) {
			meta=line
			name=line
			g=""
			# group-title
			if (match(meta, /group-title="([^"]+)"/, m)) { g=m[1] }
			# nome após vírgula
			if (match(name, /,([^,]+)$/ , n)) { name=n[1] } else { name="" }
			getline url
			if (url ~ /^https?:\/\//) {
				# escreve em tv.txt sempre
				printf("\"%s\"=\"%s\"\n", name, url) >> tv_out
				# separação por grupo (case-insensitive)
				lg=tolower(g)
				if (lg ~ /filmes/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> filmes_out
				} else if (lg ~ /s[ée]ries|series/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> series_out
				} else if (lg ~ /animes/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> animes_out
				}
			}
		}
	}
' "$M3U_SOURCE_FILE"

log "Criados: $TV_TXT, $FILMES_TXT, $SERIES_TXT, $ANIMES_TXT"

# ============================
# Download de mídias (opcional)
# ============================
if $DOWNLOAD_MEDIA; then
	need_cmd ffmpeg
	log "[5/6] Baixando mídias de FILMES e ANIMES... (SÉRIES via regra especial)"

	baixar_midias() {
		local tipo="$1"; local arquivo="$2"
		while IFS='=' read -r raw_nome raw_url; do
			[[ -n "${raw_nome:-}" && -n "${raw_url:-}" ]] || continue
			nome=${raw_nome%"}; nome=${nome#"}
			url=${raw_url%"}; url=${url#"}
			[[ -n "$url" ]] || continue

			# Pastas
			pasta_img="${ARQ_DIR}/IMAGENS/${tipo}/${nome}"
			pasta_vid="${ARQ_DIR}/VIDEOS/${tipo}/${nome}"
			mkdir -p "$pasta_img" "$pasta_vid"

			# Arquivos destino
			arquivo_mp4="${pasta_vid}/${nome}.mp4"

			log "[DOWNLOAD] ${tipo} - ${nome}"
			# cópia direta do stream (se suportado)
			ffmpeg -loglevel error -y -i "$url" -c copy "$arquivo_mp4" || warn "Falha ao copiar $nome"
		done < "$arquivo"
	}

	baixar_midias "FILMES" "$FILMES_TXT"
	baixar_midias "ANIMES" "$ANIMES_TXT"

	# Séries com organização por temporada/episódio
	while IFS='=' read -r raw_nome raw_url; do
		[[ -n "${raw_nome:-}" && -n "${raw_url:-}" ]] || continue
		nome=${raw_nome%"}; nome=${nome#"}
		url=${raw_url%"}; url=${url#"}

		# Detecta padrões S01E02, 1x02, T1E2
		SEASON="1"; EPISODE="1"
		if [[ "$nome" =~ [sS]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		elif [[ "$nome" =~ ([0-9]{1,2})x([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		elif [[ "$nome" =~ [tT]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		fi

		# Nome base da série (remove sufixos de temporada/episódio)
		SERIE=$(echo "$nome" | sed -E 's/[sS][0-9]+[eE][0-9]+.*//;s/[tT][0-9]+[eE][0-9]+.*//;s/[0-9]+x[0-9]+.*//' | sed 's/[[:space:]]\+$//' )
		[[ -z "$SERIE" ]] && SERIE="$nome"

		DEST_DIR="${ARQ_DIR}/VIDEOS/SERIES/${SERIE}/${SEASON} TEMPORADA"
		mkdir -p "$DEST_DIR"
		DEST_FILE="${DEST_DIR}/${SERIE}-T${SEASON}-E${EPISODE}.mp4"

		log "[SÉRIE] ${SERIE} T${SEASON} E${EPISODE}"
		ffmpeg -loglevel error -y -i "$url" -c copy "$DEST_FILE" || warn "Falha série ${nome}"
	done < "$SERIES_TXT"
fi

# ============================
# Unificação segura de arquivos
# ============================
log "[6/6] Unificando arquivos IPTV..."
concatenar_arquivos() {
	local destino="$1"; shift
	: > "$destino"
	for src in "$@"; do
		if [[ -f "$src" ]] && [[ "$src" != "$destino" ]]; then
			cat "$src" >> "$destino"
			echo "" >> "$destino"
			log "[ADD] $src -> $destino"
		fi
	done
}

# Garante pasta web de trabalho
mkdir -p "$PASTA_WEB"
concatenar_arquivos "${BASE_IPTV_DIR}/playlist.m3u" \
	"${IPTV_DIR}/playlist.m3u" \
	"${PASTA_WEB}/playlist.m3u"

concatenar_arquivos "${BASE_IPTV_DIR}/epg.xml" \
	"${IPTV_DIR}/epg.xml" \
	"${PASTA_WEB}/epg.xml"

concatenar_arquivos "${BASE_IPTV_DIR}/series.txt" \
	"${IPTV_DIR}/series.txt" \
	"${PASTA_WEB}/series.txt"

concatenar_arquivos "${BASE_IPTV_DIR}/filmes.txt" \
	"${IPTV_DIR}/filmes.txt" \
	"${PASTA_WEB}/filmes.txt"

concatenar_arquivos "${BASE_IPTV_DIR}/animes.txt" \
	"${IPTV_DIR}/animes.txt" \
	"${PASTA_WEB}/animes.txt"

log "Unificação concluída."

echo "Filmes: ${ARQ_DIR}/VIDEOS/FILMES"
echo "Animes: ${ARQ_DIR}/VIDEOS/ANIMES"
echo "Séries: ${ARQ_DIR}/VIDEOS/SERIES"

# ============================
# Instalação Web + DB + Analytics (opcional)
# ============================
if $INSTALL_WEB; then
	log "Instalando Nginx, PHP, MySQL e configurando frontend..."
	apt update -y
	DEBIAN_FRONTEND=noninteractive apt install -y nginx mysql-server php php-fpm php-cli php-mysql php-curl php-mbstring php-xml php-zip unzip curl git

	mkdir -p "$PASTA_WEB" "$BASE_IPTV_DIR/analytics"
	chown -R www-data:www-data "$BASE_IPTV_DIR"

	# Detecta socket do PHP-FPM
	PHP_FPM_SOCK=$(ls /var/run/php/php*-fpm.sock 2>/dev/null | head -n1 || true)
	[[ -z "${PHP_FPM_SOCK}" ]] && PHP_FPM_SOCK="/var/run/php/php-fpm.sock"

	cat > "/etc/nginx/sites-available/${DOMINIO_IPTV}" <<NGINX
server {
	listen 80;
	server_name ${DOMINIO_IPTV};

	root ${BASE_IPTV_DIR};
	index index.php index.html index.htm;

	location / {
		try_files $uri $uri/ /index.php?$args;
	}

	location ~ \.php$ {
		include snippets/fastcgi-php.conf;
		fastcgi_pass unix:${PHP_FPM_SOCK};
	}

	location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
		expires max;
		log_not_found off;
	}
}
NGINX

	ln -sf "/etc/nginx/sites-available/${DOMINIO_IPTV}" "/etc/nginx/sites-enabled/${DOMINIO_IPTV}"
	nginx -t && systemctl reload nginx

	# Frontend mínimo com HLS.js
	cat > "${BASE_IPTV_DIR}/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="pt-br">
<head>
	<meta charset="UTF-8" />
	<title>IPTV Elias Empresas</title>
	<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;margin:24px;}video{width:100%;max-height:70vh;background:#000;border-radius:8px}</style>
</head>
<body>
	<h1>IPTV Elias Empresas</h1>
	<video id="player" controls autoplay></video>
	<script>
		const video = document.getElementById('player');
		const params = new URLSearchParams(location.search);
		const src = params.get('src') || '/playlist.m3u';
		if (Hls.isSupported()) {
			const hls = new Hls();
			hls.loadSource(src);
			hls.attachMedia(video);
		} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = src;
		} else {
			document.body.insertAdjacentHTML('beforeend','<p>Seu navegador não suporta HLS</p>');
		}
		fetch('/analytics/log.php?stream=' + encodeURIComponent(src)).catch(()=>{});
	</script>
</body>
</html>
HTML

	# Analytics simples
	cat > "${BASE_IPTV_DIR}/analytics/log.php" <<PHP
<?php
\$stream = isset(\$_GET['stream']) ? \$_GET['stream'] : '';
\$ip = \$_SERVER['REMOTE_ADDR'] ?? '';
\$log = date('Y-m-d H:i:s') . " - " . \$ip . " - " . \$stream . "\n";
file_put_contents("${BASE_IPTV_DIR}/analytics/acessos.log", \$log, FILE_APPEND);
header('Content-Type: image/gif'); echo ""; // resposta vazia
PHP

	cat > "${BASE_IPTV_DIR}/analytics/dashboard.php" <<'PHP'
<?php
$arquivo = __DIR__ . '/acessos.log';
$linhas = file_exists($arquivo) ? array_reverse(file($arquivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)) : [];
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
	<meta charset="UTF-8">
	<title>Monitoramento IPTV - Elias Empresas</title>
</head>
<body>
	<h1>Monitoramento IPTV</h1>
	<table border="1" cellpadding="6" cellspacing="0">
		<tr><th>Data/Hora</th><th>IP</th><th>Stream</th></tr>
		<?php foreach ($linhas as $linha): $p = explode(' - ', $linha, 3); ?>
		<tr>
			<td><?= htmlspecialchars($p[0] ?? '') ?></td>
			<td><?= htmlspecialchars($p[1] ?? '') ?></td>
			<td><?= htmlspecialchars($p[2] ?? '') ?></td>
		</tr>
		<?php endforeach; ?>
	</table>
</body>
</html>
PHP

	# MySQL básico
	log "Configurando MySQL e tabela de streams..."
	mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
	mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
	mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
	mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" -e "
CREATE TABLE IF NOT EXISTS streams (
	id INT AUTO_INCREMENT PRIMARY KEY,
	stream_display_name VARCHAR(255) UNIQUE,
	stream_source TEXT,
	stream_type INT,
	category_id INT,
	tv_archive BOOLEAN,
	direct_source TEXT,
	stream_icon TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"

	# iptv-sync
	mkdir -p "${PASTA_WEB}"
	cat > "${PASTA_WEB}/iptv-sync.sh" <<SYNC
#!/usr/bin/env bash
set -euo pipefail

M3U_FILE="${PASTA_WEB}/playlist.m3u"
EPG_FILE="${PASTA_WEB}/epg.xml"
TV_FILE="${IPTV_DIR}/tv.txt"
DIR_FILMES="${ARQ_DIR}/VIDEOS/FILMES"
DIR_SERIES="${ARQ_DIR}/VIDEOS/SERIES"
DIR_ANIMES="${ARQ_DIR}/VIDEOS/ANIMES"
IMG_BASE_URL="https://arquivos.eliasempresas.com/ARQUIVOS/IMAGENS"
VIDEO_BASE_URL="https://arquivos.eliasempresas.com/ARQUIVOS/VIDEOS"
DB_USER="${DB_USER}"
DB_PASS="${DB_PASS}"
DB_NAME="${DB_NAME}"

log(){ echo "[sync] $*"; }

insere_stream() {
	local nome="$1" url="$2" tipo="$3" categoria="$4" icon="$5"
	mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
		INSERT INTO streams (stream_display_name, stream_source, stream_type, category_id, tv_archive, direct_source, stream_icon)
		VALUES ('${nome}', '${url}', ${tipo}, ${categoria}, 0, '${url}', '${icon}')
		ON DUPLICATE KEY UPDATE stream_source=VALUES(stream_source), stream_icon=VALUES(stream_icon);
	"
}

# Gera playlist
: > "$M3U_FILE"
echo "#EXTM3U" >> "$M3U_FILE"

# Filmes
for file in "$DIR_FILMES"/*/*.mp4; do
	[[ -f "$file" ]] || continue
	nome=$(basename "$file" .mp4)
	pasta=$(basename "$(dirname "$file")")
	img="$IMG_BASE_URL/FILMES/$pasta/${nome}.png"
	url="$VIDEO_BASE_URL/FILMES/$pasta/${nome}.mp4"
	echo "#EXTINF:-1 tvg-name=\"$nome\" tvg-logo=\"$img\" group-title=\"FILMES\",$nome" >> "$M3U_FILE"
	echo "$url" >> "$M3U_FILE"
	insere_stream "$nome" "$url" 5 1 "$img"
done

# Séries
shopt -s nullglobor temporada in "$DIR_SERIES"/*/*\ TEMPORADA; do
	[[ -d "$temporada" ]] || continue
	serie=$(basename "$(dirname "$temporada")")	temp_num=$(basename "$temporada" | grep -oE '^[0-9]+')
	for ep in "$temporada"/*.mp4; do
		[[ -f "$ep" ]] || continue
		nomeep=$(basename "$ep" .mp4)
		img="$IMG_BASE_URL/SERIES/$serie/${temp_num} TEMPORADA/${nomeep}-poster.png"
		url="$VIDEO_BASE_URL/SERIES/$serie/${temp_num} TEMPORADA/${nomeep}.mp4"
		echo "#EXTINF:-1 tvg-name=\"$nomeep\" tvg-logo=\"$img\" group-title=\"SÉRIES\",$nomeep" >> "$M3U_FILE"
		echo "$url" >> "$M3U_FILE"
		insere_stream "$nomeep" "$url" 5 2 "$img"
	done
done

# Animes
for temporada in "$DIR_ANIMES"/*/*\ TEMPORADA; do
	[[ -d "$temporada" ]] || continue
	anime=$(basename "$(dirname "$temporada")")	temp_num=$(basename "$temporada" | grep -oE '^[0-9]+')
	for ep in "$temporada"/*.mp4; do
		[[ -f "$ep" ]] || continue
		nomeep=$(basename "$ep" .mp4)
		img="$IMG_BASE_URL/ANIMES/$anime/${temp_num} TEMPORADA/${nomeep}-poster.png"
		url="$VIDEO_BASE_URL/ANIMES/$anime/${temp_num} TEMPORADA/${nomeep}.mp4"
		echo "#EXTINF:-1 tvg-name=\"$nomeep\" tvg-logo=\"$img\" group-title=\"ANIMES\",$nomeep" >> "$M3U_FILE"
		echo "$url" >> "$M3U_FILE"
		insere_stream "$nomeep" "$url" 5 3 "$img"
	done
done

# Canais ao vivo (TV)
if [[ -s "$TV_FILE" ]]; then
	while IFS='=' read -r raw_nome raw_url; do
		[[ -n "$raw_nome" && -n "$raw_url" ]] || continue
		nome=${raw_nome%"}; nome=${nome#"}; url=${raw_url%"}; url=${url#"}
		logo="$IMG_BASE_URL/CANAIS/${nome}.png"
		echo "#EXTINF:-1 tvg-id=\"$nome\" tvg-name=\"$nome\" tvg-logo=\"$logo\" group-title=\"CANAIS\",$nome" >> "$M3U_FILE"
		echo "$url" >> "$M3U_FILE"
		insere_stream "$nome" "$url" 1 4 "$logo"
	done < "$TV_FILE"
fi

# EPG simples
{
	echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?><tv>"
	if [[ -s "$TV_FILE" ]]; then
		while IFS='=' read -r raw_nome _; do
			[[ -n "$raw_nome" ]] || continue
			nome=${raw_nome%"}; nome=${nome#"}
			echo "<channel id=\"$nome\"><display-name>$nome</display-name></channel>"
			echo "<programme start=\"20250101000000 +0000\" stop=\"20250101235959 +0000\" channel=\"$nome\"><title>$nome</title><desc>TV ao vivo - $nome</desc></programme>"
		done < "$TV_FILE"
	fi
	echo "</tv>"
} > "$EPG_FILE"

log "Playlist e EPG gerados em: $M3U_FILE, $EPG_FILE"
SYNC
	chmod +x "${PASTA_WEB}/iptv-sync.sh"

	# Cron (opcional)
	if $ENABLE_CRON; then
		log "Agendando cron para iptv-sync.sh (05:55 e 15:55)..."
		(crontab -l 2>/dev/null; echo "55 5,15 * * * /bin/bash ${PASTA_WEB}/iptv-sync.sh >> /var/log/iptv-sync.log 2>&1") | crontab -
	fi

	log "Instalação web concluída. Acesse: http://${DOMINIO_IPTV}"
fi

log "Processo concluído."