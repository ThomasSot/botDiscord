const { getQueue } = require('../musicPlayer');

module.exports = {
    name: 'skip',
    aliases: ['s'],
    description: 'Saltar la canción actual',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue || !queue.playing) {
            return message.reply('No hay nada reproduciéndose.');
        }

        if (queue.songs.length <= 1) {
            return message.reply('No hay siguiente canción. Usa `!stop` para detener.');
        }

        queue.player.stop();
        message.reply('Canción saltada!');
    },
};
