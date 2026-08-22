import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: [
      'libraries/nestjs-libraries/src/database/prisma/publication-attempt/*.spec.ts',
      'apps/orchestrator/src/activities/post.activity.publication-attempt.spec.ts',
    ],
  },
});
