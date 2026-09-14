import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const assistant = readFileSync(
  fileURLToPath(new URL('./compose.ai.assistant.tsx', import.meta.url)),
  'utf8',
);
const modal = readFileSync(
  fileURLToPath(new URL('./manage.modal.tsx', import.meta.url)),
  'utf8',
);

describe('compose AI assistant placement', () => {
  it('lives in the composer footer chrome, not a viewport-edge FAB', () => {
    assert.match(modal, /<ComposeAiAssistant \/>/);
    assert.doesNotMatch(modal, /bottom-\[104px\]/);
    assert.doesNotMatch(modal, /end-\[24px\]/);
    assert.doesNotMatch(assistant, /bottom-\[104px\]/);
    assert.doesNotMatch(assistant, /position: fixed;\s*bottom: 1rem/);
  });

  it('stays visible without an OpenAI key and sends that path to Connections', () => {
    assert.match(assistant, /useAiAvailable/);
    assert.match(assistant, /href="\/connections"/);
    assert.match(assistant, /compose_ai_unconfigured_tip/);
    assert.match(assistant, /data-pq-compose-ai-trigger/);
  });

  it('opens CopilotKit as a popup chat anchored to the footer control', () => {
    assert.match(assistant, /<CopilotPopup/);
    assert.match(assistant, /Button=\{ComposeAiPopupButton\}/);
    assert.match(assistant, /availableHeight: number/);
    assert.match(assistant, /availableWidth: number/);
    assert.match(assistant, /position: relative !important/);
  });
});
