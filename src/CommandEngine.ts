import glob from 'glob';
import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import path from 'path';

import isCallbackQuery from './util/isCallbackQuery';

interface MessageIdentifier {
  messageId: number;
  chatId: number;
}

interface CommandSnapshot<TState> {
  currentStageIndex: number;
  commandDefinitionName: string;
  prevMessages: MessageIdentifier[];
  state: TState | undefined;
}

export default class CommandEngine<TState = undefined> {
  private readonly _bot: InstanceType<typeof TelegramBot>;
  private _commandDefinition: App.CommandDefinition<TState>;
  private _currentStageIndex;
  private _prevMessages: MessageIdentifier[] = [];
  private _state: TState;

  constructor(
    bot: TelegramBot,
    commandDefinition: App.CommandDefinition<TState>,
    currentStageIndex = 0,
    prevMessages: MessageIdentifier[] = [],
    state?: TState
  ) {
    this._bot = bot;
    this._commandDefinition = commandDefinition;
    this._currentStageIndex = currentStageIndex;
    this._prevMessages = prevMessages;
    this._state = state ?? this._commandDefinition.initialState;
  }

  get name() {
    return this._commandDefinition.name;
  }

  /**
   * Async function to handle an incoming message
   *
   * @returns whether the message was handled
   */
  async handle(msg: Message | CallbackQuery): Promise<boolean> {
    const currentStage =
      this._commandDefinition.stages[this._currentStageIndex];

    if (currentStage == null) {
      console.warn('invalid current state');
      return false;
    }

    let stageResponse: App.StageResponse<TState> | null = null;

    switch (currentStage.type) {
      case 'text': {
        if (isCallbackQuery(msg)) {
          console.warn('Current stage is text, but msg is not');
          return false;
        }

        const msgText = msg.text ?? '';

        switch (currentStage.trigger.type) {
          case 'command': {
            const text = msgText.slice(1).split('@')[0];
            if (this._commandDefinition.name === text) {
              stageResponse = await currentStage.handle(msg, this._state);
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

            stageResponse = await currentStage.handle(msg, this._state);
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
        stageResponse = await currentStage.handle(msg, this._state);
        this._currentStageIndex += 1;
        break;
      }
    }

    if (stageResponse == null) {
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

    for (const response of stageResponse.responses) {
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
        case 'file': {
          message = await this._bot.sendDocument(
            chatId,
            response.data,
            response.options,
            response.fileOptions
          );
          break;
        }
      }

      if (message != null) {
        this._prevMessages.push({
          messageId: message.message_id,
          chatId: message.chat.id,
        });
      }
    }

    if (stageResponse.nextState != null) {
      this._state = stageResponse.nextState;
    }

    return true;
  }

  /**
   * Whether all the stages of this command have been run through
   */
  get isEnded(): boolean {
    return this._currentStageIndex === this._commandDefinition.stages.length;
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

      try {
        await this._bot.deleteMessage(
          prevMessage.chatId,
          prevMessage.messageId.toString()
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  snapshot() {
    const record: CommandSnapshot<TState> = {
      currentStageIndex: this._currentStageIndex,
      commandDefinitionName: this._commandDefinition.name,
      prevMessages: this._prevMessages,
      state: this._state,
    };

    return record;
  }

  static restoreSnapshot<TState>(
    bot: InstanceType<typeof TelegramBot>,
    record: CommandSnapshot<TState>
  ) {
    const { commandDefinitionName, currentStageIndex, prevMessages, state } =
      record;

    const commandFiles = glob.sync(
      path.join(__dirname, './commands/**/*.+(js|ts)')
    );

    let commandDefinition: App.CommandDefinition<TState> | null = null;

    for (const commandFile of commandFiles) {
      const exp = require(path.resolve(commandFile));
      const imported = exp.default as App.CommandDefinition;

      if (imported.name === commandDefinitionName) {
        commandDefinition =
          imported as unknown as App.CommandDefinition<TState>;
        break;
      }
    }

    if (commandDefinition == null) {
      throw new Error(
        `could not find command definition for command '${commandDefinitionName}'`
      );
    }

    return new CommandEngine<TState>(
      bot,
      commandDefinition,
      currentStageIndex,
      prevMessages,
      state
    );
  }
}
