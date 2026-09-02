import { useState, useEffect } from "react"
import { supabase } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GameCard } from "@/components/ui/game-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, Minus, Loader2, Copy, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface CreatedTeam {
  teamNumber: number
  roomCode: string
  sessionId: string
}

interface Scenario {
  id: number
  name: string
}

interface CreateMatchModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const MIN_DURATION = 1
const MAX_DURATION = 60
const DEFAULT_DURATION = 10
const MIN_TEAMS = 2
const MAX_TEAMS = 10

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function generateCode(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
}

export const CreateMatchModal = ({ isOpen, onClose, onCreated }: CreateMatchModalProps) => {
  const [title, setTitle] = useState("")
  const [numTeams, setNumTeams] = useState<number | "">(2)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenarioId, setScenarioId] = useState<string>("")
  const [phase1Duration, setPhase1Duration] = useState<number | "">(DEFAULT_DURATION)
  const [phase2Duration, setPhase2Duration] = useState<number | "">(DEFAULT_DURATION)
  const [loading, setLoading] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadScenarios()
    }
  }, [isOpen])

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

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" })
      return
    }

    if (!scenarioId) {
      toast({ title: "Selecione um cenário", variant: "destructive" })
      return
    }

    const teamsCount = clampNumber(String(numTeams), MIN_TEAMS, MAX_TEAMS, MIN_TEAMS)
    const phase1 = clampNumber(String(phase1Duration), MIN_DURATION, MAX_DURATION, DEFAULT_DURATION)
    const phase2 = clampNumber(String(phase2Duration), MIN_DURATION, MAX_DURATION, DEFAULT_DURATION)

    setLoading(true)
    try {
      const matchCode = generateCode(6)

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          match_code: matchCode,
          title: title.trim(),
          num_teams: teamsCount,
          status: "waiting",
          scenario_id: parseInt(scenarioId, 10),
          phase1_duration_minutes: phase1,
          phase2_duration_minutes: phase2,
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
          })
          .select()
          .single()

        if (sessionError || !session) throw new Error(`Erro ao criar equipe ${i}`)
        teams.push({ teamNumber: i, roomCode: teamCode, sessionId: session.id })
      }

      setCreatedTeams(teams)
      onCreated()
      toast({ title: "Partida criada!", description: `${teamsCount} equipes prontas para receber alunos.` })
    } catch (err: any) {
      toast({ title: "Erro ao criar partida", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleClose = () => {
    setTitle("")
    setNumTeams(2)
    setScenarioId("")
    setPhase1Duration(DEFAULT_DURATION)
    setPhase2Duration(DEFAULT_DURATION)
    setCreatedTeams([])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <GameCard className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Nova Partida</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {createdTeams.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título da partida</Label>
              <Input
                placeholder="Ex: Turma A - Aula 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Número de equipes</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNumTeams(n => Math.max(MIN_TEAMS, (typeof n === "number" ? n : MIN_TEAMS) - 1))
                  }
                  disabled={typeof numTeams === "number" && numTeams <= MIN_TEAMS}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={numTeams}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "")
                    setNumTeams(raw === "" ? "" : parseInt(raw, 10))
                  }}
                  onBlur={(e) =>
                    setNumTeams(clampNumber(e.target.value, MIN_TEAMS, MAX_TEAMS, MIN_TEAMS))
                  }
                  className="w-14 text-center text-2xl font-bold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNumTeams(n => Math.min(MAX_TEAMS, (typeof n === "number" ? n : MIN_TEAMS) + 1))
                  }
                  disabled={typeof numTeams === "number" && numTeams >= MAX_TEAMS}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">equipes (máx. 10)</span>
              </div>
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
                Duração das fases — minutos (1 a {MAX_DURATION})
              </p>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fase 1 — Monte Requisitos</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPhase1Duration(n => Math.max(MIN_DURATION, (typeof n === "number" ? n : MIN_DURATION) - 1))
                      }
                      disabled={typeof phase1Duration === "number" && phase1Duration <= MIN_DURATION}
                    >
                      <Minus className="w-4 h-4" />
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
                        setPhase1Duration(clampNumber(e.target.value, MIN_DURATION, MAX_DURATION, DEFAULT_DURATION))
                      }
                      className="w-14 text-center text-xl font-bold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPhase1Duration(n => Math.min(MAX_DURATION, (typeof n === "number" ? n : MIN_DURATION) + 1))
                      }
                      disabled={typeof phase1Duration === "number" && phase1Duration >= MAX_DURATION}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fase 2 — Avaliação</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPhase2Duration(n => Math.max(MIN_DURATION, (typeof n === "number" ? n : MIN_DURATION) - 1))
                      }
                      disabled={typeof phase2Duration === "number" && phase2Duration <= MIN_DURATION}
                    >
                      <Minus className="w-4 h-4" />
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
                        setPhase2Duration(clampNumber(e.target.value, MIN_DURATION, MAX_DURATION, DEFAULT_DURATION))
                      }
                      className="w-14 text-center text-xl font-bold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPhase2Duration(n => Math.min(MAX_DURATION, (typeof n === "number" ? n : MIN_DURATION) + 1))
                      }
                      disabled={typeof phase2Duration === "number" && phase2Duration >= MAX_DURATION}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading || !title.trim() || !scenarioId} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? "Criando..." : "Criar Partida"}
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

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </GameCard>
    </div>
  )
}