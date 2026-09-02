import { useState, useEffect, useCallback, useRef } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, XCircle, Trophy, RefreshCw, Users, Clock, Crown, Eye, AlertCircle, ChevronRight, X, Hourglass, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import prototypeReference from "@/assets/prototype-reference.png"

interface Requirement {
  id: string
  text: string
  classification: string
  assignmentId?: string
  createdBy?: string
  countsForScore?: boolean
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

interface TeamJudgmentPhaseProps {
  sessionId: string
  participantId: string
  requirements: Requirement[]
  onComplete: () => void
  onBack: () => void
  phaseDuration?: number
  scenario?: Scenario
}

type QuestionKey = "extraidaArtefatos" | "classificacaoCorreta" | "completo"

interface RequirementValidation {
  extraidaArtefatos: boolean | null
  extraidaArtefatosJustificativa: string
  classificacaoCorreta: boolean | null
  classificacaoCorretaJustificativa: string
  completo: boolean | null
  completoJustificativa: string
}

const createEmptyValidation = (): RequirementValidation => ({
  extraidaArtefatos: null,
  extraidaArtefatosJustificativa: "",
  classificacaoCorreta: null,
  classificacaoCorretaJustificativa: "",
  completo: null,
  completoJustificativa: "",
})

function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") return value === "true" || value === "1"
  return Boolean(value)
}

const QUESTIONS: { key: QuestionKey; label: string }[] = [
  { key: "extraidaArtefatos", label: "O requisito pode ser extraído dos artefatos?" },
  { key: "classificacaoCorreta", label: "O requisito está classificado corretamente?" },
  { key: "completo", label: "O requisito está completo?" },
]

type TabKey = "estruturas" | "cenario"

