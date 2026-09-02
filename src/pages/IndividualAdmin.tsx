import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Calendar, Settings, Trophy, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"


interface IndividualPlayer {
  id: string
  player_name: string
  requirements_count: number
  evaluations_count: number
  correct_evaluations: number
  incorrect_evaluations: number
  created_at: string
  requirements: {
    id: string
    text: string
    classification: string
  }[]
  evaluations: {
    id: string
    requirement_text: string
    is_correct: boolean
    justification: string
    evaluated_by: string
    requirement_owner: string
  }[]
}

const CLASSIFICATIONS = [
  { id: "funcional", label: "Funcional", color: "bg-blue-100 text-blue-800" },
  { id: "nao-funcional", label: "Não funcional", color: "bg-yellow-100 text-yellow-800" },
  { id: "inverso", label: "Inverso", color: "bg-purple-100 text-purple-800" }
]

export default function IndividualAdmin() {
  console.log('IndividualAdmin: Component rendering...')

  const [players, setPlayers] = useState<IndividualPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<IndividualPlayer | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    console.log('IndividualAdmin: Component mounted, starting to load players...')
    console.log('Supabase URL:', supabase.supabaseUrl)
    loadIndividualPlayers()
  }, [])

  const loadIndividualPlayers = async () => {
    setLoading(true)
    try {
      console.log('IndividualAdmin: Loading individual sessions...')
      // Get individual sessions (use the correct table)
      const { data: individualSessions, error: sessionsError } = await supabase
        .from('individual_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      console.log('IndividualAdmin: Found individual sessions:', individualSessions?.length || 0)
      const playersData: IndividualPlayer[] = []

      for (const session of individualSessions || []) {
        console.log(`IndividualAdmin: Processing session ${session.id} (${session.player_name})`)

        // Get requirements for this individual session
        const { data: requirements, error: reqError } = await supabase
          .from('requirements')
          .select('*')
          .eq('individual_session_id', session.id)

        if (reqError) {
          console.error('Error loading requirements:', reqError)
          continue
        }

        console.log(`IndividualAdmin: Found ${requirements?.length || 0} requirements for session ${session.id}`)

        // Get evaluations made by this individual session (using the new table)
        const { data: evaluations, error: evalError } = await supabase
          .from('individual_requirement_evaluations')
          .select(`
            *,
            evaluator:individual_sessions!evaluator_session_id(player_name),
            requirement_owner:individual_sessions!individual_session_id(player_name)
          `)
          .eq('evaluator_session_id', session.id)

        if (evalError) {
          console.error('Error loading evaluations:', evalError)
        }

        console.log(`IndividualAdmin: Found ${evaluations?.length || 0} evaluations for session ${session.id}`)

        // Get requirement texts for the evaluations
        let evaluationsWithText = []
        if (evaluations && evaluations.length > 0) {
          for (const evaluation of evaluations) {
            const { data: reqData } = await supabase
              .from('requirements')
              .select('requirement_text')
              .eq('id', evaluation.requirement_id)
              .single()

            console.log('Evaluation data:', evaluation)
            console.log('Evaluator:', evaluation.evaluator)
            console.log('Requirement owner:', evaluation.requirement_owner)

            evaluationsWithText.push({
              ...evaluation,
              requirement_text: reqData?.requirement_text || 'Texto não encontrado',
              evaluated_by: evaluation.evaluator?.player_name || 'Desconhecido',
              requirement_owner: evaluation.requirement_owner?.player_name || 'Desconhecido'
            })
          }
        }

        console.log(`IndividualAdmin: Prepared ${evaluationsWithText.length} evaluations with text for session ${session.id}`)

        const playerData: IndividualPlayer = {
          id: session.id,
          player_name: session.player_name || 'Jogador Anônimo',
          requirements_count: requirements?.length || 0,
          evaluations_count: evaluationsWithText?.length || 0,
          correct_evaluations: evaluationsWithText?.filter(e => e.is_correct).length || 0,
          incorrect_evaluations: evaluationsWithText?.filter(e => !e.is_correct).length || 0,
          created_at: session.created_at,
          requirements: requirements?.map(req => ({
            id: req.id,
            text: req.requirement_text,
            classification: req.classification
          })) || [],
          evaluations: evaluationsWithText?.map(evaluation => ({
            id: evaluation.id,
            requirement_text: evaluation.requirement_text,
            is_correct: evaluation.is_correct,
            justification: evaluation.justification,
            evaluated_by: evaluation.evaluated_by,
            requirement_owner: evaluation.requirement_owner
          })) || []
        }

        playersData.push(playerData)
      }

      console.log('IndividualAdmin: Final players data:', playersData)
      setPlayers(playersData)
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getClassificationStyle = (classification: string) => {
    return CLASSIFICATIONS.find(c => c.id === classification)?.color || "bg-gray-100 text-gray-800"
  }

  const getClassificationLabel = (classification: string) => {
    return CLASSIFICATIONS.find(c => c.id === classification)?.label || classification
  }

  const calculateScore = (player: IndividualPlayer) => {
    // Simple scoring: +1 for each requirement created, +2 for correct evaluation, -1 for incorrect
    return player.requirements_count + (player.correct_evaluations * 2) - player.incorrect_evaluations
  }

  if (selectedPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedPlayer(null)}
                className="hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Lista
              </Button>
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Detalhes - {selectedPlayer.player_name}</h1>
              </div>
            </div>

            <Badge variant="secondary" className="px-4 py-2">
              Score: {calculateScore(selectedPlayer)}
            </Badge>
          </div>

          {/* Player Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">{selectedPlayer.requirements_count}</div>
                <div className="text-sm text-muted-foreground">Requisitos Criados</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">{selectedPlayer.correct_evaluations}</div>
                <div className="text-sm text-muted-foreground">Avaliações Corretas</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-600">{selectedPlayer.incorrect_evaluations}</div>
                <div className="text-sm text-muted-foreground">Avaliações Incorretas</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">{calculateScore(selectedPlayer)}</div>
                <div className="text-sm text-muted-foreground">Score Total</div>
              </div>
            </GameCard>
          </div>

          {/* Requirements Created */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Requisitos Criados na Fase 1</h3>
            {selectedPlayer.requirements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum requisito criado</p>
            ) : (
              <div className="space-y-3">
                {selectedPlayer.requirements.map((req, index) => (
                  <div key={req.id} className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">Requisito {index + 1}</span>
                      <Badge className={getClassificationStyle(req.classification)}>
                        {getClassificationLabel(req.classification)}
                      </Badge>
                    </div>
                    <p className="text-sm">{req.text}</p>
                  </div>
                ))}
              </div>
            )}
          </GameCard>


          {/* Evaluations Made */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Avaliações Feitas na Fase 2</h3>
            {selectedPlayer.evaluations.length > 0 && (
              <div className="text-sm text-muted-foreground mb-4">
                {selectedPlayer.evaluations.map((evaluation, index) => (
                  <div key={evaluation.id}>
                    <strong>{selectedPlayer.player_name}</strong> avaliou <strong>{evaluation.requirement_owner}</strong>
                  </div>
                ))}
              </div>
            )}
            {selectedPlayer.evaluations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma avaliação feita</p>
            ) : (
              <div className="space-y-3">
                {selectedPlayer.evaluations.map((evaluation, index) => (
                  <div key={evaluation.id} className="p-3 border rounded-lg bg-muted/20">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <span className="font-medium text-sm">Avaliação {index + 1}</span>
                        <div className="text-xs text-muted-foreground">
                          <strong>{selectedPlayer.player_name}</strong> avaliou <strong>{evaluation.requirement_owner}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {evaluation.is_correct ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correto
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Incorreto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mb-2"><strong>Requisito avaliado:</strong> {evaluation.requirement_text}</p>
                    <p className="text-sm"><strong>Justificativa:</strong> {evaluation.justification}</p>
                  </div>
                ))}
              </div>
            )}
          </GameCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Monitoramento Individual</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={loadIndividualPlayers}
              disabled={loading}
              className="px-4 py-2"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Badge variant="secondary" className="px-4 py-2">
              Jogadores: {players.length}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <Link to="/requisitos">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Requisitos
            </Button>
          </Link>
          <Link to="/equipes">
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Equipes
            </Button>
          </Link>
        </div>

        {/* Players List */}
        <GameCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Jogadores Individuais</h3>
            <div className="text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 inline mr-1" />
              Hoje: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Carregando jogadores...
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum jogador individual encontrado hoje
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player) => (
                <div key={player.id} className="p-4 border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{player.player_name}</h4>
                        <Badge variant="outline">
                          Score: {calculateScore(player)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>📝 {player.requirements_count} requisitos</span>
                        <span>✅ {player.correct_evaluations} corretas</span>
                        <span>❌ {player.incorrect_evaluations} incorretas</span>
                        <span>📅 {new Date(player.created_at).toLocaleDateString('pt-BR')} às {new Date(player.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{player.requirements_count}</div>
                      <div className="text-xs text-muted-foreground">Requisitos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{player.correct_evaluations}</div>
                      <div className="text-xs text-muted-foreground">Corretas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{calculateScore(player)}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GameCard>
      </div>
    </div>
  )
}