import { useState, useEffect, useCallback, useRef } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, CheckCircle, XCircle, Trophy, Clock, Crown, Eye,
  MessageSquareWarning, Hourglass, Gavel, AlertCircle, X, ChevronRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import prototypeReference from "@/assets/prototype-reference.png"

type QuestionKey = "can_be_extracted" | "correctly_classified" | "is_complete"

const QUESTIONS: { key: QuestionKey; label: string }[] = [
  { key: "can_be_extracted", label: "O requisito pode ser extraído dos artefatos?" },
  { key: "correctly_classified", label: "O requisito está classificado corretamente?" },
  { key: "is_complete", label: "O requisito está completo?" },
]

const CLASSIFICATION_COLORS: Record<string, string> = {
  "funcional": "bg-game-info",
  "nao-funcional": "bg-game-warning",
  "inverso": "bg-game-purple",
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  "funcional": "Funcional",
  "nao-funcional": "Não-funcional",
  "inverso": "Inverso",
}

interface MyRequirementRow {
  requirement_id: string
  requirement_text: string
  classification: string
  assignment_id: string
  evaluation_id: string | null
  can_be_extracted: boolean | null
  can_be_extracted_note: string
  correctly_classified: boolean | null
  correctly_classified_note: string
  is_complete: boolean | null
  is_complete_note: string
  total_points: number
}

interface ContestationEntry {
  id?: string
  justification: string
  status: "pendente" | "aceita" | "recusada"
  professor_response: string | null
  dirty: boolean
}

interface ScenarioImage {
  src: string
  alt?: string
  caption?: string
}

interface Scenario {
  title: string
  description: string
  images?: ScenarioImage[]
}

const DEFAULT_SCENARIO: Scenario = {
  title: "Cenário da Partida",
  description:
    "Nenhum cenário foi configurado para esta partida ainda. Quando configurado, o título, a descrição e as imagens de protótipo aparecerão aqui.",
  images: [
    { src: prototypeReference, alt: "Protótipo de referência" }
  ]
}

interface ExampleSegment {
  text: string
  color?: string
}

interface RequirementVariant {
  label: string
  structure: string
  exampleNote?: string
  exampleSegments: ExampleSegment[]
}

interface RequirementGroup {
  category: "funcional" | "inverso" | "nao-funcional"
  color: string
  title: string
  description: string
  variants: RequirementVariant[]
}

const REQUIREMENT_GROUPS: RequirementGroup[] = [
  {
    category: "funcional",
    color: "bg-blue-50 border-blue-200",
    title: "Requisito Funcional",
    description: "Descreve as funções que o sistema deve executar, representando interações entre o sistema e seu ambiente.",
    variants: [
      {
        label: "Estrutura 1",
        structure: "O sistema deve + [ verbo + objeto | frase verbal ] + [ complemento de agente | null ] + { condição 1, condição-2, ..., condição-n }",
        exampleNote: "(sem complemento)",
        exampleSegments: [
          { text: "RF01 - ", color: "text-purple-600" },
          { text: "O sistema deve ", color: "text-red-600" },
          { text: "permitir ", color: "text-green-600" },
          { text: "a exclusão de mensagens ", color: "text-blue-600" },
          { text: "quando o Interlocutor selecionar a opção de apagar para todos", color: "text-orange-500" },
        ]
      },
      {
        label: "Estrutura 2",
        structure: 'O sistema deve + verbo + objeto + complemento + ["quando" | "se"] + condição',
        exampleSegments: [
          { text: "RF02 - ", color: "text-purple-600" },
          { text: "O sistema deve ", color: "text-red-600" },
          { text: "bloquear ", color: "text-green-600" },
          { text: "o acesso ", color: "text-blue-600" },
          { text: "do cliente ", color: "text-gray-600" },
          { text: "se a senha informada estiver incorreta", color: "text-orange-500" },
        ]
      }
    ]
  },
  {
    category: "inverso",
    color: "bg-purple-50 border-purple-200",
    title: "Requisito Inverso",
    description: "São situações que não devem ocorrer em situação alguma. São, de certa forma, restrições de alcance geral.",
    variants: [
      {
        label: "Estrutura",
        structure: "O sistema não pode + frase verbal",
        exampleSegments: [
          { text: "RI01 - ", color: "text-purple-600" },
          { text: "O sistema não pode ", color: "text-red-600" },
          { text: "perder dados do cliente", color: "text-green-600" },
        ]
      }
    ]
  },
  {
    category: "nao-funcional",
    color: "bg-orange-50 border-orange-200",
    title: "Requisito Não Funcional",
    description: "Definem qualidades e condições que o sistema deve atender, impondo restrições ao seu funcionamento; podem ser críticos para a utilidade e devem ser mensuráveis.",
    variants: [
      {
        label: "Estrutura 1",
        structure: "O sistema deve + [ verbo + objeto | frase verbal ] + [ complemento de agente | null ] + [ condição | null ] + [ restrição | null ]",
        exampleNote: "(sem condição)",
        exampleSegments: [
          { text: "RNF01 - ", color: "text-purple-600" },
          { text: "O sistema deve ", color: "text-red-600" },
          { text: "processar ", color: "text-green-600" },
          { text: "o pagamento ", color: "text-blue-600" },
          { text: "para a operadora ", color: "text-gray-600" },
          { text: "em menos de 3 segundos", color: "text-orange-500" },
        ]
      },
      {
        label: "Estrutura 2",
        structure: 'O sistema deve + [ "ter" | "manter" | "possuir" | "atender" | "fazer" | "ser" + objeto ] + [ frase-adjetiva | null ]',
        exampleSegments: [
          { text: "RNF02 - ", color: "text-purple-600" },
          { text: "O sistema deve ", color: "text-red-600" },
          { text: "possuir ", color: "text-green-600" },
          { text: "uma interface ", color: "text-blue-600" },
          { text: "que seja intuitiva e de fácil utilização", color: "text-gray-600" },
        ]
      },
      {
        label: "Estrutura 3",
        structure: 'Condição + o sistema deve + [ "ter" | "manter" | "possuir" | "atender" | "fazer" | "ser" + objeto ] + [ complemento de agente | null ] + [ frase-adjetiva | null ]',
        exampleNote: "(sem complemento e sem frase adjetiva)",
        exampleSegments: [
          { text: "RNF03 - ", color: "text-purple-600" },
          { text: "Em situações de alto volume de acessos ", color: "text-orange-500" },
          { text: "o sistema deve ", color: "text-red-600" },
          { text: "manter ", color: "text-green-600" },
          { text: "o desempenho", color: "text-blue-600" },
        ]
      }
    ]
  }
]

