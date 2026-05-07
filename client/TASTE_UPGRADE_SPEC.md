# Taste-Skill Frontend Upgrade Spec

## Current State
React 18 + Vite 5 + TypeScript. No Tailwind. Custom CSS with light theme (navy/gold on white bg). Components: App, Header, ProfileCard, ChatPanel, MessageBubble. Chat via WebSocket.

## Taste-Skill Rules to Apply (from taste-skill-anti-slop.md)

### CRITICAL (Must Apply)
1. `min-h-[100dvh]` NOT `100vh` — prevent mobile browser layout jumping
2. `font-variant-numeric: tabular-nums` on body + all number displays
3. Hover states on ALL interactive elements with `translateY(-1px)` for buttons, `translateY(-2px)` for cards
4. Active/pressed feedback: `scale(0.98)` on `:active` with 80ms duration
5. Focus-visible rings: `box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent)`
6. Smooth transitions: `cubic-bezier(0.16, 1, 0.3, 1)` as `--ease-out-expo`
7. Tinted shadows: replace generic rgba(0,0,0,X) with background-tinted values
8. Inner border highlights on cards: `border: 1px solid rgba(255,255,255,0.04)`
9. Noise grain overlay: SVG filter as body::before at 2-3% opacity
10. `text-wrap: balance` on headlines
11. Skeleton shimmer loading instead of spinners
12. Composed empty states (not just "Type a message")

### Color Palette Upgrade
- Switch to DARK theme (Zinc/Slate base)
- Replace navy/gold with single high-contrast accent (Emerald or Electric Blue)
- NO purple/blue AI aesthetic — banned by taste-skill

### Typography
- Replace system font stack with 'Geist' or 'Inter' for UI
- Add letter-spacing: -0.02em on headers
- max-width: 65ch on body text blocks

### Layout
- Avoid centered hero/welcome — use left-aligned layout
- CSS Grid over flex math
- No generic card containers unless elevation needed

### States (MANDATORY)
- Loading: skeletal loaders matching layout sizes
- Empty: beautifully composed empty state with guidance
- Error: clear inline error reporting
- Tactile: active press feedback on all buttons

### New Feature: Knowledge Base Indicator
- Add a small badge/indicator in the header showing KB status: "49 schools + 57 insights loaded"
- Add a subtle indicator on messages that use KB context vs web search

## Files to Modify
- client/src/styles/index.css — full taste-skill rewrite
- client/src/App.tsx — dark theme, layout adjustments
- client/src/components/Header.tsx — KB indicator
- client/src/components/ChatPanel.tsx — UX improvements
- client/src/components/ProfileCard.tsx — form polish
- client/src/components/MessageBubble.tsx — markdown polish
- client/index.html — add Geist font link

## Do NOT
- Install Tailwind CSS (keep custom CSS with taste-skill variables)
- Change the WebSocket/API contract
- Remove existing functionality
- Add emojis (banned by taste-skill)

## Verification
After changes, the UI should feel premium, dark-themed, with smooth animations, proper hover/active states, and clear KB integration indicators.
