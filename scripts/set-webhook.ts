import { config } from 'dotenv';
config();

import TelegramBot from 'node-telegram-bot-api';

const { TELEGRAM_BOT_TOKEN } = process.env;

async function run() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing env vars!');
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {});

  const webhookUrl = process.argv[2];

  await bot.setWebHook(webhookUrl);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
