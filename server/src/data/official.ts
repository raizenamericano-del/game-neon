export const OFFICIAL_LEVELS = [
  { id: "01-first-pulse", name: "First Pulse", difficulty: 1, stars: 2, coins: 3 },
  { id: "02-neon-streets", name: "Neon Streets", difficulty: 2, stars: 3, coins: 3 },
  { id: "03-cyber-drift", name: "Cyber Drift", difficulty: 3, stars: 4, coins: 3 },
  { id: "04-voltage", name: "Voltage", difficulty: 4, stars: 5, coins: 3 },
  { id: "05-gravity-well", name: "Gravity Well", difficulty: 5, stars: 6, coins: 3 },
  { id: "06-plasma-wave", name: "Plasma Wave", difficulty: 6, stars: 7, coins: 3 },
  { id: "07-quantum-flux", name: "Quantum Flux", difficulty: 7, stars: 8, coins: 3 },
  { id: "08-dark-matter", name: "Dark Matter", difficulty: 8, stars: 9, coins: 3 },
  { id: "09-event-horizon", name: "Event Horizon", difficulty: 9, stars: 10, coins: 3 },
  { id: "10-singularity", name: "Singularity", difficulty: 10, stars: 12, coins: 3 },
] as const;

export type OfficialId = (typeof OFFICIAL_LEVELS)[number]["id"];

export function isOfficial(id: string): boolean {
  return OFFICIAL_LEVELS.some((l) => l.id === id) || id.startsWith("daily-") || id.startsWith("custom-");
}

export function officialById(id: string) {
  return OFFICIAL_LEVELS.find((l) => l.id === id);
}
