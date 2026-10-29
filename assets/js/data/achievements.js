/* ─────────────────────────────────────────────────────────────
   ACHIEVEMENTS — only things that can be pointed at.

   `visible: false` keeps an entry in the file but out of the site.
   Use it for anything not yet confirmed, then flip it to true once
   you have the certificate or the credential URL.
   ───────────────────────────────────────────────────────────── */

export const achievements = [
  {
    id: 'ssoc-2026',
    title: 'Open source contributor, Social Summer of Code',
    org: 'Social Summer of Code (SSoC)',
    date: '2026',
    kind: 'Open source',
    visible: true,
    body:
      'Merged features and issue fixes with maintainers through pull requests and code review, and built ' +
      'an end-to-end NLP pipeline for large-scale product reviews — DistilBERT, BERTopic, ' +
      'SentenceTransformers, TF-IDF and logistic regression for sentiment analysis, topic modelling and ' +
      'aspect-based sentiment extraction.',
    credential: null,
  },
  {
    id: 'amman-try-2026',
    title: 'Software engineering intern',
    org: 'Amman Try',
    date: '2026',
    kind: 'Experience',
    visible: true,
    body:
      'Structured and maintained customer interaction data in CRM software — field validation, record ' +
      'tagging, status pipelines and reporting views — to keep engagement data reliable enough to ' +
      'analyse.',
    credential: null,
  },
  {
    id: 'praxis-benchmark',
    title: 'PRAXIS benchmark results published to the repository',
    org: 'Independent research, VIT Vellore',
    date: '2026',
    kind: 'Research',
    visible: true,
    body:
      'Benchmarked a neuro-symbolic verification layer against five baselines on 255 held-out questions, ' +
      'with per-question records committed so the numbers can be re-verified. The LLM-free configuration ' +
      'reached 0.796 accuracy at a 0.149 hallucination rate against 0.235 / 0.427 for the LLM-only baseline.',
    credential: 'https://github.com/A-Pravin02/praxis-neurosymbolic',
  },
  {
    id: 'ml-specialization',
    title: 'Machine Learning Specialization',
    org: 'DeepLearning.AI (Coursera)',
    date: 'Certification',
    kind: 'Certification',
    visible: true,
    body: 'Supervised learning, advanced learning algorithms, and unsupervised learning with recommenders and reinforcement learning.',
    credential: null,
  },
  {
    id: 'genai-everyone',
    title: 'Generative AI for Everyone',
    org: 'DeepLearning.AI (Coursera)',
    date: 'Certification',
    kind: 'Certification',
    visible: true,
    body: 'How generative AI systems work, where they fail, and how projects around them are scoped.',
    credential: null,
  },
  {
    id: 'genai-business',
    title: 'Generative AI in Business',
    org: 'University of Michigan',
    date: 'Certification',
    kind: 'Certification',
    visible: true,
    body: 'Applying generative AI inside organisations — adoption, workflow and risk.',
    credential: null,
  },

  /* ── Draft entries: not shown on the site ──────────────────
     Flip `visible` to true once completion is confirmed and, where
     relevant, add the credential URL. */
  {
    id: 'mckinsey-forward',
    title: 'McKinsey.org Forward programme',
    org: 'McKinsey.org',
    date: 'In progress',
    kind: 'Programme',
    visible: false,
    body: 'Set visible: true once completion is confirmed, and add the credential URL when the certificate is issued.',
    credential: null,
  },
];

export const visibleAchievements = achievements.filter((a) => a.visible);
