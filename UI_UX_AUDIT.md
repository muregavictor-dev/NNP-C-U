# NNP Christian Union — UI/UX audit and modernization plan

**Scope:** frontend presentation, usability, responsive behavior and consistency only. Bootstrap 5 is retained. Existing form destinations, JavaScript behavior, API calls and database/backend integrations are outside scope and were not changed.

## Executive summary

The site has a clear Christian Union identity, real campus photography, useful ministry information, and a rich set of member-facing features. The main design problem is not a lack of features; it is the accumulation of page-specific styles and duplicate patterns. Multiple greens and golds, gradients, shadows, heading scales, component radii and spacing rules compete with one another. Some shared components are injected dynamically, while individual pages maintain their own styles, so the experience changes noticeably between routes.

A shared modernization layer is now loaded through the existing footer component. It establishes a restrained green-and-gold palette, shared typography, card and form treatments, responsive rules, visible keyboard focus and reduced-motion behavior without replacing Bootstrap or adding a dependency. The footer has also been simplified and restyled while retaining its links, contact information and attribution.

## Page-by-page audit

### `index.html` — Home
- **Strengths:** clear ministry purpose and tagline; substantial useful content; event, weekly schedule, live worship, sermon, gallery, contact and membership paths; real photography and a skip link.
- **Weaknesses / inconsistencies:** many inline styles compete with the shared stylesheet; oversized hero and mixed alignment; gold/green panels and gradients are used inconsistently; desktop event cards and a separate mobile carousel duplicate content and can drift apart; dense schedule information and multiple calls to action make scanning harder.
- **Type / responsive / usability:** headline sizing and alignment are not consistently controlled; the hero height and cards consume considerable mobile space; schedule content changes format by breakpoint; several interactive controls and labels should be checked for keyboard and screen-reader clarity.
- **Opportunity:** use a consistent editorial hero, prioritize “Join”, “This week” and “Watch” actions, make the schedule scannable, and keep the same event data presentation across viewports.

### `header.html` — Shared navigation and membership dialog
- **Strengths:** Bootstrap navigation/offcanvas, membership entry point, notification panel, labeled controls and a clear brand tagline.
- **Weaknesses / inconsistencies:** the header contains a large page-style block and global resets; styles overlap with the landing-page CSS; brand colors differ across files; notification and membership controls compete visually with navigation.
- **Type / responsive / usability:** mobile drawer is a useful pattern, but links and actions need a more consistent hierarchy and comfortable touch targets; active route indication is hard-coded to Home.
- **Opportunity:** retain the current Bootstrap/offcanvas and submission behavior while standardizing navigation spacing, active-route treatment, button hierarchy and focus states.

### `footer.html` — Shared footer
- **Strengths:** useful site links, contact details, social links and attribution are present.
- **Weaknesses / inconsistencies:** embedded styles duplicate Bootstrap grid behavior and global colors; duplicate year-update scripts; overly dark styling and inconsistent link destinations/labels relative to the actual pages.
- **Typography / responsive / usability:** small text contrast and dense link groups are difficult to scan; social icons need consistent spacing and touch areas.
- **Opportunity:** calmer forest-green footer, clear column headings, readable secondary text and a single compact copyright line. Existing destinations are preserved pending content-owner review.

### `contact.html` — Contact
- **Strengths:** clear contact channels, prayer/support purpose, labeled message fields, success/error feedback, and a Formspree submission path.
- **Weaknesses / inconsistencies:** duplicated attributes and duplicate Font Awesome inclusion; bright gold hero and an independently defined palette depart from the rest of the site; inline styling makes consistency difficult.
- **Typography / responsive / usability:** cards and form fields are understandable; improve heading hierarchy, consistent control sizing and focus visibility; ensure long contact details wrap on narrow screens.
- **Opportunity:** shared hero, quieter contact cards and a clear form panel. Form action, method and submission processing were left intact.

### `gallery.html` — Gallery
- **Strengths:** albums, category filters, lazy-loaded imagery, loading/empty states, a lightbox and sermon videos provide useful discovery.
- **Weaknesses / inconsistencies:** substantial unused/duplicate gallery styles remain; second palette declarations conflict; filters use a sticky bar and image overlays that depend heavily on hover; gallery content depends on GitHub API folder loading.
- **Typography / responsive / usability:** hover-only captions and controls are not reliable on touch; filter labels and category data should be kept aligned; image alt text, lightbox keyboard controls and loading/error messaging deserve a focused accessibility pass.
- **Opportunity:** consistent image ratios and cards, persistent captions, accessible filter states, and a clear gallery-loading error state. Gallery data source and behavior are unchanged.

