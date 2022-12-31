const PingCommand: App.CommandDefinition = {
  name: 'ping',
  initialState: undefined,
  stages: [
    {
      type: 'text',
      trigger: {
        type: 'command',
      },
      async handle() {
        return {
          responses: [
            {
              type: 'text',
              text: 'pong',
            },
          ],
        };
      },
    },
  ],
};

export default PingCommand;
