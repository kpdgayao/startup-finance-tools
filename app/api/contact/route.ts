import { NextResponse } from "next/server";
import { z } from "zod";
import Mailjet from "node-mailjet";

const INQUIRY_TYPES = [
  "Consulting & Mentoring",
  "Speaking & Workshops",
  "Partnership",
  "General Inquiry",
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  inquiryType: z.enum(INQUIRY_TYPES),
  organization: z.string().max(200).optional().default(""),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  // Honeypot — must be empty
  website: z.string().max(0, "Bot detected").optional().default(""),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Reject honeypot
    if (data.website) {
      // Silently succeed to not tip off bots
      return NextResponse.json({ success: true });
    }

    const apiKey = process.env.MJ_APIKEY_PUBLIC;
    const apiSecret = process.env.MJ_APIKEY_PRIVATE;

    if (!apiKey || !apiSecret) {
      console.log(`[Contact] Would send message from ${data.name} <${data.email}>: ${data.inquiryType}`);
      console.log(`[Contact] Message: ${data.message}`);
      return NextResponse.json({ success: true });
    }

    const mailjet = Mailjet.apiConnect(apiKey, apiSecret);

    const subject = `[SFT Contact] ${data.inquiryType} — ${data.name}`;

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr><td style="padding:24px 28px 16px;border-bottom:2px solid #2563eb;">
          <div style="font-size:11px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">New Contact Form Submission</div>
          <div style="font-size:18px;font-weight:700;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${data.inquiryType}</div>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
            <tr>
              <td style="padding:8px 0;font-weight:600;color:#6b7280;width:120px;vertical-align:top;">From</td>
              <td style="padding:8px 0;">${escapeHtml(data.name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-weight:600;color:#6b7280;vertical-align:top;">Email</td>
              <td style="padding:8px 0;"><a href="mailto:${escapeHtml(data.email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(data.email)}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-weight:600;color:#6b7280;vertical-align:top;">Type</td>
              <td style="padding:8px 0;">${escapeHtml(data.inquiryType)}</td>
            </tr>
            ${data.organization ? `<tr>
              <td style="padding:8px 0;font-weight:600;color:#6b7280;vertical-align:top;">Organization</td>
              <td style="padding:8px 0;">${escapeHtml(data.organization)}</td>
            </tr>` : ""}
          </table>
        </td></tr>

        <!-- Message -->
        <tr><td style="padding:0 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Message</div>
          <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;font-size:14px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
          Sent from startupfinance.tools contact form
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const textBody = `New contact form submission

From: ${data.name}
Email: ${data.email}
Type: ${data.inquiryType}
${data.organization ? `Organization: ${data.organization}\n` : ""}
Message:
${data.message}

---
Sent from startupfinance.tools contact form`;

    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "hello@startupfinance.tools",
            Name: "Startup Finance Toolkit",
          },
          To: [{ Email: "kevin@iol.ph", Name: "Kevin" }],
          ReplyTo: { Email: data.email, Name: data.name },
          Subject: subject,
          HTMLPart: htmlBody,
          TextPart: textBody,
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    console.error("[Contact] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
