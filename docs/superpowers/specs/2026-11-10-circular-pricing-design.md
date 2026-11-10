# Circular Pricing Upgrade: Design

Date: 2026-11-10. Source: Kevin's talk "Pricing for Circular Startups" (Vivita CircleWorks, 10 Nov 2026, 28 slides) and the CircleWorks profiles of its 14 sub-grantees.

## Why

The talk sends attendees to `/tools/pricing-calculator` live (slides 24–26). Two things there contradict the talk, and the rest of the tool cannot do what the talk teaches:

- The deck teaches costing first: itemized costs sorted into fixed, variable and one-time; the full cost of reuse (containers, collection, cleaning); commonly missed costs; break-even; monthly profit. The tool has one fixed-cost box and one variable-cost box.
- The deck benchmarks against the sachet **per ml, not per pack**. The tool compares raw competitor prices.
- The deck's exercise is "pick a price between the cost floor and the market ceiling, then share it in the chat". The tool's six tabs never meet.

The audience is early-stage circular startups (refilleries, reuse services, upcycled goods, bio-based packaging) in the Cordillera. Most of them run on grant money now and must price for after the grant.

## Goals

1. **Correctness against the deck (ship first).**
   - Markup vs margin: the tool's "Target Margin %" is really a markup. The tool must label it a markup, offer a true margin-on-price mode, and always show both figures.
   - The psychological price must never go negative. Today ₱5 becomes −₱1.
2. **Reuse-aware costing.** Itemized cost lines, each with:
   - a category: materials, labor, overhead, containers, collection, cleaning;
   - a behavior: fixed per month, variable per unit, one-time spread over months, or per-use (an item's cost ÷ its expected uses);
   - a "the grant pays this now" flag.
   Plus one-click "commonly missed costs", and a warning when a reuse business has no take-back costs. Results add total monthly cost and monthly profit.
3. **Per-measure benchmark.** Competitor offers are entered as price + pack size. Everything is compared per measure (e.g. per ml), with a verdict per offer.
4. **Pick and share.** One panel lines up the unit cost, the cost-plus price, the market range and the user's chosen price, with a verdict. It also builds a one-line share text in the deck's chat format.
5. **Value and testing.**
   - Value-based can be built from a list of customer savings.
   - A "test two prices" card compares monthly profit at two price/volume pairs (slide 3 and slide 27).

## Non-goals

- No persistence, accounts or URL-encoded sharing. The tool stays client-side only.
- No PDF export for this tool (it has none today).
- No impact-data or "price the proof" calculator.
- No redesign of the Penetration or Bundle tabs.
- No rewrite of the `/learn/pricing-your-product` article beyond fixing the markup/margin wording.

## Anti-goals

- Any number on the page that disagrees with the deck's worked answers. With the default inputs, the tool must show:
  - fixed ₱30,000;
  - variable ₱60;
  - unit cost ₱110;
  - price ₱143 at 30% markup;
  - break-even 362;
  - monthly profit ₱19,800;
  - ₱0.14 per ml, cheaper than the ₱0.31 pack and more expensive than the ₱0.13 refill.
- Silent clamping of a valid input (see the validation gotcha in the plan).
- New dependencies, shadows, gradients, hex colours or palette classes. The repo's guard tests fail on all of these.

## Decisions (Claude's calls, made for Kevin; he can overrule any of them)

- **Default example.** The default example becomes the deck's refill-station practice case: 600 liters, 30% markup. The old ₱130K cloud-software example stays in the learn article and the AI prompt.
- **Price basis.** The price is always computed on the **full** cost, grant-paid lines included. The grant only changes an informational line ("while the grant pays…").
- **Container loss.** Lost containers are handled by entering realistic expected uses, plus a "Lost containers" missed-cost chip. There is no probabilistic loss model.
- **Brand names.** Competitor defaults use generic names ("Single-use pack, 100.5 ml"), not brand names, even though the deck names the brands.
- **Price ladder.** The ladder is a sorted list with a verdict, not a chart. It leaves out the value-based figure, because that is per customer, not per selling unit.
- **Charm pricing.** Charm pricing shows both rounding down and rounding up. Below ₱9 it shows no charm price.
