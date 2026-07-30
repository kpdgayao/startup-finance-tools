export interface GrantTimelineEntry {
  year: string; // "2018", "2020–24", "Ongoing"
  entry: string;
}

export const ROLE_LINE = "CPA · MBA · CEO, IOL Inc.";
export const NAME = "Kevin Philip Gayao";

export const GRANT_TIMELINE: GrantTimelineEntry[] = [
  { year: "2021", entry: "DOST-PCIEERD Startup Grant" },
  { year: "2023", entry: "DOST-TAPI TECHNiCOM Grant" },
  { year: "2018", entry: "Angel investment via IdeaSpace Cohort 7" },
  { year: "2020–24", entry: "Finance Manager, Vivita Philippines (Mistletoe-backed)" },
  { year: "2024", entry: "EU-PH Green Economy Partnership grant" },
  { year: "Ongoing", entry: "Visiting Lecturer, SLU Graduate School" },
  { year: "Ongoing", entry: "Finance Mentor, New Energy Nexus" },
  { year: "Ongoing", entry: "Certified Mentor, PCE / Go Negosyo" },
];

// The right-column body copy. Distilled from the existing about page's
// prose — keep the voice first-person, unhedged, and focused on the work.
export const ABOUT_BIO = [
  "I teach startup finance to Filipino founders because most of the tools available to them were built for Silicon Valley assumptions — priced rounds, venture debt, USD-denominated everything. The Philippines runs on SAFEs that still surprise local investors, grants that disburse late, and a compliance regime that wastes weeks when you do it out of order.",
  "These calculators are the ones I wish I had when I was raising for IOL Inc. — through a DOST-PCIEERD Startup Grant, a DOST-TAPI TECHNiCOM Grant, an angel round via IdeaSpace, and four years managing finance at Vivita Philippines under Mistletoe. Every default in them is set to what I actually look for.",
];

export const PULL_QUOTE =
  "This toolkit transforms the teaching into interactive calculators that founders can use to make real financial decisions — from pricing their first product to modeling their cap table through multiple funding rounds.";
