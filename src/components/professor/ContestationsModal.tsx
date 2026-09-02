import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, Loader2, MessageSquareWarning, X } from "lucide-react"
import { supabase } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

type QuestionKey = "can_be_extracted" | "correctly_classified" | "is_complete"

const CRITERION_LABEL: Record<QuestionKey, string> = {
  can_be_extracted: "O requisito pode ser extraído dos artefatos?",
  correctly_classified: "O requisito está classificado corretamente?",
  is_complete: "O requisito está completo?",
}

interface ContestationRow {
  id: string
  evaluation_id: string
  requirement_id: string
  criterion: QuestionKey
  team_justification: string
  status: "pendente" | "aceita" | "recusada"
  professor_response: string | null
  requirement_text: string
  classification: string
  correction_note: string
}

interface ContestationsModalProps {
  isOpen: boolean
  sessionId: string | null
  roomCode: string
  teamLabel: string
  onClose: () => void
  onUpdated: () => void
}

export const ContestationsModal = ({ isOpen, sessionId, roomCode, teamLabel, onClose, onUpdated }: ContestationsModalProps) => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ContestationRow[]>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const loadContestations = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const { data: contestations, error } = await supabase
        .from("requirement_contestations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
      if (error) throw error

      const requirementIds = [...new Set((contestations ?? []).map((c: any) => c.requirement_id))]
      const evaluationIds = [...new Set((contestations ?? []).map((c: any) => c.evaluation_id))]

      const { data: requirements } = requirementIds.length > 0
        ? await supabase.from("requirements").select("id, requirement_text, classification").in("id", requirementIds)
        : { data: [] as any[] }

      const { data: evaluations } = evaluationIds.length > 0
        ? await supabase.from("requirement_evaluations").select("*").in("id", evaluationIds)
        : { data: [] as any[] }

      const requirementById = new Map((requirements ?? []).map((r: any) => [r.id, r]))
      const evaluationById = new Map((evaluations ?? []).map((e: any) => [e.id, e]))

      const mapped: ContestationRow[] = (contestations ?? []).map((c: any) => {
        const req = requirementById.get(c.requirement_id)
        const evaluation = evaluationById.get(c.evaluation_id)
        const noteKey = `${c.criterion}_note`
        return {
          id: c.id,
          evaluation_id: c.evaluation_id,
          requirement_id: c.requirement_id,
          criterion: c.criterion,
          team_justification: c.team_justification,
          status: c.status,
          professor_response: c.professor_response,
          requirement_text: req?.requirement_text ?? "Requisito não encontrado",
          classification: req?.classification ?? "",
          correction_note: evaluation?.[noteKey] ?? "",
        }
      })

      setRows(mapped)
      setResponses(prev => {
        const next = { ...prev }
        mapped.forEach(r => {
          if (next[r.id] === undefined) next[r.id] = r.professor_response ?? ""
        })
        return next
      })
    } catch (err) {
      console.error(err)
      toast({ title: "Erro ao carregar contestações", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (isOpen && sessionId) loadContestations()
  }, [isOpen, sessionId, loadContestations])

  const decide = async (row: ContestationRow, status: "aceita" | "recusada") => {
    setSaving(row.id)
    try {
      const { error } = await supabase
        .from("requirement_contestations")
        .update({ status, professor_response: responses[row.id]?.trim() || null })
        .eq("id", row.id)
      if (error) throw error

      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status } : r))
      toast({ title: status === "aceita" ? "Contestação aceita" : "Contestação recusada" })
      onUpdated()
    } catch (err) {
      console.error(err)
      toast({ title: "Erro ao salvar decisão", variant: "destructive" })
    } finally {
      setSaving(null)
    }
  }

  if (!isOpen) return null

  const pending = rows.filter(r => r.status === "pendente")
  const decided = rows.filter(r => r.status !== "pendente")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-semibold text-base">Contestações — {teamLabel}</h3>
              <p className="text-xs text-muted-foreground font-mono">{roomCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Carregando contestações...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma contestação enviada por essa equipe.
            </p>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pendentes ({pending.length})
                  </p>
                  {pending.map(row => (
                    <div key={row.id} className="rounded-lg border p-3 space-y-2 bg-orange-50/40 border-orange-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize text-xs">
                          {row.classification === "funcional" ? "Funcional" :
                           row.classification === "nao-funcional" ? "Não-funcional" :
                           row.classification === "inverso" ? "Inverso" : row.classification}
                        </Badge>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      </div>
                      <p className="text-sm font-medium">"{row.requirement_text}"</p>
                      <p className="text-xs text-muted-foreground">{CRITERION_LABEL[row.criterion]} <strong>Não</strong></p>
                      {row.correction_note && (
                        <p className="text-xs text-muted-foreground">
                          Justificativa da correção: {row.correction_note}
                        </p>
                      )}
                      <div className="p-2 bg-white rounded border text-sm">
                        <p className="text-xs font-medium mb-1">Contestação da equipe:</p>
                        {row.team_justification}
                      </div>
                      <Textarea
                        placeholder="Resposta opcional para a equipe..."
                        value={responses[row.id] ?? ""}
                        onChange={(e) => setResponses(prev => ({ ...prev, [row.id]: e.target.value }))}
                        className="min-h-14 text-sm bg-white"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                          onClick={() => decide(row, "recusada")}
                          disabled={saving === row.id}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          onClick={() => decide(row, "aceita")}
                          disabled={saving === row.id}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {decided.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Já revisadas ({decided.length})
                  </p>
                  {decided.map(row => (
                    <div key={row.id} className="rounded-lg border p-3 space-y-1.5 opacity-70">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          row.status === "aceita" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {row.status === "aceita" ? "Aceita" : "Recusada"}
                        </span>
                      </div>
                      <p className="text-sm font-medium">"{row.requirement_text}"</p>
                      <p className="text-xs text-muted-foreground">{CRITERION_LABEL[row.criterion]}</p>
                      {row.professor_response && (
                        <p className="text-xs text-muted-foreground">Resposta: {row.professor_response}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}