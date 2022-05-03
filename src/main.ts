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

  if (NODE_ENV === 'production' && WEBHOOK_DOMAIN != null) {
    options.webHook = {
      port: parseInt(PORT, 10),
    };
  } else {
    options.polling = true;
    console.log('Polling...');
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, options);

  if (NODE_ENV === 'production' && WEBHOOK_DOMAIN != null) {
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

      const isHandled = await commandInstance.handle(msg);

      console.log(
        `[MESSAGE] sessionCommandName=${commandInstance.name} isHandled=${isHandled}`
      );

      if (isHandled) {
        return;
      }

      delete userSessions[user.id];
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

      // No commands matched
      bot.sendMessage(msg.chat.id, 'Unsupported response');
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
