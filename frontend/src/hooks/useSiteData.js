import { useEffect, useState } from "react";
import { loadStandingsPageData } from "../lib/data";

export function useSiteData(loader = loadStandingsPageData) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  return { data, error, loading: !data && !error };
}
