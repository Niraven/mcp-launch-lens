# MCP Launch Lens UI redesign notes

## Direction

Rebuilt the widget around a clean shadcn/Vercel/Linear-style app surface instead of the previous ink/porcelain visual treatment.

## Changes

- Replaced serif/oriental UI with system-sans devtools typography.
- Added proper component primitives: badge, button, score panel, area cards, finding cards, side panels.
- Added `lucide-react` icons instead of decorative text/emoji.
- Reworked layout into clear product IA: topbar, hero, scorecard, readiness cards, findings filters, ship plan, partner story.
- Added light/dark adaptive design tokens.
- Improved hierarchy, spacing, contrast, tap targets, focus states, and responsive behavior.
- Removed decorative gradients/noise/ink marks that made the first widget look like a poster instead of a real app.

## Design system reference

- Vercel: white canvas, shadow-as-border, Geist-like sans hierarchy.
- Linear: dark mode luminance stacking, precise cards, restrained accent usage.
- shadcn/ui: owned component feel, composable cards/buttons/badges, accessible states.
