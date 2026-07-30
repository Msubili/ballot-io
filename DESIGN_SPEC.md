# Design Specification
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026  
**Type:** UI/UX Design Specification

---

## 1. Design Principles

Ballot.io's interface is guided by four principles drawn from established HCI research (Nielsen, 1994; Bederson et al., 2003):

1. **Clarity over cleverness** — Every element has a single unambiguous purpose. No decorative complexity.
2. **Minimal cognitive load** — Critical actions (vote, create poll) require the fewest possible steps.
3. **Transparency** — System status (poll open/closed, vote recorded) is always visible without the user having to query it.
4. **Accessibility by default** — Design decisions are WCAG 2.1 Level AA compliant from the start, not retrofitted.

---

## 2. Design Tokens

### 2.1 Colour Palette

```css
/* Primary Brand */
--color-primary-50:   #EEF2FF;
--color-primary-100:  #E0E7FF;
--color-primary-500:  #6366F1;   /* Primary action (buttons, links) */
--color-primary-600:  #4F46E5;   /* Hover state */
--color-primary-700:  #4338CA;   /* Active/pressed state */
--color-primary-900:  #1E1B4B;   /* Dark text on light bg */

/* Neutrals */
--color-gray-50:      #F9FAFB;   /* Page background */
--color-gray-100:     #F3F4F6;   /* Card backgrounds */
--color-gray-200:     #E5E7EB;   /* Borders */
--color-gray-500:     #6B7280;   /* Muted / helper text */
--color-gray-700:     #374151;   /* Body text */
--color-gray-900:     #111827;   /* Headings */

/* Status Colours */
--color-live:         #10B981;   /* Green — Live polls */
--color-live-bg:      #D1FAE5;
--color-upcoming:     #F59E0B;   /* Amber — Upcoming polls */
--color-upcoming-bg:  #FEF3C7;
--color-closed:       #6B7280;   /* Gray — Closed polls */
--color-closed-bg:    #F3F4F6;

/* Semantic */
--color-success:      #10B981;
--color-success-bg:   #D1FAE5;
--color-error:        #EF4444;
--color-error-bg:     #FEE2E2;
--color-warning:      #F59E0B;
--color-warning-bg:   #FEF3C7;

/* Winner Highlight */
--color-winner:       #6366F1;
--color-winner-bg:    #EEF2FF;
```

### 2.2 Typography

```css
/* Font stack */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;  /* code only */

/* Scale */
--text-xs:   0.75rem;   /* 12px — labels, badges */
--text-sm:   0.875rem;  /* 14px — helper text, captions */
--text-base: 1rem;      /* 16px — body text */
--text-lg:   1.125rem;  /* 18px — card titles */
--text-xl:   1.25rem;   /* 20px — section headings */
--text-2xl:  1.5rem;    /* 24px — page headings */
--text-3xl:  1.875rem;  /* 30px — hero headings */

/* Weights */
--weight-normal:   400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
```

