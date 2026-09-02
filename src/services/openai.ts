// OpenAI GPT-4 Integration Service

interface AIEvaluationResponse {
  score: number
  feedback: string
  improvements: string[]
  classification_correct: boolean
  structure_score: number
  clarity_score: number
  completeness_score: number
  scenario_alignment_score: number
}

export async function evaluateRequirementWithGPT4(
  requirementText: string,
  selectedClassification: string,
  scenarioName: string,
  scenarioDescription: string,
  apiKey: string
): Promise<AIEvaluationResponse> {

  const prompt = `
Você é um especialista em Engenharia de Requisitos. Analise o seguinte requisito de software e forneça uma avaliação detalhada.

CONTEXTO DO CENÁRIO:
- Nome: ${scenarioName}
- Descrição: ${scenarioDescription}

REQUISITO PARA ANÁLISE:
- Texto: "${requirementText}"
- Classificação escolhida pelo usuário: ${selectedClassification}

CRITÉRIOS DE AVALIAÇÃO (cada um vale 25 pontos, total 100):

1. ESTRUTURA (25 pontos):
   - Segue o padrão "O sistema deve..." ou "O sistema não pode..."?
   - Está bem formado gramaticalmente?

2. CLAREZA (25 pontos):
   - É específico e objetivo?
   - Evita termos vagos como "adequado", "bom", "rápido"?
   - Tem tamanho apropriado (nem muito curto, nem muito longo)?

3. ADEQUAÇÃO AO CENÁRIO (25 pontos):
   - O requisito faz sentido no contexto do ${scenarioName}?
   - Está alinhado com as funcionalidades esperadas deste tipo de sistema?

4. CLASSIFICAÇÃO (25 pontos):
   - A classificação "${selectedClassification}" está correta?
   - Funcional: funcionalidade do sistema
   - Não funcional: performance, qualidade, restrições técnicas
   - Inverso: o que o sistema NÃO pode fazer

RESPONDA ESTRITAMENTE NO FORMATO JSON:
{
  "structure_score": [0-25],
  "clarity_score": [0-25],
  "scenario_alignment_score": [0-25],
  "classification_score": [0-25],
  "total_score": [0-100],
  "classification_correct": true/false,
  "feedback": "feedback geral em português",
  "improvements": ["sugestão 1", "sugestão 2", "sugestão 3"]
}
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em Engenharia de Requisitos. Responda sempre em JSON válido conforme solicitado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from GPT-4')
    }

    // Parse JSON response
    const evaluation = JSON.parse(content)

    return {
      score: evaluation.total_score || 0,
      feedback: evaluation.feedback || 'Análise indisponível',
      improvements: evaluation.improvements || [],
      classification_correct: evaluation.classification_correct || false,
      structure_score: evaluation.structure_score || 0,
      clarity_score: evaluation.clarity_score || 0,
      completeness_score: evaluation.scenario_alignment_score || 0, // Using scenario alignment as completeness
      scenario_alignment_score: evaluation.scenario_alignment_score || 0
    }

  } catch (error) {
    console.error('Error calling GPT-4:', error)

    // Fallback to rule-based analysis if GPT-4 fails
    return fallbackAnalysis(requirementText, selectedClassification, scenarioName)
  }
}

// Fallback analysis when GPT-4 is not available
function fallbackAnalysis(
  text: string,
  classification: string,
  scenarioName: string
): AIEvaluationResponse {
  let score = 0
  let improvements: string[] = []

  // Basic structure check
  const structure_score = (text.toLowerCase().includes("sistema deve") || text.toLowerCase().includes("sistema não pode")) ? 25 : 0
  if (structure_score === 0) {
    improvements.push("Use a estrutura padrão: 'O sistema deve...' ou 'O sistema não pode...'")
  }

  // Clarity check
  const clarity_score = (text.length > 20 && text.length < 200) ? 25 : 0
  if (clarity_score === 0) {
    improvements.push("O requisito deve ter entre 20 e 200 caracteres para ser claro e objetivo")
  }

  // Scenario alignment (basic)
  const scenario_score = text.toLowerCase().includes('sistema') ? 20 : 10

  // Classification check (basic)
  const isInverse = text.toLowerCase().includes("não pode")
  const isNonFunctional = ['segundos', 'performance', 'plataforma', 'linguagem'].some(term =>
    text.toLowerCase().includes(term)
  )

  let expectedClassification = "funcional"
  if (isInverse) expectedClassification = "inverso"
  else if (isNonFunctional) expectedClassification = "nao-funcional"

  const classification_correct = classification === expectedClassification
  const classification_score = classification_correct ? 25 : 0

  if (!classification_correct) {
    improvements.push(`A classificação deveria ser: ${expectedClassification}`)
  }

  const total_score = structure_score + clarity_score + scenario_score + classification_score

  return {
    score: total_score,
    feedback: total_score >= 70 ? "Bom requisito com algumas melhorias possíveis" : "Requisito precisa de ajustes",
    improvements,
    classification_correct,
    structure_score,
    clarity_score,
    completeness_score: scenario_score,
    scenario_alignment_score: scenario_score
  }
}