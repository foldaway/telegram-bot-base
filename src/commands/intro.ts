import Command from '../Command';

export default class IntroCommand extends Command {
  private _name: string | null = null;
  private _age: number | null = null;

  get name(): string {
    return 'intro';
  }

  get stages(): App.CommandStage<this>[] {
    return [
      {
        type: 'text',
        trigger: {
          type: 'command',
          command: 'intro',
        },
        async handle(msg) {
          await this.bot.sendMessage(msg.chat.id, 'What is your name?');
        },
      },
      {
        type: 'text',
        trigger: {
          type: 'text',
        },
        async handle(msg) {
          this._name = msg.text ?? '';

          await this.bot.sendMessage(msg.chat.id, 'I see, what is your age?');
        },
      },
      {
        type: 'text',
        trigger: {
          type: 'text',
          matcher: /\d+/,
        },
        async handle(msg) {
          this._age = parseInt(msg.text ?? '0');

          await this.bot.sendMessage(
            msg.chat.id,
            `Hi ${this._name} of age ${this._age}!`
          );
        },
      },
    ];
  }
}
