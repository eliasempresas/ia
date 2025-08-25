#!/usr/bin/env bash

# iptv.sh - Unified IPTV script (no options)
# - Installs deps (tcpdump, tshark, curl, wget, ffmpeg, nginx, php, mysql)
# - Captures lazerplay.io traffic to extract M3U URL
# - Downloads playlist and splits into tv/filmes/series/animes
# - Optionally downloads media via ffmpeg copy (enabled)
# - Generates unified playlist and simple EPG
# - Sets up Nginx/PHP site with simple frontend and analytics
# - Creates iptv-sync.sh and cron schedule

set -euo pipefail

# Config
DOMAIN_IPTV="iptv.eliasempresas.com"
BASE_DIR="/var/www/${DOMAIN_IPTV}"
IPTV_DIR="${BASE_DIR}/lazerplay"
WORK_DIR="${BASE_DIR}/pasta"
ARQ_DIR="/var/www/arquivos.eliasempresas.com/ARQUIVOS"
PCAP_FILE="/tmp/lazerplay.pcap"
LOG_FILE="/var/log/iptv.log"
USER_AGENT="EliasEmpresas/1.1"
TIMEOUT_CAPTURE=30
DO_CAPTURE=true
DOWNLOAD_MEDIA=true
ENABLE_CRON=true
INSTALL_ALL=true

# DB
DB_NAME="iptv_db"
DB_USER="iptv_user"
DB_PASS="elias1@#$2Telefone"

log() { echo "$(date '+%F %T') [INFO] $*" | tee -a "$LOG_FILE"; }
warn() { echo "$(date '+%F %T') [WARN] $*" | tee -a "$LOG_FILE" >&2; }
err() { echo "$(date '+%F %T') [ERRO] $*" | tee -a "$LOG_FILE" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || err "Missing dependency: $1"; }

autointerface() {
	local iface
	iface=$(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | grep -Ev '^lo$' | head -n1 || true)
	[[ -n "${iface:-}" ]] || iface="wlan0"
	printf '%s' "$iface"
}

if [[ $EUID -ne 0 ]]; then err "Run as root"; fi

mkdir -p "$IPTV_DIR" "$WORK_DIR" \
	"$ARQ_DIR/IMAGENS/FILMES" "$ARQ_DIR/IMAGENS/SERIES" "$ARQ_DIR/IMAGENS/ANIMES" \
	"$ARQ_DIR/VIDEOS/FILMES" "$ARQ_DIR/VIDEOS/SERIES" "$ARQ_DIR/VIDEOS/ANIMES" \
	"$(dirname "$LOG_FILE")"

if $INSTALL_ALL; then
	log "Installing base dependencies..."
	apt update -y
	DEBIAN_FRONTEND=noninteractive apt install -y tcpdump tshark curl wget ffmpeg nginx mysql-server php php-fpm php-cli php-mysql php-curl php-mbstring php-xml php-zip unzip git
fi

# Capture and extract M3U
M3U_URL=""
if $DO_CAPTURE; then
	IFACE=$(autointerface)
	log "Using interface: $IFACE"
	need tcpdump; need tshark
	set +e
	timeout "$TIMEOUT_CAPTURE" tcpdump -i "$IFACE" host lazerplay.io -w "$PCAP_FILE" >/dev/null 2>&1
	set -e
	log "Extracting M3U URL from capture..."
	M3U_URL=$(tshark -r "$PCAP_FILE" -Y 'http.request && http.request.method == "GET"' -T fields -e http.request.full_uri 2>/dev/null | grep -Eo 'https?://[^ ]+\.m3u8?([?][^ ]*)?' | head -n1 || true)
	if [[ -z "$M3U_URL" ]]; then
		M3U_URL=$(tshark -r "$PCAP_FILE" -Y 'http.request && http.request.method == "GET"' -T fields -e http.host -e http.request.uri -E separator=/ 2>/dev/null | sed 's#^#http://#' | grep -Eo 'https?://[^ ]+\.m3u8?([?][^ ]*)?' | head -n1 || true)
	fi
fi

if [[ -n "$M3U_URL" ]]; then
	log "M3U URL: $M3U_URL"
	curl -fLs -A "$USER_AGENT" "$M3U_URL" -o "$IPTV_DIR/playlist.m3u"
	cp -f "$IPTV_DIR/playlist.m3u" "$IPTV_DIR/playlist_lazerplay.m3u"
elif [[ -s "$IPTV_DIR/playlist.m3u" ]]; then
	warn "No M3U captured; using existing $IPTV_DIR/playlist.m3u"
