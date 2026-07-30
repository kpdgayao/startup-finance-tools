import { GRANT_TIMELINE } from "@/lib/kevin";

export function GrantTimeline() {
  return (
    <dl className="flex flex-col">
      {GRANT_TIMELINE.map((row) => (
        <div
          key={row.year + row.entry}
          className="border-t border-rule pt-2 flex gap-3"
        >
          <dt className="font-mono text-[11px] tracking-[0.08em] text-ochre-deep dark:text-ochre w-9 shrink-0 pt-[2px]">
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
