/**
 * @kronos/shared — single source of truth for API contracts shared between
 * apps/web and apps/api. Keep this package free of runtime dependencies; it is
 * types-only so it can be imported from any environment.
 *
 * These types encode several hard invariants from CLAUDE.md. Where a type
 * exists to protect an invariant, the invariant number is noted.
 */

// --- Trading mode (invariant 2: paper is the default for every user) --------

export type TradingMode = "paper" | "live";

/** Paper is always the starting mode. Live requires explicit opt-in. */
export const DEFAULT_TRADING_MODE: TradingMode = "paper";

// --- Market data ------------------------------------------------------------

export type TradingPair = `${string}/${string}`;

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

/**
 * A single OHLCV candle. `closed` distinguishes a finalized candle from the
 * in-progress one. Forecasts must only ever consume closed candles
 * (invariant 1: forecasts only use closed candles).
 */
export interface Candle {
  /** Unix epoch milliseconds for the candle open. */
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** True only when the candle has finalized. */
  closed: boolean;
}

// --- Forecasts --------------------------------------------------------------

/** A probabilistic OHLCV forecast for a single future step. */
export interface ForecastStep {
  /** Unix epoch milliseconds for the forecasted candle open. */
  openTime: number;
  /** Median (p50) projected close. */
  close: number;
  /** Lower/upper bounds of the prediction interval. */
  lower: number;
  upper: number;
}

export interface Forecast {
  pair: TradingPair;
  interval: CandleInterval;
  /** Model checkpoint that produced this forecast (invariant 6 traceability). */
  modelVersion: string;
  /** When the forecast was generated (unix ms). */
  generatedAt: number;
  /** Open time of the most recent CLOSED candle the forecast was based on. */
  basedOnCandleTime: number;
  steps: ForecastStep[];
  /** Probability the next close is higher than the last close, in [0, 1]. */
  pUp: number;
}

// --- Signals ----------------------------------------------------------------

export type SignalSide = "long" | "short" | "flat";

export interface Signal {
  pair: TradingPair;
  side: SignalSide;
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** The forecast object that produced this signal (logged with every trade). */
  forecast: Forecast;
  createdAt: number;
}

// --- Risk limits (invariant 3: set by humans only, never mutated at runtime) -

export interface RiskLimits {
  /** Max notional per position, in quote currency. */
  maxPositionSize: number;
  /** Max portfolio drawdown before trading halts, as a fraction in (0, 1]. */
  maxDrawdown: number;
  /** Whether the bot is authorized to place trades at all. */
  tradingEnabled: boolean;
}

// --- Account ----------------------------------------------------------------

export interface UserAccount {
  /** EVM address, checksummed. */
  address: string;
  mode: TradingMode;
  riskLimits: RiskLimits;
  /** When the user explicitly opted into live trading, if ever (invariant 2). */
  liveOptInAt: number | null;
}

// --- API envelope -----------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
