import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Trophy, Heart, Star } from "lucide-react"

interface GameCompletedScreenProps {
  playerName?: string
  onBackToMenu: () => void
}

export const GameCompletedScreen = ({ playerName, onBackToMenu }: GameCompletedScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 flex items-center justify-center p-4">
      <GameCard variant="gradient" className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-game-success to-game-success/80 rounded-full mx-auto">
            <Trophy className="w-12 h-12 text-white" />
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-game-purple bg-clip-text text-transparent">
              Jogo Encerrado!
            </h1>
            {playerName && (
              <p className="text-xl text-muted-foreground mb-2">
                Parabéns, <span className="font-semibold text-foreground">{playerName}</span>!
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-muted/20 rounded-lg border-2 border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-red-500" />
              <Star className="w-6 h-6 text-yellow-500" />
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              Obrigado pela sua participação!
            </h2>
            <div className="space-y-3 text-lg text-muted-foreground">
              <p>
                Suas avaliações foram <span className="font-semibold text-game-success">salvas com sucesso</span> e contribuirão para a pesquisa sobre engenharia de requisitos.
              </p>
              <p>
                Sua participação é muito importante para o desenvolvimento de melhores práticas na área de requisitos de software.
              </p>
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-primary font-medium">
              ✨ Missão cumprida! Você completou todas as fases do jogo de avaliação colaborativa.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={onBackToMenu}
            size="lg"
            className="bg-gradient-to-r from-primary to-game-purple hover:shadow-game text-lg px-8 py-3"
          >
            Voltar ao Menu Principal
          </Button>
        </div>
      </GameCard>
    </div>
  )
}