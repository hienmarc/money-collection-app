import assert from "node:assert/strict"
import test from "node:test"
import { filterUnknownBanknoteImages, parseChatAnswer } from "./chat-answer"

test("parses an answer with follow-up questions", () => {
  assert.deepEqual(
    parseChatAnswer('{"answer":"You have 12 Canadian banknotes.","follow_up_questions":["Which is oldest?"]}'),
    { answer: "You have 12 Canadian banknotes.", followUpQuestions: ["Which is oldest?"] },
  )
})

test("supports a response without follow-up questions", () => {
  assert.deepEqual(parseChatAnswer('{"answer":"No banknotes found.","follow_up_questions":[]}'), {
    answer: "No banknotes found.",
    followUpQuestions: [],
  })
})

test("limits follow-up questions to three non-empty strings", () => {
  assert.deepEqual(
    parseChatAnswer(
      '{"answer":"Your collection is diverse.","follow_up_questions":[" First? ","Second?","",null,"Third?","Fourth?"]}',
    ),
    { answer: "Your collection is diverse.", followUpQuestions: ["First?", "Second?", "Third?"] },
  )
})

test("accepts fenced JSON and falls back to plain markdown", () => {
  assert.deepEqual(
    parseChatAnswer('```json\n{"answer":"Try this.","follow_up_questions":["Next?"]}\n```'),
    { answer: "Try this.", followUpQuestions: ["Next?"] },
  )
  assert.deepEqual(parseChatAnswer("**Here is your result.**"), {
    answer: "**Here is your result.**",
    followUpQuestions: [],
  })
})

test("extracts JSON from a response wrapper and omits the model's thinking section", () => {
  assert.deepEqual(
    parseChatAnswer(`<thinking>I will now format this information for the user.</thinking>
<response>
{
  "answer": "Your oldest banknote is a **5.00 Canadian Dollar** from **1954**.",
  "follow_up_questions": ["Would you like more details?"]
}
</response>`),
    {
      answer: "Your oldest banknote is a **5.00 Canadian Dollar** from **1954**.",
      followUpQuestions: ["Would you like more details?"],
    },
  )
})

test("removes reasoning and response tags around plain Markdown", () => {
  assert.deepEqual(
    parseChatAnswer("<thinking>Private reasoning.</thinking><response>**Here is your result.**</response>"),
    { answer: "**Here is your result.**", followUpQuestions: [] },
  )
})

test("keeps only Markdown images whose URLs belong to returned banknotes", () => {
  const frontImage = "https://images.example.com/front.jpg"
  const backImage = "https://images.example.com/back.jpg"
  const answer = [
    `![Front of the banknote](${frontImage})`,
    `![Back of the banknote](${backImage})`,
    "![Unrelated image](https://images.example.com/other.jpg)",
    "![Unsafe image](javascript:alert(1))",
  ].join("\n")

  assert.equal(
    filterUnknownBanknoteImages(answer, [{ front_image: frontImage, back_image: backImage }]),
    [
      `![Front of the banknote](${frontImage})`,
      `![Back of the banknote](${backImage})`,
      "",
      "",
    ].join("\n"),
  )
})