const HIGHLIGHT_TERMS: { pattern: string; color: string }[] = [
  { pattern: "o sistema não pode", color: "text-red-600" },
  { pattern: "o sistema nao pode", color: "text-red-600" },
  { pattern: "o sistema deve", color: "text-red-600" },
  { pattern: "complemento de agente", color: "text-gray-600" },
  { pattern: "frase-adjetiva", color: "text-gray-600" },
  { pattern: "frase verbal", color: "text-green-600" },
  { pattern: "condição", color: "text-orange-500" },
  { pattern: "condicao", color: "text-orange-500" },
  { pattern: "restrição", color: "text-orange-500" },
  { pattern: "restricao", color: "text-orange-500" },
  { pattern: "complemento", color: "text-gray-600" },
  { pattern: "verbo", color: "text-green-600" },
  { pattern: "objeto", color: "text-blue-600" },
  { pattern: "métrica", color: "text-pink-600" },
  { pattern: "metrica", color: "text-pink-600" },
  { pattern: "prefixo", color: "text-red-500" },
  { pattern: "manter", color: "text-green-600" },
  { pattern: "possuir", color: "text-green-600" },
  { pattern: "atender", color: "text-green-600" },
  { pattern: "fazer", color: "text-green-600" },
  { pattern: "ter", color: "text-green-600" },
  { pattern: "ser", color: "text-green-600" }
]

const HIGHLIGHT_REGEX = new RegExp(`\\b(${HIGHLIGHT_TERMS.map(t => t.pattern).join("|")})\\b`, "gi")

