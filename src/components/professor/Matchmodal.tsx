import { useState, useEffect } from "react"
import { supabase } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GameCard } from "@/components/ui/game-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, Minus, Loader2, Copy, Check, RotateCcw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { MIN_TEAMS, suggestTeams, teamSizeFor, describeDistribution } from "@/lib/teamDistribution"

interface CreatedTeam {
  teamNumber: number
  roomCode: string
  sessionId: string
}

interface Scenario {
  id: number
  name: string
}

interface EditableSession {
  id: string
  team_number: number | null
  participants: { id: string }[]
}

export interface EditableMatch {
  id: string
  match_code: string
  title: string
  num_teams: number
  scenario_id: number | null
  expected_participants: number | null
  max_team_size: number | null
  phase1_duration_minutes: number
  phase2_duration_minutes: number
  phase3_duration_minutes: number
  sessions: EditableSession[]
}

interface MatchModalProps {
  isOpen: boolean
  editingMatch: EditableMatch | null
  onClose: () => void
  onSaved: () => void
}

const MIN_DURATION = 1
const DEFAULT_DURATION = 10
const DEFAULT_CONTESTATION_DURATION = 5
const MIN_PARTICIPANTS = 1
const MAX_PARTICIPANTS = 200

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function clampMin(value: string, min: number, fallback: number) {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.max(min, n)
}

function generateCode(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
}

