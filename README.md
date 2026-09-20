# Hussain Raza — Portfolio

A static portfolio built with HTML, CSS and vanilla JavaScript. No framework, build step, animation library, analytics or backend.

## Open the website

Extract the download and open `index.html` in a modern browser. For hosting, upload `index.html`, `styles.css`, `script.js` and the `assets` folder together to any static host. All assets and fonts are local.

## Included

- Hero with code typing, portrait entrance and independent scroll-driven Y-axis rotations into About.
- Four experience entries with a reversible timeline. The removed employer is excluded.
- Five skills in the requested order, typed headings, content reveals and vertical stacking.
- Seven projects in the requested order, horizontal transitions, interactive numbering and linked images.
- Three services with a stationary section header and footer and vertical content transitions.
- Contact reveal, `start_conversation()` typing and a pressable Enter-style WhatsApp link.
- Sticky navigation, mobile menu, keyboard controls, visible focus states and reduced-motion support.

All six contact links use `https://wa.me/923234591047`. External projects open in a new tab.

## Assets and reference fidelity

The supplied ZIP contained raster mockups and a portrait, without editable design layers or original font files. Artwork, project previews, logos and the portrait shown in the mockups are extracted from those supplied designs and optimized as WebP. The supplied original portrait is also included as `assets/hussain-raza.webp` and delivered separately as its original PNG. Facial features have not been generated or retouched.

Text is real HTML. Inter is the closest matched heading/body font; system Consolas is used for code. The exact original font cannot be verified from raster images. Responsive layouts adapt the desktop references to smaller displays.

Pinned scenes use native scrolling, passive listeners and requestAnimationFrame. On viewports shorter than 660px, and for reduced-motion preferences, sections use a readable linear layout. The mobile Hero/About layout also uses natural scrolling to keep all text accessible. No wheel or touch events are blocked. The Y-axis portrait effect rotates the image plane; no fabricated reverse-side portrait is used.

## Edit

- Content, links and section order: `index.html`
- Colors, sizing and responsive styles: `styles.css`
- Animation timing and scroll distances: `script.js`

## Verification

Validated in Chromium/Edge at 1586×992, 1440×900, 1366×768, 768×1024, 390×844, 320×740 and 920×480. Checked reverse scrolling, all 15 deck panels, image loading, exact link destinations, keyboard navigation, mobile menu, reduced motion and a JavaScript-disabled fallback. External destination availability was not verified. Performance depends on the visitor's device and hosting.
