const { getQueue, createQueue, searchSong, playSong } = require('../musicPlayer');

module.exports = {
    name: 'play',
    aliases: ['p'],
    description: 'Reproducir una canción',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Necesitas estar en un canal de voz.');
        }

        const query = args.join(' ');
        if (!query) {
            return message.reply('Uso: `!play <canción o URL>`');
        }

        message.channel.send(`🔍 Buscando: **${query}**...`);

        try {
            const song = await searchSong(query);
            let queue = getQueue(message.guildId);

            if (!queue) {
                queue = createQueue(message.guildId, message.channel, voiceChannel);
                queue.songs.push(song);
                playSong(message.guildId);
            } else {
                queue.songs.push(song);
                message.channel.send(`Agregada **${song.title}** a la cola. Posición: ${queue.songs.length - 1}`);
            }
        } catch (error) {
            console.error(error);
            message.reply(`No se pudo reproducir: ${error.message}`);
        }
    },
};
