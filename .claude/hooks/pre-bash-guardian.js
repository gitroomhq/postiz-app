#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Guards against risky prisma db push and
// silent lint/tsc OOM exits. See docs/auditoria/plano-leveza-2026-07.md e
// feedback-schema-migrations (memoria).
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const command = input?.tool_input?.command || '';
  if (!command) process.exit(0);

  const isDbPush = /\bdb[\s-]push\b/i.test(command) && /prisma/i.test(command);
  if (isDbPush) {
    respond(
      'ask',
      'db push direto no schema Prisma. Regra do projeto: NUNCA usar db push em ' +
        'mudanca de TIPO de coluna (perda de dados silenciosa). Confirme que esta ' +
        'mudanca e so aditiva (nova tabela/coluna nullable) e que voce ja considerou ' +
        'gerar uma migration versionada (pnpm run prisma-migrate) em vez de push direto em prod.'
    );
    return;
  }

  const isLintOrTsc = /\bpnpm\s+(run\s+)?(lint|tsc|typecheck)\b/i.test(command);
  if (isLintOrTsc && !/NODE_OPTIONS/.test(command)) {
    respond(
      'ask',
      'lint/tsc sem NODE_OPTIONS=--max-old-space-size=4096. Neste monorepo isso ja ' +
        'causou exit 0 falso por OOM (gotcha conhecido da Fase A3). Prefira rodar com ' +
        'NODE_OPTIONS=--max-old-space-size=4096 na frente do comando, ou confirme que ' +
        'sabe do risco e quer seguir assim.'
    );
    return;
  }

  process.exit(0);
});

function respond(permissionDecision, reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}
