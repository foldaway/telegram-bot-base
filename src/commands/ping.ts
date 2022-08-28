import Command from '../Command';

export default class PingCommand extends Command {
  get name(): string {
    return 'ping';
  }

  get stages(): App.Stage<this>[] {
    return [
      {
        type: 'text',
        trigger: {
          type: 'command',
        },
        async handle() {
          return [
            {
              type: 'text',
              text: 'pong',
            },
          ];
        },
      },
    ];
  }
}
