/* ─────────────────────────────────────────────────────────────
   SKILLS — grouped, no proficiency ratings.

   `evidence` holds project ids from projects.js. The UI turns them
   into links, so a skill can always be traced to something built.
   An empty evidence array simply shows no links.
   ───────────────────────────────────────────────────────────── */

export const skillGroups = [
  {
    id: 'languages',
    title: 'Programming',
    note: 'Day to day, in rough order of how much I write.',
    items: [
      { name: 'Python', evidence: ['praxis', 'footballgpt', 'face3d', 'agrow'] },
      { name: 'TypeScript', evidence: ['agentbridge'] },
      { name: 'C', evidence: [] },
      { name: 'C++', evidence: [] },
      { name: 'Java', evidence: [] },
      { name: 'SQL', evidence: ['agrow'] },
      { name: 'R', evidence: [] },
    ],
  },
  {
    id: 'ml',
    title: 'Machine learning and data',
    note: 'Built with, not just imported.',
    items: [
      { name: 'PyTorch', evidence: ['footballgpt', 'face3d'] },
      { name: 'TensorFlow', evidence: [] },
      { name: 'NumPy', evidence: ['footballgpt', 'face3d'] },
      { name: 'pandas', evidence: [] },
      { name: 'OpenCV', evidence: ['face3d'] },
      { name: 'Open3D', evidence: ['face3d'] },
      { name: 'Transformers', evidence: ['footballgpt'] },
      { name: 'NLP pipelines', evidence: [] },
    ],
  },
  {
    id: 'systems',
    title: 'Systems and development',
    note: 'The parts that have to hold under concurrency.',
    items: [
      { name: 'Fastify', evidence: ['agentbridge'] },
      { name: 'Prisma', evidence: ['agentbridge'] },
      { name: 'PostgreSQL', evidence: ['agentbridge', 'praxis'] },
      { name: 'SQLite', evidence: ['agentbridge'] },
      { name: 'REST APIs', evidence: ['agrow'] },
      { name: 'Ed25519 / HMAC', evidence: ['agentbridge'] },
      { name: 'Vitest / pytest', evidence: ['agentbridge', 'praxis'] },
      { name: 'Git', evidence: [] },
      { name: 'Streamlit', evidence: [] },
    ],
  },
  {
    id: 'research',
    title: 'Research interests',
    note: 'Where the reading goes when nobody has set a deadline.',
    items: [
      { name: 'Neuro-symbolic AI', evidence: ['praxis'] },
      { name: 'AI-agent security', evidence: ['agentbridge'] },
      { name: 'Computer vision', evidence: ['face3d'] },
      { name: 'Quantitative finance', evidence: [] },
      { name: 'Data structures and algorithms', evidence: [] },
    ],
  },
];
