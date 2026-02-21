import type { ToolId } from "@/lib/ai/prompts";

export interface RelatedTool {
  toolId: ToolId;
  reason: string;
}

export const TOOL_RELATIONSHIPS: Record<ToolId, RelatedTool[]> = {
  "valuation-calculator": [
    { toolId: "equity-simulator", reason: "Model how this valuation affects founder ownership" },
    { toolId: "pre-post-money", reason: "Calculate how much equity you'd give away" },
    { toolId: "market-sizing", reason: "Back up your valuation with market data" },
  ],
  "equity-simulator": [
    { toolId: "valuation-calculator", reason: "Determine the pre-money valuation for each round" },
    { toolId: "pre-post-money", reason: "Quick-check a single round's dilution math" },
    { toolId: "fundraising-guide", reason: "See what stage you should be fundraising at" },
  ],
  "pre-post-money": [
    { toolId: "equity-simulator", reason: "Model multiple rounds and see cumulative dilution" },
    { toolId: "valuation-calculator", reason: "Figure out what your pre-money should be" },
    { toolId: "fundraising-guide", reason: "Prepare your full fundraising strategy" },
  ],
  "burn-rate": [
    { toolId: "cash-flow-forecast", reason: "Expand into a full 12-month cash projection" },
    { toolId: "financial-model-builder", reason: "Build a complete 3-year financial model" },
    { toolId: "fundraising-guide", reason: "Know when to start raising based on runway" },
  ],
  "pricing-calculator": [
    { toolId: "unit-economics", reason: "See how your pricing affects LTV:CAC ratio" },
    { toolId: "market-sizing", reason: "Estimate total revenue at this price point" },
    { toolId: "cash-flow-forecast", reason: "Project 12 months of revenue at this pricing" },
  ],
  "cash-flow-forecast": [
    { toolId: "burn-rate", reason: "Quick-check your monthly burn and runway" },
    { toolId: "financial-model-builder", reason: "Build a full 3-year integrated model" },
    { toolId: "unit-economics", reason: "Validate the unit economics behind your revenue" },
  ],
  "market-sizing": [
    { toolId: "valuation-calculator", reason: "Use your market size to support your valuation" },
    { toolId: "pricing-calculator", reason: "Test pricing strategies within your market" },
    { toolId: "financial-model-builder", reason: "Build revenue projections from your TAM/SAM/SOM" },
  ],
  "unit-economics": [
    { toolId: "pricing-calculator", reason: "Optimize pricing to improve your LTV:CAC" },
    { toolId: "burn-rate", reason: "See how acquisition costs affect your runway" },
    { toolId: "cash-flow-forecast", reason: "Project cash flow based on your unit economics" },
  ],
  "financial-model-builder": [
    { toolId: "cash-flow-forecast", reason: "Dive deeper into monthly cash timing" },
    { toolId: "valuation-calculator", reason: "Value your company using these financial projections" },
    { toolId: "fundraising-guide", reason: "Use your model to prepare for fundraising" },
  ],
  "compliance-checklist": [
    { toolId: "fundraising-guide", reason: "See how compliance fits into your startup stage" },
    { toolId: "financial-model-builder", reason: "Build the financial statements regulators require" },
    { toolId: "burn-rate", reason: "Budget for compliance costs in your burn rate" },
  ],
  "self-assessment": [
    { toolId: "fundraising-guide", reason: "Start your guided startup journey" },
    { toolId: "valuation-calculator", reason: "Practice valuation with your own numbers" },
    { toolId: "unit-economics", reason: "Master the metrics investors care about most" },
  ],
  "fundraising-guide": [
    { toolId: "self-assessment", reason: "Test your finance knowledge before fundraising" },
    { toolId: "valuation-calculator", reason: "Determine your startup's valuation range" },
    { toolId: "equity-simulator", reason: "Model how a funding round affects ownership" },
  ],
};

export function getRelatedTools(toolId: ToolId): RelatedTool[] {
  return TOOL_RELATIONSHIPS[toolId] ?? [];
}
