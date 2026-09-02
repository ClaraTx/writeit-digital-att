import { useState, useCallback, useEffect, useRef } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, AlertCircle, Lightbulb, Image, Plus, Trash2, Users, RefreshCw, Clock, X, Menu, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWordBank, WordEntry } from "@/hooks/useWordBank"
import { supabase } from "@/lib/api"
import prototypeReference from "@/assets/prototype-reference.png"

interface Requirement {
  id: string
  text: string
  classification: string
  created_by?: string
}

interface GameState {
  sessionId: string
  availableWords: WordEntry[]
  lastUpdate: string
}

interface PlayerState {
  participantId: string
  currentWords: string[]
  currentClassification: string
  lastUpdate: string
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

interface TeamMultiRequirementPhaseProps {
  sessionId: string
  participantId: string
  matchId?: string
  onBack: () => void
  onPhaseComplete: () => void
  phaseDuration?: number
  scenario?: Scenario
}

const ESSENTIAL_PHRASES: string[] = []
const ESSENTIAL_WORDS: string[] = []

const CLASSIFICATIONS = [
  { id: "funcional", label: "Funcional", color: "bg-game-info" },
  { id: "nao-funcional", label: "Não funcional", color: "bg-game-warning" },
  { id: "inverso", label: "Inverso", color: "bg-game-purple" }
]

type TabKey = "regras" | "estruturas" | "cenario"

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

const DEFINITIONS: { term: string; color: string; description: string }[] = [
  { term: "Verbo", color: "text-green-600", description: "É um verbo simples que expressa a funcionalidade daquele requisito." },
  { term: "Frase Verbal", color: "text-green-600", description: "É uma frase que expressa a funcionalidade do requisito." },
  { term: "Objeto", color: "text-blue-600", description: "Dependendo do tipo de verbo, o objeto pode ser um objeto direto ou um objeto direto seguido de um objeto indireto." },
  { term: "Agente", color: "text-gray-600", description: "Pode ser uma pessoa, uma instituição, um grupo ou um dispositivo físico externo ao software." },
  { term: "Complemento de agente", color: "text-gray-600", description: "É a identificação de um agente relacionado com o requisito." },
  { term: "Condição", color: "text-orange-500", description: "É uma sub-sentença que reflete uma situação específica." },
  { term: "Frase Adjetiva", color: "text-gray-600", description: "É uma expressão que caracteriza ou qualifica um substantivo." },
  { term: "Restrição", color: "text-orange-500", description: "É uma frase que qualifica a funcionalidade, restringindo-a." },
  { term: "Métrica", color: "text-pink-600", description: "Requisitos não-funcionais devem ser associados a uma forma de medida/referência a cada requisito não-funcional elicitado." }
]

const GAME_RULES: string[] = [
  "Existem vários tipos de requisitos que podem ser escritos utilizando os cartões de palavras disponibilizados.",
  "Organize os cartões para escrever os requisitos.",
  "Os requisitos escritos devem fazer sentido de acordo com o protótipo apresentado e a descrição do sistema.",
  "Os requisitos devem ser classificados corretamente.",
  "Os requisitos devem ser completos."
]

export const TeamMultiRequirementPhase = ({ sessionId, participantId, matchId, onBack, onPhaseComplete, phaseDuration = 60, scenario }: TeamMultiRequirementPhaseProps) => {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [currentWords, setCurrentWords] = useState<string[]>([])
  const [currentClassification, setCurrentClassification] = useState<string>("")
  const [prototypeDescription, setPrototypeDescription] = useState("")
  const [participants, setParticipants] = useState<{ id: string, player_name: string }[]>([])
  const [selfName, setSelfName] = useState<string>("")
  const [selfPin, setSelfPin] = useState<string>("")
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  const [availableWords, setAvailableWords] = useState<WordEntry[]>([])
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerState>>({})
  const [syncingWords, setSyncingWords] = useState(false)
  const [duration, setDuration] = useState<number>(phaseDuration)
  const durationRef = useRef<number>(phaseDuration)
  useEffect(() => { durationRef.current = duration }, [duration])
  const prevDurationForToastRef = useRef<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(phaseDuration)
  const [phaseStartTime, setPhaseStartTime] = useState<Date | null>(null)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("cenario")
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)
  const [viewPhase, setViewPhase] = useState<'playing' | 'waiting_phase2' | 'ended'>('playing')
  const advancedToPhase2 = useRef(false)
  const { toast } = useToast()
  const { words: wordBankWords, loading: wordBankLoading, error: wordBankError } = useWordBank()

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

