# Contributing to HIVEMIND

Thanks for your interest in contributing to HIVEMIND.

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/hivemind.git`
3. Install deps: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make changes and test: `npm test`
6. Push and open a PR

## Development

```bash
npm run dev      # Watch mode
npm test         # Run tests
npm run lint     # Lint code
npm run build    # Production build
```

## Code Style

- TypeScript strict mode
- No `any` types (except in tests)
- Document public APIs with JSDoc
- Test all new features

## Commit Messages

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

## Pull Requests

- Keep PRs focused (one feature/fix per PR)
- Update docs if needed
- Add tests for new functionality
- Ensure CI passes

## Questions?

Open an issue or reach out on [Discord](https://discord.gg/hivemind).
