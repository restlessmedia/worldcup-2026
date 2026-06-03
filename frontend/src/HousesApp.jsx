import { useSiteData } from "./hooks/useSiteData";
import { resolveSiteUpdatedAt, tournamentStatusLine } from "./lib/format";
import { copy } from "./lib/labels";
import { Card, ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { HousesTable } from "./components/HousesTable";

export function HousesApp() {
  const { data, error, loading } = useSiteData();

  if (loading) {
    return (
      <Layout title="World Cup 2026 sweepstake" activeNav="houses">
        <LoadingMessage />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="World Cup 2026 sweepstake" activeNav="houses">
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  const { standings, config, meta } = data;

  return (
    <Layout
      title="World Cup 2026 sweepstake"
      tagline={tournamentStatusLine(standings, config)}
      updatedAt={resolveSiteUpdatedAt({ meta, standings })}
      activeNav="houses"
      footer={
        <p>
          {copy.rankingsSource}{" "}
          <a
            href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on fifa.com
          </a>
          . Banter, not betting tips.
        </p>
      }
    >
      <Card
        title="Houses"
        hint="Tap a flag for team details."
      >
        <HousesTable standings={standings} />
      </Card>
    </Layout>
  );
}
