import assert from "node:assert/strict";
import test from "node:test";
import {
  PATHWAY_LEFT,
  PATHWAY_RIGHT,
  chunkPairs,
  pathwayFeederPlacements,
  pathwayGridPlacements,
} from "../src/lib/knockoutTree.js";

/** FIFA 2026 R32 winners that feed each R16 match (M89–M96). */
const R16_FEEDERS = {
  "r16-01": ["r32-02", "r32-05"],
  "r16-02": ["r32-01", "r32-03"],
  "r16-03": ["r32-04", "r32-06"],
  "r16-04": ["r32-07", "r32-08"],
  "r16-05": ["r32-11", "r32-12"],
  "r16-06": ["r32-09", "r32-10"],
  "r16-07": ["r32-14", "r32-16"],
  "r16-08": ["r32-13", "r32-15"],
};

function feederPairsForSide(side) {
  const pathway = side === "left" ? PATHWAY_LEFT : PATHWAY_RIGHT;
  return chunkPairs(pathway.r32);
}

test("pathway R32 order places Switzerland and Colombia on the same feeder into r16-08", () => {
  const pairs = feederPairsForSide("right");
  const switzerlandColombiaPair = pairs.find((pair) => pair.includes("r32-13"));

  assert.deepEqual(switzerlandColombiaPair, ["r32-13", "r32-15"]);
});

test("pathway R32 order places Argentina and Egypt path on the same feeder into r16-07", () => {
  const pairs = feederPairsForSide("right");
  const argentinaEgyptPair = pairs.find((pair) => pair.includes("r32-14"));

  assert.deepEqual(argentinaEgyptPair, ["r32-14", "r32-16"]);
});

test("each R16 match row aligns with its FIFA feeder pair on the grid", () => {
  for (const side of ["left", "right"]) {
    const pathway = side === "left" ? PATHWAY_LEFT : PATHWAY_RIGHT;
    const placements = pathwayGridPlacements(side);
    const feeders = pathwayFeederPlacements(side);

    pathway.r16.forEach((r16Id, index) => {
      const [feederA, feederB] = R16_FEEDERS[r16Id];
      const pairIndex = pathway.r32.indexOf(feederA);
      assert.equal(pathway.r32[pairIndex + 1], feederB, `${r16Id} feeders should be adjacent`);

      const r16Placement = placements.find((cell) => cell.id === r16Id);
      const feederPlacement = feeders[index];
      assert.equal(r16Placement.row, feederPlacement.row, `${r16Id} row matches feeder ${side}`);
    });
  }
});
