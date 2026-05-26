# CLAUDE.md

This file is durable project context. Read it at the start of every session and respect it on every change.

## What this project is

A non-custodial crypto trading web app powered by the Kronos foundation model (https://github.com/shiyu-coder/Kronos). Users connect a wallet (MetaMask / Coinbase Wallet / WalletConnect), the bot generates probabilistic OHLCV forecasts using Kronos, derives signals, and executes trades on DEXs via delegated session keys. Users never give up custody.

## What "done" looks like

A polished Next.js web app where a user connects a wallet, sees a dashboard with a live forecast chart, opts into paper trading by default, can graduate to live trading with explicit consent, and watches the bot execute trades with full visibility into reasoning and risk.

## Architecture

Monorepo with these apps:
- `apps/web` — Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, RainbowKit + wagmi v2 + viem, TanStack Query, Zustand, Recharts, TradingView Lightweight Charts, Framer Motion
- `apps/api` — FastAPI + Pydantic v2, SQLModel, Postgres + TimescaleDB, Redis, Arq for background jobs, SIWE auth
- `apps/ml` — Separate FastAPI service hosting Kronos on GPU, exposes `/forecast/{pair}` returning structured forecasts
- `packages/shared` — TypeScript types shared between frontend and backend (single source of truth for API contracts)

DEX execution via 1inch Aggregator API. Smart accounts via Biconomy or ZeroDev for session keys. ccxt for market data ingestion.

## Hard invariants (never violate these)

1. **Forecasts only use closed candles.** Never include the in-progress candle. Look-ahead bias is the single most common bug in trading systems and it makes backtests lie.
2. **Paper mode is the default for every user.** Live trading requires an explicit, separate opt-in with a confirmation modal that lists risks. No "default to live" ever.
3. **Position size limits, max drawdown limits, and trading authority are set by humans only.** No code path may modify these at runtime based on performance. Bot doing well is not a reason to let it trade bigger automatically.
4. **All code in `src/execution/` and `src/risk/` requires tests.** No exceptions. These paths touch real money.
5. **Secrets never enter the repo.** No API keys, no private keys, no seed phrases, no session signer keys in any committed file. Use `.env` (gitignored) and document required variables in `.env.example` with placeholders only.
6. **No code path may rewrite, regenerate, or hot-patch trading logic in production.** Model checkpoints and signal thresholds change through git, PRs, and human review.
7. **New model checkpoints require minimum 14 days paper-trade validation before promotion to live.** Auto-rollback if live performance drops vs paper baseline.
8. **Walk-forward backtests only.** Any backtest that trains and tests on the same window is invalid and must not be used to justify decisions.
9. **Transaction costs and slippage are modeled in every backtest.** A backtest without realistic costs is fiction.

## Coding standards

- Python: 3.11+, type hints required in `src/execution/`, `src/risk/`, `src/model/`. Ruff for lint, Black for format, mypy strict on critical modules.
- TypeScript: strict mode, no `any` without justification in a comment, prefer `unknown` + narrowing.
- Imports: absolute imports from package root, no deep relative paths.
- Logging: structured (loguru in Python, pino in Node). Every trade decision logs the forecast object that produced it.
- Errors: never swallow exceptions in execution code. Fail loud, alert, halt trading if unclear.
- Config: pydantic-settings for Python, zod-validated env parsing for TS. No magic strings.

## Testing requirements

- `src/execution/`, `src/risk/`, `src/model/`: unit tests + integration tests, target 90%+ coverage
- `src/signals/`, `src/backtest/`: unit tests on core logic
- `apps/web`: component tests with Vitest + Testing Library for critical flows (connect wallet, opt into live, place trade)
- Run `pytest` and `pnpm test` after every meaningful change
- If a test fails twice on the same task, stop and report rather than rewriting tests to pass

## Build phases (current state and what's next)

Phase 1 — Design system + landing page + wallet connect (IN PROGRESS)
Phase 2 — Auth (SIWE) + user accounts
Phase 3 — Data pipeline + Kronos service + forecast endpoint
Phase 4 — Backtest engine (walk-forward, realistic costs)
Phase 5 — Dashboard with forecast visualization
Phase 6 — Paper trading loop end-to-end
Phase 7 — DEX integration on Base Sepolia testnet
Phase 8 — Smart account / session keys on testnet
Phase 9 — Self-improvement loop (weekly retrain, auto-rollback)
Phase 10 — Mainnet with tiny size, then scale

Do not skip phases. Each phase must be working and tested before moving to the next.

## What "self-improving" means in this project (and doesn't)

Allowed and encouraged:
- Weekly Kronos fine-tuning on extended data, with backtest validation before deployment
- Optuna sweeps over signal thresholds, walk-forward validated
- Calibration tracking (when model says p_up=0.7, do 70% actually close up?)
- Regime classifier that selects between multiple fine-tuned checkpoints
- Auto-rollback if a deployed model underperforms its predecessor

Not allowed:
- Agent rewriting its own trading code
- Agent increasing position size limits or trading authority based on performance
- Auto-deployment of new checkpoints without paper-trade validation
- RL agents that learn from PnL in production
- LLM-based "reasoning" inserted into the trade decision path (LLMs are for explaining trades to users on the dashboard, not making them)

## Permission boundaries for autonomous work

When running with `acceptEdits` or unattended:
- DO: edit files in `src/`, `apps/`, `tests/`, `packages/`
- DO: run `pytest`, `pnpm test`, `pnpm build`, `ruff`, `mypy`, `black`
- DO: read documentation, search the codebase, run git diff
- DO NOT: install packages without updating `requirements.txt` / `package.json` and explaining why
- DO NOT: run `git commit`, `git push`, `git rebase`, `git reset --hard` — human commits only
- DO NOT: modify `CLAUDE.md`, `TASKS.md`, `.env.example`, `.gitignore` without explicit instruction
- DO NOT: touch anything in `apps/api/src/execution/`, `apps/api/src/risk/`, or smart-account integration code in unattended mode — these require human review
- DO NOT: hit any mainnet RPC or any non-testnet exchange API in any code path under any circumstance during development

## How to work effectively in this repo

1. Before non-trivial changes, write a plan and surface it for review.
2. Reference invariants by number when relevant ("per invariant 1, this function takes a list of closed candles only").
3. When stuck, search the codebase first, then read relevant docs, then ask — don't guess.
4. Prefer small, reviewable diffs over large refactors.
5. If a task requires changing an invariant, stop and surface it. Invariants change with human decision, not agent decision.

## Useful references

- Kronos repo: https://github.com/shiyu-coder/Kronos
- Kronos models on HF: NeoQuasar/Kronos-small, Kronos-base, Kronos-Tokenizer-base
- wagmi v2 docs, RainbowKit docs, shadcn/ui docs
- 1inch Aggregator API docs
- Biconomy / ZeroDev smart account docs
