import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Calendar, Settings, Trophy, CheckCircle, XCircle, RefreshCw, User, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"

interface TeamMember {
  id: string
  player_name: string
  is_host: boolean
  joined_at: string
  requirements_created: number
  evaluations_made: number
  correct_evaluations: number
}

interface TeamData {
  id: string
  room_code: string
  status: string
  created_at: string
  total_requirements: number
  total_evaluations: number
  members: TeamMember[]
  phase: string
}

const CLASSIFICATIONS = [
  { id: "funcional", label: "Funcional", color: "bg-blue-100 text-blue-800" },
  { id: "nao-funcional", label: "Não funcional", color: "bg-yellow-100 text-yellow-800" },
  { id: "inverso", label: "Inverso", color: "bg-purple-100 text-purple-800" }
]

const STATUS_COLORS = {
  waiting: "bg-yellow-100 text-yellow-800",
  judging: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  evaluating: "bg-purple-100 text-purple-800"
}

const STATUS_LABELS = {
  waiting: "Aguardando",
  judging: "Fase 1 - Requisitos",
  completed: "Fase 2 - Avaliação",
  evaluating: "Avaliando"
}

export default function EquipesAdmin() {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    try {
      // Get team game sessions
      const { data: teamSessions, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('mode', 'team')
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      const teamsData: TeamData[] = []

      for (const session of teamSessions || []) {
        // Get team members
        const { data: participants, error: participantsError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', session.id)
          .order('joined_at', { ascending: true })

        if (participantsError) {
          console.error('Error loading participants:', participantsError)
          continue
        }

        // Get requirements count for this session
        const { data: requirements, error: reqError } = await supabase
          .from('requirements')
          .select('id, created_by')
          .eq('session_id', session.id)

        if (reqError) {
          console.error('Error loading requirements:', reqError)
        }

        // Get evaluations count for this session
        const { data: evaluations, error: evalError } = await supabase
          .from('requirement_evaluations')
          .select('evaluator_id, is_correct')
          .eq('session_id', session.id)

        if (evalError) {
          console.error('Error loading evaluations:', evalError)
        }

        // Map members with their stats
        const membersData: TeamMember[] = participants?.map((participant, index) => {
          const memberRequirements = requirements?.filter(req => req.created_by === participant.id) || []
          const memberEvaluations = evaluations?.filter(evaluation => evaluation.evaluator_id === participant.id) || []
          const correctEvaluations = memberEvaluations.filter(evaluation => evaluation.is_correct).length

          return {
            id: participant.id,
            player_name: participant.player_name,
            is_host: index === 0, // First participant is host
            joined_at: participant.joined_at,
            requirements_created: memberRequirements.length,
            evaluations_made: memberEvaluations.length,
            correct_evaluations: correctEvaluations
          }
        }) || []

        const teamData: TeamData = {
          id: session.id,
          room_code: session.room_code,
          status: session.status,
          created_at: session.created_at,
          total_requirements: requirements?.length || 0,
          total_evaluations: evaluations?.length || 0,
          members: membersData,
          phase: getPhaseFromStatus(session.status)
        }

        teamsData.push(teamData)
      }

      setTeams(teamsData)
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

  const getPhaseFromStatus = (status: string): string => {
    switch (status) {
      case 'waiting': return 'Lobby'
      case 'judging': return 'Fase 1'
      case 'completed': return 'Fase 2'
      case 'evaluating': return 'Avaliação'
      default: return 'Desconhecido'
    }
  }

  const calculateTeamScore = (team: TeamData): number => {
    // Team score: sum of all members' individual scores
    return team.members.reduce((total, member) => {
      return total + member.requirements_created + (member.correct_evaluations * 2) - (member.evaluations_made - member.correct_evaluations)
    }, 0)
  }

  const getStatusStyle = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800"
  }

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
  }

  if (selectedTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedTeam(null)}
                className="hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Lista
              </Button>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Equipe #{selectedTeam.room_code}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusStyle(selectedTeam.status)}>
                {getStatusLabel(selectedTeam.status)}
              </Badge>
              <Badge variant="secondary" className="px-4 py-2">
                Score: {calculateTeamScore(selectedTeam)}
              </Badge>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">{selectedTeam.members.length}</div>
                <div className="text-sm text-muted-foreground">Membros</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">{selectedTeam.total_requirements}</div>
                <div className="text-sm text-muted-foreground">Requisitos Criados</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">{selectedTeam.total_evaluations}</div>
                <div className="text-sm text-muted-foreground">Avaliações Feitas</div>
              </div>
            </GameCard>
            <GameCard className="text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">{calculateTeamScore(selectedTeam)}</div>
                <div className="text-sm text-muted-foreground">Score Total</div>
              </div>
            </GameCard>
          </div>

          {/* Team Members */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Membros da Equipe</h3>
            <div className="space-y-3">
              {selectedTeam.members.map((member) => (
                <div key={member.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{member.player_name}</span>
                      {member.is_host && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Anfitrião
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Entrou: {new Date(member.joined_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{member.requirements_created}</div>
                      <div className="text-xs text-muted-foreground">Requisitos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{member.correct_evaluations}</div>
                      <div className="text-xs text-muted-foreground">Corretas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{member.evaluations_made - member.correct_evaluations}</div>
                      <div className="text-xs text-muted-foreground">Incorretas</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t">
                    <div className="text-center">
                      <span className="text-sm font-medium">Score Individual: </span>
                      <Badge variant="outline">
                        {member.requirements_created + (member.correct_evaluations * 2) - (member.evaluations_made - member.correct_evaluations)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GameCard>

          {/* Team Timeline */}
          <GameCard className="space-y-4">
            <h3 className="font-semibold">Timeline da Equipe</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Equipe criada em {new Date(selectedTeam.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedTeam.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{selectedTeam.members.length} membros se juntaram</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-3 h-3 rounded-full ${selectedTeam.status === 'completed' || selectedTeam.status === 'evaluating' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Status atual: {getStatusLabel(selectedTeam.status)}</span>
              </div>
            </div>
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
              <Users className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Monitoramento de Equipes</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={loadTeams}
              disabled={loading}
              className="px-4 py-2"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Badge variant="secondary" className="px-4 py-2">
              Equipes: {teams.length}
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
          <Link to="/individual">
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Individual
            </Button>
          </Link>
        </div>

        {/* Teams List */}
        <GameCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Equipes Ativas</h3>
            <div className="text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 inline mr-1" />
              Hoje: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Carregando equipes...
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma equipe encontrada hoje
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <div key={team.id} className="p-4 border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Equipe #{team.room_code}</h4>
                        <Badge className={getStatusStyle(team.status)}>
                          {getStatusLabel(team.status)}
                        </Badge>
                        <Badge variant="outline">
                          Score: {calculateTeamScore(team)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>👥 {team.members.length} membros</span>
                        <span>📝 {team.total_requirements} requisitos</span>
                        <span>✅ {team.total_evaluations} avaliações</span>
                        <span>🎯 {team.phase}</span>
                        <span>📅 {new Date(team.created_at).toLocaleDateString('pt-BR')} às {new Date(team.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Top performers */}
                      {team.members.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-yellow-600" />
                          <span className="text-muted-foreground">Top: </span>
                          {team.members
                            .sort((a, b) => (b.requirements_created + b.correct_evaluations) - (a.requirements_created + a.correct_evaluations))
                            .slice(0, 2)
                            .map((member, index) => (
                              <Badge key={member.id} variant="outline" className="text-xs">
                                {member.player_name} ({member.requirements_created + member.correct_evaluations})
                              </Badge>
                            ))
                          }
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTeam(team)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-3 grid grid-cols-4 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{team.members.length}</div>
                      <div className="text-xs text-muted-foreground">Membros</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{team.total_requirements}</div>
                      <div className="text-xs text-muted-foreground">Requisitos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{team.total_evaluations}</div>
                      <div className="text-xs text-muted-foreground">Avaliações</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{calculateTeamScore(team)}</div>
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