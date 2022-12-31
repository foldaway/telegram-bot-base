import axios from 'axios';

const DATA_RANDOM_IMAGE = 'random_image';
const DATA_RANDOM_DAD_JOKE = 'random_dad_joke';

const MenuCommand: App.CommandDefinition = {
  name: 'menu',
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
              text: 'Pick an option',
              options: {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Random image',
                        callback_data: DATA_RANDOM_IMAGE,
                      },
                      {
                        text: 'Random dad joke',
                        callback_data: DATA_RANDOM_DAD_JOKE,
                      },
                    ],
                  ],
                },
              },
            },
          ],
        };
      },
    },
    {
      type: 'callback_query',
      async handle(callbackQuery) {
        switch (callbackQuery.data) {
          case DATA_RANDOM_IMAGE: {
            return {
              responses: [
                {
                  type: 'photo',
                  data: 'https://source.unsplash.com/random',
                },
              ],
            };
          }
          case DATA_RANDOM_DAD_JOKE: {
            const resp = await axios.get('https://icanhazdadjoke.com', {
              headers: {
                Accept: 'text/plain',
                'User-Agent': 'telegram-bot-base',
              },
            });

            return {
              responses: [
                {
                  type: 'text',
                  text: resp.data,
                },
              ],
            };
          }
        }

        return null;
      },
    },
  ],
};

export default MenuCommand;
