import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GameCard } from "@/components/ui/game-card"
import { MatchModal } from "@/components/professor/Matchmodal"
import { ContestationsModal } from "@/components/professor/ContestationsModal"
import { MatchTimer, getMatchPhase } from "@/components/professor/MatchTimer"
import { generateMatchReport } from "./MatchReport"
import {
  GraduationCap, Users, Play, LogOut, RefreshCw,
  Clock, CheckCircle2, Loader2, PlayCircle, Trophy,
  StopCircle, Plus, ChevronDown, ChevronUp, Pencil, X, Layers,
  MessageSquareWarning, FileDown
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Participant {
  id: string
  player_name: string
  joined_at: string
}

interface Session {
  id: string
  room_code: string
  status: string
  mode: string
  created_at: string
  match_id: string | null
  team_number: number | null
  phase2_submitted_at: string | null
  phase3_submitted_at: string | null
  participants: Participant[]
}

interface Match {
  id: string
  match_code: string
  title: string
  num_teams: number
  scenario_id: number | null
  expected_participants: number | null
  max_team_size: number | null
  status: string
  scenario_title: string | null
  created_at: string
  phase1_duration_minutes: number
  phase2_duration_minutes: number
  phase3_duration_minutes: number
  phase1_started_at: string | null
  phase1_ended_at: string | null
  phase2_started_at: string | null
  phase2_ended_at: string | null
  phase3_started_at: string | null
  phase3_ended_at: string | null
  results_released_at: string | null
  sessions: Session[]
}

interface ProfessorDashboardProps {
  onLogout: () => void
}

function statusMeta(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    waiting:   { label: "Aguardando", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    judging:   { label: "Fase 1",     className: "bg-blue-100   text-blue-800   border-blue-200" },
    completed: { label: "Fase 2",     className: "bg-purple-100 text-purple-800 border-purple-200" },
    evaluating:{ label: "Avaliando",  className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    encerrado: { label: "Encerrada",  className: "bg-gray-100   text-gray-600   border-gray-200" },
  }
  return map[status] ?? { label: status, className: "bg-gray-100 text-gray-800 border-gray-200" }
}

function sessionPhaseMeta(session: Session, match: Match) {
  if (session.status === "encerrado") return statusMeta("encerrado")
  if (match.phase3_started_at && !match.phase3_ended_at) {
    return { label: "Fase 3 (Contestação)", className: "bg-orange-100 text-orange-800 border-orange-200" }
  }
  if (match.phase3_ended_at) {
    return { label: "Contestação Encerrada", className: "bg-gray-100 text-gray-600 border-gray-200" }
  }
  return statusMeta(session.status)
}

function matchStatusFrom(sessions: Session[], match?: Pick<Match, "status" | "results_released_at">): string {
  if (match && match.status === "encerrado") return "encerrado"
  if (sessions.length > 0 && sessions.every(s => s.status === "encerrado")) return "encerrado"
  if (sessions.some(s => s.status === "completed" || s.status === "evaluating")) return "fase2"
  if (sessions.some(s => s.status === "judging")) return "fase1"
  return "waiting"
}

export const ProfessorDashboard = ({ onLogout }: ProfessorDashboardProps) => {
  const [matches, setMatches] = useState<Match[]>([])
  const [looseSessions, setLooseSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [ending, setEnding] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set())
  const [contestationCounts, setContestationCounts] = useState<Record<string, number>>({})
  const [viewingContestations, setViewingContestations] = useState<{ sessionId: string; roomCode: string; teamLabel: string } | null>(null)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const { data: sessionsData } = await supabase
      .from("game_sessions")
      .select("id, room_code, status, mode, created_at, match_id, team_number, phase2_submitted_at, phase3_submitted_at, session_participants(id, player_name, joined_at)")
      .order("created_at", { ascending: false })

    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, match_code, title, num_teams, scenario_id, expected_participants, max_team_size, status, scenario_title, created_at, phase1_duration_minutes, phase2_duration_minutes, phase3_duration_minutes, phase1_started_at, phase1_ended_at, phase2_started_at, phase2_ended_at, phase3_started_at, phase3_ended_at, results_released_at")
      .order("created_at", { ascending: false })

    const sessions: Session[] = (sessionsData ?? []).map((s: any) => ({
      id: s.id,
      room_code: s.room_code,
      status: s.status,
      mode: s.mode ?? "team",
      created_at: s.created_at,
      match_id: s.match_id ?? null,
      team_number: s.team_number ?? null,
      phase2_submitted_at: s.phase2_submitted_at ?? null,
      phase3_submitted_at: s.phase3_submitted_at ?? null,
      participants: (s.session_participants ?? []).sort(
        (a: Participant, b: Participant) =>
          new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      ),
    }))

    const sessionsByMatch = new Map<string, Session[]>()
    const loose: Session[] = []
    for (const s of sessions) {
      if (s.match_id) {
        const list = sessionsByMatch.get(s.match_id) ?? []
        list.push(s)
        sessionsByMatch.set(s.match_id, list)
      } else {
        loose.push(s)
      }
    }

    const mapped: Match[] = (matchesData ?? []).map((m: any) => ({
      id: m.id,
      match_code: m.match_code,
      title: m.title,
      num_teams: m.num_teams,
      scenario_id: m.scenario_id ?? null,
      expected_participants: m.expected_participants ?? null,
      max_team_size: m.max_team_size ?? null,
      status: m.status,
      scenario_title: m.scenario_title,
      created_at: m.created_at,
      phase1_duration_minutes: m.phase1_duration_minutes,
      phase2_duration_minutes: m.phase2_duration_minutes,
      phase3_duration_minutes: m.phase3_duration_minutes,
      phase1_started_at: m.phase1_started_at,
      phase1_ended_at: m.phase1_ended_at,
      phase2_started_at: m.phase2_started_at,
      phase2_ended_at: m.phase2_ended_at,
      phase3_started_at: m.phase3_started_at,
      phase3_ended_at: m.phase3_ended_at,
      results_released_at: m.results_released_at,
      sessions: (sessionsByMatch.get(m.id) ?? []).sort(
        (a, b) => (a.team_number ?? 0) - (b.team_number ?? 0)
      ),
    }))

    setMatches(mapped)
    setLooseSessions(loose)

    const { data: contestationsData } = await supabase
      .from("requirement_contestations")
      .select("session_id, status")
      .eq("status", "pendente")

    const counts: Record<string, number> = {}
    ;(contestationsData ?? []).forEach((c: any) => {
      counts[c.session_id] = (counts[c.session_id] ?? 0) + 1
    })
    setContestationCounts(counts)

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel("professor-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "requirement_contestations" }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const startSession = async (sessionId: string, roomCode: string) => {
    setStarting(sessionId)
    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({ status: "judging" })
        .eq("id", sessionId)
      if (error) throw error
      toast({ title: `Equipe ${roomCode} iniciada!` })
    } catch {
      toast({ title: "Erro ao iniciar", variant: "destructive" })
    } finally {
      setStarting(null)
    }
  }

  const startAllInMatch = async (match: Match) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === match.id ? { ...m, status: "active", phase1_started_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ status: "active", phase1_started_at: now })
        .eq("id", match.id)
      if (error) throw error

      const waiting = match.sessions.filter(s => s.status === "waiting")
      for (const s of waiting) {
        await supabase
          .from("game_sessions")
          .update({ status: "judging", phase1_started_at: now })
          .eq("id", s.id)
      }

      toast({ title: `Partida "${match.title}" iniciada!` })
    } catch {
      toast({ title: "Erro ao iniciar partida", variant: "destructive" })
      loadData()
    }
  }

  const endPhase1 = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, phase1_ended_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ phase1_ended_at: now })
        .eq("id", matchId)
      if (error) throw error

      await supabase
        .from("game_sessions")
        .update({ status: "completed", phase1_completed_at: now })
        .eq("match_id", matchId)

      const { error: assignError } = await supabase.rpc("assign_team_cross_evaluation", { p_match_id: matchId })
      if (assignError) {
        toast({ title: "Erro ao atribuir avaliação cruzada", description: assignError.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro ao encerrar a Fase 1", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const startPhase2 = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, phase2_started_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ phase2_started_at: now })
        .eq("id", matchId)
      if (error) throw error

      await supabase
        .from("game_sessions")
        .update({ phase2_started_at: now })
        .eq("match_id", matchId)
    } catch {
      toast({ title: "Erro ao iniciar fase 2", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const endPhase2 = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, phase2_ended_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ phase2_ended_at: now })
        .eq("id", matchId)
      if (error) throw error
    } catch {
      toast({ title: "Erro ao encerrar a correção", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const startPhase3 = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, phase3_started_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ phase3_started_at: now })
        .eq("id", matchId)
      if (error) throw error

      await supabase
        .from("game_sessions")
        .update({ phase3_started_at: now })
        .eq("match_id", matchId)
    } catch {
      toast({ title: "Erro ao iniciar a contestação", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const endPhase3 = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, phase3_ended_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ phase3_ended_at: now })
        .eq("id", matchId)
      if (error) throw error
    } catch {
      toast({ title: "Erro ao encerrar a contestação", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const releaseResults = useCallback(async (matchId: string) => {
    const now = new Date().toISOString()

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, results_released_at: now } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ results_released_at: now })
        .eq("id", matchId)
      if (error) throw error
    } catch {
      toast({ title: "Erro ao concluir a Fase 2", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const adjustDuration = useCallback(async (matchId: string, phase: 1 | 2 | 3, minutes: number) => {
    const matchColumn =
      phase === 1 ? "phase1_duration_minutes" :
      phase === 2 ? "phase2_duration_minutes" :
      "phase3_duration_minutes"
    const sessionColumn =
      phase === 1 ? "phase1_duration" :
      phase === 2 ? "phase2_duration" :
      "phase3_duration"

    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, [matchColumn]: minutes } : m
    ))

    try {
      const { error } = await supabase
        .from("matches")
        .update({ [matchColumn]: minutes })
        .eq("id", matchId)
      if (error) throw error

      await supabase
        .from("game_sessions")
        .update({ [sessionColumn]: minutes * 60 })
        .eq("match_id", matchId)
    } catch {
      toast({ title: "Erro ao ajustar tempo", variant: "destructive" })
      loadData()
    }
  }, [loadData])

  const endSession = async (sessionId: string, roomCode: string) => {
    if (!confirm(`Encerrar a equipe ${roomCode}?`)) return
    setEnding(sessionId)
    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({ status: "encerrado" })
        .eq("id", sessionId)
      if (error) throw error
      toast({ title: `Equipe ${roomCode} encerrada!` })
    } catch {
      toast({ title: "Erro ao encerrar", variant: "destructive" })
    } finally {
      setEnding(null)
    }
  }

  const removeParticipant = async (participantId: string, playerName: string) => {
    if (!confirm(`Remover ${playerName} da equipe?`)) return
    try {
      const { error } = await supabase
        .from("session_participants")
        .delete()
        .eq("id", participantId)
      if (error) throw error
      toast({ title: `${playerName} removido(a) da equipe` })
    } catch (err: any) {
      toast({ title: "Erro ao remover participante", description: err.message, variant: "destructive" })
    }
  }

  const endAllInMatch = async (match: Match) => {
    if (!confirm(`Encerrar todas as equipes da partida "${match.title}"?`)) return
    const active = match.sessions.filter(s => s.status !== "encerrado")
    for (const s of active) {
      await supabase.from("game_sessions").update({ status: "encerrado" }).eq("id", s.id)
    }
    await supabase.from("matches").update({ status: "encerrado" }).eq("id", match.id)
    toast({ title: `Partida "${match.title}" encerrada!` })
    loadData()
  }

  const toggleExpand = (matchId: string) => {
    setExpandedMatches(prev => {
      const next = new Set(prev)
      next.has(matchId) ? next.delete(matchId) : next.add(matchId)
      return next
    })
  }

  const handleGenerateReport = async (match: Match) => {
    setGeneratingReport(match.id)
    try {
      await generateMatchReport(match)
      toast({ title: "Relatório gerado!", description: `Download de "${match.title}" iniciado.` })
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" })
    } finally {
      setGeneratingReport(null)
    }
  }

  const totalPlayers = matches.reduce(
    (n, m) => n + m.sessions.reduce((a, s) => a + s.participants.length, 0), 0
  ) + looseSessions.reduce((n, s) => n + s.participants.length, 0)

  const activeMatches = matches.filter(m => matchStatusFrom(m.sessions, m) !== "encerrado")
  const endedMatches  = matches.filter(m => matchStatusFrom(m.sessions, m) === "encerrado")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-game-purple flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Painel do Professor</h1>
              <p className="text-xs text-muted-foreground">Monitoramento em tempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/professor/cenarios">
              <Button variant="outline" size="sm" className="gap-2">
                <Layers className="w-4 h-4" />
                Cenários
              </Button>
            </Link>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-primary"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Nova Partida
            </Button>
            <Button variant="ghost" size="sm" onClick={loadData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users,      label: "Partidas",        value: matches.length,       color: "text-primary" },
            { icon: Clock,      label: "Aguardando",      value: activeMatches.filter(m => matchStatusFrom(m.sessions, m) === "waiting").length, color: "text-yellow-600" },
            { icon: PlayCircle, label: "Em Andamento",    value: activeMatches.filter(m => matchStatusFrom(m.sessions, m) !== "waiting").length, color: "text-blue-600" },
            { icon: Trophy,     label: "Jogadores",       value: totalPlayers,          color: "text-green-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <GameCard key={label} className="text-center">
              <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </GameCard>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Carregando partidas...
          </div>
        ) : activeMatches.length === 0 && looseSessions.length === 0 ? (
          <GameCard>
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <Plus className="w-12 h-12 mx-auto opacity-30" />
              <p className="font-medium">Nenhuma partida criada ainda</p>
              <p className="text-sm">Clique em "Nova Partida" para começar</p>
            </div>
          </GameCard>
        ) : (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Partidas Ativas
              <Badge variant="secondary">{activeMatches.length}</Badge>
            </h2>

            {activeMatches.map(match => {
              const expanded = expandedMatches.has(match.id)
              const mStatus = matchStatusFrom(match.sessions, match)
              const hasWaiting = match.sessions.some(s => s.status === "waiting")
              const hasActive  = match.sessions.some(s => s.status !== "waiting" && s.status !== "encerrado")
              const totalInMatch = match.sessions.reduce((n, s) => n + s.participants.length, 0)
              const matchPhase = getMatchPhase(match)
              const allTeamsHaveParticipant =
                match.sessions.length > 0 &&
                match.sessions.every(s => s.participants.length > 0)

              return (
                <GameCard key={match.id} className="space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(match.id)}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{match.title}</span>
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {match.match_code}
                        </span>
                        {match.scenario_title && (
                          <Badge variant="outline" className="text-xs">{match.scenario_title}</Badge>
                        )}
                        {matchPhase === "waiting" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingMatch(match)
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar detalhes
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {match.num_teams} equipes · {totalInMatch} participantes
                        {match.expected_participants ? ` (esperado: ${match.expected_participants})` : ""} ·{" "}
                        {new Date(match.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      <MatchTimer
                        match={match}
                        sessions={match.sessions}
                        pendingContestations={match.sessions.reduce((n, s) => n + (contestationCounts[s.id] ?? 0), 0)}
                        onEndPhase1={endPhase1}
                        onStartPhase2={startPhase2}
                        onEndPhase2={endPhase2}
                        onStartPhase3={startPhase3}
                        onEndPhase3={endPhase3}
                        onReleaseResults={releaseResults}
                        onAdjustDuration={adjustDuration}
                        onEndMatch={() => endAllInMatch(match)}
                      />

                      {matchPhase === "waiting" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => startAllInMatch(match)}
                          disabled={!allTeamsHaveParticipant}
                          title={
                            allTeamsHaveParticipant
                              ? undefined
                              : "Todas as equipes precisam ter pelo menos 1 participante"
                          }
                        >
                          <Play className="w-3.5 h-3.5" />
                          Iniciar Todas
                        </Button>
                      )}
                      <div onClick={() => toggleExpand(match.id)}>
                        {expanded
                          ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          : <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t">
                      {match.sessions.map(session => {
                        const meta = sessionPhaseMeta(session, match)
                        const pendingCount = contestationCounts[session.id] ?? 0
                        return (
                          <div key={session.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Equipe {session.team_number}</p>
                                <p className="font-mono font-bold text-primary">{session.room_code}</p>
                              </div>
                              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${meta.className}`}>
                                {meta.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {session.participants.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Aguardando alunos</p>
                              ) : session.participants.map((p, i) => (
                                <span key={p.id} className={`flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full font-medium ${
                                  i === 0 ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground"
                                }`}>
                                  {p.player_name}
                                  <button
                                    type="button"
                                    onClick={() => removeParticipant(p.id, p.player_name)}
                                    className="hover:text-red-600"
                                    title="Remover da equipe"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>

                            {pendingCount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 animate-pulse"
                                onClick={() => setViewingContestations({
                                  sessionId: session.id,
                                  roomCode: session.room_code,
                                  teamLabel: `Equipe ${session.team_number}`,
                                })}
                              >
                                <MessageSquareWarning className="w-3.5 h-3.5" />
                                Ver Contestações
                                <Badge className="ml-1 bg-orange-600 text-white hover:bg-orange-600">{pendingCount}</Badge>
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </GameCard>
              )
            })}
          </section>
        )}

        {looseSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Salas avulsas (sem partida)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {looseSessions.map(session => {
                const meta = statusMeta(session.status)
                return (
                  <GameCard key={session.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-bold text-xl text-primary">{session.room_code}</p>
                      <span className={`text-xs font-medium border px-2 py-1 rounded-full ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {session.participants.length === 0
                        ? <p className="text-xs text-muted-foreground italic">Sem participantes</p>
                        : session.participants.map((p, i) => (
                          <span key={p.id} className={`flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full font-medium ${
                            i === 0 ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground"
                          }`}>
                            {p.player_name}
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.id, p.player_name)}
                              className="hover:text-red-600"
                              title="Remover da equipe"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      }
                    </div>
                    <div className="flex gap-2">
                      {session.status === "waiting" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          onClick={() => startSession(session.id, session.room_code)}
                          disabled={starting === session.id || session.participants.length === 0}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Iniciar
                        </Button>
                      )}
                      {session.status !== "waiting" && session.status !== "encerrado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                          onClick={() => endSession(session.id, session.room_code)}
                          disabled={ending === session.id}
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          Encerrar
                        </Button>
                      )}
                    </div>
                  </GameCard>
                )
              })}
            </div>
          </section>
        )}

        {endedMatches.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <StopCircle className="w-5 h-5 text-gray-500" />
              Partidas Encerradas
              <Badge variant="secondary">{endedMatches.length}</Badge>
            </h2>
            {endedMatches.map(match => (
              <GameCard key={match.id} className="opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">{match.title}</span>
                    <span className="font-mono text-xs text-muted-foreground ml-2">{match.match_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleGenerateReport(match)}
                      disabled={generatingReport === match.id}
                    >
                      {generatingReport === match.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <FileDown className="w-3.5 h-3.5" />}
                      Gerar Relatório
                    </Button>
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">Encerrada</Badge>
                  </div>
                </div>
              </GameCard>
            ))}
          </section>
        )}
      </main>

      <MatchModal
        isOpen={showCreateModal || !!editingMatch}
        editingMatch={editingMatch}
        onClose={() => {
          setShowCreateModal(false)
          setEditingMatch(null)
        }}
        onSaved={loadData}
      />

      <ContestationsModal
        isOpen={!!viewingContestations}
        sessionId={viewingContestations?.sessionId ?? null}
        roomCode={viewingContestations?.roomCode ?? ""}
        teamLabel={viewingContestations?.teamLabel ?? ""}
        onClose={() => setViewingContestations(null)}
        onUpdated={loadData}
      />
    </div>
  )
}