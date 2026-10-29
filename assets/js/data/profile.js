/* ─────────────────────────────────────────────────────────────
   PROFILE — single source of truth for identity + contact.
   Edit values here; the UI reads them and hides anything empty.
   ───────────────────────────────────────────────────────────── */

export const profile = {
  name: 'Pravin Anbalagan',
  shortName: 'Pravin',
  role: 'CSBS undergraduate · AI systems',
  location: 'Vellore, India',
  timeZone: 'Asia/Kolkata',

  // Hero copy
  label: 'Engineering / AI systems / Research',
  headline: 'I like understanding what happens beneath the surface.',
  intro:
    'I’m Pravin Anbalagan, a Computer Science and Business Systems student at VIT Vellore. I build ' +
    'software, explore intelligent systems, and investigate what happens when models reason, systems ' +
    'fail, or autonomous agents take action.',

  // One line on what I'm actually doing now. Leave null to hide it.
  currentFocus: 'Currently building AgentBridge — an authorization layer for AI agents.',

  about: [
    'I study Computer Science and Business Systems at VIT Vellore. Most of what I build starts with ' +
      'the same question — how does this actually work underneath? — and ends with a prototype that ' +
      'lets me check the answer.',
    'That has taken me through a transformer written from scratch so I could see attention compute, a ' +
      '3D face reconstruction pipeline where I had to debug surface normals by hand, and an ' +
      'authorization layer that decides whether an AI agent is allowed to spend money. The subjects ' +
      'differ; the method does not.',
    'Right now I spend most of my time on neuro-symbolic reasoning and on the security problems that ' +
      'appear once agents start acting on their own.',
  ],

  interests: [
    { title: 'AI and machine learning', note: 'Transformers from first principles, training dynamics, evaluation.' },
    { title: 'Neuro-symbolic systems', note: 'Rule engines that verify what a language model claims.' },
    { title: 'AI-agent security', note: 'Identity, policy, budgets, and audit trails for autonomous agents.' },
    { title: 'Software engineering', note: 'Typed boundaries, deterministic cores, tests that mean something.' },
    { title: 'Quantitative finance', note: 'Market structure and systematic strategy as an engineering problem.' },
    { title: 'Data science', note: 'NLP pipelines, topic modelling, turning noisy text into decisions.' },
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
    headline: 'Have an interesting problem? Let’s build something.',
    body:
      'Research ideas, agent security, or anything that needs a prototype before it needs a plan — ' +
      'email is the fastest way to reach me.',
  },

  /* Portrait. To swap it, drop a square image in assets/img/ and point
     `src` at it — then regenerate the two sizes referenced by the hero's
     srcset in index.html, or replace that srcset with this one path. */
  photo: {
    src: 'assets/img/pravin-560.webp',
    alt: 'Pravin Anbalagan',
    caption: 'Pravin Anbalagan · VIT Vellore',
  },
};
