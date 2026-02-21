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
              To: [{ Email: email, Name: email.split("@")[0] }],
              Subject: "Welcome to Startup Finance Toolkit!",
              HTMLPart: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141414;border-radius:12px;border:1px solid #262626;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.5px;">Startup Finance Toolkit</div>
          <div style="width:48px;height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6);margin:16px auto 0;border-radius:2px;"></div>
        </td></tr>

        <!-- Welcome -->
        <tr><td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px;">Welcome aboard!</h1>
          <p style="font-size:15px;line-height:1.7;color:#a1a1aa;margin:0 0 24px;">You now have access to <strong style="color:#e4e4e7;">12 free financial tools</strong> built specifically for Filipino startup founders.</p>
        </td></tr>

        <!-- Tool Cards -->
        <tr><td style="padding:0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                <div style="background-color:#1c1c1e;border:1px solid #262626;border-radius:8px;padding:16px;">
                  <div style="font-size:20px;margin-bottom:6px;">&#x1F4CA;</div>
                  <div style="font-size:13px;font-weight:600;color:#e4e4e7;">Valuation Calculator</div>
                  <div style="font-size:12px;color:#71717a;margin-top:4px;">5 valuation methods</div>
                </div>
              </td>
              <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                <div style="background-color:#1c1c1e;border:1px solid #262626;border-radius:8px;padding:16px;">
                  <div style="font-size:20px;margin-bottom:6px;">&#x1F525;</div>
                  <div style="font-size:13px;font-weight:600;color:#e4e4e7;">Burn Rate Tracker</div>
                  <div style="font-size:12px;color:#71717a;margin-top:4px;">Runway & what-if analysis</div>
                </div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                <div style="background-color:#1c1c1e;border:1px solid #262626;border-radius:8px;padding:16px;">
                  <div style="font-size:20px;margin-bottom:6px;">&#x1F4B0;</div>
                  <div style="font-size:13px;font-weight:600;color:#e4e4e7;">Financial Model Builder</div>
                  <div style="font-size:12px;color:#71717a;margin-top:4px;">3-year P&L, BS, CF</div>
                </div>
              </td>
              <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                <div style="background-color:#1c1c1e;border:1px solid #262626;border-radius:8px;padding:16px;">
                  <div style="font-size:20px;margin-bottom:6px;">&#x1F4C8;</div>
                  <div style="font-size:13px;font-weight:600;color:#e4e4e7;">Unit Economics</div>
                  <div style="font-size:12px;color:#71717a;margin-top:4px;">CAC, LTV & payback</div>
                </div>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:#71717a;margin:4px 0 24px;text-align:center;">+ 8 more tools including equity simulator, market sizing, and pricing calculator</p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="https://startupfinance.tools" style="display:inline-block;padding:14px 32px;background-color:#3b82f6;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Explore All Tools</a>
        </td></tr>

        <!-- Recommended Start -->
        <tr><td style="padding:0 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="background-color:#1a1a2e;border:1px solid #2d2d5e;border-radius:8px;padding:20px;">
            <div style="font-size:12px;font-weight:600;color:#818cf8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Recommended Start</div>
            <div style="font-size:14px;color:#e4e4e7;line-height:1.6;">Take the <a href="https://startupfinance.tools/tools/self-assessment" style="color:#60a5fa;text-decoration:underline;">Founder Self-Assessment</a> to get personalized tool recommendations based on your startup stage.</div>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #262626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <p style="font-size:12px;color:#52525b;margin:0;line-height:1.6;text-align:center;">You're receiving this because you subscribed at startupfinance.tools.<br>We'll occasionally share new tools, guides, and startup finance tips. No spam.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
              TextPart:
                "Welcome to Startup Finance Toolkit!\n\nYou now have access to 12 free financial tools built specifically for Filipino startup founders.\n\nFeatured tools:\n- Valuation Calculator (5 methods)\n- Burn Rate & Runway Tracker\n- Financial Model Builder (3-year P&L, BS, CF)\n- Unit Economics (CAC, LTV & payback)\n+ 8 more tools\n\nExplore all tools: https://startupfinance.tools\n\nRecommended: Take the Founder Self-Assessment to get personalized tool recommendations: https://startupfinance.tools/tools/self-assessment\n\nWe'll occasionally share new tools, guides, and startup finance tips. No spam.",
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
