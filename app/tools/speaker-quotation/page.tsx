import { SpeakerQuotationClient } from "./speaker-quotation-client";

/**
 * Rendered per request, not at build time.
 *
 * Without this Next prerenders the route and BAKES IN whatever
 * `ANTHROPIC_API_KEY` was set during `pnpm build`. The Docker build stage
 * declares no such variable, so the deployed page would have shipped with
 * `aiAvailable={false}` permanently — the prose box would never appear in
 * production however the key was configured at runtime, and rotating it could
 * not fix it without a rebuild. It looked correct locally only because
 * `.env.local` is present while building.
 *
 * The metadata in `layout.tsx` is unaffected and stays static.
 */
export const dynamic = "force-dynamic";

export default function SpeakerQuotationPage() {
  /**
   * Whether the front door can exist at all.
   *
   * Resolved here, on the server, because the client component cannot read the
   * key — and because a failed request is not evidence that the key is missing.
   * Inferring it from one would show an organizer a prose box that cannot work.
   */
  return <SpeakerQuotationClient aiAvailable={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
