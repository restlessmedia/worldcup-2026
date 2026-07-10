import { useEffect, useState } from "react";
import { loadJson } from "./lib/data";
import { formatDate, resolveSiteUpdatedAt } from "./lib/format";
import { Card, ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { KnockoutBracket } from "./components/KnockoutBracket";

function knockoutTagline(knockout) {
  if (knockout.phase === "pre_knockout") {
    return "Bracket ready for knockout stage — fixtures appear after groups";
  }
  const updated = knockout.last_updated
    ? `Updated ${formatDate(knockout.last_updated)}`
    : "Knockout stage";
  return `${updated} · tap a team for details`;
}

export function KnockoutApp() {
  const [knockout, setKnockout] = useState(null);
  const [standings, setStandings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([loadJson("knockout.json"), loadJson("standings.json"), loadJson("meta.json")])
      .then(([knockoutData, standingsData, metaData]) => {
        setKnockout(knockoutData);
        setStandings(standingsData);
        setMeta(metaData);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (!knockout && !error) {
    return (
      <Layout title="Knockout" activeNav="knockout">
        <LoadingMessage />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Knockout" activeNav="knockout">
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  return (
    <Layout
      title="Knockout"
      tagline={knockoutTagline(knockout)}
      updatedAt={resolveSiteUpdatedAt({ meta, knockout })}
      activeNav="knockout"
    >
      <Card
        className="card--knockout"
        hint="Sweepstake teams and houses on each knockout fixture. Winners advance automatically when scores are entered."
      >
        <KnockoutBracket knockout={knockout} standings={standings} />
      </Card>
    </Layout>
  );
}
