import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';

import isCallbackQuery from './util/isCallbackQuery';

export default class Command {
  private readonly _bot: InstanceType<typeof TelegramBot>;
  private _currentStageIndex = 0;

  get name(): string {
    throw new Error('not implemented');
  }

  /**
   * Get a reference to the telegram bot API
   */
  get bot(): InstanceType<typeof TelegramBot> {
    return this._bot;
  }

  /**
   * Definition of stages in this command
   */
  get stages(): App.CommandStage<this>[] {
    throw new Error('not implemented');
  }

  constructor(bot: TelegramBot) {
    this._bot = bot;
  }

  /**
   * Async function to handle an incoming message
   *
   * @returns whether the message was handled
   */
  async handle(msg: Message | CallbackQuery): Promise<boolean> {
    const currentStage = this.stages[this._currentStageIndex];

    if (currentStage == null) {
      console.warn('invalid current state');
      return false;
    }

    if (isCallbackQuery(msg)) {
      if (currentStage.type === 'callback_query') {
        await currentStage.handle.call(this, msg);
        this._currentStageIndex += 1;
        return true;
      }

      console.warn(
        'received callback query but current stage is not a callback query handler'
      );
      return false;
    }

    if (currentStage.type === 'callback_query') {
      console.warn(
        'received message but current stage is not a message handler'
      );
      return false;
    }

    const msgText = msg.text ?? '';

    switch (currentStage.trigger.type) {
      case 'command': {
        if (currentStage.trigger.command === msgText.slice(1)) {
          await currentStage.handle.call(this, msg);
          this._currentStageIndex += 1;
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
        this._currentStageIndex += 1;
        return true;
      }
    }

    return false;
  }

  /**
   * Whether all the stages of this command have been run through
   */
  get isEnded(): boolean {
    return this._currentStageIndex === this.stages.length;
  }
}
