declare namespace App {
  type CommandTrigger =
    | { type: 'command'; command: string }
    | { type: 'text'; matcher?: RegExp | ((str: string) => boolean) };

  interface CommandStage {
    trigger: App.CommandTrigger;
    handle: (
      this: InstanceType<typeof import('./Command').default>,
      msg: import('node-telegram-bot-api').Message
    ) => Promise<void>;
  }
}
