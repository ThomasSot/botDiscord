const { getQueue } = require('../musicPlayer');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    name: 'pause',
    description: 'Pausar la canción actual',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue || !queue.playing) {
            return message.reply('No hay nada reproduciéndose.');
        }

        queue.player.pause();
        message.reply('Música pausada. Usa `!resume` para continuar.');
    },
};