else
	err "No M3U available"
fi

SRC_M3U="$IPTV_DIR/playlist.m3u"
[[ -s "$SRC_M3U" ]] || err "Empty M3U"

TV_TXT="$IPTV_DIR/tv.txt"
FILMES_TXT="$IPTV_DIR/filmes.txt"
SERIES_TXT="$IPTV_DIR/series.txt"
ANIMES_TXT="$IPTV_DIR/animes.txt"
: > "$TV_TXT"; : > "$FILMES_TXT"; : > "$SERIES_TXT"; : > "$ANIMES_TXT"

log "Parsing M3U and splitting..."
# Also write TSV with columns: name\turl\tlogo
FILMES_TSV="$IPTV_DIR/filmes.tsv"
SERIES_TSV="$IPTV_DIR/series.tsv"
ANIMES_TSV="$IPTV_DIR/animes.tsv"
: > "$FILMES_TSV"; : > "$SERIES_TSV"; : > "$ANIMES_TSV"
awk -v tv_out="$TV_TXT" -v filmes_out="$FILMES_TXT" -v series_out="$SERIES_TXT" -v animes_out="$ANIMES_TXT" -v filmes_tsv="$FILMES_TSV" -v series_tsv="$SERIES_TSV" -v animes_tsv="$ANIMES_TSV" '
	BEGIN { FS="\n"; RS="\r?\n" }
	{
		line=$0
		if (line ~ /^#EXTINF/) {
			meta=line
			name=line
			g=""; logo=""
			if (match(meta, /group-title="([^"]+)"/, m)) { g=m[1] }
			if (match(meta, /tvg-logo="([^"]+)"/, l)) { logo=l[1] }
			if (match(name, /,([^,]+)$/, n)) { name=n[1] } else { name="" }
			getline url
			if (url ~ /^https?:\/\//) {
				printf("\"%s\"=\"%s\"\n", name, url) >> tv_out
				lg=tolower(g)
				if (lg ~ /filmes/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> filmes_out
					printf("%s\t%s\t%s\n", name, url, logo) >> filmes_tsv
				} else if (lg ~ /s[ee]ries|series/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> series_out
					printf("%s\t%s\t%s\n", name, url, logo) >> series_tsv
				} else if (lg ~ /animes/) {
					printf("\"%s\"=\"%s\"\n", name, url) >> animes_out
					printf("%s\t%s\t%s\n", name, url, logo) >> animes_tsv
				}
			}
		}
	}
' "$SRC_M3U"

log "Created: $TV_TXT $FILMES_TXT $SERIES_TXT $ANIMES_TXT and TSVs"