export const MatchModal = ({ isOpen, editingMatch, onClose, onSaved }: MatchModalProps) => {
  const isEditing = !!editingMatch

  const [title, setTitle] = useState("")
  const [expectedParticipants, setExpectedParticipants] = useState<number | "">("")
  const [numTeams, setNumTeams] = useState<number | "">(2)
  const [autoCalc, setAutoCalc] = useState(true)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenarioId, setScenarioId] = useState<string>("")
  const [phase1Duration, setPhase1Duration] = useState<number | "">(DEFAULT_DURATION)
  const [phase2Duration, setPhase2Duration] = useState<number | "">(DEFAULT_DURATION)
  const [phase3Duration, setPhase3Duration] = useState<number | "">(DEFAULT_CONTESTATION_DURATION)
  const [loading, setLoading] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadScenarios()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && editingMatch) {
      setTitle(editingMatch.title)
      setScenarioId(editingMatch.scenario_id ? String(editingMatch.scenario_id) : "")
      setNumTeams(editingMatch.num_teams)
      setExpectedParticipants(editingMatch.expected_participants ?? "")
      setPhase1Duration(editingMatch.phase1_duration_minutes)
      setPhase2Duration(editingMatch.phase2_duration_minutes)
      setPhase3Duration(editingMatch.phase3_duration_minutes ?? DEFAULT_CONTESTATION_DURATION)
      setAutoCalc(false)
      setCreatedTeams([])
    } else if (isOpen && !editingMatch) {
      setTitle("")
      setExpectedParticipants("")
      setNumTeams(2)
      setAutoCalc(true)
      setScenarioId("")
      setPhase1Duration(DEFAULT_DURATION)
      setPhase2Duration(DEFAULT_DURATION)
      setPhase3Duration(DEFAULT_CONTESTATION_DURATION)
      setCreatedTeams([])
    }
  }, [isOpen, editingMatch])

  const loadScenarios = async () => {
    setLoadingScenarios(true)
    try {
      const { data, error } = await supabase
        .from("scenarios")
        .select("id, name")
        .order("id", { ascending: true })

      if (error) throw error
      setScenarios(data || [])
    } catch (err) {
      console.error("Erro ao carregar cenários:", err)
    } finally {
      setLoadingScenarios(false)
    }
  }

  if (!isOpen) return null

  const applyParticipants = (value: string) => {
    const raw = value.replace(/[^0-9]/g, "")
    const parsed = raw === "" ? "" : parseInt(raw, 10)
    setExpectedParticipants(parsed)

    if (autoCalc && typeof parsed === "number" && parsed > 0) {
      const { teams } = suggestTeams(parsed)
      setNumTeams(teams)
    }
  }

  const recalculate = () => {
    setAutoCalc(true)
    if (typeof expectedParticipants === "number" && expectedParticipants > 0) {
      const { teams } = suggestTeams(expectedParticipants)
      setNumTeams(teams)
    }
  }

  const derivedMaxSize =
    typeof expectedParticipants === "number" && typeof numTeams === "number"
      ? teamSizeFor(expectedParticipants, numTeams)
      : 0

  const distributionText =
    typeof expectedParticipants === "number" && typeof numTeams === "number"
      ? describeDistribution(expectedParticipants, numTeams)
      : null

  const syncTeamCount = async (
    match: EditableMatch,
    newCount: number,
    phase1: number,
    phase2: number,
    phase3: number
  ) => {
    const currentCount = match.sessions.length

    if (newCount > currentCount) {
      for (let i = currentCount + 1; i <= newCount; i++) {
        const teamCode = `${match.match_code}-E${i}`
        await supabase.from("game_sessions").insert({
          match_id: match.id,
          team_number: i,
          room_code: teamCode,
          requirement: "",
          classification: "funcional",
          status: "waiting",
          mode: "team",
          phase1_duration: phase1 * 60,
          phase2_duration: phase2 * 60,
          phase3_duration: phase3 * 60,
        })
      }
      await supabase.from("matches").update({ num_teams: newCount }).eq("id", match.id)
      return true
    }

    if (newCount < currentCount) {
      const removable = match.sessions.filter(
        s => s.team_number !== null && s.team_number > newCount
      )
      const withParticipants = removable.filter(s => s.participants.length > 0)

      if (withParticipants.length > 0) {
        toast({
          title: "Não foi possível reduzir as equipes",
          description: `Equipe(s) ${withParticipants
            .map(s => s.team_number)
            .join(", ")} já têm alunos.`,
          variant: "destructive",
        })
        return false
      }

      for (const s of removable) {
        await supabase.from("game_sessions").delete().eq("id", s.id)
      }
      await supabase.from("matches").update({ num_teams: newCount }).eq("id", match.id)
      return true
    }

    return true
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" })
      return
    }

    if (!scenarioId) {
      toast({ title: "Selecione um cenário", variant: "destructive" })
      return
    }

    if (typeof expectedParticipants !== "number" || expectedParticipants <= 0) {
      toast({ title: "Número de participantes obrigatório", variant: "destructive" })
      return
    }

    const teamsCount = clampMin(String(numTeams), MIN_TEAMS, MIN_TEAMS)
    const phase1 = clampMin(String(phase1Duration), MIN_DURATION, DEFAULT_DURATION)
    const phase2 = clampMin(String(phase2Duration), MIN_DURATION, DEFAULT_DURATION)
    const phase3 = clampMin(String(phase3Duration), MIN_DURATION, DEFAULT_CONTESTATION_DURATION)
    const expected = expectedParticipants
    const maxSize = teamSizeFor(expected, teamsCount)

    setLoading(true)
    try {
      if (isEditing && editingMatch) {
        const { error } = await supabase
          .from("matches")
          .update({
            title: title.trim(),
            scenario_id: parseInt(scenarioId, 10),
            expected_participants: expected,
            max_team_size: maxSize,
            phase1_duration_minutes: phase1,
            phase2_duration_minutes: phase2,
            phase3_duration_minutes: phase3,
          })
          .eq("id", editingMatch.id)

        if (error) throw error

        await supabase
          .from("game_sessions")
          .update({ phase1_duration: phase1 * 60, phase2_duration: phase2 * 60, phase3_duration: phase3 * 60 })
          .eq("match_id", editingMatch.id)

        if (teamsCount !== editingMatch.num_teams) {
          const ok = await syncTeamCount(editingMatch, teamsCount, phase1, phase2, phase3)
          if (!ok) {
            setLoading(false)
            return
          }
        }

        toast({ title: "Partida atualizada!" })
        onSaved()
        onClose()
        return
      }

      const matchCode = generateCode(6)

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_code: matchCode,
          title: title.trim(),
          num_teams: teamsCount,
          expected_participants: expected,
          max_team_size: maxSize,
          status: "waiting",
          scenario_id: parseInt(scenarioId, 10),
          phase1_duration_minutes: phase1,
          phase2_duration_minutes: phase2,
          phase3_duration_minutes: phase3,
        })
        .select()
        .single()

      if (matchError || !match) throw new Error(matchError?.message || "Erro ao criar partida")

      const teams: CreatedTeam[] = []
      for (let i = 1; i <= teamsCount; i++) {
        const teamCode = `${matchCode}-E${i}`
        const { data: session, error: sessionError } = await supabase
          .from("game_sessions")
          .insert({
            match_id: match.id,
            team_number: i,
            room_code: teamCode,
            requirement: "",
            classification: "funcional",
            status: "waiting",
            mode: "team",
            phase1_duration: phase1 * 60,
            phase2_duration: phase2 * 60,
            phase3_duration: phase3 * 60,
          })
          .select()
          .single()

        if (sessionError || !session) throw new Error(`Erro ao criar equipe ${i}`)
        teams.push({ teamNumber: i, roomCode: teamCode, sessionId: session.id })
      }

      setCreatedTeams(teams)
      onSaved()
      toast({ title: "Partida criada!", description: `${teamsCount} equipes prontas para receber alunos.` })
    } catch (err: any) {
      toast({
        title: isEditing ? "Erro ao atualizar partida" : "Erro ao criar partida",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <GameCard className="w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-xl font-bold">{isEditing ? "Editar Partida" : "Nova Partida"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto pr-1 match-modal-scroll">
        {createdTeams.length === 0 ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título da partida</Label>
              <Input
                placeholder="Ex: Turma A - Aula 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Número de participantes *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 32"
                value={expectedParticipants}
                onChange={(e) => applyParticipants(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value.trim() === "") return
                  setExpectedParticipants(
                    clampNumber(e.target.value, MIN_PARTICIPANTS, MAX_PARTICIPANTS, MIN_PARTICIPANTS)
                  )
                }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
              />
              {distributionText && (
                <p className="text-xs text-muted-foreground">Sugestão: {distributionText}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-4">
                <Label>Número de equipes</Label>
                <Label>Máx. de pessoas por equipe</Label>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAutoCalc(false)
                      setNumTeams(n => Math.max(MIN_TEAMS, (typeof n === "number" ? n : MIN_TEAMS) - 1))
                    }}
                    disabled={typeof numTeams === "number" && numTeams <= MIN_TEAMS}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={numTeams}
                    onChange={(e) => {
                      setAutoCalc(false)
                      const raw = e.target.value.replace(/[^0-9]/g, "")
                      setNumTeams(raw === "" ? "" : parseInt(raw, 10))
                    }}
                    onBlur={(e) =>
                      setNumTeams(clampMin(e.target.value, MIN_TEAMS, MIN_TEAMS))
                    }
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                    className="w-14 text-center text-2xl font-bold"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAutoCalc(false)
                      setNumTeams(n => (typeof n === "number" ? n : MIN_TEAMS) + 1)
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-14 h-9 flex items-center justify-center text-xl font-bold rounded-md bg-muted">
                    {derivedMaxSize || "—"}
                  </div>
                  <span className="text-sm text-muted-foreground">pessoas</span>
                </div>
              </div>
              {!autoCalc && (
                <button
                  type="button"
                  onClick={recalculate}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Recalcular automaticamente
                </button>
              )}
              {isEditing && editingMatch && typeof numTeams === "number" && numTeams < editingMatch.num_teams && (
                <p className="text-xs text-amber-600">
                  Reduzir remove equipes vazias no final da lista; equipes com alunos não são removidas.
                </p>
              )}
              {isEditing && editingMatch && typeof numTeams === "number" && numTeams > editingMatch.num_teams && (
                <p className="text-xs text-muted-foreground">
                  Aumentar cria {numTeams - editingMatch.num_teams} nova(s) equipe(s) vazia(s).
                </p>
              )}
            </div>

            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cenário
              </p>
              <Label>Cenário cadastrado</Label>
              <Select value={scenarioId} onValueChange={setScenarioId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingScenarios ? "Carregando..." : "Selecione um cenário"} />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Duração das fases — minutos (mínimo {MIN_DURATION})
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fase 1 — Requisitos</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase1Duration(n => Math.max(MIN_DURATION, (typeof n === "number" ? n : MIN_DURATION) - 1))
                      }
                      disabled={typeof phase1Duration === "number" && phase1Duration <= MIN_DURATION}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={phase1Duration}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "")
                        setPhase1Duration(raw === "" ? "" : parseInt(raw, 10))
                      }}
                      onBlur={(e) =>
                        setPhase1Duration(clampMin(e.target.value, MIN_DURATION, DEFAULT_DURATION))
                      }
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                      className="w-12 text-center text-lg font-bold px-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase1Duration(n => (typeof n === "number" ? n : MIN_DURATION) + 1)
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fase 2 — Avaliação</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase2Duration(n => Math.max(MIN_DURATION, (typeof n === "number" ? n : MIN_DURATION) - 1))
                      }
                      disabled={typeof phase2Duration === "number" && phase2Duration <= MIN_DURATION}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={phase2Duration}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "")
                        setPhase2Duration(raw === "" ? "" : parseInt(raw, 10))
                      }}
                      onBlur={(e) =>
                        setPhase2Duration(clampMin(e.target.value, MIN_DURATION, DEFAULT_DURATION))
                      }
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                      className="w-12 text-center text-lg font-bold px-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase2Duration(n => (typeof n === "number" ? n : MIN_DURATION) + 1)
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fase 3 — Contestação</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase3Duration(n => Math.max(MIN_DURATION, (typeof n === "number" ? n : MIN_DURATION) - 1))
                      }
                      disabled={typeof phase3Duration === "number" && phase3Duration <= MIN_DURATION}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={phase3Duration}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "")
                        setPhase3Duration(raw === "" ? "" : parseInt(raw, 10))
                      }}
                      onBlur={(e) =>
                        setPhase3Duration(clampMin(e.target.value, MIN_DURATION, DEFAULT_CONTESTATION_DURATION))
                      }
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                      className="w-12 text-center text-lg font-bold px-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPhase3Duration(n => (typeof n === "number" ? n : MIN_DURATION) + 1)
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !title.trim() || !scenarioId || typeof expectedParticipants !== "number"}
                className="flex-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading
                  ? (isEditing ? "Salvando..." : "Criando...")
                  : (isEditing ? "Salvar alterações" : "Criar Partida")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Partida criada! Distribua os códigos abaixo para cada equipe.
            </p>

            <div className="space-y-2">
              {createdTeams.map((team) => (
                <div
                  key={team.teamNumber}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Equipe {team.teamNumber}</p>
                    <p className="font-mono font-bold text-lg text-primary">{team.roomCode}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(team.roomCode)}
                  >
                    {copiedCode === team.roomCode
                      ? <Check className="w-4 h-4 text-green-600" />
                      : <Copy className="w-4 h-4" />
                    }
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
        </div>
      </GameCard>
      <style>{`
        .match-modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
        .match-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .match-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .match-modal-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 9999px;
        }
      `}</style>
    </div>
  )
}