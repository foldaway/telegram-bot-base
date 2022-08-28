declare namespace App {
  type TriggerCommand = {
    type: 'command';
  };

  type TriggerText = {
    type: 'text';
    matcher?: RegExp | ((str: string) => boolean);
  };

  interface ResponseMessage {
    type: 'text';
    text: string;
    options?: import('node-telegram-bot-api').SendMessageOptions;
  }

  interface ResponsePhoto {
    type: 'photo';
    data: string | import('stream').Stream | Buffer;
  }

  type Response = ResponseMessage | ResponsePhoto;

  interface StageTextHandler<TCommand> {
    type: 'text';
    trigger: TriggerCommand | TriggerText;
    /**
     * Handler function called when a text message is triggered
     */
    handle: (
      this: TCommand,
      msg: import('node-telegram-bot-api').Message
    ) => Promise<Response[] | null>;
  }

  interface StageCallbackQueryHandler<TCommand> {
    type: 'callback_query';
    /**
     * Handler function called when a callback query is triggered
     */
    handle: (
      this: TCommand,
      callbackQuery: import('node-telegram-bot-api').CallbackQuery
    ) => Promise<Response[] | null>;
  }

  type Stage<TCommand> =
    | StageTextHandler<TCommand>
    | StageCallbackQueryHandler<TCommand>;
}
