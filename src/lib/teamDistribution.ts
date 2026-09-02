export const MIN_TEAMS = 2
export const IDEAL_TEAM_SIZE = 6

export interface TeamSuggestion {
  teams: number
  maxTeamSize: number
}

export function suggestTeams(participants: number): TeamSuggestion {
  const teams = Math.max(MIN_TEAMS, Math.ceil(participants / IDEAL_TEAM_SIZE))
  const base = Math.floor(participants / teams)
  const extra = participants % teams
  const maxTeamSize = extra > 0 ? base + 1 : base
  return { teams, maxTeamSize }
}

export function teamSizeFor(participants: number, teams: number): number {
  if (!participants || !teams) return 0
  const base = Math.floor(participants / teams)
  const extra = participants % teams
  return extra > 0 ? base + 1 : base
}

export function describeDistribution(participants: number, teams: number): string | null {
  if (!participants || !teams) return null

  const base = Math.floor(participants / teams)
  const extra = participants % teams
  const smallerCount = teams - extra
  const biggerCount = extra

  if (base <= 0) return null

  if (extra === 0) {
    return `${teams} equipe${teams > 1 ? "s" : ""} de ${base}`
  }

  const smallerLabel = `${smallerCount} equipe${smallerCount > 1 ? "s" : ""} de ${base}`
  const biggerLabel = `${biggerCount} equipe${biggerCount > 1 ? "s" : ""} de ${base + 1}`
  return `${smallerLabel} e ${biggerLabel}`
}