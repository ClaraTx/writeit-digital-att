import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, ArrowLeft, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"

interface StoredRequirement {
  id: string
  requirement_text: string
  classification: string
  words: string[]
  created_at: string
  scenario_name: string
}

interface Scenario {
  id: number
  name: string
  description: string
}

const CLASSIFICATIONS = [
  { id: "funcional", label: "Funcional", color: "bg-blue-100 text-blue-800" },
  { id: "nao-funcional", label: "Não funcional", color: "bg-yellow-100 text-yellow-800" },
  { id: "inverso", label: "Inverso", color: "bg-purple-100 text-purple-800" }
]

export default function RequirementsAdmin() {
  const [requirements, setRequirements] = useState<StoredRequirement[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [newRequirement, setNewRequirement] = useState("")
  const [newClassification, setNewClassification] = useState("")
  const [loading, setLoading] = useState(false)
  const [wordBank, setWordBank] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadScenarios()
    loadRequirements()
  }, [])

  const loadScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error

      setScenarios(data || [])

      // Set default scenario to PoneyZap (id: 1)
      if (data && data.length > 0) {
        setCurrentScenario(data.find(s => s.id === 1) || data[0])
      }
    } catch (error) {
      console.error('Error loading scenarios:', error)
    }
  }

  const loadRequirements = async () => {
    setLoading(true)
    try {
      // Usando a tabela requirements existente com uma session_id especial para admin
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          scenarios(name)
        `)
        .eq('session_id', '00000000-0000-0000-0000-000000000000') // UUID especial para admin
        .neq('requirement_text', '[REMOVIDO]') // Filtra requisitos "removidos"
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapeia para o formato esperado
      const mappedData = data?.map(item => ({
        id: item.id,
        requirement_text: item.requirement_text,
        classification: item.classification,
        scenario_name: item.scenarios?.name || 'Sem cenário',
        words: (() => {
          // Primeiro, extrai as frases essenciais como blocos únicos
          const essentialPhrases: string[] = []
          const phrasePatterns = [
            /O sistema deve/gi,
            /O sistema não pode/gi
          ]

          let text = item.requirement_text
          phrasePatterns.forEach(pattern => {
            const matches = text.match(pattern)
            if (matches) {
              matches.forEach(match => {
                essentialPhrases.push(match)
                text = text.replace(pattern, ' ') // Remove da string para não processar novamente
              })
            }
          })

          // Depois processa o resto do texto com combinação normal
          const words = text
            .split(/\s+/)
            .map(word => word.replace(/[^\wÀ-ÿ]/g, '')) // Preserva acentos, cedilhas e caracteres especiais
            .filter(word => word.length > 0)

          // Combina palavras pequenas (1-2 caracteres) com a próxima palavra
          const combinedWords: string[] = []
          for (let i = 0; i < words.length; i++) {
            const currentWord = words[i]
            const nextWord = words[i + 1]

            if (currentWord.length <= 2 && nextWord && nextWord.length > 2) {
              // Combina palavra pequena com a próxima
              combinedWords.push(`${currentWord} ${nextWord}`)
              i++ // Pula a próxima palavra pois já foi combinada
            } else if (currentWord.length > 2) {
              // Adiciona palavra normal
              combinedWords.push(currentWord)
            }
            // Ignora palavras muito pequenas que não podem ser combinadas
          }

          return [...essentialPhrases, ...combinedWords]
        })(),
        created_at: item.created_at
      })) || []

      setRequirements(mappedData)
      generateWordBank(mappedData)
    } catch (error) {
      toast({
        title: "Erro ao carregar requisitos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateWordBank = (reqs: StoredRequirement[]) => {
    // Extrai palavras com combinação inteligente e frases essenciais
    const words = reqs.flatMap(req => {
      let text = req.requirement_text

      // Primeiro, extrai as frases essenciais como blocos únicos
      const essentialPhrases: string[] = []
      const phrasePatterns = [
        /O sistema deve/gi,
        /O sistema não pode/gi
      ]

      phrasePatterns.forEach(pattern => {
        const matches = text.match(pattern)
        if (matches) {
          matches.forEach(match => {
            essentialPhrases.push(match)
            text = text.replace(pattern, ' ') // Remove da string para não processar novamente
          })
        }
      })

      // Depois processa o resto do texto com combinação normal
      const words = text
        .split(/\s+/)
        .map(word => word.replace(/[^\wÀ-ÿ]/g, '')) // Preserva acentos, cedilhas e caracteres especiais
        .filter(word => word.length > 0)

      // Combina palavras pequenas (1-2 caracteres) com a próxima palavra
      const combinedWords: string[] = []
      for (let i = 0; i < words.length; i++) {
        const currentWord = words[i]
        const nextWord = words[i + 1]

        if (currentWord.length <= 2 && nextWord && nextWord.length > 2) {
          // Combina palavra pequena com a próxima
          combinedWords.push(`${currentWord} ${nextWord}`)
          i++ // Pula a próxima palavra pois já foi combinada
        } else if (currentWord.length > 2) {
          // Adiciona palavra normal
          combinedWords.push(currentWord)
        }
        // Ignora palavras muito pequenas que não podem ser combinadas
      }

      return [...essentialPhrases, ...combinedWords]
    })

    // Função para embaralhar array
    const shuffleArray = (array: string[]) => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    setWordBank(shuffleArray(words))
  }

  const extractWords = (text: string): string[] => {
    // Primeiro, extrai as frases essenciais como blocos únicos
    const essentialPhrases: string[] = []
    const phrasePatterns = [
      /O sistema deve/gi,
      /O sistema não pode/gi
    ]

    let remainingText = text
    phrasePatterns.forEach(pattern => {
      const matches = remainingText.match(pattern)
      if (matches) {
        matches.forEach(match => {
          essentialPhrases.push(match)
          remainingText = remainingText.replace(pattern, ' ') // Remove da string para não processar novamente
        })
      }
    })

    // Depois processa o resto do texto com combinação normal
    const words = remainingText
      .split(/\s+/)
      .map(word => word.replace(/[^\wÀ-ÿ]/g, '')) // Preserva acentos, cedilhas e caracteres especiais
      .filter(word => word.length > 0)

    // Combina palavras pequenas (1-2 caracteres) com a próxima palavra
    const combinedWords: string[] = []
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i]
      const nextWord = words[i + 1]

      if (currentWord.length <= 2 && nextWord && nextWord.length > 2) {
        // Combina palavra pequena com a próxima
        combinedWords.push(`${currentWord} ${nextWord}`)
        i++ // Pula a próxima palavra pois já foi combinada
      } else if (currentWord.length > 2) {
        // Adiciona palavra normal
        combinedWords.push(currentWord)
      }
      // Ignora palavras muito pequenas que não podem ser combinadas
    }

    return [...essentialPhrases, ...combinedWords]
  }

  const handleAddRequirement = async () => {
    if (!newRequirement.trim() || !newClassification) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o texto do requisito e selecione uma classificação",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const words = extractWords(newRequirement)

      const { error } = await supabase
        .from('requirements')
        .insert({
          session_id: '00000000-0000-0000-0000-000000000000', // UUID especial para admin
          requirement_text: newRequirement.trim(),
          classification: newClassification,
          score: 0,
          created_by: null
        })

      if (error) throw error

      toast({
        title: "Requisito adicionado!",
        description: `Geradas ${words.length} palavras para o banco`,
      })

      setNewRequirement("")
      setNewClassification("")
      loadRequirements()
    } catch (error) {
      toast({
        title: "Erro ao adicionar requisito",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequirement = async (id: string) => {
    setLoading(true)
    try {
      // Como não há política de DELETE, vamos "marcar como removido" usando UPDATE
      // Alteramos o requirement_text para um valor especial que indica remoção
      const { error } = await supabase
        .from('requirements')
        .update({
          requirement_text: '[REMOVIDO]',
          classification: 'functional',
          score: -1
        })
        .eq('id', id)
        .eq('session_id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error('Erro detalhado:', error)
        throw error
      }

      toast({
        title: "Requisito removido",
        description: "Banco de palavras atualizado",
      })

      loadRequirements()
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast({
        title: "Erro ao remover requisito",
        description: error instanceof Error ? error.message : "Erro desconhecido. Tente novamente.",
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
              <Settings className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Administração de Requisitos</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="default" className="px-4 py-2 bg-primary text-primary-foreground">
              Cenário: {currentScenario?.name || 'Carregando...'}
            </Badge>
            <Badge variant="secondary" className="px-4 py-2">
              Requisitos: {requirements.length}
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              Palavras no Banco: {wordBank.length}
            </Badge>
          </div>
        </div>

        {/* Current Scenario Info */}
        <GameCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Cenário Atual</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Funcionalidade em desenvolvimento",
                  description: "A criação de novos cenários será implementada em breve",
                })
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cenário
            </Button>
          </div>

          {currentScenario && (
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium text-lg mb-2">{currentScenario.name}</h4>
              <p className="text-sm text-muted-foreground">{currentScenario.description}</p>
            </div>
          )}
        </GameCard>

        {/* Add New Requirement */}
        <GameCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Adicionar Novo Requisito ao Cenário {currentScenario?.name}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Texto do Requisito</label>
              <Textarea
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Ex: O sistema deve permitir que o usuário faça login usando email e senha"
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Classificação</label>
              <Select value={newClassification} onValueChange={setNewClassification}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma classificação" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((classification) => (
                    <SelectItem key={classification.id} value={classification.id}>
                      {classification.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddRequirement}
              disabled={loading || !newRequirement.trim() || !newClassification}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Requisito
            </Button>
          </div>
        </GameCard>

        {/* Requirements List */}
        <GameCard className="space-y-4">
          <h3 className="font-semibold">Requisitos Cadastrados</h3>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : requirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum requisito cadastrado ainda
            </div>
          ) : (
            <div className="space-y-4">
              {requirements.map((req) => (
                <div key={req.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <Badge className={getClassificationStyle(req.classification)}>
                        {getClassificationLabel(req.classification)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {req.scenario_name}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRequirement(req.id)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm font-medium mb-3 leading-relaxed">
                    {req.requirement_text}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {req.words.map((word, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em: {new Date(req.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GameCard>

        {/* Word Bank Preview */}
        <GameCard className="space-y-4">
          <h3 className="font-semibold">Banco de Palavras (Preview)</h3>
          <p className="text-sm text-muted-foreground">
            Estas palavras serão utilizadas no jogo. Palavras são extraídas automaticamente dos requisitos cadastrados.
          </p>

          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {wordBank.map((word, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {word}
              </Badge>
            ))}
          </div>
        </GameCard>
      </div>
    </div>
  )
}