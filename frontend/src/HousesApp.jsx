import { useSiteData } from "./hooks/useSiteData";
import { tournamentStatusLine } from "./lib/format";
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

  const { standings, config } = data;

  return (
    <Layout
      title="World Cup 2026 sweepstake"
      tagline={tournamentStatusLine(standings, config)}
      activeNav="houses"
      footer={
        <p>
          Rankings from{" "}
          <a
            href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams"
            target="_blank"
            rel="noopener noreferrer"
          >
            fifa.com
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
