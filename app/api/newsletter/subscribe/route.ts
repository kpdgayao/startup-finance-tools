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
      console.log(`[Newsletter] Would subscribe: ${email} (env vars not set)`);
      return NextResponse.json({ success: true });
    }

    const mailjet = Mailjet.apiConnect(apiKey, apiSecret);

    // Try to create contact — if it already exists, skip welcome email
    let isNewContact = true;
    try {
      await mailjet.post("contact").request({ Email: email });
    } catch (err) {
      if (err instanceof Error && err.message?.includes("already exists")) {
        isNewContact = false;
      } else {
        throw err;
      }
    }

    try {
      await mailjet
        .post("listrecipient")
        .request({ ContactAlt: email, ListID: parseInt(listId) });
    } catch (err) {
      // Ignore duplicate list recipient errors
      if (
        !(err instanceof Error && err.message?.includes("already exists"))
      ) {
        throw err;
      }
    }

    // Send welcome email only to new subscribers
    if (isNewContact) {
      try {
        await mailjet.post("send", { version: "v3.1" }).request({
          Messages: [
            {
              From: {
                Email: "hello@startupfinance.tools",
                Name: "Startup Finance Toolkit",
              },
              To: [{ Email: email }],
              Subject: "Welcome to Startup Finance Toolkit!",
              HTMLPart: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
                  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Welcome to Startup Finance Toolkit!</h1>
                  <p style="font-size: 16px; line-height: 1.6; color: #333;">Thanks for subscribing. You now have access to free tools built for Filipino founders:</p>
                  <ul style="font-size: 15px; line-height: 1.8; color: #333; padding-left: 20px;">
                    <li>Startup Valuation Calculator (5 methods)</li>
                    <li>Burn Rate & Runway Tracker</li>
                    <li>Financial Model Builder</li>
                    <li>Unit Economics Dashboard</li>
                    <li>And 8 more tools</li>
                  </ul>
                  <a href="https://startupfinance.tools/tools" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Explore All Tools</a>
                  <p style="font-size: 14px; color: #666; margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 16px;">We'll occasionally share new tools, guides, and startup finance tips. No spam.</p>
                </div>
              `,
              TextPart:
                "Welcome to Startup Finance Toolkit!\n\nThanks for subscribing. You now have access to free tools built for Filipino founders: Startup Valuation Calculator, Burn Rate Tracker, Financial Model Builder, Unit Economics Dashboard, and 8 more.\n\nExplore all tools: https://startupfinance.tools/tools\n\nWe'll occasionally share new tools, guides, and startup finance tips. No spam.",
            },
          ],
        });
      } catch (emailErr) {
        // Don't fail the subscription if welcome email fails
        console.error("[Newsletter] Welcome email failed:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    console.error("[Newsletter] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
