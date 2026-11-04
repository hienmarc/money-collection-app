import assert from "node:assert/strict"
import test from "node:test"
import { parseChatAnswer } from "./chat-answer"

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
