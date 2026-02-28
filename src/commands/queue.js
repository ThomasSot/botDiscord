const { getQueue, formatDuration } = require('../musicPlayer');

module.exports = {
    name: 'queue',
    aliases: ['q'],
    description: 'Mostrar la cola de canciones',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue || queue.songs.length === 0) {
            return message.reply('No hay nada reproduciéndose.');
        }

        const current = queue.songs[0];
        const upcoming = queue.songs.slice(1, 11);

        let msg = `**Reproduciendo:** ${current.title} - \`${formatDuration(current.duration)}\`\n\n`;

        if (upcoming.length > 0) {
            msg += '**Siguiente:**\n';
            upcoming.forEach((song, i) => {
                msg += `${i + 1}. ${song.title} - \`${formatDuration(song.duration)}\`\n`;
            });
        }

        if (queue.songs.length > 11) {
            msg += `\n...y ${queue.songs.length - 11} canción(es) más`;
        }

        message.reply(msg);
    },
};
