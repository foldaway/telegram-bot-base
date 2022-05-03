declare namespace App {
  type CommandTrigger =
    | { type: 'command'; command: string }
    | { type: 'text'; matcher?: RegExp | ((str: string) => boolean) };

  interface CommandStage<
    TCommand = InstanceType<typeof import('../src/Command').default>
  > {
    trigger: App.CommandTrigger;
    handle: (
      this: TCommand,
      msg: import('node-telegram-bot-api').Message
    ) => Promise<void>;
  }
}
