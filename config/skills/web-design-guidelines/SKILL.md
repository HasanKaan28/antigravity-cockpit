---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to 'review my UI', 'check accessibility', 'audit design', 'review UX', or 'check my site against best practices'.
---

# Web Interface Guidelines & UI Auditor

Review files for compliance with modern Web Interface Guidelines (Vercel, Next.js, and W3C standards).

## Quick Audit Checklist

### 1. Accessibility (a11y)
- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)
- Use `<button>` for actions, `<a>` / `<Link>` for navigation (never `<div onClick>`)
- Images need `alt` (or `alt=""` if purely decorative)
- Decorative icons need `aria-hidden="true"`
- Dynamic/async updates (toasts, alerts, inline validation) need `aria-live="polite"`
- Headings are hierarchical: `<h1>` through `<h6>`
- Ensure visible focus indicator (`:focus-visible`, ring)

### 2. Focus States
- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent CSS
- Never use `outline: none` without a clear focus ring replacement
- Use `:focus-visible` over `:focus` (avoids jarring ring on mouse click)
- Group focus with `:focus-within` for compound controls

### 3. Forms & Inputs
- Inputs require `autocomplete` and meaningful `name`
- Use proper input types: `email`, `tel`, `url`, `number` and proper `inputmode`
- Never block pasting (`onPaste` with `preventDefault`)
- Form labels must be clickable (`htmlFor` or wrapping input)
- Disable spellcheck for technical inputs: codes, keys, emails (`spellCheck={false}`)
- Submit buttons should show loading spinners during async calls

### 4. Motion & Animation
- Always respect `prefers-reduced-motion`
- Animate `transform` and `opacity` only (GPU compositor accelerated)
- Avoid `transition: all` — specify transition properties explicitly (`transition: transform 0.2s ease, opacity 0.2s ease`)

### 5. Typography & Spacing
- Use `text-wrap: balance` or `text-wrap: pretty` on titles to prevent orphaned words
- Use tabular numbers for metrics and counters: `font-variant-numeric: tabular-nums`
- Truncate overflowing labels with `truncate` or `line-clamp` + `min-w-0` on flex children

### 6. Performance & Layout
- Set explicit `width` and `height` (or `aspect-ratio`) on images to prevent Cumulative Layout Shift (CLS)
- Use `loading="lazy"` on below-the-fold media
- Use `content-visibility: auto` or virtualization for large lists (>50 items)

## Output Format
When auditing code, output concise, high-signal findings with exact line references:
```text
<file>:<line>: <rule-violation> — <suggested-fix>
```
