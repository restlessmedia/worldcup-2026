import { FINAL_RESULTS } from "./lib/finalResults";
import { flagUrl } from "./lib/data";
import { TrophyIcon } from "./components/TrophyIcon";
import "./styles/results.css";

function Fireworks() {
  return (
    <div className="fireworks" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} className={`firework firework--${index + 1}`} />
      ))}
    </div>
  );
}

function ResultRow({ row }) {
  return (
    <article className={`result-row result-row--${row.trophy}`}>
      <div className="result-row__place">
        <TrophyIcon variant={row.trophy} />
        <span className="result-row__ordinal">{row.place}</span>
      </div>
      <div className="result-row__body">
        <div className="result-row__primary">
          <span className="result-row__house">{row.houseLabel}</span>
          <span className="result-row__team">
            <img
              className="result-row__flag"
              src={flagUrl(row.fifaCode)}
              alt=""
              width="28"
              height="28"
            />
            <span>{row.teamName}</span>
          </span>
          <span className="result-row__amount">{row.amount}</span>
        </div>
        <p className="result-row__reason">{row.reason}</p>
        {row.confirming ? (
          <p className="result-row__note">Being confirmed</p>
        ) : null}
      </div>
    </article>
  );
}

export function ResultsApp() {
  const { title, subtitle, provisional, banner, main, side } = FINAL_RESULTS;

  return (
    <div className="results-page">
      <Fireworks />
      <main className="results-shell">
        <header className="results-header">
          <h1 className="results-kicker">{title}</h1>
          <p className="results-title">{subtitle}</p>
          {provisional ? <p className="results-banner">{banner}</p> : null}
        </header>

        <section className="results-section" aria-label="Main prizes">
          {main.map((row) => (
            <ResultRow key={row.place} row={row} />
          ))}
        </section>

        <section className="results-section results-section--side" aria-label="Side prizes">
          <h2 className="results-side-heading">Side prizes</h2>
          {side.map((row) => (
            <ResultRow key={row.place} row={row} />
          ))}
        </section>
      </main>
    </div>
  );
}
