import { useState, useEffect } from "react"
import { supabase } from "@/lib/api"

export interface WordEntry {
  word: string
  category: 'prefixo' | 'verbo' | 'objeto' | 'complemento' | 'metrica' | 'condicao'
}

export interface WordBankData {
  words: WordEntry[]
  loading: boolean
  error: string | null
  refresh: () => void
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const FALLBACK_WORDS: WordEntry[] = [
  { word: 'O sistema deve', category: 'prefixo' },
  { word: 'O sistema não pode', category: 'prefixo' },
  { word: 'permitir', category: 'verbo' },
  { word: 'enviar', category: 'verbo' },
  { word: 'exibir', category: 'verbo' },
  { word: 'mensagens de texto', category: 'objeto' },
  { word: 'notificações', category: 'objeto' },
  { word: 'que o usuário', category: 'complemento' },
  { word: 'em no máximo 2 segundos', category: 'metrica' },
  { word: 'quando o app estiver minimizado', category: 'condicao' },
]

export const useWordBank = (): WordBankData => {
  const [words, setWords] = useState<WordEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWords = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Carregando palavras do banco...')

      const { data, error: dbError } = await supabase
        .from('word_bank')
        .select('word, category')
        .eq('active', 1)
        .order('category', { ascending: true })

      if (dbError) throw dbError

      if (!data || data.length === 0) {
        console.log('⚠️ word_bank vazio, usando fallback.')
        setWords(shuffleArray(FALLBACK_WORDS))
        return
      }

      console.log('📊 Palavras recebidas:', data.length)
      const entries: WordEntry[] = data.map((row: any) => ({
        word: row.word,
        category: row.category as WordEntry['category'],
      }))

      setWords(shuffleArray(entries))
      console.log('✅ Palavras carregadas com categorias.')
    } catch (err) {
      console.error('❌ Erro ao carregar banco de palavras:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setWords(shuffleArray(FALLBACK_WORDS))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWords()
  }, [])

  return { words, loading, error, refresh: loadWords }
}