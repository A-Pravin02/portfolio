# Pravin Anbalagan — portfolio

A static, dependency-free portfolio: plain HTML, CSS and ES modules. No framework, no
build step, no bundler, nothing to install.

Two things in here are more than a page: an interactive walkthrough of the
[AgentBridge](https://github.com/A-Pravin02/Agentbridge) authorization pipeline and of the
[PRAXIS](https://github.com/A-Pravin02/praxis-neurosymbolic) reasoning architecture. There is also a
simulated terminal (`Ctrl/Cmd + K` → "Open terminal", or the glyph in the top bar) and a playable
game, **System Override**, reachable from the footer.

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
| `profile.js` | Name, hero copy, about paragraphs, interests, education, links, contact copy |
| `projects.js` | Every project, plus the pipeline stages, scenarios, nodes and walkthrough cases that drive the two interactive demos |
| `achievements.js` | Timeline entries |
| `skills.js` | Skill groups, and which projects evidence each skill |

### Adding a project

Append an object to the array in `projects.js`.

- `featured: true` gives it a full editorial spread. `featured: false` puts it in the archive list,
  where it opens in the detail dialog.
- `demo: 'pipeline' | 'reasoning'` mounts one of the interactive demos. Omit it for a normal project.
- Every key under `details` is optional — a block that has no content is simply not rendered. So a
  project with only `problem` and `limitations` renders cleanly.
- `links.source` and `links.demo` each render a button only when set. Leave them `null` rather than
  pointing at a placeholder.

### Adding an achievement

Append to `achievements.js`. Entries with `visible: false` stay in the file but never reach the
site — that is where anything unconfirmed belongs. Flip it to `true` once you have the certificate,
and add `credential` when you have a URL to point at.

### Links and assets

- Contact links are in `profile.links`. Anything set to `null` or `''` is omitted from the UI
  entirely, rather than rendering a dead link — so delete a value instead of faking one.
- The résumé lives at `assets/docs/`. Replace the PDF and update `profile.links.resume`.
- The portrait is `profile.photo`. Project images go in `assets/img/` and are referenced from each
  project's `image` key.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl/Cmd + K` or `/` | Command palette |
| `↑` `↓` `↵` | Navigate and open palette results |
| `Esc` | Close any overlay; pauses a live game run instead of closing it |
| `↑` `↓` in the terminal | Command history |
| `Tab` in the terminal | Complete a command |
| `WASD` / arrows | Move in System Override — `R` restarts |

## Accessibility and motion

Overlays are native `<dialog>` elements, so focus handling, the top layer and `Esc` come from the
browser rather than from script. `prefers-reduced-motion: reduce` disables the custom cursor,
pointer parallax, magnetic buttons, scroll reveals and game particles; the interactive demos then
resolve instantly instead of stepping. The design is built to hold up with every animation off.

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
  layout.css            rail, hero, sections
  features.css          cursor, dialogs, demos, terminal, game
assets/js/
  main.js               bootstrap and keyboard shortcuts
  data/                 all editable content
  sections.js           about, achievements, skills, contact
  projects-view.js      spreads, archive, detail dialog
  agentbridge.js        pipeline demo
  praxis.js             architecture diagram demo
  terminal.js           terminal commands
  palette.js            command palette
  interactions.js       cursor, parallax, reveals, chrome
  game/engine.js        game logic — pure, no DOM
  game/view.js          canvas rendering, input, lifecycle
```

## On the demos

The AgentBridge pipeline and the PRAXIS walkthrough are simulations of architectures documented in
their repositories. They run from fixed scenarios in `projects.js`: no network call, no keys in the
browser, no payment provider, and no live model. Both say so on the page. The PRAXIS benchmark
figures in the detail view are the measured numbers published in that repository, shown with the
stated methodology and caveats.
