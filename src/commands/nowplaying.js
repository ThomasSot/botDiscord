const { getQueue, formatDuration } = require('../musicPlayer');

module.exports = {
    name: 'nowplaying',
    aliases: ['np'],
    description: 'Mostrar info de la canción actual',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue || queue.songs.length === 0) {
            return message.reply('No hay nada reproduciéndose.');
        }

        const song = queue.songs[0];
        const current = queue.currentTime;
        const total = song.duration;
        const barLength = 20;
        const filled = total > 0 ? Math.round((current / total) * barLength) : 0;
        const bar = '▓'.repeat(Math.min(filled, barLength)) + '░'.repeat(barLength - Math.min(filled, barLength));

        const msg = [
            `**Reproduciendo:**`,
            `**${song.title}**`,
            `${song.url}`,
            ``,
            `\`${formatDuration(current)}\` ${bar} \`${formatDuration(total)}\``,
        ].join('\n');

        message.reply(msg);
    },
};
