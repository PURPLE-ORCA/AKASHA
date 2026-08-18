# Akasha Design System

This file is the visual source of truth for Akasha. HeroUI v3 and HeroUI Pro
are the implementation source of truth for tokens and base components.

## Product character

Akasha is a quiet, personal visual archive. The interface should feel composed,
editorial, and fast without competing with the collected work.

- Content-first, calm, and compact.
- Purple communicates action, selection, focus, and progress.
- Neutral surfaces carry structure; imagery carries personality.
- Avoid social-feed language, engagement metrics, dashboard widgets, and ornamental effects.

## Foundations

### Color

Use HeroUI semantic tokens. Do not add raw color values in components.

| Role | Token | Intended use |
| --- | --- | --- |
| Canvas | `background` | Application and gallery background |
| Primary text | `foreground` | Titles, labels, and high-emphasis content |
| Primary action | `accent` | Main action, selected state, and focus |
| On-primary | `accent-foreground` | Content placed on the accent |
| Quiet surface | `surface-secondary` | Grouped controls and folder navigation |
| Recessed surface | `surface-tertiary` | Empty areas and subtle states |
| Supporting text | `muted` | Metadata and secondary labels |
| Interactive surface | `default` | Neutral interactive controls |
| Structure | `border` | Dividers, card edges, and hierarchy lines |
| Focus | `focus` | Keyboard focus indication |
| Destructive | `danger` | Remove and irreversible actions only |

HeroUI's light and dark token maps must stay paired. Accent color remains restrained.

### Typography

- **Manrope Variable:** body copy, controls, labels, navigation, and metadata.
- **Oxanium Variable:** Akasha wordmark and rare display accents only.
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

Use `@heroui/react` and `@heroui-pro/react` components.

- Do not pass `className` overrides to HeroUI components.
- Configure primitives only through documented props, variants, sizes, slots, and semantic tokens.
- Put layout styles on surrounding elements or dedicated Akasha composition components.
- Product compositions belong in `components/stillroom` or their owning feature.
- Use the existing Phosphor icon family consistently. No emoji icons.
- Icon-only controls require an accessible name and at least a 44px hit target.

## Application shell

### Desktop

- No sidebar. Breadcrumbs lead the header; the theme segment trails it.
- All and Folders tabs provide the only top-level library views.
- The content-sized tab list sits above full-width panels.
- The media gallery uses the full viewport width in a cards-only masonry layout.
- Media management is contextual: create on empty space; move and delete on media.

### Mobile

- Header controls wrap only when their content no longer fits.
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
