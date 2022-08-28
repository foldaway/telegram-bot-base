import axios from 'axios';
import { Message } from 'node-telegram-bot-api';

import Command from '../Command';

const DATA_RANDOM_IMAGE = 'random_image';
const DATA_RANDOM_DAD_JOKE = 'random_dad_joke';

export default class MenuCommand extends Command {
  private _prevMessage: Message | null = null;

  get name(): string {
    return 'menu';
  }

  get stages(): App.CommandStage<this>[] {
    return [
      {
        type: 'text',
        trigger: {
          type: 'command',
        },
        async handle(msg) {
          this._prevMessage = await this.bot.sendMessage(
            msg.chat.id,
            'Pick an option',
            {
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
            }
          );
        },
      },
      {
        type: 'callback_query',
        async handle(callbackQuery) {
          const chatId = callbackQuery.message?.chat?.id;

          if (chatId == null) {
            return;
          }

          if (this._prevMessage != null) {
            this.bot.deleteMessage(
              this._prevMessage.chat.id,
              this._prevMessage.message_id.toString()
            );
          }

          switch (callbackQuery.data) {
            case DATA_RANDOM_IMAGE: {
              await this.bot.sendPhoto(
                chatId,
                'https://source.unsplash.com/random'
              );
              break;
            }
            case DATA_RANDOM_DAD_JOKE: {
              const resp = await axios.get('https://icanhazdadjoke.com', {
                headers: {
                  Accept: 'text/plain',
                  'User-Agent': 'telegram-bot-base',
                },
              });

              await this.bot.sendMessage(chatId, resp.data);
              break;
            }
          }
        },
      },
    ];
  }
}
