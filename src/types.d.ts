import { SceneContextMessageUpdate } from 'telegraf/typings/stage';

interface Command {
  initialHandler: (ctx: SceneContextMessageUpdate) => Promise<void>;
  responseHandler?: (ctx: SceneContextMessageUpdate) => Promise<void>;
  responseHandlers?: {
    [option: string]: (ctx: SceneContextMessageUpdate) => Promise<void>;
  };
  callbackQueryHandler?: (ctx: SceneContextMessageUpdate) => Promise<void>;
  manualSceneHandling?: boolean;
}
