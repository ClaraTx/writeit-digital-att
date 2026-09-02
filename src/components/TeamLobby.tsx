import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/api"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Users, Copy, Check, Crown, GraduationCap, LogOut, FileText, CheckCircle2, Scale, Clock, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TeamLobbyProps {
  sessionId: string
  roomCode: string
  participantId?: string
  onStartJudgment: () => void
  onBack: () => void
  onParticipantIdFound?: (participantId: string) => void
}

interface Participant {
  id: string
  player_name: string
  joined_at: string
}

const STORAGE_PREFIX = "writeit_participant_"

const phases = [
  {
    icon: FileText,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    title: "Fase 1 - Monte Requisitos",
    description: (
      <>
        A equipe combina peças (prefixo, verbo, objeto, complemento, métrica e condição)
        pra escrever requisitos de software a partir do cenário apresentado, classificando
        cada um como <strong>funcional</strong>, <strong>não-funcional</strong> ou <strong>inverso</strong>.
      </>
    ),
  },
  {
    icon: CheckCircle2,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    title: "Fase 2 - Correção",
    description: (
      <>
        A equipe recebe os requisitos escritos por uma equipe adversária e precisa
        corrigi-los, respondendo perguntas de sim ou não sobre cada requisito. Toda
        resposta <strong>não</strong> precisa ser justificada.
      </>
    ),
  },
  {
    icon: Scale,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
    title: "Fase 3 - Contestação",
    description: (
      <>
        A equipe recebe de volta a nota parcial dos próprios requisitos, já corrigidos
        pela outra equipe, e pode contestar as respostas <strong>não</strong> com as
        quais não concordar. O professor decide se aceita ou não cada contestação, o que
        pode fazer a equipe ganhar ou perder pontos.
      </>
    ),
  },
]

