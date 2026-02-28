const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { spawn } = require('child_process');

// Cola de música por servidor
const queues = new Map();

function getQueue(guildId) {
    return queues.get(guildId);
}

function createQueue(guildId, textChannel, voiceChannel) {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    const queue = {
        textChannel,
        voiceChannel,
        connection,
        player,
        songs: [],
        playing: false,
        currentTime: 0,
        _interval: null,
    };

    // Cuando termina una canción, reproducir la siguiente
    player.on(AudioPlayerStatus.Idle, () => {
        clearInterval(queue._interval);
        killProcesses(queue);
        queue.currentTime = 0;
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guildId);
        } else {
            queue.playing = false;
            queue.textChannel.send('Cola terminada. No hay más canciones.');
            queue.connection.destroy();
            queues.delete(guildId);
        }
    });

    player.on('error', (error) => {
        console.error('Error del player:', error.message);
        killProcesses(queue);
        queue.textChannel.send(`Error reproduciendo: ${error.message}`);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guildId);
        } else {
            queue.playing = false;
            queue.connection.destroy();
            queues.delete(guildId);
        }
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        clearInterval(queue._interval);
        killProcesses(queue);
        queues.delete(guildId);
    });

    queues.set(guildId, queue);
    return queue;
}

// Si es URL de Spotify, obtener nombre de la canción via oEmbed
async function resolveSpotify(url) {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) throw new Error('No se pudo obtener info de Spotify.');
    const data = await res.json();
    // data.title viene como "Nombre - Artista"
    return data.title;
}

async function searchSong(query) {
    // Si es un link de Spotify, extraer el nombre y buscar en YouTube
    if (query.includes('spotify.com')) {
        const songName = await resolveSpotify(query);
        query = songName;
    }

    const searchQuery = query.startsWith('http') ? query : `ytsearch:${query}`;

    return new Promise((resolve, reject) => {
        const proc = spawn('yt-dlp', [
            '--dump-single-json',
            '--no-warnings',
            '--flat-playlist',
            '--skip-download',
            '-f', 'bestaudio/best',
            searchQuery,
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk; });
        proc.stderr.on('data', (chunk) => { stderr += chunk; });

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(stderr || 'yt-dlp falló'));
            }
            try {
                const data = JSON.parse(stdout);
                // Si es búsqueda, tomar primer resultado
                if (data.entries) {
                    const entry = data.entries[0];
                    if (!entry) return reject(new Error('No se encontraron resultados.'));
                    resolve({
                        title: entry.title,
                        url: entry.url || entry.webpage_url || `https://youtube.com/watch?v=${entry.id}`,
                        duration: entry.duration || 0,
                        thumbnail: entry.thumbnail || '',
                    });
                } else {
                    resolve({
                        title: data.title || 'Sin título',
                        url: data.webpage_url || data.original_url || data.url,
                        duration: data.duration || 0,
                        thumbnail: data.thumbnail || '',
                    });
                }
            } catch (e) {
                reject(new Error('No se pudo parsear la respuesta.'));
            }
        });
    });
}

function killProcesses(queue) {
    if (queue._ytdlp) {
        queue._ytdlp.kill('SIGKILL');
        queue._ytdlp = null;
    }
    if (queue._ffmpeg) {
        queue._ffmpeg.kill('SIGKILL');
        queue._ffmpeg = null;
    }
}

function playSong(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.songs.length === 0) return;

    // Matar procesos anteriores si existen
    killProcesses(queue);

    const song = queue.songs[0];
    queue.playing = true;
    queue.currentTime = 0;

    // Usar yt-dlp para obtener el audio y pipe directo a FFmpeg
    const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio/best',
        '-o', '-',
        '--no-warnings',
        song.url,
    ]);

    const ffmpeg = spawn(require('ffmpeg-static'), [
        '-i', 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-f', 'opus',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ]);

    // Guardar referencia para poder matarlos al hacer skip/stop
    queue._ytdlp = ytdlp;
    queue._ffmpeg = ffmpeg;

    ytdlp.stdout.pipe(ffmpeg.stdin).on('error', () => {});
    ytdlp.stderr.on('data', () => {});
    ytdlp.on('error', () => {});
    ffmpeg.stdin.on('error', () => {});
    ffmpeg.on('error', () => {});

    const resource = createAudioResource(ffmpeg.stdout);
    queue.player.play(resource);

    // Contador de tiempo
    queue._interval = setInterval(() => {
        queue.currentTime++;
    }, 1000);

    queue.textChannel.send(`🎵 Reproduciendo: **${song.title}** - \`${formatDuration(song.duration)}\``);
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '??:??';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = { getQueue, createQueue, searchSong, playSong, formatDuration, killProcesses, queues };
