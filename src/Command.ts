import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';

import isCallbackQuery from './util/isCallbackQuery';

export default class Command {
  private readonly _bot: InstanceType<typeof TelegramBot>;
  private _currentStageIndex = 0;
  private _prevMessages: Message[] = [];

  constructor(bot: TelegramBot) {
    this._bot = bot;
  }

  /**
   * Name of this command.
   *
   * This is also used as the trigger string. (e.g. for /menu this would be 'menu')
   */
  get name(): string {
    throw new Error('not implemented');
  }

  get stages(): App.Stage<this>[] {
    throw new Error('not implemented');
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

    let responses: App.Response[] | null = null;

    switch (currentStage.type) {
      case 'text': {
        if (isCallbackQuery(msg)) {
          console.warn('Current stage is text, but msg is not');
          return false;
        }

        const msgText = msg.text ?? '';

        switch (currentStage.trigger.type) {
          case 'command': {
            if (this.name === msgText.slice(1)) {
              responses = await currentStage.handle.call(this, msg);
              this._currentStageIndex += 1;
              break;
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

            responses = await currentStage.handle.call(this, msg);
            this._currentStageIndex += 1;
            break;
          }
        }
        break;
      }
      case 'callback_query': {
        if (!isCallbackQuery(msg)) {
          console.warn('Current stage is callback_query, but msg is not');
          return false;
        }
        responses = await currentStage.handle.call(this, msg);
        this._currentStageIndex += 1;
        break;
      }
    }

    if (responses == null) {
      return false;
    }

    await this.cleanup();

    let chatId;

    if (isCallbackQuery(msg)) {
      if (msg.message == null) {
        throw new Error('msg.message null');
      }

      chatId = msg.message.chat.id;
    } else {
      chatId = msg.chat.id;
    }

    for (const response of responses) {
      let message: Message | null = null;

      switch (response.type) {
        case 'text': {
          message = await this._bot.sendMessage(
            chatId,
            response.text,
            response.options
          );

          break;
        }
        case 'photo': {
          message = await this._bot.sendPhoto(chatId, response.data);
          break;
        }
      }

      if (message != null) {
        this._prevMessages.push(message);
      }
    }

    return true;
  }

  /**
   * Whether all the stages of this command have been run through
   */
  get isEnded(): boolean {
    return this._currentStageIndex === this.stages.length;
  }

  /**
   * Delete all previous messages
   */
  async cleanup(): Promise<void> {
    while (this._prevMessages.length > 0) {
      const prevMessage = this._prevMessages.shift();

      // For typing purposes
      if (prevMessage == null) {
        break;
      }

      await this._bot.deleteMessage(
        prevMessage.chat.id,
        prevMessage.message_id.toString()
      );
    }
  }
}
