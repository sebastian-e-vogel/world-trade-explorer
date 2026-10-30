import { useEffect, useId, useState } from "react";
import type { TradeBreakdownRequest } from "../domain/trade";
import { useTradeBreakdown } from "../hooks/useTradeBreakdown";
import { useLanguage } from "../i18n/LanguageContext";
import { countryName, productName, issueMessage } from "../i18n/labels";
import { exactUsd, percent, usd } from "../lib/format";
import { TradeError } from "../lib/errors";

function BreakdownContent({ context }: { context: TradeBreakdownRequest }) {
  const { t, language } = useLanguage();
  const query = useTradeBreakdown(context);
  const [now, setNow] = useState(Date.now);
  const error = query.error instanceof TradeError ? query.error : undefined;
  const retryAt =
    error && error.retryAfter > 0
      ? query.errorUpdatedAt + error.retryAfter * 1000
      : 0;
  const seconds = error ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!error || retryAt <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [error, retryAt]);
  if (query.isPending)
    return (
      <p className="breakdown-status" role="status">
        {t("breakdownLoading")}
      </p>
    );
  if (query.isError)
    return (
      <div className="breakdown-status" role="alert">
        <p>{issueMessage(error?.code, language)}</p>
        <button
          type="button"
          disabled={query.isFetching || seconds > 0}
          onClick={() => void query.refetch()}
        >
          {seconds > 0 ? t("breakdownRetryWait", { seconds }) : t("tryAgain")}
        </button>
      </div>
    );
  const result = query.data;
  return (
    <>
      <p className="breakdown-basis">
        {t(
          result.kind === "product-buyers"
            ? "productBuyerBasis"
            : "buyerProductBasis",
        )}
      </p>
      {!result.items.length ? (
        <p className="breakdown-status">{t("breakdownEmpty")}</p>
      ) : (
        <ul className="breakdown-list">
          {result.items.map((item) => {
            const code = "code" in item ? item.code : item.countryCode;
            const name =
              "code" in item
                ? productName(item.code, item.name, language)
                : countryName(item.countryCode, language, item.name);
            return (
              <li key={code}>
                <span className="breakdown-name">{name}</span>
                <span className="breakdown-values">
                  <span title={exactUsd(item.valueUsd, language)}>
                    {usd(item.valueUsd, language)}
                  </span>
                  <strong>{percent(item.sharePercent, language)}</strong>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <small className="breakdown-footnote">{t("breakdownRemainder")}</small>
    </>
  );
}

export function TradeBreakdown({
  context,
  label,
}: {
  context: TradeBreakdownRequest;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const { t } = useLanguage();
  return (
    <div className="trade-breakdown">
      <button
        type="button"
        className="breakdown-toggle"
        aria-expanded={open}
        aria-label={`${t(context.kind === "product-buyers" ? "productBuyerToggle" : "buyerProductToggle")}: ${label}`}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {t(
            context.kind === "product-buyers"
              ? "productBuyerToggle"
              : "buyerProductToggle",
          )}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={contentId} hidden={!open} className="breakdown-content">
        {open && <BreakdownContent context={context} />}
      </div>
    </div>
  );
}
