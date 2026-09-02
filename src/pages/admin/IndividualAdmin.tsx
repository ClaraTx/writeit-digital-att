import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Calendar, Settings, Trophy, CheckCircle, XCircle, RefreshCw, Users, Bot, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"

interface IndividualPlayer {
  id: string
  player_name: string
  requirements_count: number
  evaluations_count: number
  created_at: string
  requirements: {
    id: string
    text: string
    classification: string
    ai_evaluation?: {
      score: number
      feedback: string
      structure_score: number
      clarity_score: number
      scenario_alignment_score: number
      classification_correct: boolean
      improvements: string[]
    }
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
  const [players, setPlayers] = useState<IndividualPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<IndividualPlayer | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadIndividualPlayers()
  }, [])

  const loadAIEvaluationForRequirement = async (requirementText: string, playerName: string) => {
    try {
      const { data: aiEval } = await supabase
        .from('ai_evaluations')
        .select('*')
        .eq('requirement_text', requirementText)
        .eq('player_name', playerName)
        .maybeSingle()

      if (aiEval) {
        return {
          score: aiEval.total_score,
          feedback: aiEval.ai_feedback,
          structure_score: aiEval.structure_score,
          clarity_score: aiEval.clarity_score,
          scenario_alignment_score: aiEval.scenario_alignment_score,
          classification_correct: aiEval.classification_correct,
          improvements: aiEval.improvements ? JSON.parse(aiEval.improvements) : []
        }
      }
    } catch (error) {
      console.error('Error loading AI evaluation:', error)
    }
    return undefined
  }

  const loadIndividualPlayers = async () => {
    setLoading(true)
    try {
      console.log('AdminIndividual: Loading individual sessions...')
      // First try to get from individual_sessions table
      const { data: individualSessions, error: individualError } = await supabase
        .from('individual_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('AdminIndividual: Individual sessions result:', { individualSessions, individualError })

      if (individualError && individualError.code !== '42P01') {
        throw individualError
      }

      const playersData: IndividualPlayer[] = []

      if (!individualError && individualSessions) {
        console.log(`AdminIndividual: Processing ${individualSessions.length} individual sessions`)
        // Use new individual_sessions table
        for (const session of individualSessions) {
          console.log(`AdminIndividual: Processing session ${session.id} (${session.player_name})`)
          // Get requirements for this session
          const { data: requirements, error: reqError } = await supabase
            .from('requirements')
            .select('*')
            .eq('individual_session_id', session.id)

          if (reqError) {
            console.error('Error loading requirements:', reqError)
            continue
          }

          // Get evaluations for this session with full details
          const { data: evaluations } = await supabase
            .from('individual_requirement_evaluations')
            .select(`
              *,
              evaluator:individual_sessions!evaluator_session_id(player_name),
              requirement_owner:individual_sessions!individual_session_id(player_name)
            `)
            .eq('evaluator_session_id', session.id)

          // Get requirement texts for the evaluations
          let evaluationsWithText = []
          if (evaluations && evaluations.length > 0) {
            for (const evaluation of evaluations) {
              const { data: reqData } = await supabase
                .from('requirements')
                .select('requirement_text')
                .eq('id', evaluation.requirement_id)
                .single()

              evaluationsWithText.push({
                ...evaluation,
                requirement_text: reqData?.requirement_text || 'Texto não encontrado',
                evaluated_by: evaluation.evaluator?.player_name || 'Desconhecido',
                requirement_owner: evaluation.requirement_owner?.player_name || 'Desconhecido'
              })
            }
          }

          console.log(`AdminIndividual: Session ${session.id} - Requirements: ${requirements?.length || 0}, Evaluations: ${evaluations?.length || 0}`)

          const playerData: IndividualPlayer = {
            id: session.id,
            player_name: session.player_name,
            requirements_count: requirements?.length || 0,
            evaluations_count: evaluations?.length || 0,
            created_at: session.created_at,
            requirements: await Promise.all(requirements?.map(async req => ({
              id: req.id,
              text: req.requirement_text,
              classification: req.classification,
              ai_evaluation: await loadAIEvaluationForRequirement(req.requirement_text, session.player_name)
            })) || []),
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
      } else {
        // Fallback to game_sessions table for backward compatibility
        const { data: individualFromGameSessions, error: gameSessionsError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('mode', 'individual')
          .order('created_at', { ascending: false })

        if (gameSessionsError) throw gameSessionsError

        for (const session of individualFromGameSessions || []) {
          // Get requirements for this session
          const { data: requirements, error: reqError } = await supabase
            .from('requirements')
            .select('*')
            .eq('session_id', session.id)

          if (reqError) {
            console.error('Error loading requirements:', reqError)
            continue
          }

          // Get evaluations with full details (try both tables for compatibility)
          let evaluationsWithText = []

          // First try the new individual evaluations table
          const { data: individualEvals } = await supabase
            .from('individual_requirement_evaluations')
            .select('*')
            .eq('evaluator_session_id', session.id)

          if (individualEvals && individualEvals.length > 0) {
            // Use individual evaluations
            for (const evaluation of individualEvals) {
              const { data: reqData } = await supabase
                .from('requirements')
                .select('requirement_text')
                .eq('id', evaluation.requirement_id)
                .single()

              evaluationsWithText.push({
                ...evaluation,
                requirement_text: reqData?.requirement_text || 'Texto não encontrado'
              })
            }
          } else {
            // Fallback to old requirement_evaluations table
            const { data: evaluations } = await supabase
              .from('requirement_evaluations')
              .select(`
                *,
                requirements:requirement_id (
                  requirement_text
                )
              `)
              .eq('session_id', session.id)

            evaluationsWithText = evaluations?.map(evaluation => ({
              ...evaluation,
              requirement_text: evaluation.requirements?.requirement_text || 'Texto não encontrado'
            })) || []
          }

          const playerData: IndividualPlayer = {
            id: session.id,
            player_name: session.player_name || 'Jogador Anônimo',
            requirements_count: requirements?.length || 0,
            evaluations_count: evaluationsWithText?.length || 0,
            created_at: session.created_at,
            requirements: await Promise.all(requirements?.map(async req => ({
              id: req.id,
              text: req.requirement_text,
              classification: req.classification,
              ai_evaluation: await loadAIEvaluationForRequirement(req.requirement_text, session.player_name || 'Jogador Anônimo')
            })) || []),
            evaluations: evaluationsWithText?.map(evaluation => ({
              id: evaluation.id,
              requirement_text: evaluation.requirement_text,
              is_correct: evaluation.is_correct,
              justification: evaluation.justification
            })) || []
          }

          playersData.push(playerData)
        }
      }

      console.log('AdminIndividual: Final players data:', playersData)
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

            <div className="flex gap-2">
              <Badge variant="secondary" className="px-4 py-2">
                Escreveu {selectedPlayer.requirements_count}
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Avaliou {selectedPlayer.evaluations_count}
              </Badge>
            </div>
          </div>

          {/* Player Info */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Informações do Jogador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Nome</div>
                <div className="font-medium">{selectedPlayer.player_name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Requisitos Criados</div>
                <div className="font-medium">{selectedPlayer.requirements_count}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Requisitos Avaliados</div>
                <div className="font-medium">{selectedPlayer.evaluations_count}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Horário de Início</div>
                <div className="font-medium">
                  {new Date(selectedPlayer.created_at).toLocaleDateString('pt-BR')} às {' '}
                  {new Date(selectedPlayer.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </GameCard>

          {/* Requirements Created */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Requisitos Criados na Fase 1</h3>
            {selectedPlayer.requirements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum requisito criado</p>
            ) : (
              <div className="space-y-3">
                {selectedPlayer.requirements.map((req, index) => (
                  <div key={req.id} className="p-4 border rounded-lg bg-muted/20">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">Requisito {index + 1}</span>
                      <div className="flex gap-2">
                        <Badge className={getClassificationStyle(req.classification)}>
                          {getClassificationLabel(req.classification)}
                        </Badge>
                        {req.ai_evaluation && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-800">
                            <Bot className="w-3 h-3 mr-1" />
                            IA: {req.ai_evaluation.score}/100
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm mb-3">{req.text}</p>

                    {/* AI Evaluation Results */}
                    {req.ai_evaluation && (
                      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-300">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-sm text-indigo-800">Avaliação da IA</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.ceil(req.ai_evaluation!.score / 20)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-bold text-indigo-800">
                              {req.ai_evaluation.score}/100
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-indigo-700 mb-3">{req.ai_evaluation.feedback}</p>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">{req.ai_evaluation.structure_score}</div>
                            <div className="text-xs text-indigo-600">Estrutura</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">{req.ai_evaluation.clarity_score}</div>
                            <div className="text-xs text-indigo-600">Clareza</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">{req.ai_evaluation.scenario_alignment_score}</div>
                            <div className="text-xs text-indigo-600">Adequação</div>
                          </div>
                        </div>

                        {/* Classification Check */}
                        <div className="flex items-center gap-2 mb-3">
                          {req.ai_evaluation.classification_correct ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`text-sm ${req.ai_evaluation.classification_correct ? 'text-green-700' : 'text-red-700'}`}>
                            Classificação {req.ai_evaluation.classification_correct ? 'Correta' : 'Incorreta'}
                          </span>
                        </div>

                        {/* Improvements */}
                        {req.ai_evaluation.improvements.length > 0 && (
                          <div className="mt-3 p-2 bg-yellow-50 rounded border-l-2 border-yellow-300">
                            <p className="text-xs font-medium text-yellow-800 mb-1">Sugestões de Melhoria:</p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {req.ai_evaluation.improvements.map((improvement, i) => (
                                <li key={i}>• {improvement}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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
                {Array.from(new Set(selectedPlayer.evaluations.map(e => e.requirement_owner))).map((owner, index) => (
                  <div key={index}>
                    <strong>{selectedPlayer.player_name}</strong> avaliou <strong>{owner}</strong>
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
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">Avaliação {index + 1}</span>
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
            <Link to="/admin">
              <Button
                variant="ghost"
                className="hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Admin
              </Button>
            </Link>
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
          <Link to="/admin/requisitos">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Requisitos
            </Button>
          </Link>
          <Link to="/admin/equipes">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
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
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>✏️ Escreveu {player.requirements_count} requisitos</span>
                        <span>📝 Avaliou {player.evaluations_count} requisitos</span>
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

                </div>
              ))}
            </div>
          )}
        </GameCard>
      </div>
    </div>
  )
}