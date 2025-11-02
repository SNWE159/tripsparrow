import "dotenv/config";
import { OpenAI } from "openai";

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
});

const chatCompletion = await client.chat.completions.create({
  model: "openai/gpt-oss-20b:groq",
  messages: [
    {
      role: "user",
      content: "What is the capital of France?",
    },
  ],
});

console.log(chatCompletion.choices[0].message.content);
