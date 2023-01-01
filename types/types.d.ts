declare namespace App {
  type TriggerCommand = {
    type: 'command';
  };

  type TriggerText = {
    type: 'text';
    matcher?: RegExp | ((str: string) => boolean);
  };

  interface ChatResponseMessage {
    type: 'text';
    text: string;
    options?: import('node-telegram-bot-api').SendMessageOptions;
  }

  interface ChatResponsePhoto {
    type: 'photo';
    data: string | import('stream').Stream | Buffer;
  }

  interface ChatResponseFile {
    type: 'file';
    data: string | import('stream').Stream | Buffer;
    options?: import('node-telegram-bot-api').SendDocumentOptions;
    fileOptions?: import('node-telegram-bot-api').FileOptions;
  }

  type ChatResponse =
    | ChatResponseMessage
    | ChatResponsePhoto
    | ChatResponseFile;

  interface StageResponse<TState> {
    responses: ChatResponse[];
    nextState?: TState;
  }

  interface StageTextHandler<TState> {
    type: 'text';
    trigger: TriggerCommand | TriggerText;
    /**
     * Handler function called when a text message is triggered
     */
    handle: (
      msg: import('node-telegram-bot-api').Message,
      prevState: TState
    ) => Promise<StageResponse<TState> | null>;
  }

  interface StageCallbackQueryHandler<TState> {
    type: 'callback_query';
    /**
     * Handler function called when a callback query is triggered
     */
    handle: (
      callbackQuery: import('node-telegram-bot-api').CallbackQuery,
      prevState: TState
    ) => Promise<StageResponse<TState> | null>;
  }

  type Stage<TState> =
    | StageTextHandler<TState>
    | StageCallbackQueryHandler<TState>;

  interface CommandDefinition<TState = undefined> {
    /**
     * Name of this command.
     *
     * This is also used as the trigger string. (e.g. for /menu this would be 'menu')
     */
    name: string;
    initialState: TState;
    stages: Stage<TState>[];
  }
}
