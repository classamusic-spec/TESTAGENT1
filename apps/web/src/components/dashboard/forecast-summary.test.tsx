import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Forecast } from "@kronos/shared";

import { ForecastSummary } from "@/components/dashboard/forecast-summary";

function makeForecast(pUp: number): Forecast {
  return {
    pair: "ETH/USDC",
    interval: "1h",
    modelVersion: "stub-0.1",
    generatedAt: Date.UTC(2026, 4, 26, 12, 0),
    basedOnCandleTime: Date.UTC(2026, 4, 26, 11, 0),
    pUp,
    steps: [
      { openTime: 1, close: 3200, lower: 3150, upper: 3250 },
      { openTime: 2, close: 3240, lower: 3120, upper: 3360 },
    ],
  };
}

describe("ForecastSummary", () => {
  it("renders the probability and a long signal when p_up is high", () => {
    render(<ForecastSummary forecast={makeForecast(0.72)} />);
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("Long")).toBeInTheDocument();
    expect(screen.getByText("stub-0.1")).toBeInTheDocument();
  });

  it("shows a short signal when p_up is low", () => {
    render(<ForecastSummary forecast={makeForecast(0.3)} />);
    expect(screen.getByText("Short")).toBeInTheDocument();
  });
});
