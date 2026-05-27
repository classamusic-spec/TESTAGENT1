import type { Candle } from "@kronos/shared";

import { momentumPUp } from "@/lib/calibration";

/**
 * Autonomous paper-trading strategy used by the Paper lab. Mirrors the backend
 * pipeline (forecast p_up -> long/short signal -> stop-loss / take-profit exits)
 * so users can watch the bot manage its own trades. Deterministic: no learned or
 * LLM logic, and it never changes its own limits — sizing and stops are config.
 */

export type PositionSide = "long" | "short" | "flat";
export type TradeReason =
  | "open_long"
  | "open_short"
  | "flip"
  | "signal_exit"
  | "stop_loss"
  | "take_profit";

export type StopMode = "percent" | "atr";

export interface AutoConfig {
  startCash: number;
  maxPosition: number; // notional committed per trade
  longThreshold: number; // p_up >= -> go long
  shortThreshold: number; // p_up <= -> go short
  allowShort: boolean;
  stopMode: StopMode; // fixed-percent stop, or volatility-scaled (ATR) stop
  stopLossPct: number | null;
  atrLookback: number;
  atrMult: number;
  takeProfitPct: number | null;
  trailing: boolean;
  cooldownBars: number; // bars to wait after an exit before opening a fresh position
  maxDailyLossPct: number | null; // protection: halt fresh entries for the day past this loss
  entryVolBand: [number, number] | null; // [min, max] ATR%: skip dead/chaotic markets
  feeBps: number;
  slippageBps: number;
}

export type RiskLevel = "conservative" | "balanced" | "aggressive";

export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  startCash: 10_000,
  maxPosition: 2_500,
  longThreshold: 0.55,
  shortThreshold: 0.45,
  allowShort: true,
  stopMode: "percent",
  stopLossPct: 0.04,
  atrLookback: 14,
  atrMult: 2,
  takeProfitPct: 0.08,
  trailing: false,
  cooldownBars: 1,
  maxDailyLossPct: 0.05,
  entryVolBand: null,
  feeBps: 10,
  slippageBps: 5,
};

/**
 * Risk presets for the simplified "Newbie" experience: one tap sets the whole
 * strategy. These are human-chosen profiles (invariant 3) — the bot never edits
 * them at runtime. `exposure` is the fraction of the deposit committed per trade.
 */
export const RISK_PRESETS: Record<RiskLevel, Partial<AutoConfig> & { exposure: number }> = {
  conservative: {
    exposure: 0.25,
    longThreshold: 0.6,
    shortThreshold: 0.4,
    allowShort: false,
    stopMode: "atr",
    atrMult: 1.5,
    takeProfitPct: 0.05,
    trailing: false,
    cooldownBars: 3,
    maxDailyLossPct: 0.03,
    entryVolBand: [0.002, 0.05],
  },
  balanced: {
    exposure: 0.5,
    longThreshold: 0.55,
    shortThreshold: 0.45,
    allowShort: true,
    stopMode: "atr",
    atrMult: 2,
    takeProfitPct: 0.08,
    trailing: false,
    cooldownBars: 1,
    maxDailyLossPct: 0.05,
    entryVolBand: [0.0015, 0.07],
  },
  aggressive: {
    exposure: 0.85,
    longThreshold: 0.53,
    shortThreshold: 0.47,
    allowShort: true,
    stopMode: "atr",
    atrMult: 2.5,
    takeProfitPct: 0.12,
    trailing: true,
    cooldownBars: 0,
    maxDailyLossPct: 0.08,
    entryVolBand: [0.001, 0.12],
  },
};

/** Build a full strategy config from a deposit + a chosen risk level. */
export function configForDeposit(deposit: number, level: RiskLevel): AutoConfig {
  const { exposure, ...preset } = RISK_PRESETS[level];
  return {
    ...DEFAULT_AUTO_CONFIG,
    ...preset,
    startCash: deposit,
    maxPosition: Math.max(1, deposit * exposure),
  };
}

/** Causal ATR (average true range) at each bar, using only prior/this candle. */
export function computeAtrSeries(candles: Candle[], lookback: number): number[] {
  const tr: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i]!.high;
    const l = candles[i]!.low;
    const pc = candles[i - 1]!.close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(1, i - lookback + 1);
    const window = tr.slice(start, i + 1);
    atr.push(window.length ? window.reduce((a, b) => a + b, 0) / window.length : 0);
  }
  return atr;
}

