"use server"

export interface VectorResult {
  id: string
  score: number
  data?: string
  metadata?: {
    region?: string
    type?: string
    [key: string]: any
  }
}

export interface RAGResponse {
  sources: VectorResult[]
  answer: string
}

export async function ragQuery(question: string): Promise<RAGResponse> {
  try {
    if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
      throw new Error(
        "Missing Upstash Vector credentials. Please add UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN to your environment variables.",
      )
    }

    const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL
    if (vectorUrl.includes("upstash.io") && !vectorUrl.includes("vector")) {
      throw new Error(
        "The UPSTASH_VECTOR_REST_URL appears to be a Redis URL, not a Vector database URL. Please use your Upstash Vector database credentials instead. Vector URLs typically contain 'vector' in the domain.",
      )
    }

    // Query the Upstash Vector database using the REST API
    const vectorResponse = await fetch(`${vectorUrl}/query-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_VECTOR_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: question,
        topK: 5, // Increased topK from 3 to 5 to retrieve more relevant results
        includeMetadata: true,
        includeVectors: false,
      }),
    })

    if (!vectorResponse.ok) {
      const errorData = await vectorResponse.text()
      throw new Error(
        `Vector search failed (${vectorResponse.status}). Please verify your Upstash Vector credentials are correct.`,
      )
    }

    const vectorData = await vectorResponse.json()
    const vectorResults = vectorData.result || []

    // Build context from retrieved documents
    const context = vectorResults
      .map((result: any, index: number) => {
        const metadata = result.metadata || {}
        const text =
          result.data || metadata.text || metadata.description || metadata.content || "No description available"
        const additionalInfo = Object.entries(metadata)
          .filter(([key]) => !["text", "description", "content"].includes(key))
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
        return `Document ${index + 1}:
${text}
${additionalInfo ? additionalInfo : ""}`
      })
      .join("\n\n")

    const completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a helpful food expert assistant. Answer questions about food based on the provided context. Be informative and friendly. If the context doesn't contain relevant information, say so politely.`,
          },
          {
            role: "user",
            content: `Context:
${context}

Question: ${question}

Please provide a helpful answer based on the context above.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!completion.ok) {
      const errorData = await completion.text()
      throw new Error(`Groq API error: ${completion.status}`)
    }

    const data = await completion.json()
    const answer = data.choices?.[0]?.message?.content?.trim() || "No response generated."

    return {
      sources: vectorResults.map((r: any) => ({
        id: r.id,
        score: r.score,
        data: r.data,
        metadata: r.metadata,
      })),
      answer,
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to process your question. Please try again.")
  }
}