### `library.html` — Library
- **Strengths:** a broad resource catalogue, search, scripture lookup, dictionary, suggestions and borrow-request dialog; native `details` elements are a good progressive disclosure pattern.
- **Weaknesses / inconsistencies:** a large embedded stylesheet defines a separate palette and dark-mode appearance; generic Bootstrap class names are overridden; `.modal` is manually reimplemented in CSS, risking conflict with Bootstrap's modal model; clickable cards use inline handlers rather than button/link semantics.
- **Typography / responsive / usability:** catalogue rows can become cramped on phones; the custom modal needs a later accessibility and focus-management review; search result feedback and loading states should remain visually distinct.
- **Opportunity:** align resource cards and form controls with the shared system; progressively migrate custom modal treatment to Bootstrap only after verifying its current interactions. Modal behavior and booking form are preserved in this pass.

### `ministry.html` — Ministries and groups
- **Strengths:** detailed team descriptions, leaders and meeting information; clear enrollment form; useful section anchors and Bootstrap grid.
- **Weaknesses / inconsistencies:** malformed CSS comment, broad reset and overflow clipping; animated gradient buttons, rotating icons and progress effects add visual noise; stats are hard-coded; footer is placed after `</body>`; page-specific and shared styles duplicate rules.
- **Typography / responsive / usability:** card content is information-dense; hover movement is unnecessary on touch; enrollment controls need consistent focus treatment and scannable spacing.
- **Opportunity:** calm cards, clear team categories and concise enrollment CTA. Enrollment endpoint and processing behavior were not changed.

### `styles.css` and `unified style.css`
- **Strengths:** a useful starting set of tokens and reusable styles for buttons, hero, schedule, gallery and chat.
- **Weaknesses:** the two stylesheets diverge; repeated declarations and conflicting palette values; `styles.css` includes malformed/escaped CSS fragments and global container/row overrides that can interfere with Bootstrap; `unified style.css` contains stale component rules, a red schedule row and duplicate page-specific CSS.
- **Opportunity:** treat `modernization.css` as the presentational token/override layer, then consolidate the legacy stylesheets after page-by-page visual regression and interaction testing. Legacy files were not removed in this pass.

### `floating-widgets.html` and frontend JavaScript
- **Strengths:** clear widget labels, chat and WhatsApp shortcuts, reusable membership and lightbox concepts; JavaScript includes helpful validation and success/error feedback patterns.
- **Weaknesses / inconsistencies:** two floating-widget implementations/styles appear in the codebase; overlapping z-index and positioning rules can cause collisions; animation and loading patterns vary. The home-page chat code includes a client-side API credential and inline HTML injection patterns that merit a separate security review, not a presentation-only change.
- **Opportunity:** standardize touch targets, safe-area spacing, widget stacking, reduced motion and keyboard behavior. No endpoints, handlers, form logic or credentials were changed in this UI task.

## Unified design system

- **Brand:** Forest `#174B2B`, primary green `#28743D`, bright green reserved for existing brand use, muted gold `#D3A62D`, soft gold `#F3E7C2`. Use gold as an accent, not as a large text background. Ink `#1D2921`, muted text `#647168`, paper `#FBFAF6`, white surfaces, border `#E4E9E3`.
- **Typography:** Inter with system sans-serif fallbacks; responsive `clamp()` heading scale; body line-height near 1.7; readable line lengths and consistent heading weights.
- **Layout:** Bootstrap grid remains authoritative; shared content width around 1200px; consistent section rhythm; mobile-first gutters and flexible card grids; preserve intrinsic media ratios and allow long content to wrap.
- **Components:** 16px card radius, light green-gray borders, restrained shadows, small hover lift, unified form control height and focus ring, green primary action and gold secondary/accent action.
- **Interaction/accessibility:** visible `:focus-visible`, reduced-motion preference, touch-friendly fixed controls and persistent gallery captions. Preserve Bootstrap and existing interaction mechanisms.

## Modernization roadmap

1. **Foundation — done in this commit:** add shared tokens and presentation overrides; align page surfaces, typography, navigation, cards, buttons, forms, gallery filters, floating controls and footer; add an audit and roadmap.
2. **Responsive/content pass:** review each route at 360px, 768px, 1024px and desktop; remove duplicated mobile/desktop event content after confirming event details; verify no horizontal overflow; shorten and group long content without deleting it.
3. **Accessibility/interactions:** keyboard-test offcanvas, dialogs, gallery lightbox, filters, forms and chat; improve labels, focus return, live-region status and image alternatives; verify reduced-motion behavior with actual widgets.
4. **Cleanup and validation:** consolidate `styles.css`, `unified style.css` and embedded page CSS only after visual regression; run HTML/CSS validation and test all form submissions, integrations and dynamic component loading on staging.
5. **Release:** preview deployment on mobile and desktop, verify production forms/endpoints and image loading, then publish through the configured hosting provider.

## Scope and verification notes

This change is limited to CSS and shared footer presentation/content structure. It does not replace Bootstrap, add a dependency, modify backend code, alter API endpoints, change form destinations or rewrite JavaScript handlers. Dynamic component loading and visual behavior should still be verified in the hosted site: no browser/device test runner or Vercel deployment control is available in this GitHub session.
