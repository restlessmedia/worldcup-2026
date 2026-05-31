import { useEffect, useState } from "react";
import { loadSiteData } from "../lib/data";

export function useSiteData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSiteData()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return { data, error, loading: !data && !error };
}
