import type {
  CountryTradeProfile,
  ExportProduct,
  Ranking,
  TradePartner,
} from "../domain/trade";
import { usd, exactUsd, percent } from "../lib/format";
import { useLanguage } from "../i18n/LanguageContext";
import {
  countryName,
  productName,
  formatDate,
  issueMessage,
} from "../i18n/labels";
function RankingList({
  ranking,
  type,
}: {
  ranking: Ranking<ExportProduct> | Ranking<TradePartner>;
  type: "products" | "buyers";
}) {
  const { language, t } = useLanguage();
  if (ranking.status === "unavailable")
    return (
      <div className="ranking-unavailable">
        <span>{t("rankingUnavailable")}</span>
        <p>{issueMessage(ranking.errorCode, language)}</p>
        <small>{t("incompleteRanking")}</small>
      </div>
    );
  if (!ranking.items.length)
    return <p className="ranking-unavailable">{t("noDestinations")}</p>;
  return (
    <ol className={`ranking-list ${type}`}>
      {ranking.items.map((item, index) => {
        const code = "code" in item ? item.code : item.countryCode;
        const name =
          "code" in item
            ? productName(item.code, item.name, language)
            : countryName(item.countryCode, language, item.name);
        return (
          <li key={code}>
            <div className="rank-index">
              {type === "products" ? code : String(index + 1).padStart(2, "0")}
            </div>
            <div className="rank-content">
              <div className="rank-name">{name}</div>
              <div className="rank-values">
                <span title={exactUsd(item.valueUsd, language)}>
                  {usd(item.valueUsd, language)}
                </span>
                <span>{percent(item.sharePercent, language)}</span>
              </div>
              <div
                className="bar-track"
                role="img"
                aria-label={t("shareLabel", {
                  share: percent(item.sharePercent, language),
                })}
              >
                <div
                  style={{ width: `${Math.min(100, item.sharePercent)}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export function TradeDashboard({ profile }: { profile: CountryTradeProfile }) {
  const { language, t } = useLanguage();
  return (
    <>
      <section className="total-card" aria-label={t("totalExports")}>
        <div className="eyebrow">
          {t("totalExportsLabel")} <span>↗</span>
        </div>
        <div
          className="total-value"
          title={exactUsd(profile.totalExportsUsd, language)}
        >
          {usd(profile.totalExportsUsd, language)}
          <span>USD</span>
        </div>
        <div className="total-note">
          {t("worldExports")} <span>{profile.year}</span>
        </div>
      </section>
      <section className="ranking-section">
        <div className="section-heading">
          <h3>{t("leadingExports")}</h3>
          <span>{t("hs2")}</span>
        </div>
        <RankingList ranking={profile.topProducts} type="products" />
      </section>
      <section className="ranking-section buyer-section">
        <div className="section-heading">
          <h3>{t("topDestinations")}</h3>
          <span>{t("shareExports")}</span>
        </div>
        <RankingList ranking={profile.topBuyers} type="buyers" />
      </section>
      <div className="data-note">
        {t("classificationNote", { classification: profile.classification })}
        <br />
        {t("retrievedNote", {
          date: formatDate(profile.lastFetchedAt, language),
        })}
        <br />
        <a href="https://comtradeplus.un.org/" target="_blank" rel="noreferrer">
          {t("source")}: UN Comtrade ↗
        </a>
      </div>
    </>
  );
}
