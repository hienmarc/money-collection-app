export interface ChatAnswer {
  answer: string
  followUpQuestions: string[]
}

export function parseChatAnswer(text: string): ChatAnswer {
  const trimmed = text.trim()
  const jsonText = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() ?? trimmed

  try {
    const parsed: unknown = JSON.parse(jsonText)
    if (parsed && typeof parsed === "object" && "answer" in parsed && typeof parsed.answer === "string") {
      const followUpQuestions =
        "follow_up_questions" in parsed && Array.isArray(parsed.follow_up_questions)
          ? parsed.follow_up_questions
              .filter((question): question is string => typeof question === "string")
              .map((question) => question.trim())
              .filter(Boolean)
              .slice(0, 3)
          : []
      return { answer: parsed.answer, followUpQuestions }
    }
  } catch {
    return { answer: trimmed, followUpQuestions: [] }
  }

  return { answer: trimmed, followUpQuestions: [] }
}
