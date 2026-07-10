import { formatMoney } from "../lib/format";
import { computePrizeOutlook } from "../lib/prizeOutlook";

function ContenderList({ contenders }) {
  if (!contenders.length) return null;

  return (
    <ul className="prize-outlook__houses">
      {contenders.map((house) => (
        <li key={house.houseId}>
          <strong>{house.houseLabel}</strong>
          <span>
            {house.teamsAlive.join(", ")}
            {house.bestRank ? ` · best rank #${house.bestRank}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MainPrizeOutlook({ prize }) {
  return (
    <article className={`prize-outlook__item prize-outlook__item--${prize.ordinal}`}>
      <div className="prize-outlook__head">
        <span className="prize-outlook__ordinal">{prize.ordinal}</span>
        <div>
          <h4>{prize.title}</h4>
          <p>Last team standing at this stage</p>
        </div>
        <span className="prize-outlook__amount">{formatMoney(prize.amount)}</span>
      </div>
      {prize.emptyMessage ? (
        <p className="prize-outlook__empty">{prize.emptyMessage}</p>
      ) : (
        <ContenderList contenders={prize.contenders} />
      )}
    </article>
  );
}

function WoodenSpoonOutlook({ prize, outlook }) {
  return (
    <article className="prize-outlook__item prize-outlook__item--goals">
      <div className="prize-outlook__head">
        <span className="prize-outlook__ordinal prize-outlook__ordinal--side">Spoon</span>
        <div>
          <h4>{prize?.title || "Most goals conceded"}</h4>
          <p>Wooden spoon — team that lets in the most goals</p>
        </div>
        <span className="prize-outlook__amount">{formatMoney(prize?.amount)}</span>
      </div>
      {outlook.status === "leading" ? (
        <div className="prize-outlook__leader">
          <p>
            <strong>{outlook.houseLabel}</strong> ({outlook.teamName}) — {outlook.goalsConceded}{" "}
            goals conceded
          </p>
          {outlook.note ? <p className="prize-outlook__note">{outlook.note}</p> : null}
          {outlook.unresolved ? (
            <p className="prize-outlook__note">
              Still tied after the published tie-breakers — coin toss may be needed.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="prize-outlook__empty">{outlook.message}</p>
      )}
    </article>
  );
}

function FairPlayOutlook({ prize, message }) {
  return (
    <article className="prize-outlook__item prize-outlook__item--fair-play">
      <div className="prize-outlook__head">
        <span className="prize-outlook__ordinal prize-outlook__ordinal--side">Fair play</span>
        <div>
          <h4>{prize?.title || "Fair play award"}</h4>
          <p>Best disciplinary record in the sweepstake</p>
        </div>
        <span className="prize-outlook__amount">{formatMoney(prize?.amount)}</span>
      </div>
      <p className="prize-outlook__empty">{message}</p>
    </article>
  );
}

export function PrizeOutlook({ standings, draw, fixtures, config }) {
  const outlook = computePrizeOutlook({ standings, draw, fixtures, config });

  return (
    <div className="prize-outlook motion-stagger">
      <section className="prize-outlook__section">
        <h3 className="prize-outlook__section-title">Main prizes</h3>
        <p className="prize-outlook__section-copy">
          Houses still with a team in the World Cup can still reach any main prize, depending on how
          far that last team goes.
        </p>
        <div className="prize-outlook__list">
          {outlook.main.map((prize) => (
            <MainPrizeOutlook key={prize.ordinal} prize={prize} />
          ))}
        </div>
      </section>

      <section className="prize-outlook__section">
        <h3 className="prize-outlook__section-title">Side prizes</h3>
        <div className="prize-outlook__list">
          <WoodenSpoonOutlook prize={outlook.woodenSpoon.prize} outlook={outlook.woodenSpoon.outlook} />
          <FairPlayOutlook prize={outlook.fairPlay.prize} message={outlook.fairPlay.message} />
        </div>
      </section>
    </div>
  );
}
