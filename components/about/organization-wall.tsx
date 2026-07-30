import { ORGS, type OrgKind } from "@/lib/orgs";
import { cn } from "@/lib/utils";

const KIND_CIRCLE: Record<OrgKind, string> = {
  gov: "bg-ochre",
  edu: "bg-chart-3",
  solid: "bg-foreground",
  other: "border border-rule-strong",
};

export function OrganizationWall() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-3">
      {ORGS.map((org) => (
        <li key={org.name} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-[14px] w-[14px] rounded-full",
              KIND_CIRCLE[org.kind]
            )}
            aria-hidden
          />
          <span className="font-serif text-[13.5px] font-semibold text-foreground">
            {org.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
