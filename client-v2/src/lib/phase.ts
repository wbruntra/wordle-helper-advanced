export type SolvePhase = 'Solved' | 'Endgame' | 'Narrowing' | 'Midgame' | 'Wide open'

/** A friendly label for how far along the solve is, by words remaining. */
export function solvePhase(remaining: number): SolvePhase {
  if (remaining <= 1) return 'Solved'
  if (remaining <= 10) return 'Endgame'
  if (remaining <= 75) return 'Narrowing'
  if (remaining <= 300) return 'Midgame'
  return 'Wide open'
}