const PhaseCard = ({ phase }: { phase: typeof phases[number] }) => {
  const Icon = phase.icon
  return (
    <div className="rounded-lg border p-3 sm:p-4 space-y-2 h-full">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full ${phase.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${phase.iconColor}`} />
        </div>
        <h4 className="font-semibold text-foreground text-sm sm:text-base">{phase.title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{phase.description}</p>
    </div>
  )
}

const PhaseCarousel = () => {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const goTo = (i: number) => setIndex((i + phases.length) % phases.length)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const SWIPE_THRESHOLD = 40
    if (diff > SWIPE_THRESHOLD) goTo(index - 1)
    else if (diff < -SWIPE_THRESHOLD) goTo(index + 1)
    touchStartX.current = null
  }

  return (
    <div className="md:hidden">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <PhaseCard phase={phases[index]} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(index - 1)}
          className="h-8 w-8 p-0 rounded-full"
          aria-label="Fase anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1.5">
          {phases.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir para fase ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(index + 1)}
          className="h-8 w-8 p-0 rounded-full"
          aria-label="Próxima fase"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export const TeamLobby = ({
  sessionId,
  roomCode,
  participantId,
  onStartJudgment,
  onBack,
  onParticipantIdFound,
}: TeamLobbyProps) => {
  const teamNumberMatch = roomCode.match(/-E(\d+)$/)
  const teamLabel = teamNumberMatch ? `Equipe ${teamNumberMatch[1]}` : "Sua Equipe"

  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(
    participantId || null
  )

  useEffect(() => {
    let resolvedParticipantId = currentParticipantId

    if (!resolvedParticipantId) {
      const saved = localStorage.getItem(STORAGE_PREFIX + roomCode)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.sessionId === sessionId && parsed.participantId) {
            resolvedParticipantId = parsed.participantId
            setCurrentParticipantId(parsed.participantId)
            if (onParticipantIdFound) onParticipantIdFound(parsed.participantId)
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }

    loadParticipants()

    const channel = supabase
      .channel(`team-lobby-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        () => loadParticipants()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (resolvedParticipantId && payload.old?.id === resolvedParticipantId) {
            localStorage.removeItem(STORAGE_PREFIX + roomCode)
            toast({
              title: "Você foi removido da equipe",
              description: "O professor removeu você desta equipe.",
              variant: "destructive",
            })
            onBack()
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new?.status === "judging") {
            toast({
              title: "Jogo iniciado! 🎉",
              description: "O professor iniciou o jogo. Redirecionando...",
            })
            setTimeout(() => onStartJudgment(), 1000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, roomCode])

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true })

    if (error) { console.error("Error loading participants:", error); return }

    setParticipants(data ?? [])
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      toast({ title: "Código copiado!", description: "Compartilhe com seus colegas." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard api unavailable */
    }
  }

  const handleLeaveRoom = async () => {
    if (!currentParticipantId) {
      onBack()
      return
    }

    if (!confirm("Tem certeza que quer sair da sala? Você perde sua vaga e seu progresso nela.")) {
      return
    }

    setLeaving(true)
    try {
      await supabase
        .from("session_participants")
        .delete()
        .eq("id", currentParticipantId)
    } catch (error) {
      console.error("Error leaving room:", error)
    } finally {
      localStorage.removeItem(STORAGE_PREFIX + roomCode)
      setLeaving(false)
      toast({ title: "Você saiu da sala" })
      onBack()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-3 sm:p-4">
      <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8">

        <div className="text-center pt-2 sm:pt-4">
          <p className="text-xs sm:text-sm font-medium text-primary uppercase tracking-wide mb-1">Lobby da partida</p>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 break-words">{teamLabel}</h1>
          <p className="text-sm sm:text-lg text-muted-foreground mb-4 px-2">
            Aguardando o professor iniciar - aproveite pra combinar a estratégia com sua equipe
          </p>

          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-muted/50 border rounded-full pl-3 sm:pl-4 pr-1.5 py-1.5 flex-wrap justify-center">
            <span className="text-xs sm:text-sm text-muted-foreground">Código:</span>
            <span className="font-mono font-bold text-primary tracking-wider text-sm sm:text-base">{roomCode}</span>
            <Button
              onClick={copyRoomCode}
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 rounded-full"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>

        <GameCard className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">Como funciona o jogo</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4 sm:mb-5">
            Vocês vão trabalhar em cima de um cenário de sistema real, escrevendo e avaliando
            requisitos de software em três fases. O tempo de cada fase é definido pelo professor
            e aparece na tela assim que ela começa.
          </p>

          {/* Mobile: carrossel com setas e swipe. Desktop: grid com as 3 fases lado a lado. */}
          <PhaseCarousel />

          <div className="hidden md:grid md:grid-cols-3 gap-4">
            {phases.map((phase) => (
              <PhaseCard key={phase.title} phase={phase} />
            ))}
          </div>

          <div className="flex items-start sm:items-center gap-2 mt-4 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
            O professor controla quando cada fase começa e termina - fiquem atentos ao timer.
          </div>
        </GameCard>

        <GameCard className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">
              Participantes ({participants.length})
            </h3>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Aguardando participantes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="bg-muted/50 rounded-lg p-3 sm:p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold shrink-0">
                    {index === 0 ? <Crown className="w-5 h-5" /> : <span>{index + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-foreground truncate text-sm sm:text-base">{participant.player_name}</p>
                      {index === 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium shrink-0">
                          Líder
                        </span>
                      )}
                      {participant.id === currentParticipantId && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium shrink-0">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Entrou às {new Date(participant.joined_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GameCard>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <div className="order-2 sm:order-1">
            <Button
              onClick={handleLeaveRoom}
              variant="outline"
              size="lg"
              disabled={leaving}
              className="w-full sm:w-auto sm:min-w-44 border-red-300 text-red-600 hover:bg-red-50 gap-2"
            >
              <LogOut className="w-4 h-4" />
              {leaving ? "Saindo..." : "Sair da Sala"}
            </Button>
          </div>

          <div className="order-1 sm:order-2 flex-1 sm:max-w-sm text-center p-4 sm:p-5 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-foreground text-sm sm:text-base">A Fase 1 começa em breve</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Aproveitem esse tempo pra combinar com a equipe quem vai fazer o quê
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}