const HighlightedText = ({ text }: { text: string }) => {
  const parts = text.split(HIGHLIGHT_REGEX)
  return (
    <>
      {parts.map((part, i) => {
        const match = HIGHLIGHT_TERMS.find(t => t.pattern.toLowerCase() === part.toLowerCase())
        return match ? (
          <span key={i} className={`font-semibold ${match.color}`}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

const ExampleText = ({ segments }: { segments: ExampleSegment[] }) => (
  <>
    {segments.map((seg, i) => (
      <span key={i} className={seg.color ? `font-semibold ${seg.color}` : undefined}>
        {seg.text}
      </span>
    ))}
  </>
)

type TabKey = "estruturas" | "cenario"

type Stage = "loading" | "encerrada" | "aguardando_inicio" | "contestando" | "aguardando_revisao" | "final"

interface TeamContestationPhaseProps {
  sessionId: string
  participantId: string
  onBack: () => void
  onComplete: () => void
  scenario?: Scenario
}

function contestationKey(evaluationId: string, criterion: QuestionKey) {
  return `${evaluationId}:${criterion}`
}

function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") return value === "true" || value === "1"
  return Boolean(value)
}

export const TeamContestationPhase = ({ sessionId, participantId, onBack, onComplete, scenario }: TeamContestationPhaseProps) => {
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [leaderName, setLeaderName] = useState<string>("")
  const [selfName, setSelfName] = useState<string>("")
  const [selfPin, setSelfPin] = useState<string>("")
  const [myRequirements, setMyRequirements] = useState<MyRequirementRow[]>([])
  const [contestations, setContestations] = useState<Record<string, ContestationEntry>>({})
  const [submitting, setSubmitting] = useState(false)
  const [evaluatorAdjustment, setEvaluatorAdjustment] = useState(0)

  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [phase3StartedAt, setPhase3StartedAt] = useState<string | null>(null)
  const [phase3Submitted, setPhase3Submitted] = useState(false)
  const [matchPhase3EndedAt, setMatchPhase3EndedAt] = useState<string | null>(null)
  const [resultsReleasedAt, setResultsReleasedAt] = useState<string | null>(null)

  const [duration, setDuration] = useState<number>(300)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef<number>(300)
  const startTimeRef = useRef<Date | null>(null)
  const notifiedRef = useRef<{ oneMinute: boolean; timeUp: boolean }>({ oneMinute: false, timeUp: false })
  const prevDurationForToastRef = useRef<number | null>(null)
  const isFinalStageRef = useRef(false)

  const [activeTab, setActiveTab] = useState<TabKey>("cenario")
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)

  const edgeTabTouchStartX = useRef<number | null>(null)
  const EDGE_DRAG_THRESHOLD = 35

  const handleEdgeTabTouchStart = (e: React.TouchEvent) => {
    edgeTabTouchStartX.current = e.touches[0].clientX
  }

  const handleEdgeTabTouchMove = (e: React.TouchEvent) => {
    if (edgeTabTouchStartX.current === null) return
    const diff = e.touches[0].clientX - edgeTabTouchStartX.current
    if (diff > EDGE_DRAG_THRESHOLD) {
      setShowInfoDrawer(true)
      edgeTabTouchStartX.current = null
    }
  }

  const handleEdgeTabTouchEnd = () => {
    edgeTabTouchStartX.current = null
  }

  const { toast } = useToast()

  const activeScenario = scenario ?? DEFAULT_SCENARIO

  useEffect(() => {
    if (!showInfoDrawer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfoDrawer(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showInfoDrawer])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    if (isFinalStageRef.current) return
    const startTime = startTimeRef.current
    if (!startTime) return
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const remaining = Math.max(0, durationRef.current - elapsed)
    setTimeLeft(remaining)

    if (remaining <= 0) {
      if (!notifiedRef.current.timeUp) {
        notifiedRef.current.timeUp = true
        toast({
          title: "Tempo esgotado! ⏰",
          description: "O tempo de contestação acabou.",
          variant: "destructive",
        })
      }
      stopTimer()
    } else {
      notifiedRef.current.timeUp = false

      if (remaining <= 60 && !notifiedRef.current.oneMinute) {
        notifiedRef.current.oneMinute = true
        toast({
          title: "1 minuto restante! ⚠️",
          description: "Finalize suas contestações.",
          variant: "destructive",
        })
      } else if (remaining > 60) {
        notifiedRef.current.oneMinute = false
      }
    }
  }, [toast, stopTimer])

  const startTimer = useCallback((startTime: Date, durationSeconds: number) => {
    startTimeRef.current = startTime
    durationRef.current = durationSeconds
    setDuration(durationSeconds)
    notifiedRef.current = { oneMinute: false, timeUp: false }
    stopTimer()
    tick()
    intervalRef.current = setInterval(tick, 1000)
  }, [stopTimer, tick])

  useEffect(() => {
    const loadHost = async () => {
      const { data } = await supabase
        .from("session_participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true })

      if (data && data.length > 0) {
        setIsHost(data[0].id === participantId)
        setLeaderName(data[0].player_name)
        const self = data.find(p => p.id === participantId)
        if (self) {
          setSelfName(self.player_name)
          setSelfPin(self.pin ?? "")
        }
      }
    }
    if (sessionId && participantId) loadHost()
  }, [sessionId, participantId])

  const loadSessionAndMatch = useCallback(async () => {
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("id, match_id, phase3_started_at, phase3_duration, phase3_submitted_at, status")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      toast({ title: "Erro ao carregar a equipe", variant: "destructive" })
      return
    }

    if (session.status === "encerrado") {
      setSessionStatus("encerrado")
      return
    }

    setMatchId(session.match_id)
    setPhase3StartedAt(session.phase3_started_at)
    setPhase3Submitted(!!session.phase3_submitted_at)

    if (typeof session.phase3_duration === "number" && session.phase3_duration > 0) {
      durationRef.current = session.phase3_duration
      setDuration(session.phase3_duration)
      prevDurationForToastRef.current = session.phase3_duration
    }

    if (session.phase3_started_at) {
      startTimer(new Date(session.phase3_started_at), session.phase3_duration ?? 300)
    }

    if (session.match_id) {
      const { data: match } = await supabase
        .from("matches")
        .select("id, phase3_ended_at, results_released_at")
        .eq("id", session.match_id)
        .single()

      if (match) {
        setMatchPhase3EndedAt(match.phase3_ended_at)
        setResultsReleasedAt(match.results_released_at)
      }
    }
  }, [sessionId, toast, startTimer])

  const loadMyRequirements = useCallback(async () => {
    try {
      const { data: requirements, error: reqError } = await supabase
        .from("requirements")
        .select("id, requirement_text, classification")
        .eq("session_id", sessionId)

      if (reqError) throw reqError
      if (!requirements || requirements.length === 0) {
        setMyRequirements([])
        return
      }

      const requirementIds = requirements.map(r => r.id)

      const { data: assignments, error: assignError } = await supabase
        .from("requirement_assignments")
        .select("id, requirement_id, counts_for_score")
        .in("requirement_id", requirementIds)

      if (assignError) throw assignError

      const assignmentByRequirement = new Map<string, { id: string; counts: boolean }>()
      ;(assignments ?? []).forEach(a => {
        const counts = a.counts_for_score !== 0
        const existing = assignmentByRequirement.get(a.requirement_id)
        if (!existing || (!existing.counts && counts)) {
          assignmentByRequirement.set(a.requirement_id, { id: a.id, counts })
        }
      })
      const assignmentIds = (assignments ?? []).map(a => a.id)

      const { data: evaluations, error: evalError } = await supabase
        .from("requirement_evaluations")
        .select("*")
        .in("assignment_id", assignmentIds.length > 0 ? assignmentIds : ["00000000-0000-0000-0000-000000000000"])

      if (evalError) throw evalError

      const evaluationByAssignment = new Map<string, any>()
      ;(evaluations ?? []).forEach(e => evaluationByAssignment.set(e.assignment_id, e))

      const rows: MyRequirementRow[] = requirements.map(r => {
        const assignmentId = assignmentByRequirement.get(r.id)?.id ?? ""
        const evaluation = evaluationByAssignment.get(assignmentId)
        return {
          requirement_id: r.id,
          requirement_text: r.requirement_text,
          classification: r.classification,
          assignment_id: assignmentId,
          evaluation_id: evaluation?.id ?? null,
          can_be_extracted: toBool(evaluation?.can_be_extracted),
          can_be_extracted_note: evaluation?.can_be_extracted_note ?? "",
          correctly_classified: toBool(evaluation?.correctly_classified),
          correctly_classified_note: evaluation?.correctly_classified_note ?? "",
          is_complete: toBool(evaluation?.is_complete),
          is_complete_note: evaluation?.is_complete_note ?? "",
          total_points: evaluation?.total_points ?? 0,
        }
      })

      setMyRequirements(rows)

      const evaluationIds = rows.map(r => r.evaluation_id).filter((id): id is string => !!id)
      if (evaluationIds.length > 0) {
        const { data: existingContestations } = await supabase
          .from("requirement_contestations")
          .select("*")
          .in("evaluation_id", evaluationIds)

        if (existingContestations) {
          const map: Record<string, ContestationEntry> = {}
          existingContestations.forEach(c => {
            map[contestationKey(c.evaluation_id, c.criterion)] = {
              id: c.id,
              justification: c.team_justification,
              status: c.status,
              professor_response: c.professor_response,
              dirty: false,
            }
          })
          setContestations(prev => ({ ...map, ...prev }))
        }
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Erro ao carregar seus requisitos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [sessionId, toast])

  const loadEvaluatorAdjustment = useCallback(async () => {
    try {
      const { data: assignments, error: assignError } = await supabase
        .from("requirement_assignments")
        .select("id, counts_for_score")
        .eq("session_id", sessionId)
      if (assignError) throw assignError

      const scoringAssignmentIds = (assignments ?? [])
        .filter((a: any) => a.counts_for_score !== 0)
        .map((a: any) => a.id)

      if (scoringAssignmentIds.length === 0) {
        setEvaluatorAdjustment(0)
        return
      }

      const { data: evaluations, error: evalError } = await supabase
        .from("requirement_evaluations")
        .select("id")
        .in("assignment_id", scoringAssignmentIds)
      if (evalError) throw evalError

      const evaluationIds = (evaluations ?? []).map(e => e.id)
      if (evaluationIds.length === 0) {
        setEvaluatorAdjustment(0)
        return
      }

      const { data: contestationsAgainstUs, error: contError } = await supabase
        .from("requirement_contestations")
        .select("status")
        .in("evaluation_id", evaluationIds)
      if (contError) throw contError

      const adjustment = (contestationsAgainstUs ?? []).reduce((sum, c: any) => {
        if (c.status === "aceita") return sum - 1
        if (c.status === "recusada") return sum + 1
        return sum
      }, 0)

      setEvaluatorAdjustment(adjustment)
    } catch (err) {
      console.error(err)
    }
  }, [sessionId])

  useEffect(() => {
    loadSessionAndMatch()
    loadMyRequirements()
    loadEvaluatorAdjustment()
  }, [loadSessionAndMatch, loadMyRequirements, loadEvaluatorAdjustment])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`contestation-session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const newData = payload.new

          if (newData.status === "encerrado") {
            stopTimer()
            setSessionStatus("encerrado")
            return
          }

          if (typeof newData.phase3_duration === "number" && newData.phase3_duration > 0) {
            const prev = prevDurationForToastRef.current
            if (prev !== null && newData.phase3_duration !== prev && !isFinalStageRef.current) {
              const diffMin = Math.round((newData.phase3_duration - prev) / 60)
              toast({
                title: diffMin > 0 ? `+${diffMin} min na Contestação ⏱️` : `${diffMin} min na Contestação ⏱️`,
                description: "O professor ajustou o tempo da fase.",
              })
            }
            prevDurationForToastRef.current = newData.phase3_duration
            durationRef.current = newData.phase3_duration
            setDuration(newData.phase3_duration)
          }

          if (newData.phase3_started_at && !startTimeRef.current) {
            setPhase3StartedAt(newData.phase3_started_at)
            startTimer(new Date(newData.phase3_started_at), newData.phase3_duration ?? durationRef.current)
          }

          if (newData.phase3_submitted_at) {
            setPhase3Submitted(true)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, startTimer, stopTimer])

  useEffect(() => {
    if (!matchId) return
    const channel = supabase
      .channel(`contestation-match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const newData = payload.new
          if (newData.phase3_ended_at) setMatchPhase3EndedAt(newData.phase3_ended_at)
          if (newData.results_released_at) setResultsReleasedAt(newData.results_released_at)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`contestation-rows-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requirement_contestations", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row: any = payload.new
          if (!row) return
          setContestations(prev => ({
            ...prev,
            [contestationKey(row.evaluation_id, row.criterion)]: {
              id: row.id,
              justification: row.team_justification,
              status: row.status,
              professor_response: row.professor_response,
              dirty: false,
            },
          }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`evaluator-adjustment-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requirement_contestations" },
        () => { loadEvaluatorAdjustment() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, loadEvaluatorAdjustment])

  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    if (!loading && myRequirements.length === 0) {
      stopTimer()
    }
  }, [loading, myRequirements, stopTimer])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const handleJustificationChange = (evaluationId: string, criterion: QuestionKey, value: string) => {
    if (!isHost) return
    setContestations(prev => ({
      ...prev,
      [contestationKey(evaluationId, criterion)]: {
        ...(prev[contestationKey(evaluationId, criterion)] ?? { status: "pendente", professor_response: null, dirty: false, justification: "" }),
        justification: value,
        dirty: true,
      },
    }))
  }

  const partialTotal = myRequirements.reduce((sum, r) => sum + r.total_points, 0)
  const partialMax = myRequirements.length * 3

  const handleSubmitContestations = async () => {
    if (!isHost) {
      toast({ title: "Ação não permitida", description: "Apenas o líder pode enviar as contestações.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const rowsToUpsert = myRequirements.flatMap(req => {
        if (!req.evaluation_id) return []
        return QUESTIONS.filter(q => req[q.key] === false).flatMap(q => {
          const entry = contestations[contestationKey(req.evaluation_id!, q.key)]
          if (!entry || !entry.justification.trim() || !entry.dirty) return []
          return [{
            evaluation_id: req.evaluation_id,
            session_id: sessionId,
            requirement_id: req.requirement_id,
            criterion: q.key,
            team_justification: entry.justification.trim(),
          }]
        })
      })

      if (rowsToUpsert.length > 0) {
        const { error } = await supabase
          .from("requirement_contestations")
          .upsert(rowsToUpsert, { onConflict: "evaluation_id,criterion" })
        if (error) throw error
      }

      const { error: sessionError } = await supabase
        .from("game_sessions")
        .update({ phase3_submitted_at: new Date().toISOString() })
        .eq("id", sessionId)
      if (sessionError) throw sessionError

      stopTimer()
      setPhase3Submitted(true)
      toast({
        title: rowsToUpsert.length > 0 ? "Contestações enviadas!" : "Ok, sem contestações",
        description: "Aguardando a revisão do professor.",
      })
    } catch (err) {
      console.error(err)
      toast({ title: "Erro ao enviar contestações", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const hasNoRequirements = !loading && myRequirements.length === 0

  const stage: Stage = loading
    ? "loading"
    : sessionStatus === "encerrado"
      ? "encerrada"
      : resultsReleasedAt
        ? "final"
        : hasNoRequirements
          ? "aguardando_revisao"
          : (matchPhase3EndedAt || phase3Submitted)
            ? "aguardando_revisao"
            : phase3StartedAt
              ? "contestando"
              : "aguardando_inicio"

  useEffect(() => {
    isFinalStageRef.current = stage === "final"
    if (stage === "final") {
      stopTimer()
    }
  }, [stage, stopTimer])

  const renderInfoPanelContent = () => (
    <>
      <div className="flex gap-1 flex-shrink-0 pb-2 mb-1 border-b border-border">
        {([
          { key: "cenario", label: "Cenário da Partida" },
          { key: "estruturas", label: "Estruturas" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs sm:text-sm font-medium px-2 py-1.5 rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto pr-1 space-y-3 flex-1 min-h-0">
        {activeTab === "cenario" && (
          <>
            {activeScenario.title && activeScenario.title !== 'Cenário da Partida' && (
              <p className="font-bold text-lg text-primary flex-shrink-0">{activeScenario.title}</p>
            )}
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {activeScenario.description}
            </p>
            {activeScenario.images?.map((img, idx) => (
              <div key={idx} className="space-y-1">
                <img
                  src={img.src}
                  alt={img.alt || `Protótipo ${idx + 1}`}
                  className="rounded-lg border w-full object-contain max-h-[26rem] lg:max-h-80"
                />
                {img.caption && (
                  <p className="text-xs text-muted-foreground text-center">
                    {img.caption}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === "estruturas" && (
          <div className="space-y-3">
            {REQUIREMENT_GROUPS.map((group, idx) => (
              <div key={idx} className={`rounded-lg border p-3 space-y-3 ${group.color}`}>
                <div className="space-y-1">
                  <p className="font-bold text-sm">{group.title}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                {group.variants.map((v, vIdx) => (
                  <div key={vIdx} className="space-y-1">
                    <p className="text-xs font-semibold">{v.label}</p>
                    <p className="text-xs font-mono bg-white/60 rounded p-1.5 break-words">
                      <HighlightedText text={v.structure} />
                    </p>
                    <p className="text-xs font-semibold">
                      Exemplo{v.exampleNote ? ` ${v.exampleNote}` : ""}
                    </p>
                    <p className="text-xs italic">
                      <ExampleText segments={v.exampleSegments} />
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-lg font-semibold">Carregando pontuação da equipe...</h3>
          </div>
        </GameCard>
      </div>
    )
  }

  if (stage === "encerrada") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Partida encerrada</h3>
          <p className="text-muted-foreground">
            O professor encerrou esta partida.
          </p>
          <Button onClick={onBack} variant="outline">Voltar</Button>
        </GameCard>
      </div>
    )
  }

  if (stage === "aguardando_inicio") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <Hourglass className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">Correção encerrada</h3>
          <p className="text-muted-foreground">
            Aguardando o professor iniciar o momento de contestação. Assim que ele liberar, sua pontuação parcial aparece aqui automaticamente.
          </p>
          {selfName && (
            <p className="text-xs text-muted-foreground">
              User: <strong>{selfName}</strong>{selfPin && ` | PIN: ${selfPin}`}
            </p>
          )}
        </GameCard>
      </div>
    )
  }

  if (stage === "aguardando_revisao") {
    const liveTotal = partialTotal + evaluatorAdjustment
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <Gavel className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">
            {hasNoRequirements ? "Aguardando pontuação final" : "Aguardando o professor"}
          </h3>
          <p className="text-muted-foreground">
            {hasNoRequirements
              ? "Sua equipe não criou requisitos nesta partida, então não há nada para contestar como autora. Sua pontuação ainda pode subir, cair ou ficar negativa, dependendo do que acontecer com a contestação da equipe que vocês avaliaram."
              : "Suas contestações foram enviadas. O professor está revisando cada uma; a pontuação final aparece aqui assim que ele concluir."}
          </p>
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-2xl font-bold text-primary">
              {hasNoRequirements ? liveTotal : `${partialTotal}/${partialMax}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {hasNoRequirements ? "Pontuação atual (pode mudar)" : "Pontuação parcial (como equipe autora)"}
            </div>
          </div>
          {selfName && (
            <p className="text-xs text-muted-foreground">
              User: <strong>{selfName}</strong>{selfPin && ` | PIN: ${selfPin}`}
            </p>
          )}
        </GameCard>
      </div>
    )
  }

  if (stage === "final") {
    const authorAdjustment = Object.values(contestations).reduce((sum, c) => {
      if (c.status === "aceita") return sum + 1
      if (c.status === "recusada") return sum - 1
      return sum
    }, 0)
    const finalTotal = partialTotal + authorAdjustment + evaluatorAdjustment

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Button variant="ghost" onClick={onBack} className="hover:bg-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Lobby
            </Button>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="px-4 py-2">
                <Trophy className="w-4 h-4 mr-2" />
                Fase 2: Resultado Final
              </Badge>
              {selfName && (
                <Badge variant="outline" className="px-4 py-2">
                  User: {selfName}{selfPin && ` | PIN: ${selfPin}`}
                </Badge>
              )}
            </div>
          </div>

          <GameCard variant="gradient" className="text-center space-y-6">
            <Trophy className="w-16 h-16 mx-auto text-game-warning" />
            <h2 className="text-3xl font-bold">Pontuação Final da Equipe</h2>
            <div className="text-4xl font-bold text-primary">{finalTotal}</div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Como equipe autora: {partialTotal}/{partialMax}
                {authorAdjustment !== 0 && (
                  <> {authorAdjustment > 0 ? `+${authorAdjustment}` : authorAdjustment} (contestações)</>
                )}
              </p>
              {evaluatorAdjustment !== 0 && (
                <p>
                  Como equipe avaliadora: {evaluatorAdjustment > 0 ? `+${evaluatorAdjustment}` : evaluatorAdjustment}
                  {evaluatorAdjustment < 0
                    ? " (uma correção sua foi contestada e o professor deu razão à outra equipe)"
                    : " (suas correções foram confirmadas pelo professor)"}
                </p>
              )}
            </div>

            {myRequirements.length > 0 ? (
              <div className="space-y-3 text-left max-h-96 overflow-y-auto">
                {myRequirements.map((req, index) => (
                  <div key={req.requirement_id} className="p-3 bg-muted/20 rounded-lg space-y-1">
                    <div className="font-medium text-sm">Requisito {index + 1}: {req.requirement_text}</div>
                    {QUESTIONS.map(q => {
                      const answer = req[q.key]
                      const entry = req.evaluation_id ? contestations[contestationKey(req.evaluation_id, q.key)] : undefined
                      return (
                        <div key={q.key} className="text-xs flex items-start gap-2">
                          {answer ? <CheckCircle className="w-3.5 h-3.5 text-game-success mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />}
                          <div>
                            <span>{q.label} <strong>{answer ? "Sim" : "Não"}</strong></span>
                            {entry && (
                              <div className="text-muted-foreground">
                                Contestação: <strong>{entry.status === "aceita" ? "Aceita" : entry.status === "recusada" ? "Recusada" : "Pendente"}</strong>
                                {entry.professor_response && ` — ${entry.professor_response}`}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sua equipe não criou requisitos nesta partida.
              </p>
            )}

            <Button onClick={onComplete} size="lg">
              <CheckCircle className="w-5 h-5 mr-2" />
              Concluir
            </Button>
          </GameCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
      <button
        type="button"
        onClick={() => setShowInfoDrawer(true)}
        onTouchStart={handleEdgeTabTouchStart}
        onTouchMove={handleEdgeTabTouchMove}
        onTouchEnd={handleEdgeTabTouchEnd}
        aria-label="Abrir Cenário e Estruturas"
        className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-r-xl pl-1.5 pr-2 py-3 shadow-lg active:scale-95 transition-transform"
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-[10px] font-semibold [writing-mode:vertical-rl] tracking-wide">
          Cenário e Estruturas
        </span>
      </button>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Lobby
          </Button>

          <div className="flex flex-row items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
              <MessageSquareWarning className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Fase 2: Contestação
            </Badge>
            {selfName && (
              <Badge variant="outline" className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm max-w-[60vw] sm:max-w-none truncate">
                User: {selfName}{selfPin && ` | PIN: ${selfPin}`}
              </Badge>
            )}
          </div>
        </div>

        {showInfoDrawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowInfoDrawer(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-background shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="font-semibold text-sm">Cenário e Estruturas</h3>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col flex-1 min-h-0 p-4">
                {renderInfoPanelContent()}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <aside
            className="hidden lg:flex lg:w-[26rem] lg:flex-shrink-0 lg:sticky lg:top-4 flex-col"
            style={{ height: 'calc(100vh - 5rem)' }}
          >
            <GameCard className="flex flex-col gap-3 h-full">
              {renderInfoPanelContent()}
            </GameCard>
          </aside>

          <div className="flex-1 w-full lg:max-w-4xl space-y-6">
            {!isHost && (
              <GameCard className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {leaderName
                      ? `Apenas o líder da equipe (${leaderName}) pode contestar. Acompanhe abaixo.`
                      : "Apenas o líder da equipe pode contestar. Acompanhe abaixo."}
                  </p>
                </div>
              </GameCard>
            )}

            {isHost && (
              <GameCard className="p-4 bg-game-success/5 border-game-success/20">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-game-success flex-shrink-0" />
                  <p className="text-sm">
                    Você é o <strong>líder</strong>. Contestar é uma aposta: se o professor aceitar, sua equipe ganha 1 ponto; se recusar, sua equipe perde 1 ponto. Só conteste nos itens em que a equipe realmente acha que a correção está errada.
                  </p>
                </div>
              </GameCard>
            )}

            <GameCard variant="gradient" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Tempo de Contestação</span>
                </div>
                <div className={`text-2xl font-mono font-bold ${
                  timeLeft <= 60 ? "text-red-500 animate-pulse" :
                  timeLeft <= 300 ? "text-yellow-500" : "text-green-500"
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              <div className="mt-2">
                <Progress
                  value={duration > 0 ? (timeLeft / duration) * 100 : 0}
                  className="h-2"
                />
              </div>
              {timeLeft <= 60 && (
                <p className="text-center text-red-500 text-sm font-medium mt-2 animate-pulse">
                  ⚠️ Último minuto! Finalize suas contestações!
                </p>
              )}
            </GameCard>

            <GameCard variant="gradient" className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{partialTotal}/{partialMax}</div>
              <div className="text-sm text-muted-foreground">Pontuação parcial da equipe (como autora)</div>
            </GameCard>

            <div className="space-y-4">
              {myRequirements.map((req, index) => {
                const hasAnyNo = QUESTIONS.some(q => req[q.key] === false)
                return (
                  <GameCard key={req.requirement_id} className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-sm sm:text-lg font-semibold">Requisito {index + 1}:</span>
                      <Badge className={`capitalize text-white text-xs sm:text-sm ${CLASSIFICATION_COLORS[req.classification] ?? "bg-muted-foreground"}`}>
                        {CLASSIFICATION_LABELS[req.classification] ?? req.classification}
                      </Badge>
                      <Badge className="bg-primary text-white ml-auto text-xs sm:text-sm">{req.total_points}/3</Badge>
                    </div>
                    <div className="p-2.5 sm:p-4 bg-gradient-to-r from-primary/10 to-game-purple/10 rounded-lg border-l-4 border-primary">
                      <p className="text-sm sm:text-base font-medium">"{req.requirement_text}"</p>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      {QUESTIONS.map(q => {
                        const answer = req[q.key]
                        const note = req[`${q.key}_note` as keyof MyRequirementRow] as string
                        const evaluationId = req.evaluation_id
                        const entry = evaluationId ? contestations[contestationKey(evaluationId, q.key)] : undefined

                        return (
                          <div key={q.key} className="p-2.5 sm:p-3 bg-muted/10 rounded-lg space-y-1 sm:space-y-1.5">
                            <div className="flex items-start gap-1.5 sm:gap-2">
                              {answer ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-game-success mt-0.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive mt-0.5 flex-shrink-0" />}
                              <span className="text-xs sm:text-sm font-medium">{q.label} <strong>{answer ? "Sim" : "Não"}</strong></span>
                            </div>
                            {answer === false && note && (
                              <p className="text-[11px] sm:text-xs text-muted-foreground pl-5 sm:pl-6">Justificativa da correção: {note}</p>
                            )}

                            {answer === false && evaluationId && (
                              <div className="pl-5 sm:pl-6 space-y-1">
                                <label className="text-[11px] sm:text-xs font-medium">
                                  Contestar (aceita = +1, recusada = -1)
                                </label>
                                <Textarea
                                  placeholder={isHost ? "Explique por que sua equipe acha que essa correção está errada..." : "A equipe ainda não contestou este item."}
                                  value={entry?.justification ?? ""}
                                  onChange={(e) => handleJustificationChange(evaluationId, q.key, e.target.value)}
                                  readOnly={!isHost}
                                  className={`min-h-14 sm:min-h-16 text-xs sm:text-sm ${!isHost ? "bg-muted/30 cursor-not-allowed" : ""}`}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {!hasAnyNo && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground italic">Todos os critérios foram avaliados como "Sim" — nada a contestar aqui.</p>
                      )}
                    </div>
                  </GameCard>
                )
              })}
            </div>

            {isHost && (
              <GameCard>
                <Button
                  onClick={handleSubmitContestations}
                  disabled={submitting}
                  className="w-full h-12 text-lg font-medium bg-gradient-to-r from-primary to-game-purple hover:shadow-game transition-all duration-200 hover:scale-105"
                >
                  <Gavel className="w-5 h-5 mr-2" />
                  {submitting ? "Enviando..." : "Finalizar Contestação"}
                </Button>
              </GameCard>
            )}

            {!isHost && (
              <GameCard className="text-center p-4">
                <p className="text-sm text-muted-foreground">
                  Aguardando o líder revisar e finalizar as contestações da equipe.
                </p>
              </GameCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}