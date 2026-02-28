const { getQueue, queues } = require('../musicPlayer');

module.exports = {
    name: 'stop',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Detener la música y salir del canal',
    async execute(message) {
        const queue = getQueue(message.guildId);
        if (!queue) {
            return message.reply('No hay nada reproduciéndose.');
        }

        queue.songs = [];
        clearInterval(queue._interval);
        queue.player.stop();
        queue.connection.destroy();
        queues.delete(message.guildId);
        message.reply('Música detenida y cola limpiada.');
    },
};