  useEffect(() => {
    if (!showInfoDrawer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfoDrawer(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showInfoDrawer])

  const syncPlayerState = useCallback(async (words: string[], classification: string) => {
    if (syncingWords) return

    try {
      const { error } = await supabase
        .from('player_states')
        .upsert({
          session_id: sessionId,
          participant_id: participantId,
          current_words: words,
          current_classification: classification,
          last_update: new Date().toISOString()
        })

      if (error) {
        console.error('Error syncing player state:', error)
      }
    } catch (error) {
      console.error('Error in syncPlayerState:', error)
    }
  }, [sessionId, participantId, syncingWords])


  const syncAvailableWords = useCallback(async (words: WordEntry[]) => {
    if (syncingWords) return

    try {
      const { error } = await supabase
        .from('game_states')
        .upsert({
          session_id: sessionId,
          available_words: words,
          last_update: new Date().toISOString()
        })

      if (error) {
        console.error('Error syncing available words:', error)
      }
    } catch (error) {
      console.error('Error in syncAvailableWords:', error)
    }
  }, [sessionId, syncingWords])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const startTimer = useCallback((startTime: Date) => {
    setTimerInterval(prev => {
      if (prev) clearInterval(prev)
      return prev
    })
    setPhaseStartTime(startTime)
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, durationRef.current - elapsed)

      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(interval)

        supabase
          .from('game_sessions')
          .update({ phase1_completed_at: new Date().toISOString(), status: 'completed' })
          .eq('id', sessionId)
          .then(async ({ error }) => {
            if (error) {
              console.error('Error updating session status:', error)
              return
            }
            if (isHost) {
              await supabase.rpc('assign_team_cross_evaluation', { p_match_id: matchId ?? null })
            }
          })

        setViewPhase('waiting_phase2')
      } else if (remaining === 60) {
        toast({
          title: "1 minuto restante! ⚠️",
          description: "O tempo está se esgotando!",
          variant: "destructive"
        })
      } else if (remaining === 300) {
        toast({
          title: "5 minutos restantes ⏳",
          description: "Finalize seus requisitos!",
        })
      }
    }, 1000)

