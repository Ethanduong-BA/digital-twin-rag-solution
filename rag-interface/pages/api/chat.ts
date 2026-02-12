import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful Digital Twin AI assistant." },
        { role: "user", content: message },
      ],
      model: "mixtral-8x7b-32768",
    });

    const reply = completion.choices[0]?.message?.content || "No response.";
    res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}