export interface AutoTrade {
  index: number;
  time: number;
  action: "buy" | "sell";
  reason: TradeReason;
  price: number;
  units: number;
  realizedPnl: number; // 0 for opens; signed PnL for closes
}

export interface AutoStep {
  index: number;
  time: number;
  price: number;
  pUp: number;
  signal: PositionSide;
  positionSide: PositionSide;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  equity: number;
  cash: number;
  event: TradeReason | null;
}

export interface AutoSummary {
  finalEquity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  numTrades: number;
  closedTrades: number;
  wins: number;
  winRate: number;
}

export interface AutoRun {
  steps: AutoStep[];
  trades: AutoTrade[];
  summary: AutoSummary;
}

function signalFor(pUp: number, cfg: AutoConfig): PositionSide {
  if (pUp >= cfg.longThreshold) return "long";
  if (pUp <= cfg.shortThreshold) return cfg.allowShort ? "short" : "flat";
  return "flat";
}

function stopLevels(
  side: PositionSide,
  entry: number,
  best: number,
  atrAtEntry: number,
  cfg: AutoConfig,
) {
  let stop: number | null = null;
  let target: number | null = null;
  const ref = cfg.trailing ? best : entry;

  // Stop distance: a fixed % of entry, or a multiple of ATR at entry.
  let distance: number | null = null;
  if (cfg.stopMode === "atr") {
    if (atrAtEntry > 0) distance = cfg.atrMult * atrAtEntry;
  } else if (cfg.stopLossPct != null) {
    distance = entry * cfg.stopLossPct;
  }
  if (distance != null) {
    stop = side === "long" ? ref - distance : ref + distance;
  }

  if (cfg.takeProfitPct != null) {
    target = side === "long" ? entry * (1 + cfg.takeProfitPct) : entry * (1 - cfg.takeProfitPct);
  }
  return { stop, target };
}

