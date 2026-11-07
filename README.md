# CEdMA Spinny Wheel

A CEdMA Enterprise branded spin wheel for picking topics, speakers, or prize winners at CEdMA events. It runs entirely in the browser with no build step and no server-side code.

## Using it

Open `index.html` in a browser, or serve the folder from any static web host (GitHub Pages works). Then:

- Edit, add, or remove options in the Options panel. Pasting a list adds one option per line.
- Press **Spin** (or the space bar) to spin the wheel.
- Use **Remove from wheel** after a spin to take the result out of the next draw.
- Open **Spin history** to see earlier results for the session.
- Use the full screen button in the header when presenting.

Options are saved in the browser, so they are still there the next time the page is opened on the same machine. Spin history is kept for the current session only.

The page follows the device's light or dark mode setting automatically.

## Files

| Path | Contents |
| --- | --- |
| `index.html` | Page structure |
| `css/styles.css` | Styles, including the light and dark theme tokens |
| `js/wheel.js` | Wheel drawing, spinning, options, and history |
| `images/` | CEdMA Enterprise logo and logomark (color and color dark versions) |

Fonts (Albert Sans, Cormorant Garamond, and DM Mono) load from Google Fonts. Without an internet connection the page falls back to system fonts.

## Brand

Colors, typography, and logo usage follow the CEdMA Enterprise Brand Guidelines v2.2.
