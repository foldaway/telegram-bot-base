import { Command } from '../src/types';

const ping: Command = {
  initialHandler: async (ctx) => {
    ctx.reply('pong');
  },
};

export default ping;
