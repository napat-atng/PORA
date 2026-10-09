# PORA Design System

## Direction

A modern personal wallet: light neutral canvas, a navy balance card, indigo actions, and compact transaction rows. This replaces the earlier BudgetZen treatment after user feedback that it did not feel appealing enough.

## UX research applied

- [NN/g: Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/): make the daily allowance the primary number, the cycle balance secondary, and supporting amounts smaller. Size, grouping, and contrast guide attention.
- [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show ordinary tasks first; put editing/deletion in a row menu and storage/calculation details in accordions. Keep amounts and payment actions visible.
- Explored [VaultLine](https://designmd.ai/chef/vaultline) and [Trust Blue Pay](https://designmd.ai/chef/trust-blue-pay) for finance-oriented alternatives. PORA's implementation uses its own wallet composition rather than copying a banking dashboard or implying live bank connectivity.

These are design decisions, not evidence that users prefer this version. User feedback remains the usability acceptance signal.

## One component library

Use **Mantine 9.7.1** throughout. `src/ui.tsx` owns the shared theme and small app adapters. `MantineProvider` and `ModalsProvider` are configured in `src/main.tsx`.

| Interface | Component |
| --- | --- |
| Actions and navigation | Button, ActionIcon |
| Transaction actions | Menu |
| Text/date/file input | TextInput |
| Type and date filters | NativeSelect |
| Panels and balances | Paper |
| Status and icons | Badge, ThemeIcon, Alert |
| Help and explanations | Accordion |
| Forms and confirmations | Modal, ModalsProvider |
| Typography | Text, Title |

See [Mantine theming](https://mantine.dev/theming/mantine-provider/) and [Modal accessibility](https://mantine.dev/core/modal/). Ordinary semantic list/layout elements compose these controls; do not introduce a second UI library. Native browser leave-page warnings remain a browser responsibility.

## Interaction and layout rules

- Keep Thai-capable system fonts and all UI assets local for offline operation.
- Preserve integer-satang calculations, Bangkok dates, and personal/sample storage isolation.
- Use 44px minimum action targets and 48px inputs. Keep labels visible and errors associated with fields.
- Focus the amount when entering a transaction. Guard unsaved changes; cancel must retain the draft. Escape dismisses the top confirmation, and editor closure restores its initiating action.
- Desktop: sidebar and two-column content. Mobile: bottom navigation and stacked panels. At 320px, summary amounts become full-width rows.
- Verify 320, 390, 768, and 1440px, long names, large supported amounts, keyboard navigation, offline writes, and app updates.