export function runAutoStrategy(candles: Candle[], config: Partial<AutoConfig> = {}): AutoRun {
  const cfg = { ...DEFAULT_AUTO_CONFIG, ...config };
  const slip = cfg.slippageBps / 10_000;
  const feeRate = cfg.feeBps / 10_000;
  const atrSeries = computeAtrSeries(candles, cfg.atrLookback);

  let cash = cfg.startCash;
  let side: PositionSide = "flat";
  let units = 0; // signed
  let entry = 0;
  let best = 0;
  let atrAtEntry = 0;

  const steps: AutoStep[] = [];
  const trades: AutoTrade[] = [];
  let closedTrades = 0;
  let wins = 0;
  let peakEquity = cfg.startCash;
  let maxDrawdown = 0;
  let cooldownUntil = -1; // index until which fresh entries are suppressed
  let dayStart = cfg.startCash; // equity at the start of the current "day" (24 bars)

  const close = (price: number, time: number, index: number, reason: TradeReason) => {
    const fillPrice = price * (1 + (units > 0 ? -slip : slip)); // exit a long by selling (down), a short by buying (up)
    const proceeds = units * fillPrice; // long: + ; short: - (pay to buy back)
    const fee = Math.abs(units) * fillPrice * feeRate;
    cash += proceeds - fee;
    const realized = units > 0 ? (fillPrice - entry) * units : (entry - fillPrice) * -units;
    trades.push({
      index,
      time,
      action: units > 0 ? "sell" : "buy",
      reason,
      price: fillPrice,
      units: Math.abs(units),
      realizedPnl: realized - fee,
    });
    closedTrades += 1;
    if (realized - fee > 0) wins += 1;
    units = 0;
    side = "flat";
  };

  const open = (next: "long" | "short", price: number, time: number, index: number, flip: boolean) => {
    const buying = next === "long";
    const fillPrice = price * (1 + (buying ? slip : -slip));
    const tradedUnits = (buying ? 1 : -1) * (cfg.maxPosition / fillPrice);
    const fee = Math.abs(tradedUnits) * fillPrice * feeRate;
    cash += -(tradedUnits * fillPrice) - fee; // long: pay out; short: receive proceeds (tradedUnits<0)
    units = tradedUnits;
    side = next;
    entry = fillPrice;
    best = fillPrice;
    atrAtEntry = atrSeries[index] ?? 0;
    trades.push({
      index,
      time,
      action: buying ? "buy" : "sell",
      reason: flip ? "flip" : next === "long" ? "open_long" : "open_short",
      price: fillPrice,
      units: Math.abs(tradedUnits),
      realizedPnl: 0,
    });
  };

  for (let i = 0; i < candles.length; i++) {
    const mark = candles[i]!.close;
    const time = candles[i]!.openTime;
    const pUp = momentumPUp(candles, i);

    if (side !== "flat") {
      best = side === "long" ? Math.max(best, mark) : Math.min(best, mark);
    }

    // Daily-loss protection: reset the day boundary every 24 bars; lock fresh
    // entries (not exits) once the day's loss exceeds the configured limit.
    const eqNow = cash + units * mark;
    if (i % 24 === 0) dayStart = eqNow;
    const dailyLocked =
      cfg.maxDailyLossPct != null && dayStart > 0 && eqNow <= dayStart * (1 - cfg.maxDailyLossPct);

    // Volatility filter: skip fresh entries in dead or chaotic markets.
    const atrPct = mark > 0 ? (atrSeries[i] ?? 0) / mark : 0;
    const volBlocked =
      cfg.entryVolBand != null && (atrPct < cfg.entryVolBand[0] || atrPct > cfg.entryVolBand[1]);

    const sig = signalFor(pUp, cfg);
    let event: TradeReason | null = null;

    // Warm-up: let momentum establish before trading.
    if (i >= 6) {
      // 1) Autonomous exits take priority over the entry signal.
      let exited = false;
      if (side !== "flat") {
        const { stop, target } = stopLevels(side, entry, best, atrAtEntry, cfg);
        const hitStop =
          stop != null && (side === "long" ? mark <= stop : mark >= stop);
        const hitTarget =
          target != null && (side === "long" ? mark >= target : mark <= target);
        if (hitStop || hitTarget) {
          event = hitStop ? "stop_loss" : "take_profit";
          close(mark, time, i, event);
          cooldownUntil = i + cfg.cooldownBars;
          exited = true;
        }
      }

      // 2) Otherwise follow the signal: open, flip, or exit-on-flat.
      // Compare as plain strings: `side` is mutated inside closures, which makes
      // TS over-narrow `sig` if compared directly against it.
      const sideStr: string = side;
      const sigStr: string = sig;
      if (!exited && sigStr !== sideStr) {
        const wasOpen = sideStr !== "flat";
        if (wasOpen && sigStr === "flat") {
          close(mark, time, i, "signal_exit");
          cooldownUntil = i + cfg.cooldownBars;
          event = "signal_exit";
        } else if (wasOpen) {
          // opposite signal: flip (close + reopen), bypassing cooldown
          close(mark, time, i, "flip");
          open(sig as "long" | "short", mark, time, i, true);
          event = "flip";
        } else if (i >= cooldownUntil && !dailyLocked && !volBlocked) {
          // fresh entry from flat: cooldown elapsed, not daily-locked, vol in band
          open(sig as "long" | "short", mark, time, i, false);
          event = sigStr === "long" ? "open_long" : "open_short";
        }
      }
    }

    const equity = cash + units * mark;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity);

    const levels =
      side !== "flat" ? stopLevels(side, entry, best, atrAtEntry, cfg) : { stop: null, target: null };
    steps.push({
      index: i,
      time,
      price: mark,
      pUp,
      signal: sig,
      positionSide: side,
      entryPrice: side !== "flat" ? entry : null,
      stopPrice: levels.stop,
      targetPrice: levels.target,
      equity,
      cash,
      event,
    });
  }

  const finalEquity = steps.length ? steps[steps.length - 1]!.equity : cfg.startCash;
  return {
    steps,
    trades,
    summary: {
      finalEquity,
      totalReturnPct: (finalEquity / cfg.startCash - 1) * 100,
      maxDrawdownPct: maxDrawdown * 100,
      numTrades: trades.length,
      closedTrades,
      wins,
      winRate: closedTrades ? wins / closedTrades : 0,
    },
  };
}
