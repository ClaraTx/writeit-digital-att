import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Minus, Clock, Play, StopCircle, Trophy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const MIN_DURATION = 1
const MAX_DURATION = 60

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = Math.floor(clamped % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export interface MatchTimerData {
  id: string
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
  status: string
}

export interface MatchTimerSessionData {
  status: string
  phase2_submitted_at: string | null
  phase3_submitted_at: string | null
}

interface MatchTimerProps {
  match: MatchTimerData
  sessions: MatchTimerSessionData[]
  pendingContestations: number
  onEndPhase1: (matchId: string) => void
  onStartPhase2: (matchId: string) => void
  onEndPhase2: (matchId: string) => void
  onStartPhase3: (matchId: string) => void
  onEndPhase3: (matchId: string) => void
  onReleaseResults: (matchId: string) => void
  onAdjustDuration: (matchId: string, phase: 1 | 2 | 3, minutes: number) => void
  onEndMatch: () => void
}

export type Phase =
  | "waiting"
  | "phase1"
  | "phase1_done"
  | "phase2"
  | "phase2_done"
  | "phase3"
  | "phase3_done"
  | "final"
  | "ended"

export function getMatchPhase(match: MatchTimerData): Phase {
  if (match.status === "encerrado") return "ended"
  if (match.results_released_at) return "final"
  if (match.phase3_ended_at) return "phase3_done"
  if (match.phase3_started_at) return "phase3"
  if (match.phase2_ended_at) return "phase2_done"
  if (match.phase2_started_at) return "phase2"
  if (match.phase1_ended_at) return "phase1_done"
  if (match.phase1_started_at) return "phase1"
  return "waiting"
}

export const MatchTimer = ({
  match,
  sessions,
  pendingContestations,
  onEndPhase1,
  onStartPhase2,
  onEndPhase2,
  onStartPhase3,
  onEndPhase3,
  onReleaseResults,
  onAdjustDuration,
  onEndMatch,
}: MatchTimerProps) => {
  const [now, setNow] = useState(() => Date.now())
  const firedTimeUp = useRef<string | null>(null)
  const phase2AutoFired = useRef(false)
  const phase3AutoFired = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const phase = getMatchPhase(match)

  const activeSessions = sessions.filter(s => s.status !== "encerrado")
  const phase2SubmittedCount = activeSessions.filter(s => !!s.phase2_submitted_at).length
  const phase3SubmittedCount = activeSessions.filter(s => !!s.phase3_submitted_at).length
  const allPhase2Submitted = activeSessions.length > 0 && phase2SubmittedCount === activeSessions.length
  const allPhase3Submitted = activeSessions.length > 0 && phase3SubmittedCount === activeSessions.length

  useEffect(() => {
    if (phase === "phase2" && allPhase2Submitted && !phase2AutoFired.current) {
      phase2AutoFired.current = true
      onEndPhase2(match.id)
    }
  }, [phase, allPhase2Submitted, match.id, onEndPhase2])

  useEffect(() => {
    if (phase === "phase3" && allPhase3Submitted && !phase3AutoFired.current) {
      phase3AutoFired.current = true
      onEndPhase3(match.id)
    }
  }, [phase, allPhase3Submitted, match.id, onEndPhase3])

  const phase1Deadline = match.phase1_started_at
    ? new Date(match.phase1_started_at).getTime() + match.phase1_duration_minutes * 60000
    : null
  const phase2Deadline = match.phase2_started_at
    ? new Date(match.phase2_started_at).getTime() + match.phase2_duration_minutes * 60000
    : null
  const phase3Deadline = match.phase3_started_at
    ? new Date(match.phase3_started_at).getTime() + match.phase3_duration_minutes * 60000
    : null

  const deadline =
    phase === "phase3" ? phase3Deadline :
    phase === "phase2" ? phase2Deadline :
    phase === "phase1" ? phase1Deadline : null
  const remainingSeconds = deadline ? (deadline - now) / 1000 : null

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds > 0) return
    if (phase !== "phase1" && phase !== "phase2" && phase !== "phase3") return

    const key = `${match.id}-${phase}-timeup`
    if (firedTimeUp.current === key) return
    firedTimeUp.current = key

    if (phase === "phase1") onEndPhase1(match.id)
    else if (phase === "phase2") onEndPhase2(match.id)
    else onEndPhase3(match.id)
  }, [phase, remainingSeconds, match.id, onEndPhase1, onEndPhase2, onEndPhase3])

  const currentDuration =
    phase === "phase3" ? match.phase3_duration_minutes :
    phase === "phase2" ? match.phase2_duration_minutes :
    match.phase1_duration_minutes
  const currentPhaseNumber: 1 | 2 | 3 =
    phase === "phase3" ? 3 : phase === "phase2" ? 2 : 1

  const totalForEdit =
    phase === "phase1_done" ? match.phase2_duration_minutes :
    phase === "phase2_done" ? match.phase3_duration_minutes :
    match.phase1_duration_minutes
  const totalPhaseForEdit: 1 | 2 | 3 =
    phase === "phase1_done" ? 2 : phase === "phase2_done" ? 3 : 1

  const [totalInput, setTotalInput] = useState(String(totalForEdit))
  useEffect(() => {
    if (phase === "waiting" || phase === "phase1_done" || phase === "phase2_done") {
      setTotalInput(String(totalForEdit))
    }
  }, [phase, totalForEdit])

  const commitTotal = () => {
    const clamped = clampNumber(totalInput, MIN_DURATION, MAX_DURATION, totalForEdit)
    if (clamped !== totalForEdit) {
      onAdjustDuration(match.id, totalPhaseForEdit, clamped)
      toast({ title: "Tempo editado", description: `Fase ${totalPhaseForEdit} agora dura ${clamped} min` })
    }
    setTotalInput(String(clamped))
  }

  const [amountInput, setAmountInput] = useState("1")

  const commitAmount = () => {
    setAmountInput(String(clampNumber(amountInput, 1, MAX_DURATION, 1)))
  }

  const applyDelta = (sign: 1 | -1) => {
    const amount = clampNumber(amountInput, 1, MAX_DURATION, 1)
    const next = Math.min(MAX_DURATION, Math.max(MIN_DURATION, currentDuration + sign * amount))
    onAdjustDuration(match.id, currentPhaseNumber, next)
    const phaseLabel = currentPhaseNumber === 1 ? "Fase 1" : currentPhaseNumber === 2 ? "Fase 2" : "Contestação"
    if (sign === 1) {
      toast({ title: "Tempo adicionado", description: `+${amount} min na ${phaseLabel}` })
    } else {
      toast({ title: "Tempo reduzido", description: `-${amount} min na ${phaseLabel}` })
    }
  }

  if (phase === "waiting") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Fase 1
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 1, Math.max(MIN_DURATION, match.phase1_duration_minutes - 1))}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={totalInput}
          onChange={(e) => setTotalInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitTotal}
          onKeyDown={(e) => { if (e.key === "Enter") { commitTotal(); e.currentTarget.blur() } }}
          className="w-14 h-7 text-center text-sm font-mono border-muted-foreground/30"
          title="Digite o novo tempo total da Fase 1"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 1, Math.min(MAX_DURATION, match.phase1_duration_minutes + 1))}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <span className="text-sm text-muted-foreground">min</span>
      </div>
    )
  }

  if (phase === "phase1_done") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
          Aguardando Fase 2
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 2, Math.max(MIN_DURATION, match.phase2_duration_minutes - 1))}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={totalInput}
          onChange={(e) => setTotalInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitTotal}
          onKeyDown={(e) => { if (e.key === "Enter") { commitTotal(); e.currentTarget.blur() } }}
          className="w-14 h-7 text-center text-sm font-mono border-muted-foreground/30"
          title="Digite o tempo total da Fase 2"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 2, Math.min(MAX_DURATION, match.phase2_duration_minutes + 1))}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <span className="text-sm text-muted-foreground">min</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={onEndMatch}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Partida
        </Button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-7"
          onClick={() => onStartPhase2(match.id)}
        >
          <Play className="w-3.5 h-3.5" />
          Iniciar Fase 2
        </Button>
      </div>
    )
  }

  if (phase === "phase2_done") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
          Aguardando Contestação
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 3, Math.max(MIN_DURATION, match.phase3_duration_minutes - 1))}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={totalInput}
          onChange={(e) => setTotalInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitTotal}
          onKeyDown={(e) => { if (e.key === "Enter") { commitTotal(); e.currentTarget.blur() } }}
          className="w-14 h-7 text-center text-sm font-mono border-muted-foreground/30"
          title="Digite o tempo total da Contestação"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAdjustDuration(match.id, 3, Math.min(MAX_DURATION, match.phase3_duration_minutes + 1))}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <span className="text-sm text-muted-foreground">min</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={onEndMatch}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Partida
        </Button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-7"
          onClick={() => onStartPhase3(match.id)}
        >
          <Play className="w-3.5 h-3.5" />
          Iniciar Contestação
        </Button>
      </div>
    )
  }

  if (phase === "phase3_done") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
          Aguardando revisão do professor
        </span>
        {pendingContestations > 0 && (
          <span className="text-xs text-orange-700 font-medium">
            {pendingContestations} contestação{pendingContestations > 1 ? "ões" : ""} pendente{pendingContestations > 1 ? "s" : ""}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={onEndMatch}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Partida
        </Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-7"
          onClick={() => onReleaseResults(match.id)}
          disabled={pendingContestations > 0}
          title={pendingContestations > 0 ? "Revise todas as contestações pendentes antes de liberar o resultado" : undefined}
        >
          <Trophy className="w-3.5 h-3.5" />
          Liberar Resultado
        </Button>
      </div>
    )
  }

  if (phase === "final") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
          Resultado Liberado
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={onEndMatch}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Partida
        </Button>
      </div>
    )
  }

  if (phase === "ended") {
    return <span className="text-sm text-muted-foreground">Encerrada</span>
  }

  const phaseLabel = phase === "phase1" ? "Fase 1" : phase === "phase2" ? "Fase 2" : "Contestação"
  const phaseBadgeClass = phase === "phase1" ? "bg-blue-100 text-blue-800" : phase === "phase2" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"
  const submittedCount = phase === "phase2" ? phase2SubmittedCount : phase === "phase3" ? phase3SubmittedCount : null

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phaseBadgeClass}`}>
        {phaseLabel}
      </span>

      {(phase === "phase2" || phase === "phase3") && activeSessions.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {submittedCount}/{activeSessions.length} equipes concluíram
        </span>
      )}

      <span className="font-mono text-lg font-bold tabular-nums">
        {formatTime(remainingSeconds ?? 0)}
      </span>

      <Button
        variant="outline"
        size="sm"
        className="h-6 w-6 p-0"
        title="Tirar o tempo digitado"
        onClick={() => applyDelta(-1)}
      >
        <Minus className="w-3 h-3" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        value={amountInput}
        onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commitAmount}
        onKeyDown={(e) => { if (e.key === "Enter") { commitAmount(); e.currentTarget.blur() } }}
        className="w-12 h-7 text-center text-sm font-mono border-primary/40 bg-primary/5"
        title="Quantos minutos somar ou tirar"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-6 w-6 p-0"
        title="Somar o tempo digitado"
        onClick={() => applyDelta(1)}
      >
        <Plus className="w-3 h-3" />
      </Button>
      <span className="text-xs text-muted-foreground">min</span>

      {phase === "phase1" && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={() => onEndPhase1(match.id)}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Fase 1
        </Button>
      )}

      {phase === "phase2" && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={() => onEndPhase2(match.id)}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Fase 2
        </Button>
      )}

      {phase === "phase3" && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
          onClick={() => onEndPhase3(match.id)}
        >
          <StopCircle className="w-3.5 h-3.5" />
          Encerrar Contestação
        </Button>
      )}
    </div>
  )
}