### 2.3 Spacing (8px base grid)
```css
--space-1:  0.25rem;   /*  4px */
--space-2:  0.5rem;    /*  8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

### 2.4 Border Radius
```css
--radius-sm: 0.375rem;   /*  6px — inputs, small elements */
--radius-md: 0.5rem;     /*  8px — cards, buttons */
--radius-lg: 0.75rem;    /* 12px — modals */
--radius-xl: 1rem;       /* 16px — hero sections */
--radius-full: 9999px;   /* pill — badges, tags */
```

### 2.5 Shadows
```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
```

---

## 3. Component Library

### 3.1 Button

**Variants:** Primary, Secondary, Ghost, Danger  
**Sizes:** sm, md (default), lg

```
[Primary]   Filled indigo background, white text, rounded-md
[Secondary] White background, indigo border and text
[Ghost]     Transparent background, gray text, hover bg-gray-100
[Danger]    Red background, white text — delete actions only
```

All buttons:
- Min touch target: 44 × 44px (WCAG 2.5.5)
- Focus ring: 2px indigo outline offset 2px
- Disabled state: 50% opacity, `cursor-not-allowed`
- Loading state: spinner icon replaces label; button disabled

### 3.2 Input Field

```
Label (sm, semibold, gray-700)
┌──────────────────────────────┐
│ Placeholder text...          │  ← border-gray-200, focus:border-primary-500
└──────────────────────────────┘
Helper text (xs, gray-500)
Error text (xs, error-red, error icon)
```

- Height: 40px (md), 32px (sm), 48px (lg)
- Border: 1px solid gray-200, radius-sm
- Focus: ring-2 ring-primary-500 border-primary-500
- Error: border-error, ring-error, red helper text

### 3.3 Badge / Status Tag

Poll status displayed as a pill badge:
```
[● Live]     bg-live-bg, text-live, green dot
[● Upcoming] bg-upcoming-bg, text-upcoming, amber dot
[● Closed]   bg-closed-bg, text-closed, gray dot
```

Category badge: outlined, no fill, border-gray-200, text-gray-600

### 3.4 Poll Card

```
┌─────────────────────────────────────────┐
│  [Election] [● Live]               ⋮    │  ← category badge, status badge, menu
│                                         │
│  Student Council President 2025         │  ← title, text-lg, font-semibold
│  Vote for your preferred candidate...   │  ← description, text-sm, text-gray-500
│                                         │
│  1,248 votes  ·  Closes 30 Jul 2026    │  ← meta, text-xs
│                                         │
│             [Vote Now →]                │  ← Primary CTA (disabled if not Live)
└─────────────────────────────────────────┘
```

- Card: bg-white, rounded-md, shadow-sm, border border-gray-100
- Hover: shadow-md, border-primary-100 (subtle lift)
- Padding: space-6

### 3.5 Results Bar

```
Option A   ████████████████████░░░░░░░░  64%  (800 votes)
Option B   ████████░░░░░░░░░░░░░░░░░░░░  28%  (350 votes)
Option C   ███░░░░░░░░░░░░░░░░░░░░░░░░░   8%  (98 votes)
```

- Bar: bg-primary-500 (winner), bg-gray-200 (others), height 8px, radius-full
- Winner row: bg-winner-bg, left border 3px solid winner-color, bold label
- Values: right-aligned, text-sm, monospace

### 3.6 Modal (Confirmation Dialog)

Used for poll deletion:
```
┌──────────────────────────────────────┐
│  ⚠  Delete Poll                  ✕  │
│                                      │
│  Are you sure you want to delete     │
│  "Student Council President 2025"?   │
│  This will remove all 1,248 votes.   │
│  This action cannot be undone.       │
│                                      │
│        [Cancel]   [Delete Poll]      │
└──────────────────────────────────────┘
```

- Backdrop: rgba(0,0,0,0.5)
- Modal: bg-white, rounded-lg, shadow-lg, max-width 440px
- Delete button: Danger variant

### 3.7 KPI Stat Card (Admin)

```
┌──────────────────────┐
│  🗳️  Total Polls     │
│                      │
│         24           │  ← text-3xl, font-bold, primary
│   across 4 categories│  ← text-xs, gray-500
└──────────────────────┘
```

---

## 4. Page Layouts

### 4.1 Navigation Bar
```
┌────────────────────────────────────────────────────────────┐
│  🗳 Ballot.io   [Polls]  [Create Poll]  [Admin]  [logout]  │
└────────────────────────────────────────────────────────────┘
```
- Height: 64px, bg-white, border-b border-gray-200, shadow-sm
- Logo: icon + wordmark, links to /polls when authenticated
- Active link: text-primary-600, border-b-2 border-primary-500
- Mobile: hamburger menu at ≤ 768px

### 4.2 Home / Polls Page
```
┌──────────────────────────────────────────────────────┐
│  NAV                                                  │
├──────────────────────────────────────────────────────┤
│  Active Polls                      [+ Create Poll]   │
│  [All] [Election] [Community] [Corporate] [General]  │  ← filter tabs
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Poll Card│  │ Poll Card│  │ Poll Card│           │  ← 3-col grid (lg), 2-col (md), 1-col (sm)
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

### 4.3 Vote Page
```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│  ← Back to Polls                        │
│                                         │
│  Student Council President 2025         │  ← h1
│  [● Live]  [Election]  1,248 votes      │
│  Closes 30 July 2026 at 23:59           │
│                                         │
│  ○  Alice Mwangi                        │  ← radio options, large touch target
│  ○  Brian Ochieng                       │
│  ○  Carol Njeri                         │
│                                         │
│         [Cast My Vote]                  │  ← disabled until selection made
└─────────────────────────────────────────┘
```

Vote option rows:
- Height: 56px min
- Selected: bg-primary-50, border-primary-500, indigo fill on radio
- Hover: bg-gray-50

