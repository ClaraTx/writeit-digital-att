import { useState, useEffect } from "react"
import { GameCard } from "@/components/ui/game-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, ArrowLeft, Settings, Image as ImageIcon, ListPlus, Check, X, ArrowUp, ArrowDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"

const ADMIN_SESSION_ID = '00000000-0000-0000-0000-000000000000'

interface Scenario {
  id: number
  name: string
  description: string
  image_url: string | null
}

interface ScenarioImage {
  id: string
  scenario_id: number
  image_url: string
  order_index: number
}

interface StoredRequirement {
  id: string
  requirement_text: string
  classification: string
  is_valid_requirement: boolean
  created_at: string
}

interface WordBankEntry {
  id: string
  word: string
  category: WordCategory
  active: boolean
}

type WordCategory = 'prefixo' | 'verbo' | 'objeto' | 'complemento' | 'metrica' | 'condicao'

const CLASSIFICATIONS = [
  { id: "funcional", label: "Funcional", color: "bg-blue-100 text-blue-800" },
  { id: "nao-funcional", label: "Não funcional", color: "bg-yellow-100 text-yellow-800" },
  { id: "inverso", label: "Inverso", color: "bg-purple-100 text-purple-800" }
]

const CATEGORIES: { id: WordCategory; label: string; color: string }[] = [
  { id: "prefixo", label: "Prefixo", color: "bg-red-100 text-red-800 border-red-300" },
  { id: "verbo", label: "Verbo", color: "bg-green-100 text-green-800 border-green-300" },
  { id: "objeto", label: "Objeto", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "complemento", label: "Complemento", color: "bg-slate-200 text-slate-800 border-slate-400" },
  { id: "metrica", label: "Métrica", color: "bg-pink-100 text-pink-800 border-pink-300" },
  { id: "condicao", label: "Condição", color: "bg-orange-100 text-orange-800 border-orange-300" },
]

const normalizeWord = (word: string) => word.trim().replace(/\s+/g, ' ')

