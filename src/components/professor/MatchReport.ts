import { supabase } from "@/lib/api"
import * as XLSX from "xlsx"

type Criterion = "can_be_extracted" | "correctly_classified" | "is_complete"

const CRITERION_LABEL: Record<Criterion, string> = {
  can_be_extracted: "Pode ser extraído dos artefatos?",
  correctly_classified: "Classificado corretamente?",
  is_complete: "Está completo?",
}

const CLASS_LABEL: Record<string, string> = {
  funcional: "Funcional",
  "nao-funcional": "Não-funcional",
  inverso: "Inverso",
}

interface ReportSession {
  id: string
  room_code: string
  team_number: number | null
  participants: { id: string; player_name: string }[]
}

interface ReportMatch {
  id: string
  match_code: string
  title: string
  phase1_started_at: string | null
  phase1_ended_at: string | null
  phase2_started_at: string | null
  phase2_ended_at: string | null
  phase3_started_at: string | null
  phase3_ended_at: string | null
  sessions: ReportSession[]
}

function fmtDate(iso: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("pt-BR")
}

function fmtDuration(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return "-"
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms < 0) return "-"
  const totalSeconds = Math.round(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}min ${s}s`
}

function boolLabel(v: unknown) {
  if (v === true) return "Sim"
  if (v === false) return "Não"
  return "-"
}

function countsForScore(assignment: any | null | undefined) {
  if (!assignment) return true
  return assignment.counts_for_score !== 0
}

function findScoringAssignment(assignments: any[], requirementId: string) {
  const candidates = assignments.filter((a: any) => a.requirement_id === requirementId)
  if (candidates.length === 0) return null
  return candidates.find((a: any) => countsForScore(a)) ?? candidates[0]
}

export async function generateMatchReport(match: ReportMatch) {
  const sessions = match.sessions
  const sessionIds = sessions.map(s => s.id)

  const participantName = new Map<string, string>()
  const sessionLabel = new Map<string, string>()
  sessions.forEach(s => {
    sessionLabel.set(s.id, `Equipe ${s.team_number ?? "?"} (${s.room_code})`)
    s.participants.forEach(p => participantName.set(p.id, p.player_name))
  })

  const { data: allRequirements = [] } = await supabase
    .from("requirements")
    .select("*")
    .in("session_id", sessionIds)

  const requirementIds = (allRequirements ?? []).map((r: any) => r.id)

  const { data: allAssignments = [] } = requirementIds.length
    ? await supabase.from("requirement_assignments").select("*").in("requirement_id", requirementIds)
    : { data: [] as any[] }

  const assignmentIds = (allAssignments ?? []).map((a: any) => a.id)

  const { data: allEvaluations = [] } = assignmentIds.length
    ? await supabase.from("requirement_evaluations").select("*").in("assignment_id", assignmentIds)
    : { data: [] as any[] }

  const evaluationIds = (allEvaluations ?? []).map((e: any) => e.id)

  const { data: allContestations = [] } = evaluationIds.length
    ? await supabase.from("requirement_contestations").select("*").in("evaluation_id", evaluationIds)
    : { data: [] as any[] }

  const requirementById = new Map((allRequirements ?? []).map((r: any) => [r.id, r]))
  const assignmentById = new Map((allAssignments ?? []).map((a: any) => [a.id, a]))
  const evaluationsByAssignment = new Map<string, any>()
  ;(allEvaluations ?? []).forEach((e: any) => evaluationsByAssignment.set(e.assignment_id, e))
  const contestationsByEvaluation = new Map<string, any[]>()
  ;(allContestations ?? []).forEach((c: any) => {
    const list = contestationsByEvaluation.get(c.evaluation_id) ?? []
    list.push(c)
    contestationsByEvaluation.set(c.evaluation_id, list)
  })

  const workbook = XLSX.utils.book_new()
  const summaryRows: (string | number)[][] = [
    ["Equipe", "Sala", "Participantes", "Requisitos Criados", "Pontuação (autora)", "Ajuste (contestações como autora)", "Ajuste (contestações como avaliadora)", "Pontuação Final"],
  ]

  for (const session of sessions) {
    const teamLabel = sessionLabel.get(session.id)!
    const myRequirements = (allRequirements ?? []).filter((r: any) => r.session_id === session.id)

    const rows: (string | number)[][] = []
    rows.push([`Relatório — ${teamLabel}`])
    rows.push([`Partida: ${match.title} (${match.match_code})`])
    rows.push([`Participantes: ${session.participants.map(p => p.player_name).join(", ") || "-"}`])
    rows.push([])

    rows.push(["FASE 1 — Requisitos Criados"])
    rows.push([`Duração da Fase 1: ${fmtDuration(match.phase1_started_at, match.phase1_ended_at)} (início: ${fmtDate(match.phase1_started_at)}, fim: ${fmtDate(match.phase1_ended_at)})`])
    rows.push(["Requisito", "Classificação", "Criado por"])
    myRequirements.forEach((r: any) => {
      rows.push([r.requirement_text, CLASS_LABEL[r.classification] ?? r.classification, participantName.get(r.created_by) ?? "-"])
    })
    if (myRequirements.length === 0) rows.push(["(nenhum requisito criado)"])
    rows.push([])

    rows.push(["FASE 2 — Avaliação Recebida (requisitos desta equipe)"])
    rows.push([`Duração da Fase 2: ${fmtDuration(match.phase2_started_at, match.phase2_ended_at)}`])
    rows.push(["Requisito", "Avaliado por", "Critério", "Resposta", "Justificativa", "Pontos do Requisito"])

    let partialTotal = 0
    const partialMax = myRequirements.length * 3

    myRequirements.forEach((r: any) => {
      const assignment = findScoringAssignment(allAssignments ?? [], r.id)
      const evaluation = assignment ? evaluationsByAssignment.get(assignment.id) : null
      const evaluatorTeam = assignment ? (sessionLabel.get(assignment.session_id) ?? "-") : "-"
      const counts = countsForScore(assignment)

      if (!evaluation) {
        rows.push([r.requirement_text, evaluatorTeam, "-", "-", "-", "-"])
        return
      }
      if (counts) {
        partialTotal += evaluation.total_points ?? 0
      }
      ;(["can_be_extracted", "correctly_classified", "is_complete"] as Criterion[]).forEach((crit, i) => {
        rows.push([
          i === 0 ? r.requirement_text : "",
          i === 0 ? (counts ? evaluatorTeam : `${evaluatorTeam} (autoavaliação, não pontua)`) : "",
          CRITERION_LABEL[crit],
          boolLabel(evaluation[crit]),
          evaluation[`${crit}_note`] || "",
          i === 0 ? (counts ? `${evaluation.total_points ?? 0}/3` : "não pontua") : "",
        ])
      })
    })
    rows.push([])

    rows.push(["FASE 3 — Contestações Feitas (como autora)"])
    rows.push([`Duração da Contestação: ${fmtDuration(match.phase3_started_at, match.phase3_ended_at)}`])
    rows.push(["Requisito", "Critério", "Justificativa da equipe", "Status", "Resposta do professor"])

    let authorAdjustment = 0
    let hasAnyAuthorContestation = false
    myRequirements.forEach((r: any) => {
      const assignment = findScoringAssignment(allAssignments ?? [], r.id)
      const evaluation = assignment ? evaluationsByAssignment.get(assignment.id) : null
      if (!evaluation) return
      const counts = countsForScore(assignment)
      const contestations = contestationsByEvaluation.get(evaluation.id) ?? []
      if (contestations.length > 0) hasAnyAuthorContestation = true
      contestations.forEach((c: any) => {
        if (counts) {
          if (c.status === "aceita") authorAdjustment += 1
          if (c.status === "recusada") authorAdjustment -= 1
        }
        rows.push([
          r.requirement_text,
          CRITERION_LABEL[c.criterion as Criterion] ?? c.criterion,
          c.team_justification,
          c.status === "aceita" ? "Aceita" : c.status === "recusada" ? "Recusada" : "Pendente",
          c.professor_response || "",
        ])
      })
    })
    if (!hasAnyAuthorContestation) {
      rows.push(["(nenhuma contestação feita)"])
    }
    rows.push([])

    const myEvaluatorAssignments = (allAssignments ?? []).filter((a: any) => a.session_id === session.id)
    rows.push(["FASE 2 — Avaliações Dadas (como avaliadora de outra equipe)"])
    rows.push(["Requisito (de outra equipe)", "Equipe autora", "Critério", "Resposta", "Justificativa"])

    let evaluatorAdjustment = 0
    myEvaluatorAssignments.forEach((a: any) => {
      const req = requirementById.get(a.requirement_id)
      const evaluation = evaluationsByAssignment.get(a.id)
      if (!req || !evaluation) return
      const counts = countsForScore(a)
      const authorTeam = sessionLabel.get(req.session_id) ?? "-"
      ;(["can_be_extracted", "correctly_classified", "is_complete"] as Criterion[]).forEach((crit, i) => {
        rows.push([
          i === 0 ? req.requirement_text : "",
          i === 0 ? (counts ? authorTeam : `${authorTeam} (autoavaliação, não pontua)`) : "",
          CRITERION_LABEL[crit],
          boolLabel(evaluation[crit]),
          evaluation[`${crit}_note`] || "",
        ])
      })
      if (counts) {
        const contestations = contestationsByEvaluation.get(evaluation.id) ?? []
        contestations.forEach((c: any) => {
          if (c.status === "aceita") evaluatorAdjustment -= 1
          if (c.status === "recusada") evaluatorAdjustment += 1
        })
      }
    })
    if (myEvaluatorAssignments.length === 0) rows.push(["(esta equipe não avaliou nenhum requisito)"])
    rows.push([])

    const finalTotal = partialTotal + authorAdjustment + evaluatorAdjustment

    rows.push(["RESUMO DA PONTUAÇÃO"])
    rows.push(["Pontuação como autora", `${partialTotal}/${partialMax}`])
    rows.push(["Ajuste por contestações feitas (autora)", authorAdjustment])
    rows.push(["Ajuste por contestações recebidas (avaliadora)", evaluatorAdjustment])
    rows.push(["PONTUAÇÃO FINAL", finalTotal])

    summaryRows.push([
      teamLabel,
      session.room_code,
      session.participants.map(p => p.player_name).join(", "),
      myRequirements.length,
      `${partialTotal}/${partialMax}`,
      authorAdjustment,
      evaluatorAdjustment,
      finalTotal,
    ])

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet["!cols"] = [{ wch: 45 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 40 }, { wch: 14 }]
    const sheetName = `Equipe ${session.team_number ?? "?"}`.slice(0, 31)
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo Geral")
  workbook.SheetNames.unshift(workbook.SheetNames.pop()!)

  const safeTitle = match.title.replace(/[^\w\-]+/g, "_").slice(0, 40)
  XLSX.writeFile(workbook, `relatorio_${safeTitle}_${match.match_code}.xlsx`)
}