    setTimerInterval(interval)
  }, [onPhaseComplete, toast, sessionId, isHost, matchId])

  const stopTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
  }, [timerInterval])

  
  const handleManualRefresh = useCallback(async () => {
    toast({
      title: "Atualizando...",
      description: "Sincronizando com a equipe",
    })
    await loadRequirements()
    setLastSync(new Date())
  }, [])

  useEffect(() => {
    if (wordBankWords.length > 0 && availableWords.length === 0 && !syncingWords) {
      setAvailableWords(wordBankWords)
      syncAvailableWords(wordBankWords)
    }
  }, [wordBankWords, availableWords.length, syncingWords, syncAvailableWords])

  useEffect(() => {
    if (wordBankError) {
      toast({
        title: "Erro ao carregar banco de palavras",
        description: "Usando palavras padrão. Verifique sua conexão.",
        variant: "destructive"
      })
    }
  }, [wordBankError, toast])

  useEffect(() => {
    if (!sessionId) {
      console.error('Cannot setup real-time subscription: sessionId is missing')
      return
    }

    const channel = supabase
      .channel(`team-requirements-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirements',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReq = {
              id: payload.new.id,
              text: payload.new.requirement_text,
              classification: payload.new.classification,
              created_by: payload.new.created_by
            }
            setRequirements(prev => {
              if (prev.find(r => r.id === newReq.id)) {
                return prev
              }
              return [...prev, newReq]
            })
          } else if (payload.eventType === 'DELETE') {
            setRequirements(prev => prev.filter(r => r.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setRequirements(prev => prev.map(r =>
              r.id === payload.new.id
                ? {
                    id: payload.new.id,
                    text: payload.new.requirement_text,
                    classification: payload.new.classification,
                    created_by: payload.new.created_by
                  }
                : r
            ))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          loadParticipants()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_states',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const playerState: PlayerState = {
              participantId: payload.new.participant_id,
              currentWords: payload.new.current_words || [],
              currentClassification: payload.new.current_classification || '',
              lastUpdate: payload.new.last_update
            }
            setPlayerStates(prev => ({
              ...prev,
              [playerState.participantId]: playerState
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_states',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incomingWords = payload.new.available_words
            if (Array.isArray(incomingWords) && incomingWords.length > 0) {
              setSyncingWords(true)
              setAvailableWords(incomingWords)
              setTimeout(() => setSyncingWords(false), 100)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new

            if (typeof newData.phase1_duration === 'number') {
              const prev = prevDurationForToastRef.current
              if (prev !== null && newData.phase1_duration !== prev && phaseStartTime) {
                const diffMin = Math.round((newData.phase1_duration - prev) / 60)
                toast({
                  title: diffMin > 0 ? `+${diffMin} min na Fase 1 ⏱️` : `${diffMin} min na Fase 1 ⏱️`,
                  description: "O professor ajustou o tempo da fase.",
                })
              }
              prevDurationForToastRef.current = newData.phase1_duration
              setDuration(newData.phase1_duration)
            }

            if (newData.status === 'encerrado') {
              stopTimer()
              setViewPhase('ended')
              return
            }

            if (newData.phase1_started_at && !phaseStartTime && newData.status !== 'completed') {
              const startTime = new Date(newData.phase1_started_at)
              startTimer(startTime)
            }

            if (newData.status === 'completed' && !advancedToPhase2.current) {
              stopTimer()
              setViewPhase('waiting_phase2')
            }

            if (newData.phase2_started_at && !advancedToPhase2.current) {
              advancedToPhase2.current = true
              stopTimer()
              onPhaseComplete()
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          const interval = setInterval(() => {
            loadRequirements()
          }, 5000)

          return () => clearInterval(interval)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [sessionId])

  const loadGameStates = useCallback(async () => {
    try {
      const { data: gameState } = await supabase
        .from('game_states')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (gameState && Array.isArray(gameState.available_words) && gameState.available_words.length > 0) {
        setSyncingWords(true)
        setAvailableWords(gameState.available_words)
        setTimeout(() => setSyncingWords(false), 100)
      }

      const { data: playerStatesData } = await supabase
        .from('player_states')
        .select('*')
        .eq('session_id', sessionId)

      if (playerStatesData) {
        const states: Record<string, PlayerState> = {}
        playerStatesData.forEach(state => {
          states[state.participant_id] = {
            participantId: state.participant_id,
            currentWords: state.current_words || [],
            currentClassification: state.current_classification || '',
            lastUpdate: state.last_update
          }
        })
        setPlayerStates(states)
      }
    } catch (error) {
      console.error('Error loading game states:', error)
    }
  }, [sessionId])

  useEffect(() => {
    const initializeTimer = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('phase1_started_at, phase2_started_at, status, phase1_duration')
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        console.error('Error fetching session data:', sessionError)
        return
      }

      if (typeof sessionData?.phase1_duration === 'number') {
        setDuration(sessionData.phase1_duration)
        prevDurationForToastRef.current = sessionData.phase1_duration
      }

      if (sessionData?.status === 'encerrado') {
        setViewPhase('ended')
        return
      }

      if (sessionData?.phase2_started_at) {
        advancedToPhase2.current = true
        onPhaseComplete()
        return
      }

      if (sessionData?.status === 'completed') {
        setViewPhase('waiting_phase2')
        return
      }

      if (sessionData?.phase1_started_at) {
        const startTime = new Date(sessionData.phase1_started_at)
        startTimer(startTime)
      } else if (isHost && sessionData?.status === 'judging') {
        const now = new Date()

        const { error } = await supabase
          .from('game_sessions')
          .update({ phase1_started_at: now.toISOString() })
          .eq('id', sessionId)

        if (error) {
          console.error('Error saving phase1_started_at:', error)
        } else {
          startTimer(now)
        }
      } else {
        if (!isHost && sessionData?.status === 'judging') {
          const checkInterval = setInterval(async () => {
            const { data: updatedData } = await supabase
              .from('game_sessions')
              .select('phase1_started_at')
              .eq('id', sessionId)
              .single()

            if (updatedData?.phase1_started_at && !phaseStartTime) {
              clearInterval(checkInterval)
              const startTime = new Date(updatedData.phase1_started_at)
              startTimer(startTime)
            }
          }, 1000)

          setTimeout(() => {
            clearInterval(checkInterval)
          }, 30000)
        }
      }
    }

    initializeTimer()

    return () => {
      stopTimer()
    }
  }, [isHost, sessionId, startTimer, stopTimer])

  useEffect(() => {
    if (sessionId) {
      loadRequirements()
      loadParticipants()
      loadSessionData()
      loadGameStates()
    } else {
      console.error('SessionId is missing!')
    }
  }, [sessionId, participantId, loadGameStates])

  const loadRequirements = async () => {
    try {
      if (!sessionId) {
        toast({
          title: "Erro de sessão",
          description: "ID da sessão não encontrado",
          variant: "destructive"
        })
        return
      }

      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('session_id', sessionId)

      if (error) {
        console.error('Error loading requirements:', error)
        toast({
          title: "Erro ao carregar requisitos",
          description: error.message,
          variant: "destructive"
        })
        return
      }

      if (data) {
        const mappedReqs = data.map(req => ({
          id: req.id,
          text: req.requirement_text,
          classification: req.classification,
          created_by: req.created_by
        }))
        setRequirements(mappedReqs)
        setLastSync(new Date())
      } else {
        setRequirements([])
      }
    } catch (error) {
      console.error('Unexpected error loading requirements:', error)
      toast({
        title: "Erro inesperado",
        description: "Falha ao carregar requisitos da equipe",
        variant: "destructive"
      })
    }
  }

  const loadParticipants = async () => {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)

    if (data) {
      setParticipants(data)
      if (data.length > 0) {
        const firstParticipant = data[0]
        const isCurrentUserHost = firstParticipant.id === participantId
        setIsHost(isCurrentUserHost)
      }
      const self = data.find(p => p.id === participantId)
      if (self) {
        setSelfName(self.player_name)
        setSelfPin(self.pin ?? "")
      }
    }
  }

  const loadSessionData = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (data) {
      setPrototypeDescription(data.prototype_description || "")
    }
  }

  const addNewWordToBank = useCallback(() => {
  }, [])

  const isEssentialWordOrPhrase = useCallback((item: string) => {
    return ESSENTIAL_WORDS.includes(item) || ESSENTIAL_PHRASES.includes(item)
  }, [])

  const handleWordClick = useCallback((word: string) => {
    const newWords = [...currentWords, word]
    const newAvailableWords = availableWords.filter(w => w.word !== word)

    setCurrentWords(newWords)
    setAvailableWords(newAvailableWords)

    syncPlayerState(newWords, currentClassification)
    syncAvailableWords(newAvailableWords)
  }, [currentWords, availableWords, currentClassification, syncPlayerState, syncAvailableWords])

  const handleWordRemove = useCallback((index: number) => {
    const removedWord = currentWords[index]
    const newWords = currentWords.filter((_, i) => i !== index)
    const restoredEntry = wordBankWords.find(e => e.word === removedWord)
    const newAvailableWords = restoredEntry
      ? [...availableWords, restoredEntry]
      : availableWords

    setCurrentWords(newWords)
    setAvailableWords(newAvailableWords)

    syncPlayerState(newWords, currentClassification)
    syncAvailableWords(newAvailableWords)
  }, [currentWords, availableWords, wordBankWords, currentClassification, syncPlayerState, syncAvailableWords])

  const handleClassificationSelect = useCallback((classification: string) => {
    setCurrentClassification(classification)
    syncPlayerState(currentWords, classification)
  }, [currentWords, syncPlayerState])

  const handleAddRequirement = useCallback(async () => {
    if (currentWords.length < 3) {
      toast({
        title: "Requisito muito curto!",
        description: "Um requisito precisa ter pelo menos 3 palavras.",
        variant: "destructive"
      })
      return
    }

    if (!currentClassification) {
      toast({
        title: "Classificação necessária!",
        description: "Selecione uma classificação para o requisito.",
        variant: "destructive"
      })
      return
    }

    const { error } = await supabase
      .from('requirements')
      .insert({
        session_id: sessionId,
        requirement_text: currentWords.join(" "),
        classification: currentClassification,
        score: 0,
        created_by: participantId
      })

    if (error) {
      toast({
        title: "Erro ao adicionar requisito",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    setCurrentWords([])
    setCurrentClassification("")

    syncPlayerState([], '')

    await loadRequirements()

    toast({
      title: "Requisito adicionado!",
      description: `"${currentWords.join(" ")}"`,
    })
  }, [currentWords, currentClassification, sessionId, participantId, toast])

  const handleRemoveRequirement = useCallback(async (id: string) => {
    const requirement = requirements.find(r => r.id === id)

    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: "Erro ao remover requisito",
        description: error.message,
        variant: "destructive"
      })
    } else if (requirement) {

      const remainingText = requirement.text
      const restoredEntries: WordEntry[] = []
      const sortedBank = [...wordBankWords].sort((a, b) => b.word.length - a.word.length)

      let remaining = remainingText
      while (remaining.trim().length > 0) {
        const match = sortedBank.find(entry =>
          remaining.startsWith(entry.word + ' ') || remaining === entry.word
        )
        if (match) {
          restoredEntries.push(match)
          remaining = remaining.slice(match.word.length).trimStart()
        } else {
          break
        }
      }

      setAvailableWords(prev => {
        const updated = [...prev, ...restoredEntries]
        syncAvailableWords(updated)
        return updated
      })
    }
  }, [toast, requirements, wordBankWords, syncAvailableWords])

  const handlePrototypeUpdate = useCallback(async () => {
    const { error } = await supabase
      .from('game_sessions')
      .update({
        prototype_description: prototypeDescription
      })
      .eq('id', sessionId)

    if (error) {
      toast({
        title: "Erro ao atualizar protótipo",
        description: error.message,
        variant: "destructive"
      })
    }
  }, [sessionId, prototypeDescription, toast])

  const handleDragStart = (word: string) => {
    setDraggedWord(word)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedWord) {
      const newWords = [...currentWords, draggedWord]
      const newAvailableWords = availableWords.filter(w => w.word !== draggedWord)

      setCurrentWords(newWords)
      setAvailableWords(newAvailableWords)
      setDraggedWord(null)

      syncPlayerState(newWords, currentClassification)
      syncAvailableWords(newAvailableWords)
    }
  }

  const getWordTextSizeClass = (word: string) => {
    const len = word.length
    if (len > 34) return 'text-[8px] leading-[1.05]'
    if (len > 24) return 'text-[9px] leading-[1.05]'
    if (len > 16) return 'text-[10px] leading-tight'
    return 'text-xs leading-tight'
  }

  const renderInfoPanelContent = () => (
    <>
      <div className="flex gap-1 flex-shrink-0 pb-2 mb-1 border-b border-border">
        {([
          { key: "regras", label: "Regras" },
          { key: "estruturas", label: "Estruturas" },
          { key: "cenario", label: "Cenário da Partida" },
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

        {activeTab === "regras" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-bold text-sm">Regras</p>
              <ul className="list-disc pl-4 space-y-1">
                {GAME_RULES.map((r, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">{r}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-sm">Definições</p>
              {DEFINITIONS.map((d, idx) => (
                <p key={idx} className={`text-xs ${d.color}`}>
                  <span className="font-semibold">{d.term}:</span> {d.description}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )


  if (viewPhase === 'ended') {
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

  if (viewPhase === 'waiting_phase2') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
        <GameCard className="text-center p-8 max-w-md space-y-4">
          <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" />
          <h3 className="text-lg font-semibold">Fase 1 concluída! 🎉</h3>
          <p className="text-muted-foreground">
            Aguarde o professor iniciar a Fase 2 para continuar.
          </p>
          <Badge variant="secondary" className="px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            Aguardando Fase 2
          </Badge>
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
      {/* Abinha lateral fixa (só no mobile) para abrir Regras e Cenário: toque ou arraste pra direita */}
      <button
        type="button"
        onClick={() => setShowInfoDrawer(true)}
        onTouchStart={handleEdgeTabTouchStart}
        onTouchMove={handleEdgeTabTouchMove}
        onTouchEnd={handleEdgeTabTouchEnd}
        aria-label="Abrir Regras e Cenário"
        className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-r-xl pl-1.5 pr-2 py-3 shadow-lg active:scale-95 transition-transform"
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-[10px] font-semibold [writing-mode:vertical-rl] tracking-wide">
          Regras e Cenário
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
            Voltar
          </Button>

          <div className="flex flex-row items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="px-2 py-1 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
              <Users className="w-3 h-3 mr-2" />
              Fase 1: Monte Requisitos (Equipe)
            </Badge>
            <Badge variant="outline" className="px-2 py-1 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
              Participantes: {participants.length}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
              Ativos: {Object.keys(playerStates).filter(id => {
                const state = playerStates[id]
                return state.currentWords.length > 0 || state.currentClassification
              }).length}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
              Requisitos Montados: {requirements.length}
            </Badge>
            {selfName && (
              <Badge variant="secondary" className="px-2 py-1 sm:px-3 sm:py-1 text-xs whitespace-nowrap">
                User: {selfName}{selfPin && ` | PIN: ${selfPin}`}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="px-2 py-1 h-auto text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Sync
              </Button>
            </div>
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
                <h3 className="font-semibold text-sm">Regras, Estruturas e Cenário</h3>
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
            {phaseStartTime && (
              <GameCard variant="gradient" className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Tempo da Fase 1 - Requisitos</span>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${
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
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  A fase avançará automaticamente quando o tempo esgotar
                </div>
                {timeLeft <= 60 && (
                  <p className="text-center text-red-500 text-sm font-medium mt-2 animate-pulse">
                    ⚠️ Último minuto! O jogo avançará automaticamente!
                  </p>
                )}
              </GameCard>
            )}

            {!phaseStartTime && (
              <GameCard className="p-4 text-center">
                <div className="space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground" />
                  <h3 className="font-semibold">Aguardando Início</h3>
                  <p className="text-sm text-muted-foreground">
                    Aguardando o início do jogo
                  </p>
                </div>
              </GameCard>
            )}

            <GameCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-game-warning" />
                  <h3 className="font-semibold text-sm">Banco de Palavras</h3>
                  {wordBankLoading && <span className="text-xs text-muted-foreground">(Carregando...)</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {availableWords.length} palavras
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: 'prefixo',     label: 'Prefixo',      bg: 'bg-red-400',    text: 'text-white' },
                  { key: 'verbo',       label: 'Verbo',        bg: 'bg-green-500',  text: 'text-white' },
                  { key: 'objeto',      label: 'Objeto',       bg: 'bg-blue-400', text: 'text-white' },
                  { key: 'complemento', label: 'Complemento',  bg: 'bg-gray-600',   text: 'text-white' },
                  { key: 'metrica',     label: 'Métrica',      bg: 'bg-pink-500',   text: 'text-white' },
                  { key: 'condicao',    label: 'Condição',     bg: 'bg-orange-400', text: 'text-white' },
                ] as const).map(cat => (
                  <span key={cat.key} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                    {cat.label}
                  </span>
                ))}
              </div>

              <div className="max-h-52 overflow-y-auto">
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {availableWords.map((entry, index) => {
                    const colorMap: Record<WordEntry['category'], string> = {
                     prefixo:     'border-red-400 text-red-500 hover:bg-red-400 active:bg-red-500',
                     verbo:       'border-green-500 text-green-600 hover:bg-green-500 active:bg-green-600',
                     objeto:      'border-blue-400 text-blue-600 hover:bg-blue-400 active:bg-blue-500',
                     complemento: 'border-gray-500 text-gray-600 hover:bg-gray-500 active:bg-gray-600',
                     metrica:     'border-pink-500 text-pink-600 hover:bg-pink-500 active:bg-pink-600',
                     condicao:    'border-orange-400 text-orange-500 hover:bg-orange-400 active:bg-orange-500',
                    }
                    const colorClass = colorMap[entry.category]
                    return (
                      <button
                        key={`word-${entry.word}-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(entry.word)}
                        onClick={() => handleWordClick(entry.word)}
                        className={`w-[45%] sm:w-36 h-14 flex items-center justify-center text-center px-1.5 py-1 rounded-lg border-2 bg-white font-medium transition-all duration-150 hover:text-white hover:scale-105 active:text-white cursor-pointer overflow-hidden ${colorClass}`}
                      >
                        <span className={`${getWordTextSizeClass(entry.word)} whitespace-normal break-words`}>{entry.word}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </GameCard>
            <div className="space-y-6">
              <GameCard
                variant="puzzle"
                className="min-h-32"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <h3 className="font-semibold text-center">Monte um Requisito</h3>

                  <div className="min-h-20 border-2 border-dashed border-primary/40 rounded-lg p-3 sm:p-4 bg-white/50">
                    {currentWords.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm sm:text-base">
                        Arraste palavras aqui ou clique nelas para montar o requisito
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {currentWords.map((word, index) => (
                          <GameCard
                            key={index}
                            variant="word"
                            size="word"
                            onClick={() => handleWordRemove(index)}
                            className="bg-primary/10 border-primary/30 text-primary cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200 text-xs sm:text-sm"
                          >
                            {word}
                          </GameCard>
                        ))}
                      </div>
                    )}
                  </div>

                  {currentWords.length > 0 && (
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Visualização:</p>
                      <p className="font-medium text-sm sm:text-base break-words">{currentWords.join(" ")}</p>
                    </div>
                  )}
                </div>
              </GameCard>

              <GameCard>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-game-success" />
                    <h3 className="font-semibold">Classificação</h3>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {CLASSIFICATIONS.map((classification) => (
                      <Button
                        key={classification.id}
                        variant={currentClassification === classification.id ? "default" : "outline"}
                        onClick={() => handleClassificationSelect(classification.id)}
                        className={`h-auto p-3 sm:p-4 transition-all duration-200 flex items-center justify-center ${
                          currentClassification === classification.id
                            ? `${classification.color} text-white`
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className="text-center w-full">
                          <div className="font-medium text-xs sm:text-sm leading-tight">{classification.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </GameCard>

              <Button
                onClick={handleAddRequirement}
                disabled={currentWords.length < 3 || !currentClassification}
                className="w-full h-10 sm:h-12 text-sm sm:text-lg font-medium transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Adicionar Requisito
              </Button>

              {Object.keys(playerStates).length > 0 && (
                <GameCard>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-game-info" />
                      <h3 className="font-semibold">Atividade da Equipe</h3>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(playerStates)
                        .filter(([id]) => id !== participantId)
                        .map(([playerId, state]) => {
                          const participant = participants.find(p => p.id === playerId)
                          if (!participant || (!state.currentWords.length && !state.currentClassification)) {
                            return null
                          }

                          return (
                            <div key={playerId} className="p-3 border rounded-lg bg-muted/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{participant.player_name}</span>
                                {state.currentClassification && (
                                  <Badge variant="outline" className="text-xs">
                                    {CLASSIFICATIONS.find(c => c.id === state.currentClassification)?.label}
                                  </Badge>
                                )}
                              </div>
                              {state.currentWords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {state.currentWords.map((word, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {word}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                        .filter(Boolean)
                      }
                    </div>

                    {Object.entries(playerStates)
                      .filter(([id]) => id !== participantId)
                      .every(([, state]) => !state.currentWords.length && !state.currentClassification) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum membro da equipe está montando requisitos no momento
                      </p>
                    )}
                  </div>
                </GameCard>
              )}

              {requirements.length > 0 && (
                <GameCard>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-game-success" />
                      <h3 className="font-semibold">Requisitos Criados ({requirements.length})</h3>
                    </div>

                    <div className="space-y-3">
                      {requirements.map((req) => {
                        const classificationInfo = CLASSIFICATIONS.find(c => c.id === req.classification)
                        return (
                          <div key={req.id} className="p-3 border rounded-lg bg-muted/20">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`${classificationInfo?.color} text-white`}>
                                  {classificationInfo?.label}
                                </Badge>
                                {req.created_by && (
                                  <Badge variant="outline" className="text-xs">
                                    {participants.find(p => p.id === req.created_by)?.player_name || 'Jogador'}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRequirement(req.id)}
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm font-medium">{req.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </GameCard>
              )}

              <div className="w-full h-10 sm:h-12 flex items-center justify-center border-2 border-dashed border-primary rounded-lg text-primary">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-sm sm:text-lg font-medium">
                  {phaseStartTime ?
                    `Fase avançará automaticamente quando o tempo acabar` :
                    'Aguardando início do jogo...'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}