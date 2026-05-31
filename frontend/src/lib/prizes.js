import { formatMoney } from "./format";

const ORDINALS = ["1st", "2nd", "3rd", "4th"];

function subtitleFromName(name) {
  const match = name.match(/\(([^)]+)\)/);
  return match ? match[1] : name;
}

export function splitPrizes(config) {
  const prizes = config?.prizes || [];
  const main = prizes.slice(0, 4).map((prize, index) => ({
    ordinal: ORDINALS[index],
    title: subtitleFromName(prize.name),
    amount: prize.amount_gbp,
    percent: prize.percent,
  }));

  const side = prizes.slice(4).map((prize) => {
    const isGoals = /goals conceded/i.test(prize.name);
    return {
      id: isGoals ? "goals" : "fair-play",
      title: isGoals ? "Most goals conceded" : "Fair play award",
      subtitle: isGoals
        ? "Wooden spoon — team with the highest GA"
        : "Best fair play record in the sweepstake",
      amount: prize.amount_gbp,
      percent: prize.percent,
    };
  });

  return { main, side };
}

export function mainPrizeTotal(main) {
  return formatMoney(main.reduce((sum, prize) => sum + (prize.amount || 0), 0));
}

export function sidePrizeTotal(side) {
  return formatMoney(side.reduce((sum, prize) => sum + (prize.amount || 0), 0));
}
