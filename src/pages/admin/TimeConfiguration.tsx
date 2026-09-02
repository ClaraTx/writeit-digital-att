import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Clock, Settings, Save, Plus, Trash2, CheckCircle, AlertCircle, Edit, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { Link } from "react-router-dom"

interface GameConfiguration {
  id: string
  name: string
  description: string
  phase1_duration: number // in seconds
  phase2_duration: number // in seconds
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function TimeConfiguration() {
  const [configurations, setConfigurations] = useState<GameConfiguration[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newConfig, setNewConfig] = useState({
    name: "",
    description: "",
    phase1_minutes: 20,
    phase2_minutes: 15
  })
  const [editConfig, setEditConfig] = useState({
    name: "",
    description: "",
    phase1_minutes: 20,
    phase2_minutes: 15
  })
  const { toast } = useToast()

  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_configurations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setConfigurations(data || [])
    } catch (error) {
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

    setLoading(true)
    try {
      const { error } = await supabase
        .from('game_configurations')
        .insert({
          name: newConfig.name.trim(),
          description: newConfig.description.trim() || null,
          phase1_duration: newConfig.phase1_minutes * 60,
          phase2_duration: newConfig.phase2_minutes * 60,
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
        phase2_minutes: 15
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
    const config = configurations.find(c => c.id === id)
    if (config?.is_active) {
      toast({
        title: "Não é possível excluir",
        description: "Desative a configuração antes de excluí-la.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('game_configurations')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Configuração removida",
        description: "A configuração foi excluída com sucesso.",
      })

      loadConfigurations()
    } catch (error) {
      toast({
        title: "Erro ao excluir configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditConfiguration = (config: GameConfiguration) => {
    console.log("Editando configuração:", config.name)
    setEditingId(config.id)
    setEditConfig({
      name: config.name,
      description: config.description,
      phase1_minutes: Math.floor(config.phase1_duration / 60),
      phase2_minutes: Math.floor(config.phase2_duration / 60)
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
          updated_at: new Date().toISOString()
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
        phase2_minutes: 15
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
      phase2_minutes: 15
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
              <Clock className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Configuração de Tempo</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">{activeConfig.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {activeConfig.description || 'Sem descrição'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-100 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(activeConfig.phase1_duration)}
                  </div>
                  <div className="text-sm text-blue-800">Fase 1</div>
                </div>
                <div className="text-center p-4 bg-purple-100 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(activeConfig.phase2_duration)}
                  </div>
                  <div className="text-sm text-purple-800">Fase 2</div>
                </div>
              </div>
            </div>
          </GameCard>
        )}

        {/* Create New Configuration */}
        <GameCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Nova Configuração de Tempo</h3>
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
              <div>
                <label className="block text-sm font-medium mb-2">Duração da Fase 1 (minutos)</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={newConfig.phase1_minutes}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, phase1_minutes: parseInt(e.target.value) || 20 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo para montar requisitos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duração da Fase 2 (minutos)</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={newConfig.phase2_minutes}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, phase2_minutes: parseInt(e.target.value) || 15 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo para avaliar requisitos
                </p>
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
                <div key={config.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{config.name}</h4>
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
                        onClick={() => handleDeleteConfiguration(config.id)}
                        disabled={loading || config.is_active}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        title="Excluir configuração"
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

                      <div className="grid grid-cols-2 gap-4">
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
                            <span className="text-sm text-muted-foreground">minutos</span>
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
                            <span className="text-sm text-muted-foreground">minutos</span>
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
                        <p className="text-sm text-muted-foreground mb-3">
                          {config.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-lg font-bold text-blue-600">
                            {formatDuration(config.phase1_duration)}
                          </div>
                          <div className="text-sm text-blue-800">Fase 1 - Requisitos</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-lg font-bold text-purple-600">
                            {formatDuration(config.phase2_duration)}
                          </div>
                          <div className="text-sm text-purple-800">Fase 2 - Avaliação</div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
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

          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p><strong>Configuração Ativa:</strong> Apenas uma configuração pode estar ativa por vez. Ela será aplicada automaticamente a todos os novos jogos.</p>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p><strong>Aplicação:</strong> As configurações são aplicadas no momento da criação da sessão de jogo, não afetam jogos já em andamento.</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p><strong>Monitoramento:</strong> Use as páginas de monitoramento de equipes e jogadores individuais para acompanhar o tempo restante em cada fase.</p>
            </div>
          </div>
        </GameCard>
      </div>
    </div>
  )
}