# RoboMemo project page

Project page for **RoboMemo: Personalized Robot Manipulation from Everyday Smart-Glasses Recordings**.
It's plain HTML, CSS and JS with no build step, built on the Bulma layout used by
[Nerfies](https://github.com/nerfies/nerfies.github.io) and the
[Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template).

Once published, it is served at **https://xinleiyuleo.com/robomemo/**. The custom domain on
`XinleiYu-Leo.github.io` applies to every project repo automatically.

## Preview locally

Serve this folder, not the personal site repo next to it:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 -d /Users/leo/Documents/NativeWebSocket/robomemo
```

Then open http://localhost:8000/. To preview at the same `/robomemo/` path as the live site, serve
the parent folder (`-d /Users/leo/Documents/NativeWebSocket`) and open
http://localhost:8000/robomemo/ instead.

Python's server doesn't support byte-range requests, so seeking
inside a video can misbehave locally. GitHub Pages supports range requests, so this only affects
local previews.

## Page layout

| Section | Content |
|---|---|
| Hero | Title, authors, affiliations with logos, link buttons |
| Top | TL;DR in large type, four headline numbers from the paper, then the full supplementary video (with narration) |
| Abstract | Verbatim from the paper |
| Overview | Fig. 1 |
| Key findings | Three takeaways |
| Capture | Four looping first-person clips from the smart-glasses recordings, one per object pair |
| System | Fig. 2, the three stages, a Personal Context Store example, the verification states |
| Demos | Tabs with synced side-by-side clips: RoboMemo (C2) vs No Context (C0) |
| Results | Tabs for Tables IV, V, II and I, then Fig. 3 |
| FAQ | Answers taken from the paper |
| BibTeX | Placeholder `@misc` entry until the arXiv ID exists |

Still to do: `grep -n TODO index.html` lists them (Paper, arXiv and Code links, and the BibTeX entry).
To activate a link button, add `href="..."`, then remove `class="is-pending"` and `aria-disabled="true"`.
Once all three links are live, delete the "Paper, arXiv and code coming soon." line under the buttons.

## Assets

```
static/images/fig1-overview.webp        Fig. 1, extracted from the PDF at native resolution
static/images/fig2-architecture.webp    Fig. 2
static/images/fig3-qualitative.webp     Fig. 3
static/images/capture-glasses.webp      crop of Fig. 1A (smart glasses + film strip)
static/images/store-sunglasses.webp     crop of Fig. 1A (context store entry)
static/images/store-mug.webp            crop of Fig. 1A (context store entry)
static/images/logos/*.svg               affiliation logos from Wikimedia Commons
static/images/og-card.png               1200x630 social preview card
static/images/posters/*.webp            first frame of each video
static/videos/robomemo-supplementary.mp4    the full supplementary video (see below)
static/videos/capture/{mug,notebook,sunglasses,pouch}.mp4   smart-glasses clips for the Capture section
static/videos/demos/exp{1,2,3}-*-{robomemo,nocontext}.mp4
```

### How the demo clips were cut

Each clip is one panel cropped out of the supplementary video (1280x720), scaled to 640x360,
H.264 CRF 25, no audio. The two clips of a pair share the same time range so they stay in sync.
To re-cut a clip, use Homebrew's ffmpeg (the Anaconda build has no libx264):

```bash
ffmpeg -ss START -to END -i SUPPLEMENTARY_SOURCE.mp4 -vf "crop=W:H:X:Y,scale=640:360:flags=lanczos,setsar=1,fps=30" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -an -movflags +faststart OUT.mp4
```

| Clip | Time range (s) | RoboMemo crop `W:H:X:Y` | No Context crop `W:H:X:Y` |
|---|---|---|---|
| exp1 sunglasses | 16.05 – 47.3 | `554:308:73:143` | `554:308:687:143` |
| exp2 tea can | 52.05 – 80.3 | `568:318:65:141` | `566:316:681:139` |
| exp3 mug | 90.8 – 173.6 | `568:318:64:137` | `568:318:679:137` |

The start times skip the screen-recorder play bar that shows for the first second of each
experiment, and the crops sit inside the green and red panel borders.

### The supplementary video

`robomemo-supplementary.mp4` is the source video re-encoded once (H.264 CRF 21, audio copied,
metadata stripped) so that a label box under the title on the opening card could be blanked out.
The opening card switches layout at frame 365, so it takes two `delogo` regions:

```bash
ffmpeg -i SUPPLEMENTARY_SOURCE.mp4 -vf "delogo=x=464:y=247:w=386:h=57:enable='lt(n,365)',delogo=x=470:y=257:w=377:h=56:enable='between(n,365,390)'" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -c:a copy -map_metadata -1 -movflags +faststart robomemo-supplementary.mp4
```

Regenerate `static/images/posters/supplementary.webp` from its first frame after any re-encode.

### How the capture clips were cut

Each clip comes from one of the smart-glasses session recordings (960x720). The crop
`960:540:0:150` keeps a 16:9 band below the recorder's status and timestamp overlay, which sits in
the top-left 258x138 px. Clips are scaled to 640x360, H.264 CRF 26, no audio.

```bash
ffmpeg -ss START -to END -i session_N.mp4 -vf "crop=960:540:0:150,scale=640:360:flags=lanczos,fps=30,setsar=1" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -an -map_metadata -1 -movflags +faststart OUT.mp4
```

| Clip | Session | Time range (s) |
|---|---|---|
| mug | 1 | 70.0 – 78.0 |
| notebook | 4 | 46.0 – 52.0 |
| sunglasses | 3 | 120.5 – 128.5 |
| pouch | 4 | 99.5 – 107.5 |

Posters are the first frame of each clip.

### Demo playback

Videos in a `[data-sync]` block play and pause together when scrolled into view, and the right
clip is kept within 0.3 s of the left one. Videos in hidden tabs don't load until their tab is
opened. Visitors with reduced motion turned on get playback controls instead of autoplay.

## Publish on GitHub Pages

1. Create a public repo named **`robomemo`** under `XinleiYu-Leo` (lowercase: Pages URLs are
   case-sensitive).
2. Push this folder:
   ```bash
   git add -A && git commit -m "Add RoboMemo project page"
   git remote add origin https://github.com/XinleiYu-Leo/robomemo.git
   git push -u origin main
   ```
3. In the repo, open **Settings → Pages**, set **Source** to *Deploy from a branch*, then pick
   `main` and `/ (root)`.
4. After a minute or two the page is live at https://xinleiyuleo.com/robomemo/.

`.nojekyll` tells GitHub Pages to serve the files as they are, without running Jekyll.
The whole site is about 20 MB, most of it the 14.7 MB supplementary video.

## Credits

Layout adapted from Nerfies and the Academic Project Page Template, which are licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Keep the footer credit.
Affiliation logos are trademarks of their respective owners.
