/* ─────────────────────────────────────────────────────────────
   PROFILE — single source of truth for identity + contact.
   Edit values here; the UI reads them and hides anything empty.

   Copy here is deliberately short. The homepage is meant to be
   understood in well under a minute, so nothing on it runs past two
   sentences — detail belongs in the project case studies.
   ───────────────────────────────────────────────────────────── */

export const profile = {
  name: 'Pravin Anbalagan',
  shortName: 'Pravin',
  role: 'AI Engineer · Developer · Research Enthusiast',
  location: 'Vellore, India',

  // Hero copy
  headline: 'I build intelligent systems and software that solve real problems.',
  intro:
    'Computer Science and Business Systems at VIT Vellore. I work on AI agent security, ' +
    'neuro-symbolic reasoning, and the backend systems underneath them.',

  // Two sentences, no more. Shown under "Beyond the code."
  about: [
    'I’m a Computer Science and Business Systems student at VIT Vellore, interested in building ' +
      'intelligent systems at the intersection of AI, software engineering and applied research.',
    'I enjoy understanding how systems work beneath the surface, experimenting with ideas and turning ' +
      'them into practical implementations.',
  ],

  education: {
    degree: 'B.Tech, Computer Science and Business Systems',
    institution: 'Vellore Institute of Technology, Vellore',
    period: '2024 — 2028',
    // Grades belong on the résumé, not the site. Anything put here is
    // appended after the period; leave it null to show nothing.
    detail: null,
  },

  // Links. Anything left as null or '' is omitted from the UI entirely.
  links: {
    email: 'pravinanbalagan2@gmail.com',
    github: 'https://github.com/A-Pravin02',
    linkedin: 'https://www.linkedin.com/in/pravinanbalagan',
    resume: 'assets/docs/Pravin-Anbalagan-Resume.pdf',
    // phone intentionally omitted from the public site
  },

  contact: {
    headline: 'Have something interesting in mind?',
    body: 'Let’s build something meaningful.',
  },

  /* Portrait. To swap it, drop a square image in assets/img/ and point
     `src` at it — then regenerate the two sizes referenced by the hero's
     srcset in index.html, or replace that srcset with this one path. */
  photo: {
    src: 'assets/img/pravin-560.webp',
    alt: 'Pravin Anbalagan',
  },
};
