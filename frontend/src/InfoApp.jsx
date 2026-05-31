import { useSiteData } from "./hooks/useSiteData";
import { potTotal } from "./lib/format";
import { copy } from "./lib/labels";
import { Card, ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { PrizeList } from "./components/PrizeList";

function tieBreakSteps(config) {
  const order = config?.side_prize_tie_break?.order;
  if (!order) return [];
  return order
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function InfoApp() {
  const { data, error, loading } = useSiteData();

  if (loading) {
    return (
      <Layout title="Prizes & rules" activeNav="info">
        <LoadingMessage />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Prizes & rules" activeNav="info">
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  const { config, meta } = data;
  const ruleLines = config.notes || [];
  const tieBreaks = tieBreakSteps(config);

  return (
    <Layout
      title="Prizes & rules"
      tagline={`${potTotal(config)} pot · main prizes, side prizes, and tie-breakers`}
      activeNav="info"
    >
      <Card title="Prizes" hint="Last team standing at each stage wins the main prizes.">
        <PrizeList config={config} />
      </Card>

      <Card title="Rules">
        <ul className="rules">
          {ruleLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>17 houses, 48 teams from the locked draw — each house holds 1–4 teams.</li>
          <li>
            During the tournament, teams are eliminated as they go out of the World Cup. A house
            stays in the running until all its teams are out.
          </li>
        </ul>
      </Card>

      <Card
        title="Tie-breakers"
        hint="Wooden spoon (most goals conceded) and how deadlocks are settled."
      >
        <h3 className="subsection-title">Wooden spoon league</h3>
        <ul className="rules">
          <li>Teams tied on goals conceded share the same league position.</li>
          <li>
            See the{" "}
            <a href="spoon.html">wooden spoon league table</a> for live standings.
          </li>
        </ul>

        <h3 className="subsection-title">If still tied on most goals conceded</h3>
        <ol className="rules rules--ordered">
          {tieBreaks.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <p className="meta">
          {copy.teamDataSource(meta.fifa_data_date?.slice(0, 10))}.
        </p>
      </Card>
    </Layout>
  );
}
