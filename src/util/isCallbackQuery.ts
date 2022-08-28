import { CallbackQuery } from 'node-telegram-bot-api';

export default function isCallbackQuery(obj: unknown): obj is CallbackQuery {
  return (
    typeof obj === 'object' &&
    obj != null &&
    'id' in obj &&
    'chat_instance' in obj
  );
}
