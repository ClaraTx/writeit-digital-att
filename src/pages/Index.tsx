import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/api"
import { GameModeSelector } from "@/components/GameModeSelector"
import { TeamMultiRequirementPhase } from "@/components/TeamMultiRequirementPhase"
import { TeamLobby } from "@/components/TeamLobby"
import { TeamJudgmentPhase } from "@/components/TeamJudgmentPhase"
import { TeamContestationPhase } from "@/components/TeamContestationPhase"
import { GameCompletedScreen } from "@/components/GameCompletedScreen"

type GameState = 'mode-selection' | 'team-requirements' | 'team-lobby' | 'team-judgment' | 'team-contestation' | 'game-completed'

interface TeamData {
  sessionId: string
  roomCode: string
  participantId?: string
}

interface TeamMatchConfig {
  matchId: string
  scenario: {
    title: string
    description: string
    images: { src: string }[]
  }
  phase1Duration: number
  phase2Duration: number
}

function resolveScenarioImageUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('mode-selection')
  const gameStateRef = useRef(gameState)

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const [teamData, setTeamData] = useState<TeamData>({
    sessionId: '',
    roomCode: '',
    participantId: ''
  })
  const [teamMatchConfig, setTeamMatchConfig] = useState<TeamMatchConfig | null>(null)

  useEffect(() => {
    if (!['team-requirements', 'team-judgment', 'team-contestation'].includes(gameState)) return
    if (!teamData.sessionId) return
    if (teamMatchConfig) return

    let cancelled = false

    const loadMatchConfig = async () => {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('match_id')
          .eq('id', teamData.sessionId)
          .single()

        if (sessionError || !session?.match_id) {
          console.error('Sessão sem match_id vinculado:', sessionError)
          return
        }

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*, scenarios(*)')
          .eq('id', session.match_id)
          .single()

        if (matchError || !match || cancelled) {
          console.error('Erro ao carregar a partida:', matchError)
          return
        }

        const scenarioData = match.scenarios

        let images: { src: string }[] = []
        if (scenarioData?.id) {
          const { data: scenarioImages, error: imagesError } = await supabase
            .from('scenario_images')
            .select('*')
            .eq('scenario_id', scenarioData.id)
            .order('order_index', { ascending: true })

          if (imagesError) {
            console.error('Erro ao carregar imagens do cenário:', imagesError)
          } else if (scenarioImages && scenarioImages.length > 0) {
            images = scenarioImages
              .map(img => resolveScenarioImageUrl(img.image_url))
              .filter((src): src is string => !!src)
              .map(src => ({ src }))
          }
        }

        if (images.length === 0) {
          const legacyImage = resolveScenarioImageUrl(scenarioData?.image_url)
          if (legacyImage) images = [{ src: legacyImage }]
        }

        if (cancelled) return

        setTeamMatchConfig({
          matchId: match.id,
          scenario: {
            title: scenarioData?.name || 'Cenário da Partida',
            description: scenarioData?.description || '',
            images,
          },
          phase1Duration: (match.phase1_duration_minutes ?? 10) * 60,
          phase2Duration: (match.phase2_duration_minutes ?? 10) * 60,
        })
      } catch (error) {
        console.error('Erro inesperado ao carregar config da partida:', error)
      }
    }

    loadMatchConfig()
    return () => { cancelled = true }
  }, [gameState, teamData.sessionId, teamMatchConfig])

  const handleTeamModeSelect = async (sessionId: string, roomCode: string, participantId?: string) => {
    setTeamData({ sessionId, roomCode, participantId })

    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('status, phase2_started_at, phase3_started_at')
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        setGameState('team-lobby')
        return
      }

      if (session.phase3_started_at) {
        setGameState('team-contestation')
      } else if (session.phase2_started_at) {
        setGameState('team-judgment')
      } else if (session.status === 'judging' || session.status === 'completed' || session.status === 'encerrado') {
        setGameState('team-requirements')
      } else {
        setGameState('team-lobby')
      }
    } catch (err) {
      console.error('Erro ao verificar status da sessão:', err)
      setGameState('team-lobby')
    }
  }

  const handleTeamRequirementsComplete = () => {
    setGameState('team-judgment')
  }

  const handleBackToModeSelection = () => {
    setGameState('mode-selection')
    setTeamData({ sessionId: '', roomCode: '', participantId: '' })
    setTeamMatchConfig(null)
  }

  const handleStartTeamRequirements = () => {
    setGameState('team-requirements')
  }

  const handleParticipantIdFound = (participantId: string) => {
    setTeamData(prev => ({ ...prev, participantId }))
  }

  useEffect(() => {
    if (teamData.sessionId) {
      const channel = supabase
        .channel(`session-${teamData.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${teamData.sessionId}`
          },
          (payload) => {
            const currentState = gameStateRef.current
            const newData = payload.new

            if (newData.status === 'judging') {
              if (currentState === 'team-lobby') {
                setTimeout(() => {
                  setGameState('team-requirements')
                }, 1000)
              }
            }

            if (newData.phase3_started_at) {
              if (currentState === 'team-lobby' || currentState === 'team-judgment') {
                setGameState('team-contestation')
              }
            }

            if (newData.status === 'encerrado') {
              setTimeout(() => setGameState('game-completed'), 500)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [teamData.sessionId])

  const handleTeamJudgmentComplete = () => {
    setGameState('team-contestation')
  }

  const handleTeamContestationComplete = () => {
    setGameState('team-lobby')
  }

  const renderLoadingMatch = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-3">
        <div className="w-8 h-8 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground">Carregando dados da partida...</p>
      </div>
    </div>
  )

  const renderSessionError = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Erro de Sessão</h2>
        <p className="text-muted-foreground">ID do participante não encontrado. Tente entrar na sala novamente.</p>
        <Button onClick={handleBackToModeSelection}>Voltar ao Menu</Button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (gameState) {
      case 'mode-selection':
        return (
          <GameModeSelector
            onTeamModeSelect={handleTeamModeSelect}
          />
        )

      case 'team-requirements':
        if (!teamData.participantId) return renderSessionError()
        if (!teamMatchConfig) return renderLoadingMatch()
        return (
          <TeamMultiRequirementPhase
            sessionId={teamData.sessionId}
            participantId={teamData.participantId}
            matchId={teamMatchConfig.matchId}
            onBack={() => setGameState('team-lobby')}
            onPhaseComplete={handleTeamRequirementsComplete}
            phaseDuration={teamMatchConfig.phase1Duration}
            scenario={teamMatchConfig.scenario}
          />
        )

      case 'team-lobby':
        return (
          <TeamLobby
            sessionId={teamData.sessionId}
            roomCode={teamData.roomCode}
            participantId={teamData.participantId}
            onStartJudgment={handleStartTeamRequirements}
            onBack={handleBackToModeSelection}
            onParticipantIdFound={handleParticipantIdFound}
            lobbyDuration={0}
          />
        )

      case 'team-judgment':
        if (!teamData.participantId) return renderSessionError()
        if (!teamMatchConfig) return renderLoadingMatch()
        return (
          <TeamJudgmentPhase
            sessionId={teamData.sessionId}
            participantId={teamData.participantId}
            requirements={[]}
            onComplete={handleTeamJudgmentComplete}
            onBack={() => setGameState('team-lobby')}
            phaseDuration={teamMatchConfig.phase2Duration}
            scenario={teamMatchConfig.scenario}
          />
        )

      case 'team-contestation':
        if (!teamData.participantId) return renderSessionError()
        if (!teamMatchConfig) return renderLoadingMatch()
        return (
          <TeamContestationPhase
            sessionId={teamData.sessionId}
            participantId={teamData.participantId}
            onBack={() => setGameState('team-lobby')}
            onComplete={handleTeamContestationComplete}
            scenario={teamMatchConfig.scenario}
          />
        )

      case 'game-completed':
        return (
          <GameCompletedScreen
            onBackToMenu={handleBackToModeSelection}
          />
        )

      default:
        return (
          <GameModeSelector
            onTeamModeSelect={handleTeamModeSelect}
          />
        )
    }
  }

  return renderContent()
};

export default Index;