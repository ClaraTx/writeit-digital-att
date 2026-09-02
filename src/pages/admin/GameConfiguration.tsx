import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Settings, Save, Plus, Trash2, CheckCircle, AlertCircle, Clock, Users, User, Edit, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"

interface GameConfiguration {
  id: string
  name: string
  description: string
  phase1_duration: number // in seconds
  phase2_duration: number // in seconds
  max_team_members: number
  min_team_members: number
  min_individual_players: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function GameConfiguration() {
  const [configurations, setConfigurations] = useState<GameConfiguration[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newConfig, setNewConfig] = useState({
    name: "",
    description: "",
    phase1_minutes: 20,
    phase2_minutes: 15,
    max_team_members: 6,
    min_team_members: 2,
    min_individual_players: 2
  })
  const [editConfig, setEditConfig] = useState({
    name: "",
    description: "",
    phase1_minutes: 20,
    phase2_minutes: 15,
    max_team_members: 6,
    min_team_members: 2,
    min_individual_players: 2
  })
  const { toast } = useToast()

  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = async () => {
    console.log("🔄 Carregando configurações...")
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_configurations')
        .select('*')
        .order('created_at', { ascending: false })

      console.log("📥 Dados recebidos do Supabase:", data)
      console.log("❌ Erro (se houver):", error)

      if (error) throw error

      console.log("✅ Definindo configurações no estado:", data?.length, "items")
      setConfigurations(data || [])
    } catch (error) {
      console.log("❌ Erro ao carregar configurações:", error)
      toast({
        title: "Erro ao carregar configurações",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfiguration = async () => {
    if (!newConfig.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a configuração",
        variant: "destructive"
      })
      return
    }

    if (newConfig.max_team_members < newConfig.min_team_members) {
      toast({
        title: "Configuração inválida",
        description: "Número máximo deve ser maior ou igual ao mínimo",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('game_configurations')
        .insert({
          name: newConfig.name.trim(),
          description: newConfig.description.trim() || null,
          phase1_duration: newConfig.phase1_minutes * 60,
          phase2_duration: newConfig.phase2_minutes * 60,
          max_team_members: newConfig.max_team_members,
          min_team_members: newConfig.min_team_members,
          min_individual_players: newConfig.min_individual_players,
          is_active: false
        })

      if (error) throw error

      toast({
        title: "Configuração criada!",
        description: `${newConfig.name} foi adicionada às configurações.`,
      })

      setNewConfig({
        name: "",
        description: "",
        phase1_minutes: 20,
        phase2_minutes: 15,
        max_team_members: 6,
        min_team_members: 2,
        min_individual_players: 2
      })

      loadConfigurations()
    } catch (error) {
      toast({
        title: "Erro ao criar configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleActivateConfiguration = async (id: string) => {
    setLoading(true)
    try {
      // Use SQL function to properly handle the unique constraint
      const { error } = await supabase
        .rpc('activate_game_configuration', { config_id: id })

      if (error) throw error

      toast({
        title: "Configuração ativada!",
        description: "As novas configurações serão aplicadas aos próximos jogos.",
      })

      loadConfigurations()
    } catch (error) {
      toast({
        title: "Erro ao ativar configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfiguration = async (id: string) => {
    console.log("=== FUNÇÃO DELETE CHAMADA ===")
    const config = configurations.find(c => c.id === id)
    console.log("Configuração encontrada:", config)
    console.log("Tentando deletar configuração:", config?.name, "Ativa:", config?.is_active)

    if (config?.is_active) {
      console.log("❌ Configuração está ativa, não pode deletar")
      toast({
        title: "Não é possível excluir",
        description: "Desative a configuração antes de excluí-la.",
        variant: "destructive"
      })
      return
    }

    // Confirmação antes de deletar
    console.log("🤔 Perguntando confirmação...")
    const confirmDelete = confirm(`Tem certeza que deseja excluir a configuração "${config?.name}"?`)
    console.log("Confirmação:", confirmDelete)

    if (!confirmDelete) {
      console.log("❌ Usuário cancelou")
      return
    }

    console.log("✅ Prosseguindo com exclusão...")

    setLoading(true)
    try {
      console.log("🗄️ Chamando Supabase DELETE para ID:", id)
      const { error, data } = await supabase
        .from('game_configurations')
        .delete()
        .eq('id', id)

      console.log("Resposta Supabase:", { error, data })

      if (error) {
        console.log("❌ Erro do Supabase:", error)
        throw error
      }

      console.log("✅ Delete bem-sucedido!")
      toast({
        title: "Configuração removida",
        description: "A configuração foi excluída com sucesso.",
      })

      // Pequeno delay para garantir que o banco foi atualizado
      console.log("⏳ Aguardando 500ms antes de recarregar...")
      setTimeout(() => {
        loadConfigurations()
      }, 500)
    } catch (error) {
      console.log("❌ Erro capturado:", error)
      toast({
        title: "Erro ao excluir configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      console.log("🏁 Finalizando operação de delete")
      setLoading(false)
    }
  }

  const handleEditConfiguration = (config: GameConfiguration) => {
    setEditingId(config.id)
    setEditConfig({
      name: config.name,
      description: config.description,
      phase1_minutes: Math.floor(config.phase1_duration / 60),
      phase2_minutes: Math.floor(config.phase2_duration / 60),
      max_team_members: config.max_team_members,
      min_team_members: config.min_team_members,
      min_individual_players: config.min_individual_players
    })
  }

  const handleUpdateConfiguration = async () => {
    if (!editingId) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('game_configurations')
        .update({
          name: editConfig.name,
          description: editConfig.description,
          phase1_duration: editConfig.phase1_minutes * 60,
          phase2_duration: editConfig.phase2_minutes * 60,
          max_team_members: editConfig.max_team_members,
          min_team_members: editConfig.min_team_members,
          min_individual_players: editConfig.min_individual_players
        })
        .eq('id', editingId)

      if (error) throw error

      toast({
        title: "Configuração atualizada!",
        description: `${editConfig.name} foi atualizada com sucesso.`,
      })

      setEditingId(null)
      setEditConfig({
        name: "",
        description: "",
        phase1_minutes: 20,
        phase2_minutes: 15,
        max_team_members: 6,
        min_team_members: 2,
        min_individual_players: 2
      })

      loadConfigurations()
    } catch (error) {
      toast({
        title: "Erro ao atualizar configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditConfig({
      name: "",
      description: "",
      phase1_minutes: 20,
      phase2_minutes: 15,
      lobby_minutes: 1,
      max_team_members: 6,
      min_team_members: 2,
      min_individual_players: 2
    })
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds === 0 ? `${minutes}min` : `${minutes}min ${remainingSeconds}s`
  }

  const activeConfig = configurations.find(c => c.is_active)

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
              <Settings className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Configurações da Partida</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-4 py-2">
              Configurações: {configurations.length}
            </Badge>
          </div>
        </div>

        {/* Active Configuration Display */}
        {activeConfig && (
          <GameCard variant="gradient" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold">Configuração Ativa</h3>
              </div>
              <Badge className="bg-green-100 text-green-800">
                Ativo
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">{activeConfig.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {activeConfig.description || 'Sem descrição'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Time Settings */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-lg font-bold text-blue-600">
                      {formatDuration(activeConfig.phase1_duration)}
                    </div>
                    <div className="text-xs text-blue-800">Fase 1</div>
                  </div>
                  <div className="text-center p-3 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold text-purple-600">
                      {formatDuration(activeConfig.phase2_duration)}
                    </div>
                    <div className="text-xs text-purple-800">Fase 2</div>
                  </div>
                </div>

                {/* Team Settings */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-4 h-4 mx-auto mb-1 text-green-600" />
                    <div className="text-sm font-bold text-green-600">{activeConfig.min_team_members}-{activeConfig.max_team_members}</div>
                    <div className="text-xs text-green-800">Equipe</div>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <User className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                    <div className="text-sm font-bold text-orange-600">{activeConfig.min_individual_players}+</div>
                    <div className="text-xs text-orange-800">Individual</div>
                  </div>
                </div>
              </div>
            </div>
          </GameCard>
        )}

        {/* Create New Configuration */}
        <GameCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Nova Configuração</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome da Configuração</label>
                <Input
                  value={newConfig.name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Configuração Rápida"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                <Textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva quando usar esta configuração..."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Time Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fase 1 (min)</label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={newConfig.phase1_minutes}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, phase1_minutes: parseInt(e.target.value) || 20 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Montar requisitos</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fase 2 (min)</label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={newConfig.phase2_minutes}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, phase2_minutes: parseInt(e.target.value) || 15 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Avaliar requisitos</p>
                </div>

              </div>

              {/* Team Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min. Equipe</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newConfig.min_team_members}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, min_team_members: parseInt(e.target.value) || 2 }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Máx. Equipe</label>
                  <Input
                    type="number"
                    min="2"
                    max="20"
                    value={newConfig.max_team_members}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, max_team_members: parseInt(e.target.value) || 6 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Min. Jogadores Individuais</label>
                <Input
                  type="number"
                  min="2"
                  max="50"
                  value={newConfig.min_individual_players}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, min_individual_players: parseInt(e.target.value) || 2 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Para avaliação cruzada</p>
              </div>

              <Button
                onClick={handleCreateConfiguration}
                disabled={loading || !newConfig.name.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Configuração
              </Button>
            </div>
          </div>
        </GameCard>

        {/* Configurations List */}
        <GameCard className="space-y-4">
          <h3 className="font-semibold">Configurações Disponíveis</h3>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando configurações...
            </div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma configuração encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {configurations.map((config) => (
                <div key={config.id} className="p-6 border rounded-lg bg-muted/20">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-lg">{config.name}</h4>
                      {config.is_active && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!config.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateConfiguration(config.id)}
                          disabled={loading}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditConfiguration(config)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-700"
                        title="Editar configuração"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log("CLICOU NA LIXEIRA - Config:", config.name, "ID:", config.id, "Ativa:", config.is_active, "Loading:", loading)
                          handleDeleteConfiguration(config.id)
                        }}
                        disabled={loading || config.is_active}
                        className={`${config.is_active ? 'text-gray-400 cursor-not-allowed' : 'text-destructive hover:text-destructive-foreground hover:bg-destructive'}`}
                        title={config.is_active ? "Desative a configuração antes de excluir" : "Excluir configuração"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {editingId === config.id ? (
                    // Edit form
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Nome da configuração"
                          value={editConfig.name}
                          onChange={(e) => setEditConfig(prev => ({ ...prev, name: e.target.value }))}
                          className="mb-2"
                        />
                        <Textarea
                          placeholder="Descrição (opcional)"
                          value={editConfig.description}
                          onChange={(e) => setEditConfig(prev => ({ ...prev, description: e.target.value }))}
                          className="mb-2"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Time Settings */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Duração das Fases
                          </h5>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-blue-800">Fase 1 - Requisitos</label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={editConfig.phase1_minutes}
                                  onChange={(e) => setEditConfig(prev => ({ ...prev, phase1_minutes: parseInt(e.target.value) || 20 }))}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">min</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-purple-800">Fase 2 - Avaliação</label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={editConfig.phase2_minutes}
                                  onChange={(e) => setEditConfig(prev => ({ ...prev, phase2_minutes: parseInt(e.target.value) || 15 }))}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">min</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Team/Player Settings */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Configurações de Jogadores
                          </h5>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-green-800">Min. Equipe</label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={editConfig.min_team_members}
                                onChange={(e) => setEditConfig(prev => ({ ...prev, min_team_members: parseInt(e.target.value) || 2 }))}
                                className="w-16 text-center"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-green-800">Max. Equipe</label>
                              <Input
                                type="number"
                                min="2"
                                max="20"
                                value={editConfig.max_team_members}
                                onChange={(e) => setEditConfig(prev => ({ ...prev, max_team_members: parseInt(e.target.value) || 6 }))}
                                className="w-16 text-center"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-orange-800">Min. Individual</label>
                              <Input
                                type="number"
                                min="1"
                                max="50"
                                value={editConfig.min_individual_players}
                                onChange={(e) => setEditConfig(prev => ({ ...prev, min_individual_players: parseInt(e.target.value) || 2 }))}
                                className="w-16 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={handleUpdateConfiguration}
                          disabled={loading || !editConfig.name.trim()}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={loading}
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      {config.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {config.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Time Settings */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Duração das Fases
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-lg font-bold text-blue-600">
                                {formatDuration(config.phase1_duration)}
                              </div>
                              <div className="text-xs text-blue-800">Fase 1 - Requisitos</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="text-lg font-bold text-purple-600">
                                {formatDuration(config.phase2_duration)}
                              </div>
                              <div className="text-xs text-purple-800">Fase 2 - Avaliação</div>
                            </div>
                          </div>
                        </div>

                        {/* Team/Player Settings */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Configurações de Jogadores
                          </h5>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-lg font-bold text-green-600">
                                {config.min_team_members}-{config.max_team_members}
                              </div>
                              <div className="text-xs text-green-800">Membros/Equipe</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="text-lg font-bold text-orange-600">
                                {config.min_individual_players}+
                              </div>
                              <div className="text-xs text-orange-800">Min. Individual</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                    Criado em: {new Date(config.created_at).toLocaleDateString('pt-BR')} às {new Date(config.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {config.updated_at !== config.created_at && (
                      <span className="ml-4">
                        Atualizado: {new Date(config.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GameCard>

        {/* Usage Instructions */}
        <GameCard className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Como Funciona</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2 text-blue-800">⏱️ Tempo das Fases</h4>
              <p className="text-blue-700">Configure quanto tempo os jogadores têm para cada fase do jogo.</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium mb-2 text-green-800">👥 Equipes</h4>
              <p className="text-green-700">Defina o número mínimo e máximo de membros por equipe.</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-medium mb-2 text-orange-800">🧑‍💻 Individual</h4>
              <p className="text-orange-700">Número mínimo de jogadores para avaliação cruzada funcionar.</p>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> As configurações são aplicadas apenas a novos jogos. Jogos em andamento mantêm suas configurações originais.
            </p>
          </div>
        </GameCard>
      </div>
    </div>
  )
}