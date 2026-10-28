# VistaTrans + Stream — interactive deck

Web version of `Vista_Trans.pdf` (November 2026). The text is the same as the
PDF; only the motion and interaction are new. Plain HTML, CSS and JS, with no
build step and no dependencies.

## Slides

1. Cover
2. Logistics Specialists (team and clients)
3. Your Real Estate Partner: **Investment Management** and **Development** in
   the service list open as popouts
4. Understanding Your Business: VistaTrans building profiles (Huntley,
   Grapevine, Norcross, Etobicoke). The table shows only the facts
   highlighted in `Vista_Trans_Building_Profiles_Updated.docx`, under a
   photo of each building (`assets/img/huntley-aerial.jpg`, `grapevine.jpg`,
   `norcross.jpg`, `etobicoke.jpg`; drop a new file over one to replace it).
5. Capital Structure Flexibility
6. Thank You (phone numbers and emails are live links)

The popouts are the PDF's pages 4 (Investment Management Services) and 5
(Development Services). They sit over About Stream instead of in the slide
order.

## Presenting

| Action | Keys / gestures |
|---|---|
| Next / previous slide | → ← (also ↓ ↑, Space, PageDown/PageUp), swipe, or the controls bottom right |
| First / last | Home / End |
| Full screen | F, or ⤢ in the controls |
| Open a popout | click Investment Management or Development on slide 3 |
| Switch popouts | ← → or the side arrow while one is open |
| Close a popout | Esc, ×, or click outside it |

Each slide and popout has its own link, e.g. `…/#about-stream` or
`…/#development`, which opens the deck straight there.

## Hosting on Netlify

Create a new site from this repository and set **Base directory** to
`vista-trans`. Netlify picks up `vista-trans/netlify.toml` (no build, publish
the folder as-is). Leave the existing 357 Green site alone; it builds from the
repo root.

## One-file version

```sh
python3 tools/build_single.py
```

writes `VistaTrans-Stream.html`, with every image and font inlined (about
4 MB). It opens with a double-click, needs no internet, and can be emailed.

## Files

- `index.html`: all slides. Positions are 1920×1080 stage pixels taken from
  the PDF.
- `deck.css`: layout, entrance motion, and the design layer (slide wipe,
  progress line, hover states).
- `deck.js`: scaling, navigation, popouts, count-ups, and the Continuum of
  Service route.
- `assets/img`: photos and logos extracted from the PDF at full resolution.
- `assets/fonts`: Inter Tight (headings), Nunito Sans and Open Sans. These
  are open-source stand-ins for the PDF's heading face and match its body
  fonts.
