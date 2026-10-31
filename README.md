# Pravin Anbalagan — portfolio

A static, dependency-free portfolio: plain HTML, CSS and ES modules. No framework, no
build step, no bundler, nothing to install.

Two things in here are more than a page: an interactive walkthrough of the
[AgentBridge](https://github.com/A-Pravin02/Agentbridge) authorization pipeline and of the
[PRAXIS](https://github.com/A-Pravin02/praxis-neurosymbolic) reasoning architecture. There is also a
simulated terminal and a playable game, **Maze Override**, which has its own Playground section in the
page and opens from labelled **Terminal** and **Play** buttons in the top bar, the mobile menu and the
footer. Neither is hidden behind a shortcut.

## Run it locally

ES modules need to be served over HTTP — opening `index.html` from the filesystem will not work.

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>. Any static server does the same job (`npx serve`, `php -S`).

There is nothing to build and no tests to run: the site ships exactly what is in the repository.

## Editing the content

All copy and data live in `assets/js/data/`. Nothing else needs touching to add work.

| File | What it holds |
| --- | --- |
| `profile.js` | Name, role line, hero headline, the two About sentences, education, links, contact copy |
| `projects.js` | Every project, plus the pipeline stages, scenarios, nodes and walkthrough cases that drive the two interactive demos |
| `achievements.js` | The record list |
| `skills.js` | The four "What I work with" groups |

### Adding a project

Append an object to the array in `projects.js`.

- `featured: true` puts a project on the homepage as a card; the first featured project gets the wide
  lead card. Anything else is named in the "Also built" line and still opens its full case study.
- `cardLine` is the one-liner on the card. `question` is the framing question used as a fallback.
- `demo: 'pipeline' | 'reasoning'` mounts one of the interactive demos inside that project's case
  study. The homepage deliberately carries no demos — it is meant to be scannable in under a minute,
  so everything detailed sits one click away.
- Every key under `details` is optional — a block that has no content is simply not rendered. So a
  project with only `problem` and `limitations` renders cleanly.
- `links.source` and `links.demo` each render a button only when set. Leave them `null` rather than
  pointing at a placeholder.

### Adding an achievement

Append to `achievements.js`. Entries with `visible: false` stay in the file but never reach the
site — that is where anything unconfirmed belongs. Flip it to `true` once you have the certificate,
and add `credential` when you have a URL to point at.

### Replacing the portrait

The hero portrait is the first thing on the page, so it is served at two sizes from a `srcset` in
`index.html` rather than as one large file. To swap it:

1. Put a square image in `assets/img/` (anything from about 1000px up).
2. Regenerate the two sizes the hero asks for:

```bash
python -c "from PIL import Image; im=Image.open('assets/img/YOURS.jpg'); [im.resize((w,w)).save(f'assets/img/pravin-{w}.webp','WEBP',quality=84,method=6) for w in (560,1120)]"
```

3. The caption and alt text come from `profile.photo` in `data/profile.js`.

If you would rather use a single file, replace the `srcset` and `sizes` attributes on the hero `img`
with one `src`. Keep the `width` and `height` attributes either way — they reserve the space and stop
the page shifting as the image arrives.

The portrait is deliberately a plain bordered frame: no halo, ring or glow.

### Links and assets

- Contact links are in `profile.links`. Anything set to `null` or `''` is omitted from the UI
  entirely, rather than rendering a dead link — so delete a value instead of faking one.
- The résumé lives at `assets/docs/`. Replace the PDF and update `profile.links.resume`.
- Project images go in `assets/img/` and are referenced from each project's `image` key.

## Palette

All colour lives in `assets/css/tokens.css`. Four colours carry the whole site:

| Token | Value | Role |
| --- | --- | --- |
| `--bg` / `--bg-2` / `--surface` | `#070B16` → `#0F1626` | Midnight navy surfaces |
| `--ink` / `--ink-2` / `--ink-3` | `#E6EFF8` → `#7E91AB` | Ice blue text, three weights |
| `--accent` | `#3D8BFF` | Electric blue — links, selected states, focus |
| `--accent-2` | `#CDFF4F` | Chartreuse — rationed to one primary action per view, plus "allowed" in the demos |

Every text pair clears WCAG AA: 16.9:1 for body text on the background, 9.5:1 for secondary,
6.1:1 for metadata, and 5.9:1 for the electric blue. Changing a token here changes it everywhere,
including the game board, which reads its colours from the same values.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + K` or `/` | Command palette |
| `↑` `↓` `↵` | Navigate and open palette results |
| `Esc` | Close any overlay; pauses a live game run instead of closing it |
| `↑` `↓` in the terminal | Command history |
| `Tab` in the terminal | Complete a command |
| `WASD` / arrows | Move in Maze Override — `R` restarts, `Esc` pauses |

## Accessibility and motion

Overlays are native `<dialog>` elements, so focus handling, the top layer and `Esc` come from the
browser rather than from script. There is no cursor-following glow, no custom cursor and no magnetic
buttons — hover and press states carry the feedback instead, which keeps touch and reduced-motion
users on the same footing. `prefers-reduced-motion: reduce` turns off the scroll reveals and the
pellet pulse, and resolves the interactive demos instantly instead of stepping them. The design is
built to hold up with every animation off.

## Deploying

The repository root is the site. No build command, no output directory.

**Vercel** — import the repository, framework preset **Other**, leave build command and output
directory empty.

**GitHub Pages** — Settings → Pages → deploy from branch `main`, folder `/ (root)`.

**Netlify / Cloudflare Pages** — connect the repository, leave the build command empty and set the
publish directory to `.`.

## Layout

```
index.html              page shell, dialogs
assets/css/
  tokens.css            colour, type scale, spacing, motion, resets
  layout.css            top nav, hero, sections, playground
  features.css          cursor, dialogs, demos, terminal, game
assets/js/
  main.js               bootstrap and keyboard shortcuts
  data/                 all editable content
  sections.js           about, achievements, skills, contact
  projects-view.js      project spreads and detail dialog
  agentbridge.js        pipeline demo
  praxis.js             architecture diagram demo
  terminal.js           terminal commands
  palette.js            command palette
  interactions.js       cursor, parallax, reveals, chrome
  game/engine.js        maze, pellets, ghost AI — pure, no DOM
  game/view.js          canvas rendering, input, lifecycle
```

## On the demos

The AgentBridge pipeline and the PRAXIS walkthrough are simulations of architectures documented in
their repositories. They run from fixed scenarios in `projects.js`: no network call, no keys in the
browser, no payment provider, and no live model. Both say so on the page. The PRAXIS benchmark
figures in the detail view are the measured numbers published in that repository, shown with the
stated methodology and caveats.
