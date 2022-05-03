import TelegramBot, { Message } from 'node-telegram-bot-api';

export default class Command {
  private readonly _bot: InstanceType<typeof TelegramBot>;
  private _currentStageIndex = 0;

  get name(): string {
    throw new Error('not implemented');
  }

  get bot(): InstanceType<typeof TelegramBot> {
    return this._bot;
  }

  get stages(): App.CommandStage[] {
    throw new Error('not implemented');
  }

  constructor(bot: TelegramBot) {
    this._bot = bot;
  }

  async handle(msg: Message): Promise<boolean> {
    const currentStage = this.stages[this._currentStageIndex];

    if (currentStage == null) {
      console.warn('invalid current state');
      return false;
    }

    const msgText = msg.text ?? '';

    switch (currentStage.trigger.type) {
      case 'command': {
        if (currentStage.trigger.command === msgText.slice(1)) {
          await currentStage.handle.call(this, msg);
          return true;
        }

        break;
      }
      case 'text': {
        if (currentStage.trigger.matcher != null) {
          let isTextMatch = false;

          if (typeof currentStage.trigger.matcher === 'function') {
            isTextMatch = currentStage.trigger.matcher(msgText);
          } else {
            isTextMatch = currentStage.trigger.matcher.test(msgText);
          }

          if (!isTextMatch) {
            return false;
          }
        }

        await currentStage.handle.call(this, msg);
        return true;
      }
    }

    return false;
  }
}
