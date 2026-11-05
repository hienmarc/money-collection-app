export interface ChatAnswer {
  answer: string
  followUpQuestions: string[]
}

export function filterUnknownBanknoteImages(
  answer: string,
  rows: Record<string, unknown>[],
): string {
  const imageUrls = new Set(
    rows.flatMap((row) =>
      [row.front_image, row.back_image].filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      ),
    ),
  )

  const markdownWithImages = answer.replace(
    /(?<!!)\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g,
    (markdown, alt: string, url: string) => imageUrls.has(url) ? `![${alt}](${url})` : markdown,
  )

  return markdownWithImages.replace(
    /!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g,
    (markdown, _alt: string, url: string) => {
      try {
        const parsedUrl = new URL(url, "https://chatbot.invalid")
        if (imageUrls.has(url) && ["http:", "https:"].includes(parsedUrl.protocol)) {
          return markdown
        }
      } catch {
        return ""
      }
      return ""
    },
  )
}

export function parseChatAnswer(text: string): ChatAnswer {
  const withoutReasoning = text
    .replace(/<(thinking|analysis|reasoning)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .trim()
  const responseMatch = withoutReasoning.match(/<response\b[^>]*>([\s\S]*?)<\/response>/i)
  const responseText = responseMatch?.[1].trim() ?? withoutReasoning
  const jsonText = responseText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() ?? responseText

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
    return { answer: responseText, followUpQuestions: [] }
  }

  return { answer: responseText, followUpQuestions: [] }
}
