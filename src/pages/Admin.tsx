import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Users, User, FileText, Calendar, Trophy, Activity, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"

interface AdminStats {
  total_requirements: number
  total_teams: number
  total_individual_players: number
  active_sessions: number
  today_sessions: number
  total_evaluations: number
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats>({
    total_requirements: 0,
    total_teams: 0,
    total_individual_players: 0,
    active_sessions: 0,
    today_sessions: 0,
    total_evaluations: 0
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAdminStats()
  }, [])

  const loadAdminStats = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get admin-saved requirements only (not player-generated ones)
      const { data: requirements, error: reqError } = await supabase
        .from('requirements')
        .select('id')
        .eq('session_id', '00000000-0000-0000-0000-000000000000')
        .neq('requirement_text', '[REMOVIDO]')

      if (reqError) throw reqError

      // Get team sessions
      const { data: teamSessions, error: teamError } = await supabase
        .from('game_sessions')
        .select('id, status, created_at')
        .eq('mode', 'team')

      if (teamError) throw teamError

      // Get individual sessions (from new table when it exists)
      const { data: individualSessions, error: individualError } = await supabase
        .from('individual_sessions')
        .select('id, status, created_at')

      // If individual_sessions table doesn't exist yet, count from game_sessions
      let individualCount = 0
      if (individualError?.code === '42P01') {
        const { data: individualFromGameSessions } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('mode', 'individual')
        individualCount = individualFromGameSessions?.length || 0
      } else {
        individualCount = individualSessions?.length || 0
      }

      // Get evaluations
      const { data: evaluations, error: evalError } = await supabase
        .from('requirement_evaluations')
        .select('id')

      if (evalError && evalError.code !== '42P01') throw evalError

      // Calculate stats
      const totalRequirements = requirements?.length || 0
      const totalTeams = teamSessions?.length || 0
      const totalIndividualPlayers = individualCount
      const activeSessions = teamSessions?.filter(s => s.status !== 'completed').length || 0
      const todaySessions = teamSessions?.filter(s =>
        s.created_at.startsWith(today)
      ).length || 0
      const totalEvaluations = evaluations?.length || 0

      setStats({
        total_requirements: totalRequirements,
        total_teams: totalTeams,
        total_individual_players: totalIndividualPlayers,
        active_sessions: activeSessions,
        today_sessions: todaySessions,
        total_evaluations: totalEvaluations
      })

    } catch (error) {
      console.error('Error loading admin stats:', error)
      toast({
        title: "Erro ao carregar estatísticas",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const adminSections = [
    {
      id: 'requisitos',
      title: 'Gerenciar Requisitos',
      description: 'Adicionar, editar e remover requisitos do banco de dados',
      icon: FileText,
      path: '/admin/requisitos',
      color: 'bg-blue-100 text-blue-800',
      stats: `${stats.total_requirements} requisitos`
    },
    {
      id: 'configuracoes',
      title: 'Configurações da Partida',
      description: 'Configurar tempo das fases e regras de equipe',
      icon: Settings,
      path: '/admin/configuracoes',
      color: 'bg-orange-100 text-orange-800',
      stats: 'Tempo e regras'
    },
    {
      id: 'equipes',
      title: 'Monitorar Equipes',
      description: 'Acompanhar progresso e estatísticas das equipes',
      icon: Users,
      path: '/admin/equipes',
      color: 'bg-green-100 text-green-800',
      stats: `${stats.total_teams} equipes`
    },
    {
      id: 'individual',
      title: 'Jogadores Individuais',
      description: 'Monitorar jogadores em modo individual',
      icon: User,
      path: '/admin/individual',
      color: 'bg-purple-100 text-purple-800',
      stats: `${stats.total_individual_players} jogadores`
    },
  ]

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
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Painel Administrativo</h1>
                <p className="text-muted-foreground">WriteIt - Jogo de Requisitos</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-4 py-2">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date().toLocaleDateString('pt-BR')}
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GameCard className="text-center">
            <div className="space-y-2">
              <Activity className="w-8 h-8 mx-auto text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.active_sessions}</div>
              <div className="text-sm text-muted-foreground">Sessões Ativas</div>
            </div>
          </GameCard>

          <GameCard className="text-center">
            <div className="space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.today_sessions}</div>
              <div className="text-sm text-muted-foreground">Sessões Hoje</div>
            </div>
          </GameCard>

          <GameCard className="text-center">
            <div className="space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{stats.total_evaluations}</div>
              <div className="text-sm text-muted-foreground">Avaliações Feitas</div>
            </div>
          </GameCard>
        </div>

        {/* Admin Sections */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Seções Administrativas</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Link key={section.id} to={section.path}>
                <GameCard className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer h-full">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${section.color}`}>
                        <section.icon className="w-6 h-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {section.stats}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {section.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full">
                        Acessar
                      </Button>
                    </div>
                  </div>
                </GameCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <GameCard className="space-y-4">
          <h3 className="font-semibold">Ações Rápidas</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={loadAdminStats}
              disabled={loading}
            >
              <Activity className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Atualizar Stats</span>
            </Button>

            <Link to="/admin/requisitos">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 w-full"
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">Requisitos</span>
              </Button>
            </Link>

            <Link to="/admin/configuracoes">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 w-full"
              >
                <Settings className="w-6 h-6" />
                <span className="text-sm">Configurações</span>
              </Button>
            </Link>

            <Link to="/admin/equipes">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 w-full"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm">Equipes</span>
              </Button>
            </Link>

            <Link to="/admin/individual">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 w-full"
              >
                <User className="w-6 h-6" />
                <span className="text-sm">Individual</span>
              </Button>
            </Link>
          </div>

        </GameCard>

        {/* System Info */}
        <GameCard className="space-y-4">
          <h3 className="font-semibold">Informações do Sistema</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Total Requisitos</div>
              <div className="text-lg font-bold">{stats.total_requirements}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Total Equipes</div>
              <div className="text-lg font-bold">{stats.total_teams}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Jogadores Individuais</div>
              <div className="text-lg font-bold">{stats.total_individual_players}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Avaliações</div>
              <div className="text-lg font-bold">{stats.total_evaluations}</div>
            </div>
          </div>
        </GameCard>
      </div>
    </div>
  )
}