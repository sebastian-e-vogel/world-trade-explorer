import type { TradeIssueCode } from "../domain/trade";
export class TradeError extends Error {
  constructor(
    message: string,
    public code: TradeIssueCode,
    public retryAfter = 0,
  ) {
    super(message);
    this.name = "TradeError";
  }
}
