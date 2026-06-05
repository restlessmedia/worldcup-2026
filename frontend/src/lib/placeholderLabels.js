const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];

function knockoutOutcomeLabel(matchNum, outcome) {
  const role = outcome === "winner" ? "Winner" : "Loser";
  if (matchNum >= 101 && matchNum <= 102) return `${role} of semi-final ${matchNum - 100}`;
  if (matchNum >= 97 && matchNum <= 100) return `${role} of quarter-final ${matchNum - 96}`;
  if (matchNum >= 89 && matchNum <= 96) return `${role} of Round of 16 (match ${matchNum})`;
  if (matchNum >= 73 && matchNum <= 88) return `${role} of Round of 32 (match ${matchNum})`;
  return `${role} of match ${matchNum}`;
}

export function placeholderLabel(code) {
  if (!code) return "To be decided";

  const text = String(code).trim();
  if (!text) return "To be decided";

  const groupPos = text.match(/^([1-4])([A-L])$/);
  if (groupPos) {
    return `${ORDINALS[Number(groupPos[1])]} in Group ${groupPos[2]}`;
  }

  const bestThird = text.match(/^3([A-L]+)$/);
  if (bestThird) {
    const groups = [...bestThird[1]].join(", ");
    return `Best 3rd-place team (groups ${groups})`;
  }

  const altGroup = text.match(/^([A-L])([1-4])$/);
  if (altGroup) {
    return `${ORDINALS[Number(altGroup[2])]} in Group ${altGroup[1]}`;
  }

  const winner = text.match(/^W(\d+)$/);
  if (winner) return knockoutOutcomeLabel(Number(winner[1]), "winner");

  const loser = text.match(/^RU(\d+)$/) || text.match(/^L(\d+)$/);
  if (loser) return knockoutOutcomeLabel(Number(loser[1]), "loser");

  return text;
}

export function teamDisplayName(team) {
  if (!team) return "To be decided";
  if (team.status === "placeholder") return placeholderLabel(team.draw_name || team.display_name);
  return team.display_name || team.draw_name || "To be decided";
}
