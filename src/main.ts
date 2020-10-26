import { config } from 'dotenv';
config();

import glob from 'glob';
import { Server } from 'http';
import Redis from 'ioredis';
import path from 'path';
import Telegraf, { BaseScene, session, Stage } from 'telegraf';

import { Command } from './types';
const { leave } = Stage;

const {
  NODE_ENV,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME,
  PORT = '3000',
  REDIS_URL,
  WEBHOOK_DOMAIN,
} = process.env;

const KEY_AUTHENTICATED = 'authenticated';

async function main() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_USERNAME || !WEBHOOK_DOMAIN) {
    throw new Error('Missing env vars!');
  }

  const bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
    username: TELEGRAM_BOT_USERNAME,
  });

  const redis = REDIS_URL ? new Redis(REDIS_URL) : new Redis();

  // Authentication
  bot.use(async (ctx, next) => {
    const authed = await redis.lrange(KEY_AUTHENTICATED, 0, -1);

    if (ctx.chat === undefined) {
      return;
    }

    if (authed.indexOf(ctx.chat.id?.toString() ?? '') !== -1) {
      return next();
    }

    const text = ctx.message?.text ?? '';
    if (text !== 'tired') {
      ctx.reply('This chat is not authenticated. Please type the password.');
      return;
    }

    await redis.lpush(KEY_AUTHENTICATED, ctx.chat.id);
    ctx.reply('You are authenticated!');

    return next();
  });

  const stage = new Stage([]);

  bot.use(session());
  //@ts-ignore
  bot.use(stage.middleware());
  stage.command('cancel', leave());

  const commandFiles = glob.sync(
    path.join(__dirname, './commands/**/*.+(js|ts)')
  );

  for (const commandFile of commandFiles) {
    const exp = await import(path.resolve(commandFile));
    const cmd = exp.default as Command;
    const commandName = path
      .basename(commandFile)
      .replace(path.extname(commandFile), '');

    console.log(`Registering '${commandName}' from '${commandFile}'`);

    const scene = new BaseScene(commandName);
    scene.enter(cmd.initialHandler);

    const {
      responseHandler,
      responseHandlers,
      manualSceneHandling,
      callbackQueryHandler,
    } = cmd;

    if (responseHandlers !== undefined) {
      // Fixed-answer handlers
      scene.on('message', (ctx) => {
        const text = ctx.update.message?.text ?? '';
        console.log(`Received message: '${text}'`);

        if (text in responseHandlers) {
          responseHandlers[text](ctx);
        } else if (responseHandler !== undefined) {
          responseHandler(ctx);
        }

        if (manualSceneHandling !== true) {
          ctx.scene.leave();
        }
      });
    } else if (responseHandler !== undefined) {
      // Single catch-all handler, for open-ended responses
      scene.on('message', (ctx) => {
        responseHandler(ctx);
        if (manualSceneHandling !== true) {
          ctx.scene.leave();
        }
      });
    } else {
      console.error('Unsupported command!');
    }

    // Inline options response handler
    if (callbackQueryHandler !== undefined) {
      scene.on('callback_query', callbackQueryHandler);
    }

    stage.register(scene);

    bot.command(commandName, (ctx) => {
      console.log(`Processing command: '${commandName}'`);
      //@ts-ignore
      ctx.scene.enter(commandName);
    });
  }

  //@ts-ignore
  bot.catch((err, ctx) => {
    console.error(err);
    ctx.replyWithMarkdown(`Error occurred:\n\`${err}\``, {
      reply_to_message_id: ctx.update.message.message_id,
    });
  });

  if (NODE_ENV === 'production') {
    await bot.telegram.setWebhook(`https://${WEBHOOK_DOMAIN}/telegram`);

    return new Promise((resolve) => {
      bot.startWebhook('/telegram', null, parseInt(PORT, 10));
      //@ts-ignore
      (bot.webhookServer as Server).on('close', resolve);
    });
  } else {
    console.log('Polling...');

    return new Promise((resolve) => {
      bot.launch({ polling: { stopCallback: resolve } });
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
