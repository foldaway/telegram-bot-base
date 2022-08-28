import { config } from 'dotenv';
config();

import glob from 'glob';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';

import Command from './Command';

const {
  NODE_ENV,
  TELEGRAM_BOT_TOKEN,
  PORT = '3000',
  WEBHOOK_DOMAIN,
} = process.env;

const userSessions: Record<number, InstanceType<typeof Command>> = {};

async function main() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing env vars!');
  }

  const options: TelegramBot.ConstructorOptions = {};

  const isProduction = NODE_ENV === 'production';
  const isWebhook = isProduction && WEBHOOK_DOMAIN != null;

  if (isWebhook) {
    options.webHook = {
      port: parseInt(PORT, 10),
    };
  } else {
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
    const user = msg.from;

    if (user == null || user.is_bot) {
      return;
    }

    console.log(
      `[MESSAGE] userId=${user.id} chatId=${msg.chat.id} text=${msg.text}`
    );

    if (user.id in userSessions) {
      const commandInstance = userSessions[user.id];

      console.log(
        `[MESSAGE] sessionCommandName=${commandInstance.name} isEnded=${commandInstance.isEnded}`
      );

      const msgText = msg.text ?? '';

      if (commandInstance.isEnded) {
        delete userSessions[user.id];
      } else if (msgText.slice(1) === 'cancel') {
        await commandInstance.cleanup();
        delete userSessions[user.id];
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
        }

        return;
      }
    }

    let isHandled = false;

    for (const commandFile of commandFiles) {
      const exp = await import(path.resolve(commandFile));
      const CommandClass = exp.default as typeof Command;

      const instance = new CommandClass(bot);
      isHandled = await instance.handle(msg);

      console.log(
        `[MESSAGE] trying commandName=${instance.name} isHandled=${isHandled}`
      );

      if (isHandled) {
        userSessions[user.id] = instance;
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

    if (user.id in userSessions) {
      const commandInstance = userSessions[user.id];

      console.log(
        `[CALLBACK QUERY] sessionCommandName=${commandInstance.name} isEnded=${commandInstance.isEnded}`
      );

      if (commandInstance.isEnded) {
        delete userSessions[user.id];
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
      const CommandClass = exp.default as typeof Command;

      const instance = new CommandClass(bot);
      isHandled = await instance.handle(callbackQuery);

      console.log(
        `[CALLBACK QUERY] trying commandName=${instance.name} isHandled=${isHandled}`
      );

      if (isHandled) {
        userSessions[user.id] = instance;
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

  return new Promise((resolve) => {
    process.on('SIGINT', resolve);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
