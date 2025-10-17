import { ToolAction } from '@mastra/core/dist/tools/types';
import { getAuth } from '@gitroom/nestjs-libraries/chat/async.storage';

export const checkAuth: ToolAction['execute'] = async (
  { runtimeContext },
  options
) => {
  const auth = getAuth();
  // @ts-ignore
  if (options?.extra?.authInfo || auth) {
    runtimeContext.set(
      // @ts-ignore
      'organization',
      // @ts-ignore
      JSON.stringify(options?.extra?.authInfo || auth)
    );
    // @ts-ignore
    runtimeContext.set('ui', 'false');
  }
};
