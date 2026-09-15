import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const controller = readFileSync(
  fileURLToPath(new URL('./posts.controller.ts', import.meta.url)),
  'utf8'
);
const service = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts',
      import.meta.url
    )
  ),
  'utf8'
);

describe('Create Post find-slot', () => {
  it('uses a 1–4 hour soon slot, not postingTimes 02:00', () => {
    assert.match(controller, /findSoonDateTime\(org\.id\)/);
    assert.match(service, /async findSoonDateTime/);
    assert.match(service, /soonWindow/);
  });

  it('keeps per-channel slots on the postingTimes grid', () => {
    assert.match(controller, /findFreeDateTime\(org\.id, id\)/);
  });
});
