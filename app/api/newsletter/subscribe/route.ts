import { NextResponse } from "next/server";
import { z } from "zod";
import Mailjet from "node-mailjet";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const apiKey = process.env.MJ_APIKEY_PUBLIC;
    const apiSecret = process.env.MJ_APIKEY_PRIVATE;
    const listId = process.env.MJ_LIST_ID;

    if (!apiKey || !apiSecret || !listId) {
      // In development without env vars, just acknowledge
      console.log(`[Newsletter] Would subscribe: ${email} (env vars not set)`);
      return NextResponse.json({ success: true });
    }

    const mailjet = Mailjet.apiConnect(apiKey, apiSecret);

    // Add contact to Mailjet list (Mailjet handles deduplication)
    await mailjet.post("contact").request({ Email: email });

    await mailjet
      .post("listrecipient")
      .request({ ContactAlt: email, ListID: parseInt(listId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Mailjet duplicate contact returns 400 — treat as success
    if (
      error instanceof Error &&
      error.message?.includes("already exists")
    ) {
      return NextResponse.json({ success: true });
    }

    console.error("[Newsletter] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
