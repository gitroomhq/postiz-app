#!/usr/bin/env node
// PostToolUse hook (matcher: Edit|Write|MultiEdit). Reminds to boot real
// (curl) after touching schema/migrations/tsconfig, porque tsc/build podem
// sair verde mesmo com boot quebrado. Ver feedback-verificar-backend-pos-mudanca.
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = String(input?.tool_input?.file_path || '').replace(/\\/g, '/');
  if (!filePath) process.exit(0);

  const isSchema = /prisma\/schema\.prisma$/.test(filePath);
  const isMigration = /prisma\/migrations\/.*\.sql$/.test(filePath);
  const isTsconfig = /tsconfig[^/]*\.json$/.test(filePath);

  if (!isSchema && !isMigration && !isTsconfig) process.exit(0);

  const what = isSchema
    ? 'schema.prisma'
    : isMigration
    ? 'uma migration SQL'
    : 'um tsconfig';

  console.log(
    JSON.stringify({
      decision: 'block',
      reason:
        `Voce editou ${what}. Lembrete (nao bloqueia, so nao esqueca): tsc/build ` +
        'podem sair 0 mesmo com boot quebrado. Antes de considerar isso pronto, ' +
        'suba o backend real (pnpm run dev-backend ou dev:backend) e valide com curl ' +
        'no endpoint afetado, alem de checar se e preciso pnpm run prisma-generate/prisma-migrate.',
    })
  );
  process.exit(0);
});
