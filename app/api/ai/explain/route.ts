import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSystemPrompt, isValidToolId } from "@/lib/ai/prompts";

const requestSchema = z.object({
  toolId: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request: toolId (string) and data (object) required." },
      { status: 400 }
    );
  }

  const { toolId, data } = parsed.data;

  if (!isValidToolId(toolId)) {
    return Response.json({ error: `Unknown tool: ${toolId}` }, { status: 400 });
  }

  const systemPrompt = getSystemPrompt(toolId);
  const userMessage = `Here are my calculator inputs and results:\n\n${JSON.stringify(data, null, 2)}\n\nPlease explain what these results mean for my startup.`;

  try {
    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get AI explanation.";
    return Response.json({ error: message }, { status: 500 });
  }
}
