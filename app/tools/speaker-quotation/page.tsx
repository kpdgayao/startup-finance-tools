import { SpeakerQuotationClient } from "./speaker-quotation-client";

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
