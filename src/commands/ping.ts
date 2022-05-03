import Command from '../Command';

export default class PingCommand extends Command {
  get name(): string {
    return 'ping';
  }

  get stages(): App.CommandStage<this>[] {
    return [
      {
        type: 'text',
        trigger: {
          type: 'command',
          command: 'ping',
        },
        async handle(msg) {
          await this.bot.sendMessage(msg.chat.id, 'pong');
        },
      },
    ];
  }
}