### 4.4 Results Page
```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│  Results: Student Council 2025          │
│  [● Closed]  Total: 1,248 votes        │
│                                         │
│  🏆 Alice Mwangi — WINNER              │  ← winner banner (if closed)
│                                         │
│  Alice Mwangi   ████████████  58%      │
│  Brian Ochieng  ██████░░░░░░  32%      │
│  Carol Njeri    ███░░░░░░░░░  10%      │
│                                         │
│  Live since 25 Jul · Closed 30 Jul     │
└─────────────────────────────────────────┘
```

### 4.5 Admin Dashboard
```
┌─────────────────────────────────────────────────────┐
│  NAV                                                 │
├─────────────────────────────────────────────────────┤
│  Admin Dashboard              [+ New Poll]           │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │24 Polls  │ │3 Live    │ │8,123 Votes│ │12 Done│ │  ← KPI cards
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                      │
│  All Polls                     [Search polls...]     │
│  ┌──────────────────────────────────────────────┐    │
│  │ Title          │ Category │ Status │ Votes │ ☰ │  │  ← table
│  │ Student…       │ Election │ Live   │ 1,248 │ … │  │
│  │ Budget Vote    │ Community│ Closed │ 4,782 │ … │  │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

Row action menu (⋮): View Results / Vote / Delete

### 4.6 Login / Register Pages

Centred single-column card, max-width 420px:
```
┌─────────────────────────┐
│   🗳 Ballot.io          │
│                         │
│   Sign in to continue   │
│                         │
│   Email                 │
│   ┌─────────────────┐   │
│   └─────────────────┘   │
│   Password              │
│   ┌─────────────────┐   │
│   └─────────────────┘   │
│                         │
│   [Sign In]             │
│                         │
│   Don't have an account?│
│   [Create one →]        │
└─────────────────────────┘
```

---

## 5. Responsive Breakpoints

| Name | Min Width | Layout |
|---|---|---|
| Mobile | 320px | 1-column; stacked nav |
| Tablet | 768px | 2-column poll grid; hamburger nav |
| Desktop | 1024px | 3-column poll grid; full nav |
| Wide | 1280px | Max content width 1200px, centered |

---

## 6. Motion & Animation

- **Preference:** `prefers-reduced-motion: reduce` disables all transitions.
- **Page transitions:** fade-in 150ms ease-out.
- **Poll card hover:** box-shadow transition 150ms ease.
- **Result bars:** width animates from 0% to target on mount (400ms ease-out). Disabled if reduced-motion.
- **Modal:** scale 95%→100% + opacity 0→1, 200ms ease-out.
- **Toast notifications:** slide-in from bottom-right, auto-dismiss 4s.

---

## 7. Accessibility Requirements

| Rule | Implementation |
|---|---|
| Colour contrast ≥ 4.5:1 (normal text) | All text combinations verified with Colour Contrast Analyzer |
| Keyboard navigation | All interactive elements reachable via Tab; focus visible at all times |
| Screen reader support | `aria-label` on all icon-only buttons; `role="status"` on live vote counts |
| Error identification | Errors not conveyed by colour alone; icon + text always |
| Vote options | `<fieldset>` + `<legend>` groups radio inputs with poll question |
| Skip link | "Skip to main content" as first focusable element |
| Loading states | `aria-busy="true"` on containers while fetching |

---

## 8. Empty & Error States

Every list view has a designed empty state:
```
         🗳️
   No polls yet.
   Create the first poll to get started.
        [+ Create Poll]
```

Error states:
- Network error: "Couldn't load polls. Check your connection and try again. [Retry]"
- 403 Forbidden: "You don't have permission to view this page."
- 404 Not Found: "This poll doesn't exist or has been removed. [Back to Polls]"

---

## 9. Iconography

Icon library: **Lucide React** (consistent stroke weight, MIT licence)

| Context | Icon |
|---|---|
| Vote / ballot | `Vote` |
| Poll / survey | `ClipboardList` |
| Create | `Plus`, `PlusCircle` |
| Delete | `Trash2` |
| Results / chart | `BarChart2` |
| Admin | `ShieldCheck` |
| Live status dot | `Circle` (filled, green) |
| Winner | `Trophy` |
| Warning | `AlertTriangle` |
| Close / dismiss | `X` |
| User | `User` |
| Logout | `LogOut` |
