# Contributing

Contributions are welcome.

## Workflow

1. Fork the repository.
2. Create a feature branch from the current deployment branch.
3. Make focused changes with tests when applicable.
4. Open a pull request with a clear summary and rollback plan.

## Guidelines

- Keep pull requests small and reviewable.
- Avoid unrelated refactors in feature/fix PRs.
- Document behavior changes in `README.md` or inline docs.
- Prefer `pnpm` for all workspace commands.

## Development

```bash
pnpm install
docker compose -f docker-compose.dev.yaml up -d
pnpm dev
```

## Need help?

Open an issue in this repository with reproduction steps and expected behavior.