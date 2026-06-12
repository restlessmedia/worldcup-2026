import { useEffect, useState } from "react";
import { loadJson } from "../lib/data";

let cachedStandings = null;

export function useStandingsLookup() {
  const [standings, setStandings] = useState(cachedStandings);

  useEffect(() => {
    if (cachedStandings) return undefined;

    let cancelled = false;
    loadJson("standings.json")
      .then((data) => {
        if (cancelled) return;
        cachedStandings = data;
        setStandings(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return standings;
}
