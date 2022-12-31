interface State {
  name: string;
  age: number;
}

const IntroCommand: App.CommandDefinition<State> = {
  name: 'intro',
  initialState: {
    name: '',
    age: -1,
  },
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
              text: 'What is your name?',
            },
          ],
        };
      },
    },
    {
      type: 'text',
      trigger: {
        type: 'text',
      },
      async handle(msg) {
        return {
          responses: [
            {
              type: 'text',
              text: 'I see, what is your age?',
              options: {
                reply_markup: {
                  force_reply: true,
                },
                reply_to_message_id: msg.message_id,
              },
            },
          ],
          nextState: {
            name: msg.text ?? '',
            age: -1,
          },
        };
      },
    },
    {
      type: 'text',
      trigger: {
        type: 'text',
        matcher: /\d+/,
      },
      async handle(msg, prevState) {
        const age = parseInt(msg.text ?? '0');

        return {
          responses: [
            {
              type: 'text',
              text: `Hi ${prevState.name} of age ${age}!`,
            },
          ],
          nextState: {
            name: prevState.name,
            age,
          },
        };
      },
    },
  ],
};

export default IntroCommand;
