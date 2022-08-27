declare namespace App {
  type TriggerCommand = {
    type: 'command';
    /**
     * Command string (e.g. for /menu, this would be 'menu')
     */
    command: string;
  };

  type TriggerText = {
    type: 'text';
    matcher?: RegExp | ((str: string) => boolean);
  };

  interface StageTextHandler<TCommand> {
    type: 'text';
    trigger: App.TriggerCommand | App.TriggerText;
    /**
     * Handler function called when a text message is triggered
     */
    handle: (
      this: TCommand,
      msg: import('node-telegram-bot-api').Message
    ) => Promise<void>;
  }

  interface StageCallbackQueryHandler<TCommand> {
    type: 'callback_query';
    /**
     * Handler function called when a callback query is triggered
     */
    handle: (
      this: TCommand,
      callbackQuery: import('node-telegram-bot-api').CallbackQuery
    ) => Promise<void>;
  }

  type CommandStage<
    TCommand = InstanceType<typeof import('../src/Command').default>
  > = StageTextHandler<TCommand> | StageCallbackQueryHandler<TCommand>;
}
