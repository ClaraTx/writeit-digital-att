import { useState } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, LogIn } from "lucide-react"
import { TeamJoinModal } from "./TeamJoinModal"

interface GameModeSelectorProps {
  onTeamModeSelect: (sessionId: string, roomCode: string, participantId?: string) => void
}

export const GameModeSelector = ({ onTeamModeSelect }: GameModeSelectorProps) => {
  const [showJoinModal, setShowJoinModal] = useState(false)

  const handleJoinSuccess = (sessionId: string, roomCode: string, participantId?: string) => {
    onTeamModeSelect(sessionId, roomCode, participantId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
            🎓 Jogo Educacional
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-game-purple bg-clip-text text-transparent">
            WriteIt
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Aprenda engenharia de requisitos de forma divertida e interativa
          </p>
        </div>

        <GameCard
          variant="interactive"
          className="group hover:shadow-game mx-auto max-w-md"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-game-success to-game-success/80 rounded-full mx-auto group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">Jogar em Equipe</h3>
              <p className="text-muted-foreground">
                Entre no código da sua equipe e colabore com seus colegas
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Colaborativo
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <LogIn className="w-3 h-3 mr-1" />
                  Código da equipe
                </Badge>
              </div>
            </div>
          </div>
        </GameCard>

        <div className="pt-4">
          <Button
            onClick={() => setShowJoinModal(true)}
            size="lg"
            className="px-8 py-4 text-lg font-semibold min-w-64"
          >
            Entrar na Equipe <LogIn className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          🎯 Monte requisitos • 🔍 Classifique corretamente • 🏆 Complete desafios
        </p>
      </div>

      <TeamJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinSuccess={handleJoinSuccess}
      />
    </div>
  )
}