# PORA Design

## Reference and prompt

Selected: [BudgetZen by chef](https://designmd.ai/chef/budgetzen), listed as MIT on designmd.ai. Reviewed against Warm Teal and Verdana Health; BudgetZen directly fits personal budgeting and mobile use.

The page's prompt:

> Using designmd mcp, download the design system https://designmd.ai/chef/budgetzen and implement it in my code

The download endpoint was used directly; no MCP installation was needed.

## Adaptation

Use mint `#10B981`, sky `#38BDF8`, stone `#78716C`, canvas `#FAFFFE`, and white surfaces. Apply rounded cards, subtle elevation, an 8px spacing rhythm, and progressive disclosure. Favor reassuring language and make balances visible at a glance.

PORA uses darker green for accessible button text/background contrast, a Thai-capable system font for offline operation, 44px minimum touch targets, and tabular money figures. Avoid invented progress targets or savings charts: this app has no goal-tracking data.

## Component contract

- Overview: one primary amount, daily budget, and distinct spending/income dates. Small cards explain balance, bills, and reserve.
- Lists: icon tile, name, metadata, amount, and labeled edit/delete actions.
- Forms: clear labels, prominent amount input, note chips, visible errors, and a full-width save button.
- Help: concise default copy; calculations, storage caveats, and installation instructions expand on demand.
- Responsive: desktop sidebar and two-column content; mobile bottom navigation, stacked panels, wrapping actions, and safe-area spacing. Check 320, 390, 768, and 1440px plus long money/name values.
- Preserve all financial calculations, storage keys, confirmation guards, and PWA behavior.
