const { getQueue } = require('../musicPlayer');

module.exports = {
    name: 'resume',
    aliases: ['unpause'],
    description: 'Reanudar la canción pausada',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue) {
            return message.reply('No hay nada reproduciéndose.');
        }

        queue.player.unpause();
        message.reply('Música reanudada!');
    },
};
