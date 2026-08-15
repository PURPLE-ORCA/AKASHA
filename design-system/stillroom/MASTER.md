# Stillroom Design System

This file is the visual source of truth for Stillroom. The generated shadcn preset
`b5s2s6ZE9K` is the implementation source of truth for tokens and base components.

## Product character

Stillroom is a quiet, personal visual archive. The interface should feel composed,
editorial, and fast without competing with the collected work.

- Content-first, calm, and compact.
- Purple communicates action, selection, focus, and progress.
- Neutral surfaces carry structure; imagery carries personality.
- Avoid social-feed language, engagement metrics, dashboard widgets, and ornamental effects.

## Foundations

### Color

Use semantic tokens from `apps/web/src/styles.css`. Do not add raw color values in
components.

| Role | Token | Intended use |
| --- | --- | --- |
| Canvas | `background` | Application and gallery background |
| Primary text | `foreground` | Titles, labels, and high-emphasis content |
| Primary purple | `primary` | Main action, selected state, and progress |
| On-primary | `primary-foreground` | Content placed on primary purple |
| Quiet surface | `secondary` | Secondary actions and grouped controls |
| Recessed surface | `muted` | Empty areas, placeholders, and subtle states |
| Supporting text | `muted-foreground` | Metadata and secondary labels |
| Interactive surface | `accent` | Hovered or expanded neutral controls |
| Structure | `border` | Dividers, card edges, and hierarchy lines |
| Focus | `ring` | Keyboard focus indication |
| Destructive | `destructive` | Remove and irreversible actions only |

The preset's light and dark token maps must stay paired. Purple is restrained: one
dominant purple action or selected state per region.

### Typography

- **Manrope Variable:** body copy, controls, labels, navigation, and metadata.
- **Oxanium Variable:** Stillroom wordmark and rare display accents only.
- Body text starts at `1rem` on small screens.
- Metadata may use `0.75rem`; no functional copy should be smaller.
- Prefer weight and spacing over color to establish hierarchy.

### Shape and spacing

- Base radius: `0.45rem`, inherited from the preset.
- Use the preset radius tokens from `radius-sm` through `radius-4xl`.
- Spacing follows a 4px rhythm: 4, 8, 12, 16, 24, 32, and 48px.
- Use borders for most separation. Reserve shadows for menus, dialogs, and floating action bars.
- Gallery media keeps its natural aspect ratio and reserves space before loading.

### Motion

- Interaction transitions: 150-250ms.
- Animate opacity and transforms only.
- Motion explains state changes such as selection, insertion, and folder expansion.
- Respect `prefers-reduced-motion`; no interaction depends on animation.

## Component policy

Use shadcn components generated from preset `b5s2s6ZE9K`.

- Treat files in `apps/web/src/components/ui` as base primitives.
- Do not restyle shadcn instances with consumer-side `className` overrides.
- Configure primitives through their documented props, variants, sizes, slots, and semantic tokens.
- Put layout styles on surrounding elements or dedicated Stillroom composition components.
- Product compositions belong in `components/stillroom` or their owning feature.
- Use the preset's Phosphor icon family consistently. No emoji icons.
- Icon-only controls require an accessible name and at least a 44px hit target.

## Application shell

### Desktop

- Persistent left folder rail with clearly visible nesting.
- Breadcrumb, search, view controls, and one primary Add action in the top region.
- The media gallery receives most of the viewport.
- Bulk actions appear only after selection and remain keyboard accessible.

### Mobile

- Folder navigation moves into a shadcn Sheet.
- Search remains directly accessible.
- The gallery reduces columns without horizontal scrolling.
- Primary and destructive actions remain visually separated.

## Interaction standards

- A capture always returns explicit saving, success, or actionable failure feedback.
- Selected items use more than color alone: checkbox state, border, and accessible state.
- Folder expansion, selection, and current location are distinct concepts.
- Destructive actions require confirmation or an immediate undo path.
- All core workflows work by keyboard; drag-and-drop has a menu-based alternative.
- Loading longer than 300ms uses a layout-stable skeleton.
- Empty states explain the next useful action without internal implementation language.

## Accessibility and quality gates

- WCAG AA text contrast in both themes.
- Visible focus rings are never removed.
- Sequential heading hierarchy and a skip link to the gallery content.
- Meaningful media has useful alternative text; decorative imagery has empty alt text.
- Verify at 375, 768, 1024, and 1440px widths.
- Verify reduced motion, keyboard navigation, loading, empty, error, and offline states.
- No visible placeholder copy, developer notes, storage-provider terminology, or architecture language.

## Page overrides

Page-specific files may live under `design-system/stillroom/pages`. They can refine
layout or interaction behavior but cannot replace preset tokens or base-component policy.
