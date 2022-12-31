import { config } from 'dotenv';
config();

import { DynamoDB } from 'aws-sdk';
import glob from 'glob';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';

import CommandEngine from './CommandEngine';

const { NODE_ENV, TELEGRAM_BOT_TOKEN, WEBHOOK_DOMAIN } = process.env;

const db = new DynamoDB.DocumentClient();

const TableName = process.env.TABLE_NAME!;

export default async function run(update?: TelegramBot.Update) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing env vars!');
  }

  const options: TelegramBot.ConstructorOptions = {};

  const isProduction = NODE_ENV === 'production';
  const isWebhook = isProduction && WEBHOOK_DOMAIN != null;

  if (!isProduction) {
    options.polling = true;
    console.log('Polling...');
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, options);

  if (isWebhook) {
    await bot.setWebHook(`https://${WEBHOOK_DOMAIN}/telegram`);
  }

  const commandFiles = glob.sync(
    path.join(__dirname, './commands/**/*.+(js|ts)')
  );

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    if (user == null || user.is_bot) {
      return;
    }

    console.log(
      `[MESSAGE] userId=${user.id} chatId=${msg.chat.id} text=${msg.text}`
    );

    const existingChatSession = await db
      .get({
        TableName,
        Key: {
          chatId,
        },
      })
      .promise();

    if (existingChatSession.Item != null) {
      const commandInstance = CommandEngine.restoreSnapshot(
        bot,
        existingChatSession.Item.snapshot
      );

      console.log(
        `[MESSAGE] sessionCommandName=${commandInstance.name} isEnded=${commandInstance.isEnded}`
      );

      const msgText = msg.text ?? '';

      if (commandInstance.isEnded) {
        await db
          .delete({
            TableName,
            Key: {
              chatId,
            },
          })
          .promise();
      } else if (msgText.slice(1) === 'cancel') {
        await commandInstance.cleanup();
        await db
          .delete({
            TableName,
            Key: {
              chatId,
            },
          })
          .promise();
        await bot.sendMessage(msg.chat.id, 'Current command aborted');
        return;
      } else {
        const isHandled = await commandInstance.handle(msg);

        console.log(`[MESSAGE] isHandled=${isHandled}`);

        if (!isHandled) {
          // No commands matched
          bot.sendMessage(
            msg.chat.id,
            `Sorry, I do not understand that. You have an ongoing /${commandInstance.name} session, use /cancel to abort.`
          );
        } else {
          await db
            .put({
              TableName,
              Item: {
                chatId,
                snapshot: commandInstance.snapshot(),
              },
            })
            .promise();
        }

        return;
      }
    }

    let isHandled = false;

    for (const commandFile of commandFiles) {
      const exp = require(path.resolve(commandFile));
      const commandDefinition = exp.default as App.CommandDefinition;

      const instance = new CommandEngine(bot, commandDefinition);
      isHandled = await instance.handle(msg);

      console.log(
        `[MESSAGE] trying commandName=${instance.name} isHandled=${isHandled}`
      );

      if (isHandled) {
        await db
          .put({
            TableName,
            Item: {
              chatId,
              snapshot: instance.snapshot(),
            },
          })
          .promise();
        break;
      }
    }

    if (!isHandled) {
      console.log(`[MESSAGE] no command handlers could handle this message`);
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    const user = callbackQuery.from;

    if (user == null || user.is_bot) {
      return;
    }

    const chatId = callbackQuery.message?.chat?.id;

    if (chatId == null) {
      return;
    }

    console.log(
      `[CALLBACK QUERY] userId=${user.id} chatId=${chatId} data=${callbackQuery.data}`
    );

    const existingChatSession = await db
      .get({
        TableName,
        Key: {
          chatId,
        },
      })
      .promise();

    if (existingChatSession.Item != null) {
      const commandInstance = CommandEngine.restoreSnapshot(
        bot,
        existingChatSession.Item.snapshot
      );

      console.log(
        `[CALLBACK QUERY] sessionCommandName=${commandInstance.name} isEnded=${commandInstance.isEnded}`
      );

      if (commandInstance.isEnded) {
        await db
          .delete({
            TableName,
            Key: {
              chatId,
            },
          })
          .promise();
      } else {
        const isHandled = await commandInstance.handle(callbackQuery);

        console.log(`[CALLBACK QUERY] isHandled=${isHandled}`);

        if (!isHandled) {
          // No commands matched
          bot.sendMessage(
            chatId,
            `Sorry, I do not understand that. You have an ongoing /${commandInstance.name} session, use /cancel to abort.`
          );
        }

        return;
      }
    }

    let isHandled = false;

    for (const commandFile of commandFiles) {
      const exp = await import(path.resolve(commandFile));
      const commandDefinition = exp.default as App.CommandDefinition;

      const instance = new CommandEngine(bot, commandDefinition);
      isHandled = await instance.handle(callbackQuery);

      console.log(
        `[CALLBACK QUERY] trying commandName=${instance.name} isHandled=${isHandled}`
      );

      if (isHandled) {
        await db
          .put({
            TableName,
            Item: {
              chatId,
              snapshot: instance.snapshot(),
            },
          })
          .promise();
        break;
      }
    }

    if (!isHandled) {
      console.log(
        `[CALLBACK QUERY] no command handlers could handle this message`
      );
    }
  });

  bot.on('error', (err) => {
    console.error(err);
  });

  if (update != null) {
    bot.processUpdate(update);
  }

  return new Promise((resolve) => {
    process.on('SIGINT', resolve);
  });
}
