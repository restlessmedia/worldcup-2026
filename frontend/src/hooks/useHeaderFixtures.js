import { useEffect, useState } from "react";
import { loadJson } from "../lib/data";

export function useHeaderFixtures() {
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadJson("fixtures.json")
      .then((data) => {
        if (!cancelled) setFixtures(data?.fixtures || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return fixtures;
}
