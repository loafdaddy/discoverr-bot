# Discoverr brand

Visual direction: dark, calm, teal accent — discovery and media signal, with an original mark for Discoverr. Sibling feel to Cadence (dark + accent period), distinct palette.

| File | Use |
|------|-----|
| `discoverr-mark.svg` | Icon / Discord bot avatar / favicon-style mark |
| `discoverr-lockup.svg` | README and marketing (“Discoverr.”) |

## Palette

| Token | Hex | Role |
|-------|-----|------|
| Accent | `#4FD1C5` | Period, radar strokes, highlights |
| Accent soft | `#9AF0E8` | Spark / lighter beam |
| Deep | `#0C1C28` | Mark background mid-stop |
| Deep top | `#163247` | Mark background highlight |
| Deep bottom | `#061018` | Mark background shadow |
| Soft text | `#E8F6F5` | Wordmark |

Wordmark ends with a teal period tucked against the final letter (not floating).

## Typography

Lockup wordmark is **Cantarell Extra Bold** (GNOME’s classic UI face), outlined as SVG paths so GitHub and other hosts render the same weight without needing the font installed.

The teal period is placed optically tight against the final letter (aligned to the stem at x-height, not the full glyph bounding box).

Fallback stack if you re-edit as live text: `Cantarell Extra Bold, Cantarell, Adwaita Sans, Inter, Segoe UI, Ubuntu, system-ui, sans-serif` at weight **800**.

## Usage notes

- Prefer the **lockup** in README heroes and marketing.
- Prefer the **mark** alone for Discord bot avatar, small UI chrome, and square crops.
- Do not recolor the accent to purple (reserved for Cadence sibling branding).
- Export PNG from the SVG if a host does not accept SVG uploads.
