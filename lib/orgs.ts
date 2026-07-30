export type OrgKind = "gov" | "edu" | "solid" | "other";

export interface Org {
  name: string;
  kind: OrgKind;
}

// Full, unfiltered set — renders on /about only. The homepage org wall was
// dropped in Phase 2. `kind` drives the circle colour: gov = ochre,
// edu = teal, solid = ink, other = hollow --rule-strong.
export const ORGS: Org[] = [
  { name: "DOST-PCIEERD", kind: "gov" },
  { name: "DOST-TAPI", kind: "gov" },
  { name: "IdeaSpace Foundation", kind: "other" },
  { name: "Vivita Philippines", kind: "solid" },
  { name: "Mistletoe Ventures", kind: "solid" },
  { name: "EU-PH Green Economy Partnership", kind: "gov" },
  { name: "Saint Louis University", kind: "edu" },
  { name: "New Energy Nexus", kind: "other" },
  { name: "PCE / Go Negosyo", kind: "gov" },
  { name: "SEC", kind: "gov" },
  { name: "DTI", kind: "gov" },
  { name: "BIR", kind: "gov" },
];
