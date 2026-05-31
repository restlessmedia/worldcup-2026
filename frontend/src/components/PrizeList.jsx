import { formatMoney } from "../lib/format";
import { mainPrizeTotal, sidePrizeTotal, splitPrizes } from "../lib/prizes";

function MainPrizeRow({ prize }) {
  return (
    <div className={`prize-row prize-row--place prize-row--${prize.ordinal}`}>
      <span className="prize-ordinal">{prize.ordinal}</span>
      <div className="prize-copy">
        <span className="prize-title">{prize.title}</span>
        <span className="prize-subtitle">Last team standing at this stage</span>
      </div>
      <span className="prize-amount">{formatMoney(prize.amount)}</span>
    </div>
  );
}

function SidePrizeRow({ prize }) {
  return (
    <div className={`prize-row prize-row--side prize-row--${prize.id}`}>
      <span className="prize-ordinal prize-ordinal--side">
        {prize.id === "goals" ? "GA" : "FP"}
      </span>
      <div className="prize-copy">
        <span className="prize-title">{prize.title}</span>
        <span className="prize-subtitle">
          {prize.subtitle}
          {prize.id === "goals" ? (
            <>
              {" "}
              · <a href="spoon.html">League table</a>
            </>
          ) : null}
        </span>
      </div>
      <span className="prize-amount">{formatMoney(prize.amount)}</span>
    </div>
  );
}

export function PrizeList({ config }) {
  const { main, side } = splitPrizes(config);

  return (
    <div className="prize-list-grid">
      <section className="prize-section">
        <div className="prize-section-head">
          <h3>Main prizes</h3>
          <span className="prize-section-total">{mainPrizeTotal(main)}</span>
        </div>
        <div className="prize-rows">
          {main.map((prize) => (
            <MainPrizeRow key={prize.ordinal} prize={prize} />
          ))}
        </div>
      </section>

      <section className="prize-section">
        <div className="prize-section-head">
          <h3>Side prizes</h3>
          <span className="prize-section-total">{sidePrizeTotal(side)}</span>
        </div>
        <div className="prize-rows">
          {side.map((prize) => (
            <SidePrizeRow key={prize.id} prize={prize} />
          ))}
        </div>
      </section>
    </div>
  );
}
