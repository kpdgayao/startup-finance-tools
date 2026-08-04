import { GRANT_TIMELINE } from "@/lib/kevin";

export function GrantTimeline() {
  return (
    <dl className="flex flex-col">
      {GRANT_TIMELINE.map((row) => (
        <div
          key={row.year + row.entry}
          className="border-t border-rule pt-2 flex gap-3"
        >
          {/* w-14, not w-9: the column carries "Ongoing" and "2020–24", not
              just four digits. At 36px both overflowed — "Ongoing" ran into
              the entry text and the date range wrapped to a second line. */}
          <dt className="font-mono text-[11px] tracking-[0.08em] text-ochre-deep dark:text-ochre w-14 shrink-0 pt-[2px]">
            {row.year}
          </dt>
          <dd className="font-serif text-[13px] leading-[1.4] text-foreground">
            {row.entry}
          </dd>
        </div>
      ))}
    </dl>
  );
}