export default function RequirementsAdmin() {
  const { toast } = useToast()

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [scenarioName, setScenarioName] = useState("")
  const [scenarioDescription, setScenarioDescription] = useState("")
  const [savingScenario, setSavingScenario] = useState(false)

  const [scenarioImages, setScenarioImages] = useState<ScenarioImage[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [savingImage, setSavingImage] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)

  const [wordBank, setWordBank] = useState<WordBankEntry[]>([])
  const [newWord, setNewWord] = useState("")
  const [newWordCategory, setNewWordCategory] = useState<WordCategory | "">("")
  const [savingWord, setSavingWord] = useState(false)
  const [bulkWords, setBulkWords] = useState("")
  const [bulkCategory, setBulkCategory] = useState<WordCategory | "">("")
  const [savingBulkWords, setSavingBulkWords] = useState(false)
  const [wordFilter, setWordFilter] = useState<WordCategory | "todas">("todas")
  const [loadingWords, setLoadingWords] = useState(false)

  const [requirements, setRequirements] = useState<StoredRequirement[]>([])
  const [newRequirement, setNewRequirement] = useState("")
  const [newClassification, setNewClassification] = useState("")
  const [newIsValid, setNewIsValid] = useState(true)
  const [loadingRequirements, setLoadingRequirements] = useState(false)

  useEffect(() => {
    loadScenarios()
  }, [])

  useEffect(() => {
    if (currentScenario) {
      setScenarioName(currentScenario.name)
      setScenarioDescription(currentScenario.description || "")
      loadScenarioImages(currentScenario.id)
      loadWordBank(currentScenario.id)
      loadRequirements()
    }
  }, [currentScenario?.id])

  const loadScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error

      setScenarios(data || [])

      if (data && data.length > 0) {
        setCurrentScenario(data.find((s: Scenario) => s.id === 1) || data[0])
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar cenários",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const handleSaveScenario = async () => {
    if (!currentScenario) return
    if (!scenarioName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" })
      return
    }

    setSavingScenario(true)
    try {
      const { error } = await supabase
        .from('scenarios')
        .update({
          name: scenarioName.trim(),
          description: scenarioDescription.trim(),
        })
        .eq('id', currentScenario.id)

      if (error) throw error

      toast({ title: "Cenário atualizado!" })
      loadScenarios()
    } catch (error) {
      toast({
        title: "Erro ao salvar cenário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setSavingScenario(false)
    }
  }

  const loadScenarioImages = async (scenarioId: number) => {
    setLoadingImages(true)
    try {
      const { data, error } = await supabase
        .from('scenario_images')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('order_index', { ascending: true })

      if (error) throw error

      setScenarioImages(data || [])
    } catch (error) {
      toast({
        title: "Erro ao carregar imagens",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoadingImages(false)
    }
  }

  const handleAddImage = async () => {
    if (!currentScenario) return
    if (!newImageUrl.trim()) {
      toast({ title: "Cole a URL ou caminho da imagem", variant: "destructive" })
      return
    }

    setSavingImage(true)
    try {
      const nextOrder = scenarioImages.length > 0
        ? Math.max(...scenarioImages.map(i => i.order_index)) + 1
        : 0

      const { error } = await supabase
        .from('scenario_images')
        .insert({
          scenario_id: currentScenario.id,
          image_url: newImageUrl.trim(),
          order_index: nextOrder,
        })

      if (error) throw error

      setNewImageUrl("")
      toast({ title: "Imagem adicionada!" })
      loadScenarioImages(currentScenario.id)
    } catch (error) {
      toast({
        title: "Erro ao adicionar imagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setSavingImage(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scenario_images')
        .delete()
        .eq('id', id)

      if (error) throw error

      setScenarioImages(prev => prev.filter(i => i.id !== id))
      toast({ title: "Imagem removida" })
    } catch (error) {
      toast({
        title: "Erro ao remover imagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const handleMoveImage = async (image: ScenarioImage, direction: 'up' | 'down') => {
    const idx = scenarioImages.findIndex(i => i.id === image.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const swapWith = scenarioImages[swapIdx]
    if (!swapWith) return

    try {
      const { error: error1 } = await supabase
        .from('scenario_images')
        .update({ order_index: swapWith.order_index })
        .eq('id', image.id)

      if (error1) throw error1

      const { error: error2 } = await supabase
        .from('scenario_images')
        .update({ order_index: image.order_index })
        .eq('id', swapWith.id)

      if (error2) throw error2

      loadScenarioImages(image.scenario_id)
    } catch (error) {
      toast({
        title: "Erro ao reordenar imagens",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const loadWordBank = async (scenarioId: number) => {
    setLoadingWords(true)
    try {
      const { data, error } = await supabase
        .from('word_bank')
        .select('id, word, category, active')
        .eq('scenario_id', scenarioId)
        .order('category', { ascending: true })

      if (error) throw error

      const mapped: WordBankEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        word: row.word,
        category: row.category,
        active: Number(row.active) === 1,
      }))

      setWordBank(mapped)
    } catch (error) {
      toast({
        title: "Erro ao carregar banco de palavras",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoadingWords(false)
    }
  }

  const wordExists = (word: string, category: WordCategory) => {
    const normalized = normalizeWord(word).toLowerCase()
    return wordBank.some(w => w.category === category && normalizeWord(w.word).toLowerCase() === normalized)
  }

  const handleAddWord = async () => {
    if (!currentScenario) return

    const cleanWord = normalizeWord(newWord)

    if (!cleanWord || !newWordCategory) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a palavra e selecione uma categoria",
        variant: "destructive"
      })
      return
    }

    if (wordExists(cleanWord, newWordCategory)) {
      toast({
        title: "Palavra já existe",
        description: `"${cleanWord}" já está cadastrada em ${CATEGORIES.find(c => c.id === newWordCategory)?.label}`,
        variant: "destructive"
      })
      return
    }

    setSavingWord(true)
    try {
      const { error } = await supabase
        .from('word_bank')
        .insert({
          word: cleanWord,
          category: newWordCategory,
          scenario_id: currentScenario.id,
          active: 1,
        })

      if (error) throw error

      setNewWord("")
      setNewWordCategory("")
      toast({ title: "Palavra adicionada!" })
      loadWordBank(currentScenario.id)
    } catch (error) {
      toast({
        title: "Erro ao adicionar palavra",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setSavingWord(false)
    }
  }

  const handleBulkAddWords = async () => {
    if (!currentScenario) return
    if (!bulkWords.trim() || !bulkCategory) {
      toast({
        title: "Campos obrigatórios",
        description: "Cole as palavras (uma por linha) e selecione uma categoria",
        variant: "destructive"
      })
      return
    }

    const seen = new Set<string>()
    const toInsert: string[] = []
    let skipped = 0

    bulkWords
      .split('\n')
      .map(normalizeWord)
      .filter(l => l.length > 0)
      .forEach(line => {
        const key = line.toLowerCase()
        if (seen.has(key) || wordExists(line, bulkCategory)) {
          skipped++
          return
        }
        seen.add(key)
        toInsert.push(line)
      })

    if (toInsert.length === 0) {
      toast({
        title: "Nada pra adicionar",
        description: skipped > 0 ? `Todas as ${skipped} linhas já existiam nessa categoria` : "Nenhuma linha válida encontrada",
        variant: "destructive"
      })
      return
    }

    setSavingBulkWords(true)
    try {
      const rows = toInsert.map(word => ({
        word,
        category: bulkCategory,
        scenario_id: currentScenario.id,
        active: 1,
      }))

      const { error } = await supabase
        .from('word_bank')
        .insert(rows)

      if (error) throw error

      setBulkWords("")
      setBulkCategory("")
      toast({
        title: `${toInsert.length} palavras adicionadas!`,
        description: skipped > 0 ? `${skipped} já existiam e foram ignoradas` : undefined,
      })
      loadWordBank(currentScenario.id)
    } catch (error) {
      toast({
        title: "Erro ao adicionar palavras em lote",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setSavingBulkWords(false)
    }
  }

  const handleToggleWordActive = async (word: WordBankEntry) => {
    try {
      const { error } = await supabase
        .from('word_bank')
        .update({ active: word.active ? 0 : 1 })
        .eq('id', word.id)

      if (error) throw error

      setWordBank(prev =>
        prev.map(w => w.id === word.id ? { ...w, active: !w.active } : w)
      )
    } catch (error) {
      toast({
        title: "Erro ao atualizar palavra",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const handleDeleteWord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('word_bank')
        .delete()
        .eq('id', id)

      if (error) throw error

      setWordBank(prev => prev.filter(w => w.id !== id))
    } catch (error) {
      toast({
        title: "Erro ao remover palavra",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const filteredWordBank = wordFilter === "todas"
    ? wordBank
    : wordBank.filter(w => w.category === wordFilter)

  const loadRequirements = async () => {
    setLoadingRequirements(true)
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('session_id', ADMIN_SESSION_ID)
        .neq('requirement_text', '[REMOVIDO]')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: StoredRequirement[] = (data || []).map((item: any) => ({
        id: item.id,
        requirement_text: item.requirement_text,
        classification: item.classification,
        is_valid_requirement: Number(item.is_valid_requirement) === 1,
        created_at: item.created_at,
      }))

      setRequirements(mapped)
    } catch (error) {
      toast({
        title: "Erro ao carregar requisitos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoadingRequirements(false)
    }
  }

  const handleAddRequirement = async () => {
    if (!currentScenario) return
    if (!newRequirement.trim() || !newClassification) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o texto do requisito e selecione uma classificação",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('requirements')
        .insert({
          session_id: ADMIN_SESSION_ID,
          requirement_text: newRequirement.trim(),
          classification: newClassification,
          scenario_id: currentScenario.id,
          score: 0,
          is_valid_requirement: newIsValid ? 1 : 0,
          created_by: null,
        })

      if (error) throw error

      toast({ title: "Requisito adicionado!" })
      setNewRequirement("")
      setNewClassification("")
      setNewIsValid(true)
      loadRequirements()
    } catch (error) {
      toast({
        title: "Erro ao adicionar requisito",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const handleToggleValidRequirement = async (req: StoredRequirement) => {
    try {
      const { error } = await supabase
        .from('requirements')
        .update({ is_valid_requirement: req.is_valid_requirement ? 0 : 1 })
        .eq('id', req.id)
        .eq('session_id', ADMIN_SESSION_ID)

      if (error) throw error

      setRequirements(prev =>
        prev.map(r => r.id === req.id ? { ...r, is_valid_requirement: !r.is_valid_requirement } : r)
      )
    } catch (error) {
      toast({
        title: "Erro ao atualizar requisito",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const handleDeleteRequirement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('requirements')
        .update({
          requirement_text: '[REMOVIDO]',
          classification: 'funcional',
          score: -1,
        })
        .eq('id', id)
        .eq('session_id', ADMIN_SESSION_ID)

      if (error) throw error

      toast({ title: "Requisito removido" })
      loadRequirements()
    } catch (error) {
      toast({
        title: "Erro ao remover requisito",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    }
  }

  const getClassificationStyle = (classification: string) =>
    CLASSIFICATIONS.find(c => c.id === classification)?.color || "bg-gray-100 text-gray-800"

  const getClassificationLabel = (classification: string) =>
    CLASSIFICATIONS.find(c => c.id === classification)?.label || classification

  const getCategoryStyle = (category: WordCategory) =>
    CATEGORIES.find(c => c.id === category)?.color || "bg-gray-100 text-gray-800"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-game-purple/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} className="hover:bg-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Administração de Cenário</h1>
            </div>
          </div>

          {scenarios.length > 1 && (
            <Select
              value={currentScenario?.id?.toString() || ""}
              onValueChange={(val) => {
                const s = scenarios.find(s => s.id.toString() === val)
                if (s) setCurrentScenario(s)
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecione o cenário" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <GameCard className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Cenário</h3>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Ex: PoneyZap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <Textarea
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              rows={4}
              placeholder="Descrição do cenário..."
            />
          </div>

          <Button onClick={handleSaveScenario} disabled={savingScenario}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Cenário
          </Button>

          <div className="pt-4 border-t space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Adicionar imagem</label>
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="/scenarios/poneyzap-1.png ou https://..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                />
                <Button onClick={handleAddImage} disabled={savingImage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A primeira imagem adicionada fica em cima; as próximas entram em ordem, embaixo.
              </p>
            </div>

            {loadingImages ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
            ) : (
              <div className="space-y-2">
                {scenarioImages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada ainda</p>
                )}
                {scenarioImages.map((img, idx) => (
                  <div key={img.id} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground w-6 text-center">{idx + 1}º</span>
                    <img
                      src={img.image_url}
                      alt={`Imagem ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                    />
                    <span className="flex-1 text-xs text-muted-foreground truncate">{img.image_url}</span>
                    <button
                      onClick={() => handleMoveImage(img, 'up')}
                      disabled={idx === 0}
                      className="disabled:opacity-30"
                      title="Mover pra cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveImage(img, 'down')}
                      disabled={idx === scenarioImages.length - 1}
                      className="disabled:opacity-30"
                      title="Mover pra baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteImage(img.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GameCard>

        <GameCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">Banco de Palavras</h3>
            </div>
            <Badge variant="outline">{wordBank.length} palavras</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 border rounded-lg">
              <p className="text-sm font-medium">Adicionar uma palavra</p>
              <Input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Ex: permitir"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
              <Select value={newWordCategory} onValueChange={(v) => setNewWordCategory(v as WordCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddWord} size="sm" className="w-full" disabled={savingWord}>
                <Plus className="w-4 h-4 mr-2" />
                {savingWord ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>

            <div className="space-y-3 p-4 border rounded-lg">
              <p className="text-sm font-medium">Adicionar em lote (uma palavra por linha)</p>
              <Textarea
                value={bulkWords}
                onChange={(e) => setBulkWords(e.target.value)}
                rows={4}
                placeholder={"permitir\nenviar\nexibir"}
              />
              <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v as WordCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria (aplica a todas as linhas)" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAddWords} size="sm" className="w-full" variant="secondary" disabled={savingBulkWords}>
                <ListPlus className="w-4 h-4 mr-2" />
                {savingBulkWords ? "Adicionando..." : "Adicionar em lote"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              variant={wordFilter === "todas" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setWordFilter("todas")}
            >
              Todas
            </Badge>
            {CATEGORIES.map(c => (
              <Badge
                key={c.id}
                variant="outline"
                className={`cursor-pointer border ${wordFilter === c.id ? c.color : ''}`}
                onClick={() => setWordFilter(c.id)}
              >
                {c.label}
              </Badge>
            ))}
          </div>

          {loadingWords ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-2">
              {filteredWordBank.map(w => (
                <div
                  key={w.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs ${getCategoryStyle(w.category)} ${!w.active ? 'opacity-40' : ''}`}
                >
                  <span>{w.word}</span>
                  <button onClick={() => handleToggleWordActive(w)} title={w.active ? "Desativar" : "Ativar"}>
                    {w.active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </button>
                  <button onClick={() => handleDeleteWord(w.id)} title="Excluir">
                    <Trash2 className="w-3 h-3 hover:text-destructive" />
                  </button>
                </div>
              ))}
              {filteredWordBank.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Nenhuma palavra nessa categoria ainda</p>
              )}
            </div>
          )}
        </GameCard>

        <GameCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">Requisitos do Cenário {currentScenario?.name}</h3>
            </div>
            <Badge variant="outline">{requirements.length} requisitos</Badge>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Texto do Requisito</label>
              <Textarea
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Ex: O sistema deve permitir que o usuário faça login usando email e senha"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Classificação</label>
                <Select value={newClassification} onValueChange={setNewClassification}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Esperado no cenário?</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newIsValid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewIsValid(true)}
                    className="flex-1"
                  >
                    Sim, esperado
                  </Button>
                  <Button
                    type="button"
                    variant={!newIsValid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewIsValid(false)}
                    className="flex-1"
                  >
                    Não esperado
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddRequirement}
              disabled={!newRequirement.trim() || !newClassification}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Requisito
            </Button>
          </div>

          {loadingRequirements ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : requirements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum requisito cadastrado ainda</div>
          ) : (
            <div className="space-y-3">
              {requirements.map((req) => (
                <div key={req.id} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getClassificationStyle(req.classification)}>
                        {getClassificationLabel(req.classification)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`cursor-pointer ${req.is_valid_requirement ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}
                        onClick={() => handleToggleValidRequirement(req)}
                      >
                        {req.is_valid_requirement ? 'Esperado no cenário' : 'Não esperado'}
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

                  <p className="text-sm font-medium leading-relaxed">{req.requirement_text}</p>

                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em: {new Date(req.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GameCard>
      </div>
    </div>
  )
}