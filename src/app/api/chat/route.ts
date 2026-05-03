import { NextResponse } from "next/server";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

const SYSTEM_PROMPT = `You are an English tutor. You correct errors tactfully and continue the conversation.
Return ONLY valid JSON with the exact keys:
errorsFound: boolean
correction: string
explanation: string
reply: string

Rules:
- If there are errors, put the corrected sentence in correction.
- explanation and reply must be in English.
- If there are no errors, correction must be "".
- reply must continue the conversation with an open question.
- Keep responses clear and concise.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function safeParseJson(text: string) {
  const cleaned = text
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return null;
  }

  const slice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 },
      );
    }

    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    let data: GeminiResponse | null = null;
    let lastError = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `${SYSTEM_PROMPT}\nLevel: B1` }],
            },
            contents,
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 500,
            },
          }),
        },
      );

      if (response.ok) {
        data = (await response.json()) as GeminiResponse;
        break;
      }

      lastError = await response.text();
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Gemini API error",
          detail: lastError || "Service busy",
        },
        { status: 503 },
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const parsed = safeParseJson(text);

    if (!parsed) {
      return NextResponse.json({
        errorsFound: false,
        correction: "",
        explanation: "I could not read the correction. Please try again.",
        reply: "Let's continue. Tell me about your day in two sentences.",
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
