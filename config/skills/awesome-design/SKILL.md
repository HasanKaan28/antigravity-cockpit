---
name: awesome-design
description: Real-world design systems and design token specifications from 70+ top brands (Stripe, Linear, Vercel, Supabase, Raycast, OpenAI, Anthropic, Apple, Tesla, etc.) to build authentic, production-grade UIs.
---

# Awesome Design Systems & Reference Tokens

Access authentic, production-grade design systems, color tokens, typography scales, spacing grids, and component patterns extracted from over 70 world-class engineering and design leaders.

## When to Use
- Designing or styling web pages with specific brand aesthetics (e.g. "Linear-style", "Stripe-like", "Vercel minimalism", "Raycast dark tech", "Apple clean").
- Extracting exact HEX colors, surface gradients, hairline borders, and shadow depths instead of guessing.
- Setting up CSS variables or Tailwind configs based on proven real-world palettes.

## Available Design Systems
Located in:
`~/.gemini/config/skills/awesome-design\design-md/<brand>/DESIGN.md`

### Top Tech & Developer Platforms
- **Linear**: `linear.app/DESIGN.md` (Deep black #010102, lavender accent #5e6ad2, hairline borders, dense craft)
- **Stripe**: `stripe/DESIGN.md` (Vibrant purple/blue gradients, clean whites, high-trust fintech)
- **Vercel**: `vercel/DESIGN.md` (Pure monochrome, stark contrast, Geist typography, geometric minimalism)
- **Supabase**: `supabase/DESIGN.md` (Emerald green #3ecf8e, dark mode canvas #1c1c1c)
- **Raycast**: `raycast/DESIGN.md` (Vibrant red accent #ff6363, MacOS desktop luxury, compact density)
- **Resend**: `resend/DESIGN.md` (Clean monochrome, crisp typography, developer-first simplicity)
- **Warp**: `warp/DESIGN.md` (Terminal aesthetics, modern cyber tones)
- **PostHog**: `posthog/DESIGN.md` (Hedgehog playful retro, high-contrast badges)

### AI & Frontier Labs
- **Claude / Anthropic**: `claude/DESIGN.md` (Warm terracotta/clay #d97757, ivory background, editorial serifs)
- **Cohere**: `cohere/DESIGN.md` (Earthy corals, sage greens, technical elegance)
- **Mistral**: `mistral.ai/DESIGN.md` (Retro orange-red, pixel elements, high-tech French minimalism)
- **Ollama**: `ollama/DESIGN.md` (Friendly terminal, monochrome llama aesthetic)
- **Replicate**: `replicate/DESIGN.md` (High contrast, raw monospaced utilitarianism)
- **X.AI**: `x.ai/DESIGN.md` (Minimal dark space, stark futuristic typography)

### Consumer, Automotive & Creative
- **Apple**: `apple/DESIGN.md` (San Francisco typography, neutral frosted glass, human-centered luxury)
- **Tesla**: `tesla/DESIGN.md` (Futuristic red/black, sleek aerodynamic layout)
- **Figma**: `figma/DESIGN.md` (Playful multi-color handles, tool canvas layout)
- **Framer**: `framer/DESIGN.md` (Fluid motion, kinetic typography, dynamic responsive sections)
- **Nike**: `nike/DESIGN.md` (Bold aggressive typography, dynamic contrast, high-energy imagery)
- **Ferrari**: `ferrari/DESIGN.md` & **Lamborghini**: `lamborghini/DESIGN.md`

## How to Apply in Code
1. Inspect the relevant brand's `DESIGN.md`:
   ```bash
   view_file AbsolutePath="~/.gemini/config/skills/awesome-design\design-md\<brand>\DESIGN.md"
   ```
2. Read the `colors:`, `typography:`, `radii:`, `shadows:`, and `components:` sections.
3. Map the tokens to CSS custom properties:
   ```css
   :root {
     --canvas: #010102;
     --surface-1: #0f1011;
     --hairline: #23252a;
     --accent: #5e6ad2;
     --text-primary: #f7f8f8;
     --text-muted: #8a8f98;
   }
   ```
4. Build components strictly adhering to the hairline borders, radius tokens, and elevation patterns specified.

