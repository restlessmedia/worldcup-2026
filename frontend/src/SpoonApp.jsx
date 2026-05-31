import { useSiteData } from "./hooks/useSiteData";
import { spoonTagline } from "./lib/format";
import { ErrorMessage, Layout, LoadingMessage } from "./components/Layout";
import { SpoonLeagueTable } from "./components/SpoonLeagueTable";

export function SpoonApp() {
  const { data, error, loading } = useSiteData();

  if (loading) {
    return (
      <Layout title="Wooden spoon league" activeNav="spoon">
        <LoadingMessage />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Wooden spoon league" activeNav="spoon">
        <ErrorMessage message={error} />
      </Layout>
    );
  }

  const { standings, config } = data;

  return (
    <Layout
      title="Wooden spoon league"
      tagline={spoonTagline(standings)}
      activeNav="spoon"
    >
      <SpoonLeagueTable standings={standings} config={config} />
    </Layout>
  );
}
