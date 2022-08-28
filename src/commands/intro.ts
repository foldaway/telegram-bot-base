import Command from '../Command';

export default class IntroCommand extends Command {
  private _name: string | null = null;
  private _age: number | null = null;

  get name(): string {
    return 'intro';
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
              text: 'What is your name?',
            },
          ];
        },
      },
      {
        type: 'text',
        trigger: {
          type: 'text',
        },
        async handle(msg) {
          this._name = msg.text ?? '';

          return [
            {
              type: 'text',
              text: 'I see, what is your age?',
              options: {
                reply_markup: {
                  force_reply: true,
                },
                reply_to_message_id: msg.message_id,
              },
            },
          ];
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

          return [
            {
              type: 'text',
              text: `Hi ${this._name} of age ${this._age}!`,
            },
          ];
        },
      },
    ];
  }
}