export const TeamJudgmentPhase = ({ sessionId, participantId, requirements: initialRequirements, onBack, onComplete, phaseDuration = 900, scenario }: TeamJudgmentPhaseProps) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements || [])
  const [validations, setValidations] = useState<Record<string, RequirementValidation>>({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [leaderName, setLeaderName] = useState<string>("")
  const [ended, setEnded] = useState(false)
  const [selfName, setSelfName] = useState<string>("")
  const [selfPin, setSelfPin] = useState<string>("")

  const [activeTab, setActiveTab] = useState<TabKey>("cenario")
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)
  const activeScenario = scenario ?? DEFAULT_SCENARIO

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

  const [duration, setDuration] = useState<number>(phaseDuration)
  const durationRef = useRef<number>(phaseDuration)
  useEffect(() => { durationRef.current = duration }, [duration])
  const prevDurationForToastRef = useRef<number | null>(null)

  const [timeLeft, setTimeLeft] = useState<number>(phaseDuration)
  const [phaseStartTime, setPhaseStartTime] = useState<Date | null>(null)
  const phaseStartTimeRef = useRef<Date | null>(null)
  useEffect(() => { phaseStartTimeRef.current = phaseStartTime }, [phaseStartTime])

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeUpNotifiedRef = useRef(false)
  const fiveMinNotifiedRef = useRef(false)
  const oneMinNotifiedRef = useRef(false)

  const { toast } = useToast()

  useEffect(() => {
    if (!showInfoDrawer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfoDrawer(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showInfoDrawer])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const startTimer = useCallback((startTime: Date) => {
    stopTimer()

    setPhaseStartTime(startTime)
    timeUpNotifiedRef.current = false
    fiveMinNotifiedRef.current = false
    oneMinNotifiedRef.current = false

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, durationRef.current - elapsed)

      setTimeLeft(remaining)

      if (remaining <= 0) {
        timeUpNotifiedRef.current = true
      } else {
        timeUpNotifiedRef.current = false

        if (remaining <= 60) {
          if (!oneMinNotifiedRef.current) {
            oneMinNotifiedRef.current = true
            toast({
              title: "1 minuto restante! ⚠️",
              description: "O tempo está se esgotando!",
              variant: "destructive"
            })
          }
        } else {
          oneMinNotifiedRef.current = false

          if (remaining <= 300) {
            if (!fiveMinNotifiedRef.current) {
              fiveMinNotifiedRef.current = true
              toast({
                title: "5 minutos restantes ⏳",
                description: "Finalize suas avaliações!",
              })
            }
          } else {
            fiveMinNotifiedRef.current = false
          }
        }
      }
    }, 1000)

    timerIntervalRef.current = interval
  }, [toast, stopTimer])

  useEffect(() => {
    const loadParticipantsAndDetermineHost = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true })

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

    if (sessionId && participantId) {
      loadParticipantsAndDetermineHost()
    }
  }, [sessionId, participantId])

  useEffect(() => {
    let cancelled = false
    let checkInterval: ReturnType<typeof setInterval> | null = null

    const initializeTimer = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('phase2_started_at, phase2_duration, status')
        .eq('id', sessionId)
        .single()

      if (cancelled) return

      if (sessionError) {
        console.error('Error fetching session data:', sessionError)
        return
      }

      if (sessionData?.status === 'encerrado') {
        setEnded(true)
        return
      }

      if (typeof sessionData?.phase2_duration === 'number' && sessionData.phase2_duration > 0) {
        setDuration(sessionData.phase2_duration)
        prevDurationForToastRef.current = sessionData.phase2_duration
      }

      if (sessionData?.phase2_started_at) {
        const startTime = new Date(sessionData.phase2_started_at)
        startTimer(startTime)
        return
      }

      checkInterval = setInterval(async () => {
        const { data: updatedData } = await supabase
          .from('game_sessions')
          .select('phase2_started_at, phase2_duration, status')
          .eq('id', sessionId)
          .single()

        if (cancelled) return

        if (updatedData?.status === 'encerrado') {
          if (checkInterval) clearInterval(checkInterval)
          setEnded(true)
          return
        }

        if (typeof updatedData?.phase2_duration === 'number' && updatedData.phase2_duration > 0) {
          setDuration(updatedData.phase2_duration)
          prevDurationForToastRef.current = updatedData.phase2_duration
        }

        if (updatedData?.phase2_started_at) {
          if (checkInterval) clearInterval(checkInterval)
          const startTime = new Date(updatedData.phase2_started_at)
          startTimer(startTime)
        }
      }, 1000)
    }

    if (sessionId) {
      initializeTimer()
    }

    return () => {
      cancelled = true
      if (checkInterval) clearInterval(checkInterval)
      stopTimer()
    }
  }, [sessionId, startTimer, stopTimer])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`team-judgment-timer-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newData = payload.new

          if (newData.status === 'encerrado') {
            stopTimer()
            setEnded(true)
            return
          }

          if (typeof newData.phase2_duration === 'number' && newData.phase2_duration > 0) {
            const prev = prevDurationForToastRef.current
            if (prev !== null && newData.phase2_duration !== prev) {
              const diffMin = Math.round((newData.phase2_duration - prev) / 60)
              toast({
                title: diffMin > 0 ? `+${diffMin} min na Fase 2 ⏱️` : `${diffMin} min na Fase 2 ⏱️`,
                description: "O professor ajustou o tempo da fase.",
              })
            }
            prevDurationForToastRef.current = newData.phase2_duration
            setDuration(newData.phase2_duration)
          }

          if (newData.phase2_started_at && !phaseStartTimeRef.current) {
            const startTime = new Date(newData.phase2_started_at)
            startTimer(startTime)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, startTimer, stopTimer])

  // Fallback de polling: garante que a Fase 2 se recupere caso o canal
  // Realtime perca um evento (start da fase, ajuste de tempo ou encerramento).
  useEffect(() => {
    if (!sessionId) return
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('phase2_started_at, phase2_duration, status')
        .eq('id', sessionId)
        .single()
      if (!data) return

      if (data.status === 'encerrado') {
        stopTimer()
        setEnded(true)
        return
      }

      if (
        typeof data.phase2_duration === 'number' &&
        data.phase2_duration > 0 &&
        data.phase2_duration !== durationRef.current
      ) {
        const prev = prevDurationForToastRef.current
        if (prev !== null && data.phase2_duration !== prev) {
          const diffMin = Math.round((data.phase2_duration - prev) / 60)
          toast({
            title: diffMin > 0 ? `+${diffMin} min na Fase 2 ⏱️` : `${diffMin} min na Fase 2 ⏱️`,
            description: "O professor ajustou o tempo da fase.",
          })
        }
        prevDurationForToastRef.current = data.phase2_duration
        setDuration(data.phase2_duration)
      }

      // Se o Realtime perdeu o evento de início da fase, o polling cobre aqui.
      if (data.phase2_started_at && !phaseStartTimeRef.current) {
        const startTime = new Date(data.phase2_started_at)
        startTimer(startTime)
      }
    }, 15000)
    return () => clearInterval(pollInterval)
  }, [sessionId, stopTimer, toast, startTimer])

  const loadAssignedRequirements = useCallback(async () => {
    try {
      const { data: assignments, error: assignError } = await supabase
        .from('requirement_assignments')
        .select('id, requirement_id, creator_id, evaluator_id, counts_for_score')
        .eq('session_id', sessionId)

      if (assignError) {
        console.error('Error loading assigned requirements:', assignError)
        toast({
          title: "Erro ao carregar requisitos",
          description: assignError.message,
          variant: "destructive"
        })
        return
      }

      if (assignments && assignments.length > 0) {
        const requirementIds = assignments.map(a => a.requirement_id)

        const { data: requirementsData, error: reqError } = await supabase
          .from('requirements')
          .select('*')
          .in('id', requirementIds)

        if (reqError) {
          console.error('Error loading requirements details:', reqError)
          toast({
            title: "Erro ao carregar requisitos",
            description: reqError.message,
            variant: "destructive"
          })
          return
        }

        const requirementsById = Object.fromEntries(
          (requirementsData || []).map(r => [r.id, r])
        )

        const mappedReqs = assignments
          .map(assignment => {
            const req = requirementsById[assignment.requirement_id]
            if (!req) return null
            return {
              id: req.id,
              text: req.requirement_text,
              classification: req.classification,
              assignmentId: assignment.id,
              createdBy: assignment.creator_id,
              countsForScore: (assignment as any).counts_for_score !== 0
            }
          })
          .filter(Boolean) as Requirement[]

        setRequirements(mappedReqs)

        const assignmentIds = assignments.map(a => a.id)
        const { data: evaluationsData, error: evalError } = await supabase
          .from('requirement_evaluations')
          .select('*')
          .in('assignment_id', assignmentIds)

        if (!evalError && evaluationsData) {
          const preloaded: Record<string, RequirementValidation> = {}
          evaluationsData.forEach(ev => {
            preloaded[ev.requirement_id] = {
              extraidaArtefatos: toBool(ev.can_be_extracted),
              extraidaArtefatosJustificativa: ev.can_be_extracted_note || "",
              classificacaoCorreta: toBool(ev.correctly_classified),
              classificacaoCorretaJustificativa: ev.correctly_classified_note || "",
              completo: toBool(ev.is_complete),
              completoJustificativa: ev.is_complete_note || "",
            }
          })
          setValidations(prev => ({ ...preloaded, ...prev }))
        }
      } else {
        setRequirements([])
      }
    } catch (error) {
      console.error('Unexpected error loading assigned requirements:', error)
      toast({
        title: "Erro inesperado",
        description: "Falha ao carregar requisitos para avaliação",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, toast])

  useEffect(() => {
    if (sessionId) {
      loadAssignedRequirements()
    } else {
      setLoading(false)
    }
  }, [sessionId, loadAssignedRequirements])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`requirement-evaluations-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requirement_evaluations',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newEval = payload.new
          setValidations(prev => ({
            ...prev,
            [newEval.requirement_id]: {
              extraidaArtefatos: toBool(newEval.can_be_extracted),
              extraidaArtefatosJustificativa: newEval.can_be_extracted_note || "",
              classificacaoCorreta: toBool(newEval.correctly_classified),
              classificacaoCorretaJustificativa: newEval.correctly_classified_note || "",
              completo: toBool(newEval.is_complete),
              completoJustificativa: newEval.is_complete_note || "",
            }
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const handleValidation = useCallback((requirementId: string, questionKey: QuestionKey, value: boolean) => {
    if (!isHost) return
    setValidations(prev => {
      const current = prev[requirementId] || createEmptyValidation()
      return {
        ...prev,
        [requirementId]: {
          ...current,
          [questionKey]: value
        }
      }
    })
  }, [isHost])

  const handleJustificationChange = useCallback((requirementId: string, questionKey: QuestionKey, justification: string) => {
    if (!isHost) return
    setValidations(prev => {
      const current = prev[requirementId] || createEmptyValidation()
      return {
        ...prev,
        [requirementId]: {
          ...current,
          [`${questionKey}Justificativa`]: justification
        }
      }
    })
  }, [isHost])

  const getTotalPoints = useCallback((requirementId: string) => {
    const v = validations[requirementId]
    if (!v) return 0
    return [v.extraidaArtefatos, v.classificacaoCorreta, v.completo].filter(answer => answer === true).length
  }, [validations])

  const isRequirementComplete = useCallback((requirementId: string) => {
    const v = validations[requirementId]
    if (!v) return false
    return (QUESTIONS as { key: QuestionKey; label: string }[]).every(({ key }) => {
      const answer = v[key]
      if (answer === null || answer === undefined) return false
      if (answer === false) {
        const justificativa = v[`${key}Justificativa` as keyof RequirementValidation] as string
        return !!(justificativa && justificativa.trim())
      }
      return true
    })
  }, [validations])

  const handleSubmitValidation = useCallback(async () => {
    if (!isHost) {
      toast({
        title: "Ação não permitida",
        description: "Apenas o líder da equipe pode enviar a avaliação.",
        variant: "destructive"
      })
      return
    }

    if (!requirements || requirements.length === 0) return

    const incompleteValidations = requirements.filter(req => !isRequirementComplete(req.id))

    if (incompleteValidations.length > 0) {
      toast({
        title: "Avaliação incompleta!",
        description: `Complete a avaliação de ${incompleteValidations.length} requisito(s) com justificativa.`,
        variant: "destructive"
      })
      return
    }

    try {
      const evaluations = requirements.map(req => {
        const v = validations[req.id]
        return {
          assignment_id: req.assignmentId,
          session_id: sessionId,
          requirement_id: req.id,
          evaluator_id: participantId,
          can_be_extracted: v.extraidaArtefatos,
          can_be_extracted_note: v.extraidaArtefatosJustificativa,
          correctly_classified: v.classificacaoCorreta,
          correctly_classified_note: v.classificacaoCorretaJustificativa,
          is_complete: v.completo,
          is_complete_note: v.completoJustificativa,
          total_points: getTotalPoints(req.id)
        }
      })

      const { error } = await supabase
        .from('requirement_evaluations')
        .upsert(evaluations, { onConflict: 'assignment_id' })

      if (error) {
        console.error('Error saving evaluations:', error)
        toast({
          title: "Erro ao salvar avaliações",
          description: error.message,
          variant: "destructive"
        })
        return
      }

      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({ phase2_submitted_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (sessionError) {
        console.error('Error marking phase 2 as submitted:', sessionError)
        toast({
          title: "Avaliação salva, mas houve um erro ao sinalizar conclusão",
          description: sessionError.message,
          variant: "destructive"
        })
      }

      stopTimer()
      setShowResults(true)

      toast({
        title: "Avaliação Concluída! 🎉",
        description: "Avaliação salva com sucesso!",
      })
    } catch (error) {
      console.error('Unexpected error saving evaluations:', error)
      toast({
        title: "Erro inesperado",
        description: "Falha ao salvar avaliações",
        variant: "destructive"
      })
    }
  }, [requirements, validations, sessionId, participantId, toast, stopTimer, isHost, isRequirementComplete, getTotalPoints])

  const completedValidations = requirements.filter(req => isRequirementComplete(req.id)).length
  const progress = requirements.length > 0 ? (completedValidations / requirements.length) * 100 : 0
  const hasNonScoringRequirements = requirements.some(req => req.countsForScore === false)
  const allRequirementsNonScoring = requirements.length > 0 && requirements.every(req => req.countsForScore === false)

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

  if (ended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Partida encerrada</h3>
          <p className="text-muted-foreground">
            O professor encerrou esta partida.
          </p>
          <Button onClick={onBack} variant="outline">
            Voltar
          </Button>
        </GameCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-lg font-semibold">Carregando requisitos...</h3>
            <p className="text-muted-foreground">Aguarde enquanto carregamos os requisitos da equipe.</p>
          </div>
        </GameCard>
      </div>
    )
  }

  if (requirements.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" />
          <h3 className="text-lg font-semibold">Aguardando os requisitos da avaliação</h3>
          <p className="text-muted-foreground">
            O professor ainda está preparando a Fase 2. Assim que os requisitos forem atribuídos, eles aparecem aqui automaticamente.
          </p>
          {selfName && (
            <p className="text-xs text-muted-foreground">
              User: <strong>{selfName}</strong>{selfPin && ` | PIN: ${selfPin}`}
            </p>
          )}
          <Button onClick={onBack} variant="outline">
            Voltar ao Lobby
          </Button>
        </GameCard>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <Hourglass className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">Avaliação enviada! 🎉</h3>
          <p className="text-muted-foreground">
            Aguarde o professor iniciar a fase de contestação. Assim que ele liberar, vocês poderão revisar e contestar a correção recebida.
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
          <Button
            variant="ghost"
            onClick={onBack}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Lobby
          </Button>

          <div className="flex flex-row items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              <span className="sm:hidden">Fase 2: Avaliação</span>
              <span className="hidden sm:inline">Fase 2: Avaliação dos Requisitos (Equipe)</span>
            </Badge>
            {selfName && (
              <Badge variant="outline" className="px-4 py-2">
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
                  <div>
                    <p className="font-medium text-sm">Modo de acompanhamento</p>
                    <p className="text-sm text-muted-foreground">
                      {leaderName
                        ? `Apenas o líder da equipe (${leaderName}) pode avaliar. Acompanhe as avaliações em tempo real abaixo.`
                        : "Apenas o líder da equipe pode avaliar. Acompanhe as avaliações em tempo real abaixo."}
                    </p>
                  </div>
                </div>
              </GameCard>
            )}

            {isHost && (
              <GameCard className="p-4 bg-game-success/5 border-game-success/20">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-game-success flex-shrink-0" />
                  <p className="text-sm">
                    Você é o <strong>líder</strong> da equipe. Suas avaliações valem para todos os membros.
                  </p>
                </div>
              </GameCard>
            )}

            {hasNonScoringRequirements && (
              <GameCard className="p-4 bg-amber-50 border-2 border-amber-400 shadow-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-amber-900">
                    {allRequirementsNonScoring
                      ? <>A equipe adversária <strong>não criou requisitos</strong> na Fase 1, então vocês vão avaliar os requisitos da <strong>própria equipe</strong> para não ficar parados nesta fase. <strong>Essa avaliação não conta pontos.</strong></>
                      : <>Alguns requisitos abaixo são da <strong>própria equipe</strong> (marcados como "não pontua") — a equipe adversária correspondente <strong>não criou requisitos</strong> na Fase 1.</>}
                  </p>
                </div>
              </GameCard>
            )}

            {phaseStartTime && (
              <GameCard variant="gradient" className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-semibold text-sm sm:text-base">
                      <span className="sm:hidden">Tempo restante</span>
                      <span className="hidden sm:inline">Tempo da Fase 2 - Avaliação</span>
                    </span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-mono font-bold ${
                    timeLeft <= 60 ? 'text-red-500 animate-pulse' :
                    timeLeft <= 300 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
                <div className="mt-2">
                  <Progress
                    value={(timeLeft / duration) * 100}
                    className="h-2"
                  />
                </div>
                {timeLeft <= 60 && (
                  <p className="text-center text-red-500 text-sm font-medium mt-2 animate-pulse">
                    ⚠️ Último minuto! Finalize sua avaliação!
                  </p>
                )}
              </GameCard>
            )}

            {!phaseStartTime && (
              <GameCard className="p-4 text-center">
                <div className="space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground" />
                  <h3 className="font-semibold">Sincronizando o tempo da fase...</h3>
                </div>
              </GameCard>
            )}

            <GameCard variant="gradient" className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso da Avaliação</span>
                  <span>{completedValidations}/{requirements.length} requisitos</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </GameCard>

            <div className="space-y-4">
              <div className="text-left">
                <h3 className="text-xl font-bold mb-2">
                  {isHost ? "Avalie os requisitos da equipe adversária:" : "Requisitos da equipe adversária:"}
                </h3>
                {isHost && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Pontuação:</strong> Cada "Sim" vale 1 ponto (máximo 3 por requisito).
                    Sempre justifique quando responder "Não".
                  </p>
                )}
              </div>

              <div className="space-y-3 sm:space-y-6">
                {requirements.map((requirement, index) => (
                  <GameCard key={requirement.id} variant="interactive" className="group">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-sm sm:text-lg font-semibold">Requisito {index + 1}:</span>
                            <Badge className={`capitalize text-white ${CLASSIFICATION_COLORS[requirement.classification] ?? "bg-muted-foreground"}`}>
                              {CLASSIFICATION_LABELS[requirement.classification] ?? requirement.classification}
                            </Badge>
                            {requirement.countsForScore === false && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                                Não pontua
                              </Badge>
                            )}
                          </div>
                          <Badge className="bg-primary text-white sm:hidden">
                            Pontos: {getTotalPoints(requirement.id)}/3
                          </Badge>
                          {!isHost && isRequirementComplete(requirement.id) && (
                            <Badge className="hidden sm:inline-flex bg-primary text-white">
                              Pontos: {getTotalPoints(requirement.id)}/3
                            </Badge>
                          )}
                          {!isHost && !isRequirementComplete(requirement.id) && (
                            <Badge variant="outline" className="hidden sm:inline-flex text-muted-foreground">
                              Aguardando avaliação do líder
                            </Badge>
                          )}
                        </div>
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-game-purple/10 rounded-lg border-l-4 border-primary">
                          <p className="text-base sm:text-lg font-medium">"{requirement.text}"</p>
                        </div>
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        {QUESTIONS.map(q => {
                          const answer = validations[requirement.id]?.[q.key]
                          const justification = (validations[requirement.id]?.[`${q.key}Justificativa` as keyof RequirementValidation] as string) || ""

                          return (
                            <div key={q.key} className="space-y-1.5 sm:space-y-2 p-2.5 sm:p-3 bg-muted/10 rounded-lg">
                              <label className="text-sm font-medium block">{q.label}</label>
                              <div className="flex gap-2 sm:gap-3">
                                <Button
                                  variant={answer === true ? "default" : "outline"}
                                  onClick={() => handleValidation(requirement.id, q.key, true)}
                                  disabled={!isHost}
                                  className={`flex-1 h-9 sm:h-10 text-sm sm:text-base ${
                                    answer === true
                                      ? 'bg-game-success text-white'
                                      : 'hover:bg-game-success/10 hover:border-game-success'
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Sim
                                </Button>
                                <Button
                                  variant={answer === false ? "default" : "outline"}
                                  onClick={() => handleValidation(requirement.id, q.key, false)}
                                  disabled={!isHost}
                                  className={`flex-1 h-9 sm:h-10 text-sm sm:text-base ${
                                    answer === false
                                      ? 'bg-destructive text-white'
                                      : 'hover:bg-destructive/10 hover:border-destructive'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Não
                                </Button>
                              </div>

                              {answer === false && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">
                                    Justificativa {isHost && <span className="text-destructive">*</span>}
                                  </label>
                                  <Textarea
                                    placeholder={isHost ? "Explique o motivo..." : "Aguardando justificativa do líder..."}
                                    value={justification}
                                    onChange={(e) => handleJustificationChange(requirement.id, q.key, e.target.value)}
                                    readOnly={!isHost}
                                    className={`min-h-14 sm:min-h-16 text-sm ${!isHost ? 'bg-muted/30 cursor-not-allowed' : ''}`}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <div className="hidden sm:flex items-center justify-between p-2.5 sm:p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <span className="font-medium text-sm">Total de Pontos do Requisito</span>
                          <span className="text-lg font-bold text-primary">{getTotalPoints(requirement.id)}/3</span>
                        </div>
                      </div>
                    </div>
                  </GameCard>
                ))}
              </div>
            </div>

            {isHost && (
              <GameCard>
                <Button
                  onClick={handleSubmitValidation}
                  disabled={completedValidations < requirements.length}
                  className="w-full h-12 text-base sm:text-lg font-medium bg-gradient-to-r from-primary to-game-purple hover:shadow-game transition-all duration-200 hover:scale-105"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  {completedValidations < requirements.length
                    ? `Complete a avaliação (${completedValidations}/${requirements.length})`
                    : "Finalizar Avaliação"
                  }
                </Button>
              </GameCard>
            )}

            {!isHost && (
              <GameCard className="text-center p-4">
                <p className="text-sm text-muted-foreground">
                  {completedValidations < requirements.length
                    ? `O líder avaliou ${completedValidations}/${requirements.length} requisitos até agora.`
                    : "O líder concluiu a avaliação de todos os requisitos."}
                </p>
              </GameCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}