if $DOWNLOAD_MEDIA; then
	need ffmpeg
	log "Downloading VOD (FILMES, ANIMES); organizing SERIES by season/episode"
	baixar_vod() {
		local tipo="$1"; local arquivo="$2"; local tsv="$3"
		local linha nome url logo base_img_dir base_vid_dir
		base_img_dir="${ARQ_DIR}/IMAGENS/${tipo}"
		base_vid_dir="${ARQ_DIR}/VIDEOS/${tipo}"
		mkdir -p "$base_img_dir" "$base_vid_dir"
		while IFS=$'\t' read -r nome url logo; do
			[[ -n "${nome:-}" && -n "${url:-}" ]] || continue
			# Pastas e destinos
			mkdir -p "${base_img_dir}/${nome}"
			if [[ "$tipo" == "FILMES" ]]; then
				mkdir -p "${base_vid_dir}"
				vid_dest="${base_vid_dir}/${nome}.mp4"
				img_dest1="${base_img_dir}/${nome}/${nome}.png"
				img_dest2="${base_img_dir}/${nome}/${nome}-poster.png"
			else
				# Para ANIMES aqui baixamos somente o VOD unitário em nome/nome.mp4 (sem temporada)
				mkdir -p "${base_vid_dir}/${nome}"
				vid_dest="${base_vid_dir}/${nome}/${nome}.mp4"
				img_dest1="${base_img_dir}/${nome}/${nome}.png"
				img_dest2="${base_img_dir}/${nome}/${nome}-poster.png"
			fi
			# Download de vídeo
			ffmpeg -loglevel error -y -i "$url" -c copy "$vid_dest" || warn "Failed: $nome"
			# Imagens a partir do tvg-logo (se fornecido)
			if [[ -n "${logo:-}" ]]; then
				curl -fsSL "$logo" -o "$img_dest1" || true
				cp -f "$img_dest1" "$img_dest2" 2>/dev/null || true
			fi
		done < "$tsv"
	}
	baixar_vod "FILMES" "$FILMES_TXT" "$FILMES_TSV"
	baixar_vod "ANIMES" "$ANIMES_TXT" "$ANIMES_TSV"

	# Séries: vídeo por temporada/episódio e imagens em estrutura exigida
	while IFS=$'\t' read -r nome url logo; do
		[[ -n "${nome:-}" && -n "${url:-}" ]] || continue
		SEASON="1"; EPISODE="1"
		if [[ "$nome" =~ [sS]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		elif [[ "$nome" =~ ([0-9]{1,2})x([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		elif [[ "$nome" =~ [tT]([0-9]{1,2})[eE]([0-9]{1,2}) ]]; then
			SEASON="${BASH_REMATCH[1]}"; EPISODE="${BASH_REMATCH[2]}"
		fi
		SERIE=$(echo "$nome" | sed -E 's/[sS][0-9]+[eE][0-9]+.*//;s/[tT][0-9]+[eE][0-9]+.*//;s/[0-9]+x[0-9]+.*//' | sed 's/[[:space:]]\+$//')
		[[ -z "$SERIE" ]] && SERIE="$nome"
		TEMP_DIR_NUM="${SEASON} TEMPORADA"
		VID_DIR="${ARQ_DIR}/VIDEOS/SERIES/${SERIE}/${TEMP_DIR_NUM}"
		IMG_DIR="${ARQ_DIR}/IMAGENS/SERIES/${SERIE}/${TEMP_DIR_NUM}"
		mkdir -p "$VID_DIR" "$IMG_DIR"
		EP_BASENAME="${SERIE}-T${SEASON}-E${EPISODE}"
		ffmpeg -loglevel error -y -i "$url" -c copy "${VID_DIR}/${EP_BASENAME}.mp4" || warn "Failed series: $nome"
		if [[ -n "${logo:-}" ]]; then
			curl -fsSL "$logo" -o "${IMG_DIR}/${EP_BASENAME}.png" || true
			cp -f "${IMG_DIR}/${EP_BASENAME}.png" "${IMG_DIR}/${EP_BASENAME}-poster.png" 2>/dev/null || true
		fi
	done < "$SERIES_TSV"

	# Cópias de temporada (T## e T##-poster) se existir ao menos um episódio
	while IFS= read -r -d '' tdir; do
		serie=$(basename "$(dirname "$tdir")")
		tnum=$(basename "$tdir" | grep -oE '^[0-9]+')
		imgd="${ARQ_DIR}/IMAGENS/SERIES/${serie}/${tnum} TEMPORADA"
		first_ep_img=$(find "$imgd" -maxdepth 1 -type f -name "${serie}-T${tnum}-E*.png" | head -n1)
		if [[ -n "$first_ep_img" ]]; then
			cp -f "$first_ep_img" "${imgd}/${serie}-T${tnum}.png" 2>/dev/null || true
			cp -f "${imgd}/${serie}-T${tnum}.png" "${imgd}/${serie}-T${tnum}-poster.png" 2>/dev/null || true
		fi
	done < <(find "${ARQ_DIR}/VIDEOS/SERIES" -type d -name '* TEMPORADA' -print0)

	# Estruturas para ANIMES por temporada/episódio (se houver)
	while IFS= read -r -d '' tdir; do
		anime=$(basename "$(dirname "$tdir")")
		tnum=$(basename "$tdir" | grep -oE '^[0-9]+')
		imgd="${ARQ_DIR}/IMAGENS/ANIMES/${anime}/${tnum} TEMPORADA"
		first_ep_img=$(find "$imgd" -maxdepth 1 -type f -name "${anime}-T${tnum}-E*.png" | head -n1)
		if [[ -n "$first_ep_img" ]]; then
			cp -f "$first_ep_img" "${imgd}/${anime}-T${tnum}.png" 2>/dev/null || true
			cp -f "${imgd}/${anime}-T${tnum}.png" "${imgd}/${anime}-T${tnum}-poster.png" 2>/dev/null || true
		fi
	done < <(find "${ARQ_DIR}/VIDEOS/ANIMES" -type d -name '* TEMPORADA' -print0)
fi

log "Unifying output files..."
concatenate() {
	local out="$1"; shift
	: > "$out"
	for f in "$@"; do
		if [[ -f "$f" ]] && [[ "$f" != "$out" ]]; then
			cat "$f" >> "$out"
			echo "" >> "$out"
		fi
	done
}
mkdir -p "$WORK_DIR"
concatenate "$BASE_DIR/playlist.m3u" "$IPTV_DIR/playlist.m3u" "$WORK_DIR/playlist.m3u"
concatenate "$BASE_DIR/epg.xml" "$IPTV_DIR/epg.xml" "$WORK_DIR/epg.xml"
concatenate "$BASE_DIR/series.txt" "$IPTV_DIR/series.txt" "$WORK_DIR/series.txt"
concatenate "$BASE_DIR/filmes.txt" "$IPTV_DIR/filmes.txt" "$WORK_DIR/filmes.txt"
concatenate "$BASE_DIR/animes.txt" "$IPTV_DIR/animes.txt" "$WORK_DIR/animes.txt"

log "Setting up Nginx/PHP site..."
mkdir -p "$BASE_DIR/analytics"
chown -R www-data:www-data "$BASE_DIR"
PHP_FPM_SOCK=$(ls /var/run/php/php*-fpm.sock 2>/dev/null | head -n1 || true)
[[ -z "${PHP_FPM_SOCK}" ]] && PHP_FPM_SOCK="/var/run/php/php-fpm.sock"
cat > "/etc/nginx/sites-available/${DOMAIN_IPTV}" <<NGINX
server {
	listen 80;
	server_name ${DOMAIN_IPTV};
	root ${BASE_DIR};
	index index.php index.html index.htm;
	location / { try_files \$uri \$uri/ /index.php?\$args; }
	location ~ \.php$ {
		include snippets/fastcgi-php.conf;
		fastcgi_pass unix:${PHP_FPM_SOCK};
	}
	location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ { expires max; log_not_found off; }
}
NGINX
ln -sf "/etc/nginx/sites-available/${DOMAIN_IPTV}" "/etc/nginx/sites-enabled/${DOMAIN_IPTV}"
nginx -t && systemctl reload nginx || warn "Nginx reload failed"

cat > "${BASE_DIR}/index.html" <<'HTML'
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
		if (Hls.isSupported()) { const hls = new Hls(); hls.loadSource(src); hls.attachMedia(video); }
		else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src; }
		else { document.body.insertAdjacentHTML('beforeend','<p>Navegador sem suporte HLS</p>'); }
		fetch('/analytics/log.php?stream=' + encodeURIComponent(src)).catch(()=>{});
	</script>
</body>
</html>
HTML

cat > "${BASE_DIR}/analytics/log.php" <<'PHP'
<?php
$stream = isset($_GET["stream"]) ? $_GET["stream"] : "";
$ip = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "";
$log = date("Y-m-d H:i:s") . " - " . $ip . " - " . $stream . "\n";
file_put_contents(__DIR__ . "/acessos.log", $log, FILE_APPEND);
header("Content-Type: image/gif"); echo "";
PHP

cat > "${BASE_DIR}/analytics/dashboard.php" <<'PHP'
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

log "Configuring MySQL..."
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
mysql -u"${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" -e "CREATE TABLE IF NOT EXISTS streams (id INT AUTO_INCREMENT PRIMARY KEY, stream_display_name VARCHAR(255) UNIQUE, stream_source TEXT, stream_type INT, category_id INT, tv_archive BOOLEAN, direct_source TEXT, stream_icon TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"

mkdir -p "${WORK_DIR}"
cat > "${WORK_DIR}/iptv-sync.sh" <<'SYNC'
#!/usr/bin/env bash
set -euo pipefail
M3U_FILE="__WORK__/playlist.m3u"
EPG_FILE="__WORK__/epg.xml"
TV_FILE="__IPTV__/tv.txt"
DIR_FILMES="__ARQ__/VIDEOS/FILMES"
DIR_SERIES="__ARQ__/VIDEOS/SERIES"
DIR_ANIMES="__ARQ__/VIDEOS/ANIMES"
IMG_BASE_URL="https://arquivos.eliasempresas.com/ARQUIVOS/IMAGENS"
VIDEO_BASE_URL="https://arquivos.eliasempresas.com/ARQUIVOS/VIDEOS"
DB_USER="__DBU__"
DB_PASS="__DBP__"
DB_NAME="__DBN__"
log(){ echo "[sync] $*"; }
insere(){ local n="$1" u="$2" t="$3" c="$4" i="$5"; mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "INSERT INTO streams (stream_display_name, stream_source, stream_type, category_id, tv_archive, direct_source, stream_icon) VALUES ('${n}','${u}',${t},${c},0,'${u}','${i}') ON DUPLICATE KEY UPDATE stream_source=VALUES(stream_source), stream_icon=VALUES(stream_icon);"; }
: > "$M3U_FILE"; echo "#EXTM3U" >> "$M3U_FILE"
# Filmes: path sem subpasta; imagens padrao e poster
for f in "$DIR_FILMES"/*.mp4; do [ -f "$f" ] || continue; n=$(basename "$f" .mp4); img="$IMG_BASE_URL/FILMES/$n/$n.png"; url="$VIDEO_BASE_URL/FILMES/${n}.mp4"; echo "#EXTINF:-1 tvg-name=\"$n\" tvg-logo=\"$img\" group-title=\"FILMES\",$n" >> "$M3U_FILE"; echo "$url" >> "$M3U_FILE"; insere "$n" "$url" 5 1 "$img"; done
# Séries
shopt -s nullglob
for tdir in "$DIR_SERIES"/*/*\ TEMPORADA; do [ -d "$tdir" ] || continue; serie=$(basename "$(dirname "$tdir")"); tnum=$(basename "$tdir" | grep -oE '^[0-9]+'); for ep in "$tdir"/*.mp4; do [ -f "$ep" ] || continue; ne=$(basename "$ep" .mp4); img="$IMG_BASE_URL/SERIES/$serie/${tnum} TEMPORADA/${ne}-poster.png"; url="$VIDEO_BASE_URL/SERIES/$serie/${tnum} TEMPORADA/${ne}.mp4"; echo "#EXTINF:-1 tvg-name=\"$ne\" tvg-logo=\"$img\" group-title=\"SERIES\",$ne" >> "$M3U_FILE"; echo "$url" >> "$M3U_FILE"; insere "$ne" "$url" 5 2 "$img"; done; done
# Animes
for tdir in "$DIR_ANIMES"/*/*\ TEMPORADA; do [ -d "$tdir" ] || continue; anime=$(basename "$(dirname "$tdir")"); tnum=$(basename "$tdir" | grep -oE '^[0-9]+'); for ep in "$tdir"/*.mp4; do [ -f "$ep" ] || continue; ne=$(basename "$ep" .mp4); img="$IMG_BASE_URL/ANIMES/$anime/${tnum} TEMPORADA/${ne}-poster.png"; url="$VIDEO_BASE_URL/ANIMES/$anime/${tnum} TEMPORADA/${ne}.mp4"; echo "#EXTINF:-1 tvg-name=\"$ne\" tvg-logo=\"$img\" group-title=\"ANIMES\",$ne" >> "$M3U_FILE"; echo "$url" >> "$M3U_FILE"; insere "$ne" "$url" 5 3 "$img"; done; done
# Canais ao vivo
if [[ -s "$TV_FILE" ]]; then while IFS='=' read -r rn ru; do [ -n "$rn" ] || continue; n=${rn%"}; n=${n#"}; u=${ru%"}; u=${u#"}; logo="$IMG_BASE_URL/CANAIS/${n}.png"; echo "#EXTINF:-1 tvg-id=\"$n\" tvg-name=\"$n\" tvg-logo=\"$logo\" group-title=\"CANAIS\",$n" >> "$M3U_FILE"; echo "$u" >> "$M3U_FILE"; insere "$n" "$u" 1 4 "$logo"; done < "$TV_FILE"; fi
# EPG
{
	echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?><tv>"
	if [[ -s "$TV_FILE" ]]; then while IFS='=' read -r rn _; do [ -n "$rn" ] || continue; n=${rn%"}; n=${n#"}; echo "<channel id=\"$n\"><display-name>$n</display-name></channel>"; echo "<programme start=\"20250101000000 +0000\" stop=\"20250101235959 +0000\" channel=\"$n\"><title>$n</title><desc>TV ao vivo - $n</desc></programme>"; done < "$TV_FILE"; fi
	echo "</tv>"
} > "$EPG_FILE"
SYNC
# Replace placeholders in sync script
sed -i "s#__WORK__#${WORK_DIR}#g; s#__IPTV__#${IPTV_DIR}#g; s#__ARQ__#${ARQ_DIR}#g; s#__DBU__#${DB_USER}#g; s#__DBP__#${DB_PASS}#g; s#__DBN__#${DB_NAME}#g" "${WORK_DIR}/iptv-sync.sh"
chmod +x "${WORK_DIR}/iptv-sync.sh"

if $ENABLE_CRON; then
	log "Scheduling cron for iptv-sync.sh (05:55 and 15:55)"
	(crontab -l 2>/dev/null; echo "55 5,15 * * * /bin/bash ${WORK_DIR}/iptv-sync.sh >> /var/log/iptv-sync.log 2>&1") | crontab -
fi

log "Done. Access: http://${DOMAIN_IPTV}"