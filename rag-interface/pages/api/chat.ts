import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: groq('mixtral-8x7b-32768'),
    messages,
    system: 'You are a professional Digital Twin assistant.',
  });

  return result.toTextStreamResponse();
}