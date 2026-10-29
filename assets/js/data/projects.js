/* ─────────────────────────────────────────────────────────────
   PROJECTS — add, remove or reorder entries here.
   `featured: true` gives a project the full editorial spread with
   its interactive demo. Everything else renders as an archive row.

   Claims in this file are grounded in the repositories and the
   résumé. Do not add outcomes that cannot be pointed at.
   ───────────────────────────────────────────────────────────── */

export const projects = [
  /* ══ AGENTBRIDGE ══════════════════════════════════════════ */
  {
    id: 'agentbridge',
    title: 'AgentBridge',
    category: 'AI agents · Payment authorization · Backend security',
    year: '2026',
    featured: true,
    demo: 'pipeline',
    status: 'Active — runs locally against a sandbox provider',
    tagline: 'LLMs propose actions. AgentBridge decides whether they happen.',
    summary:
      'An authorization layer that sits between an AI agent and a payment provider. The agent never ' +
      'holds spending authority: it submits a proposal, and a deterministic policy engine returns ' +
      'ALLOW, REQUIRE_APPROVAL or BLOCK. No language model sits in the decision path.',
    tech: ['TypeScript', 'Fastify', 'Prisma', 'SQLite / PostgreSQL', 'Ed25519', 'MCP SDK', 'Next.js', 'Vitest'],
    links: {
      source: 'https://github.com/A-Pravin02/Agentbridge',
      demo: null,
    },
    details: {
      problem:
        'Give an agent a payment API key and you have given it your budget. The usual answer — prompt ' +
        'the model to behave — fails the moment the model is wrong, jailbroken, or simply looping. ' +
        'What is missing is a layer that treats every agent action as a proposal to be judged.',
      architecture:
        'A modular monolith. All decision logic lives in pure, I/O-free packages so it is unit-testable ' +
        'and reproducible: shared-types (money, contracts, state transitions), policy-engine ' +
        '(15 composable rules), threat-analyzer (11 behavioural rules scoring 0–100), audit (hash ' +
        'chaining), payments (HMAC verification). Around them sit a Fastify API with ledger, audit, ' +
        'payment and purchase services, an MCP server that signs requests as the agent, and a Next.js ' +
        'merchant dashboard with an attack console.',
      security: [
        'Deterministic policy engine — 15 composable rules, zero LLM involvement. BLOCK takes precedence over REQUIRE_APPROVAL, which takes precedence over ALLOW.',
        'Ed25519 agent identity — the server stores public keys only. Signatures cover method, path, nonce, timestamp and body digest; nonces are single-use.',
        'Budget ledger — a per-agent daily ledger updated with an atomic conditional write. This is the concurrency control point of the system.',
        'Audit chain — SHA-256 over a gapless sequence with compare-and-swap head updates, so concurrent appends serialize instead of forking.',
        'HMAC payment verification — HMAC-SHA256 over order and payment IDs with server-side pricing, compared in constant time and failing closed.',
        'Human approvals — authenticated approver role, single-use, time-limited, tenant-bound, and budget is reserved at approval time.',
      ],
      decisions: [
        'Keep the decision core pure. Policy and threat analysis take a request and return a verdict with no database or network access, which makes every verdict reproducible from its inputs alone.',
        'Fail closed everywhere. An unverifiable signature, an unknown nonce or a mismatched HMAC is a BLOCK, never a warning.',
        'Make the budget ledger the single serialization point rather than spreading locks across services.',
        'Ship an attack console in the dashboard so the invariants can be attacked, not just asserted.',
      ],
      challenges:
        'The hard part was concurrency. Two approved purchases arriving at once must not both pass the ' +
        'daily limit, and two audit appends must not fork the chain. Both were solved by moving the ' +
        'contention to a single atomic write — a conditional update for the ledger, compare-and-swap on ' +
        'the chain head — rather than by locking in application code.',
      verified: [
        '179 tests across six suites, covering package behaviour, system invariants and adversarial cases.',
        'Ten security invariants asserted in tests, including “a BLOCK can never result in a payment” and “an agent can never exceed its daily limit”.',
      ],
      limitations: [
        'SQLite is the default and is single-writer; the suite also passes on PostgreSQL.',
        'The sandbox provider is not Razorpay — live test-mode keys have not been exercised end to end.',
        'The threat analyzer is heuristic, with hand-tuned thresholds.',
        'No key-rotation endpoint; rate limiting is in-process; approvals are delivered only through the dashboard.',
        'Not independently audited and not deployed commercially.',
      ],
    },

    /* The pipeline visualisation. Stage copy is descriptive of the
       repository's architecture — the browser demo is a simulation of
       that architecture, not a live call into the service. */
    pipeline: [
      {
        id: 'agent',
        label: 'AI agent',
        mono: 'mcp.propose()',
        checks: 'Nothing. This stage only states an intention.',
        why: 'Separating proposal from authority is the whole point: the agent can ask for anything, and asking is not permission.',
        inputs: 'Tool call from the model — merchant, item, amount, currency.',
        outputs: 'A signed purchase proposal handed to the API.',
      },
      {
        id: 'identity',
        label: 'Identity verification',
        mono: 'ed25519.verify()',
        checks: 'That the request was signed by a registered agent key, and that the nonce has not been used before.',
        why: 'Without proof of origin every later check is decoration — anyone could submit as any agent.',
        inputs: 'Signature over method, path, nonce, timestamp and body digest.',
        outputs: 'A verified agent identity, or a hard BLOCK. The server never sees a private key.',
      },
      {
        id: 'permissions',
        label: 'Permission check',
        mono: 'scope.assert()',
        checks: 'Whether this agent is allowed to act for this tenant, on this merchant, with this capability.',
        why: 'A valid signature proves who is asking, not what they may do. Scope is a separate question.',
        inputs: 'Agent record, tenant binding, requested capability.',
        outputs: 'Permitted scope, or BLOCK.',
      },
      {
        id: 'threat',
        label: 'Threat analysis',
        mono: 'risk: 0–100',
        checks: '11 behavioural rules — repeated blocked attempts, velocity, odd amounts, unfamiliar merchants.',
        why: 'Individually legal requests can be an attack in aggregate. A single request carries no history; a score does.',
        inputs: 'This request plus the agent’s recent behaviour.',
        outputs: 'A 0–100 risk score that feeds the combined decision. Heuristic, with hand-tuned thresholds.',
      },
      {
        id: 'policy',
        label: 'Policy evaluation',
        mono: 'evaluatePolicy()',
        checks: '15 composable rules over amount, category, merchant, time window and remaining budget.',
        why: 'This is the deterministic heart. Same inputs, same verdict, every time — and reproducible from the inputs alone.',
        inputs: 'Verified request, agent policy, current ledger state.',
        outputs: 'ALLOW, REQUIRE_APPROVAL or BLOCK, with the rule that decided it.',
      },
      {
        id: 'combined',
        label: 'Combined decision',
        mono: 'BLOCK > APPROVAL > ALLOW',
        checks: 'How policy and risk resolve together, under a fixed precedence.',
        why: 'Two subsystems can disagree. Precedence makes the outcome predictable rather than a judgement call.',
        inputs: 'Policy verdict, risk score, budget headroom.',
        outputs: 'The final verdict, written to the audit chain either way.',
      },
      {
        id: 'outcome',
        label: 'Authorized or blocked',
        mono: 'audit.append()',
        checks: 'On ALLOW: budget is debited atomically and payment settlement is HMAC-verified. On BLOCK: nothing moves.',
        why: 'A decision nobody can reconstruct is not a control. Every verdict is appended to a SHA-256 chain.',
        inputs: 'Final verdict, ledger, payment provider response.',
        outputs: 'A settled payment or a refusal — and in both cases an immutable audit entry.',
      },
    ],

    /* Deterministic demo scenarios. `path` marks which stage decides,
       and `verdict` is the outcome the architecture produces. */
    scenarios: [
      {
        id: 'ok',
        label: 'Within policy',
        request: { merchant: 'TechKart', item: 'USB-C hub', amount: '₹1,499', agent: 'shopper-01' },
        verdict: 'ALLOW',
        decidedAt: 'policy',
        trace: {
          agent: 'Proposal received and signed by shopper-01.',
          identity: 'Signature valid. Nonce unused.',
          permissions: 'Agent scoped to TechKart purchases for this tenant.',
          threat: 'Risk 12 / 100 — ordinary amount, familiar merchant, no recent refusals.',
          policy: 'Under the ₹5,000 single-transaction cap and inside the daily budget. Rule: amount_within_limit.',
          combined: 'Policy ALLOW, risk below threshold → ALLOW.',
          outcome: 'Budget debited atomically. Settlement HMAC verified. Audit entry appended.',
        },
      },
      {
        id: 'approval',
        label: 'Needs a human',
        request: { merchant: 'TechKart', item: 'Workstation GPU', amount: '₹84,000', agent: 'shopper-01' },
        verdict: 'REQUIRE_APPROVAL',
        decidedAt: 'policy',
        trace: {
          agent: 'Proposal received and signed by shopper-01.',
          identity: 'Signature valid. Nonce unused.',
          permissions: 'Agent scoped to TechKart purchases for this tenant.',
          threat: 'Risk 46 / 100 — amount is far outside this agent’s usual range.',
          policy: 'Above the single-transaction cap but inside the tenant ceiling. Rule: high_value_requires_approval.',
          combined: 'REQUIRE_APPROVAL outranks ALLOW → held for an approver.',
          outcome: 'No payment. Budget reserved at approval time, single-use and time-limited. Audit entry appended.',
        },
      },
      {
        id: 'budget',
        label: 'Budget exhausted',
        request: { merchant: 'TechKart', item: 'Mechanical keyboard', amount: '₹6,200', agent: 'shopper-02' },
        verdict: 'BLOCK',
        decidedAt: 'policy',
        trace: {
          agent: 'Proposal received and signed by shopper-02.',
          identity: 'Signature valid. Nonce unused.',
          permissions: 'Agent scoped to TechKart purchases for this tenant.',
          threat: 'Risk 38 / 100 — third request in a short window.',
          policy: 'Daily ledger has ₹900 remaining of ₹10,000. Rule: exceeds_daily_budget.',
          combined: 'BLOCK takes precedence over everything → BLOCK.',
          outcome: 'No payment. Ledger untouched. Audit entry appended.',
        },
      },
      {
        id: 'replay',
        label: 'Replayed request',
        request: { merchant: 'TechKart', item: 'USB-C hub', amount: '₹1,499', agent: 'shopper-01' },
        verdict: 'BLOCK',
        decidedAt: 'identity',
        terminal: true, // identity failures stop the pipeline
        trace: {
          agent: 'Proposal received — byte-identical to one already seen.',
          identity: 'Nonce already consumed. Fails closed. Rule: nonce_replayed.',
          permissions: 'Not reached.',
          threat: 'Not reached.',
          policy: 'Not reached.',
          combined: 'Not reached — identity failure is terminal.',
          outcome: 'No payment. Refusal appended to the audit chain.',
        },
      },
      {
        id: 'probe',
        label: 'Agent probing limits',
        request: { merchant: 'Unknown vendor', item: 'Gift cards ×8', amount: '₹4,900', agent: 'shopper-03' },
        verdict: 'BLOCK',
        decidedAt: 'threat',
        trace: {
          agent: 'Proposal received and signed by shopper-03.',
          identity: 'Signature valid. Nonce unused.',
          permissions: 'Capability present, but the merchant is unregistered.',
          threat: 'Risk 91 / 100 — six refusals in ten minutes, each just under the cap, unfamiliar merchant.',
          policy: 'Amount alone is within the cap. Rule: amount_within_limit.',
          combined: 'Risk above the block threshold outranks the policy ALLOW → BLOCK.',
          outcome: 'No payment. Pattern recorded against the agent. Audit entry appended.',
        },
      },
    ],
  },

  /* ══ PRAXIS ═══════════════════════════════════════════════ */
  {
    id: 'praxis',
    title: 'PRAXIS',
    category: 'Neuro-symbolic AI · LLM reasoning · Research',
    year: '2026',
    featured: true,
    demo: 'reasoning',
    status: 'Research project — benchmarked on generated enterprise worlds',
    tagline: 'A language model is never the authority for a decision.',
    summary:
      'A neuro-symbolic reasoning and verification layer for reducing hallucination. A three-valued ' +
      'rule engine proves or refutes claims against authorized records, and deterministic checks gate ' +
      'the answer before release. In the default configuration the decision path contains no language ' +
      'model at all.',
    tech: ['Python', 'PostgreSQL', 'Three-valued logic', 'pytest', 'nanoGPT'],
    note: 'Research with Athiban Karthik, Vellore Institute of Technology.',
    links: {
      source: 'https://github.com/A-Pravin02/praxis-neurosymbolic',
      demo: null,
    },
    details: {
      problem:
        'A language model that does not know something will still answer. Retrieval narrows the gap ' +
        'but does not close it, because nothing in the pipeline is obliged to check that the answer ' +
        'follows from the evidence. The question PRAXIS asks is what happens when you remove the model ' +
        'from the decision entirely and make a rule engine answerable instead.',
      architecture:
        'Four stages. A neural encoder interprets the question and selects candidate goals — optionally ' +
        'an LLM acts as semantic parser instead. A symbolic reasoner applies versioned business rules ' +
        'to authorized records under three-valued logic, proving or refuting each rule. Deterministic ' +
        'verification then gates the answer, surfacing the reason each check passed or failed. Only ' +
        'then is the answer released.',
      decisions: [
        'Three-valued logic rather than boolean: “unknown” is a first-class outcome, so an uncovered case abstains instead of guessing.',
        'Versioned rules, so a verdict can be replayed against the rule set that produced it.',
        'Verification as a gate, not a score — the answer is withheld until the checks pass, and each check reports its reason.',
        'The LLM is optional and confined to parsing. It never decides.',
      ],
      challenges:
        'Verification turned out to answer a narrower question than expected. As the repository puts it: ' +
        'verification establishes that a claim follows from evidence, not that it answers the question ' +
        'asked. Closing that gap needed a separate relevance gate.',
      evaluation: {
        method:
          '255 held-out questions across five generated enterprise worlds, with gold answers from an ' +
          'independent oracle. Per-question records are committed to the repository so the numbers can ' +
          'be re-verified.',
        rows: [
          { system: 'PRAXIS (no LLM)', accuracy: 0.796, hallucination: 0.149, coverage: 0.943, highlight: true },
          { system: 'PRAXIS (LLM as parser)', accuracy: 0.945, hallucination: 0.035, coverage: 0.976, highlight: true },
          { system: 'LLM + RAG + rules', accuracy: 0.537, hallucination: 0.247, coverage: 0.781 },
          { system: 'LLM + RAG + self-check', accuracy: 0.247, hallucination: 0.282, coverage: 0.505 },
          { system: 'LLM only', accuracy: 0.235, hallucination: 0.427, coverage: 0.6 },
          { system: 'LLM + RAG', accuracy: 0.2, hallucination: 0.302, coverage: 0.462 },
        ],
        caveats: [
          'Measured on generated enterprise worlds, not real traffic, in a single domain whose rules can be written down.',
          'Not a general-domain factuality result. No claim is made that the approach eliminates hallucination.',
          'Latency is not reported.',
          'On 15 questions that no policy clause covers, the default LLM-free configuration abstains in none of them. With a relevance gate the LLM-parser configuration improves from 6 of 15 to 15 of 15, with no losses on the curated suite.',
        ],
      },
      limitations: [
        'Rules must be writable. Domains without statable policy are out of scope.',
        'Benchmark worlds are generated, so distribution shift against real queries is untested.',
        'The default configuration under-abstains on uncovered questions.',
        'No independent replication.',
      ],
    },

    /* Architecture graph for the interactive diagram. */
    nodes: [
      {
        id: 'query',
        label: 'User query',
        kind: 'io',
        role: 'The question, in natural language, with the asker’s authorization context attached.',
        inputs: 'Free text plus identity.',
        outputs: 'A parse request.',
        why: 'Authorization travels with the question so the reasoner can only ever read records this asker may see.',
        failure: 'Answers assembled from records the asker was never entitled to.',
      },
      {
        id: 'encoder',
        label: 'Neural encoder',
        kind: 'neural',
        role: 'Interprets the question and selects candidate goals for the reasoner to attempt.',
        inputs: 'Query text.',
        outputs: 'A set of candidate goals.',
        why: 'Language is the one part of the problem that genuinely needs a learned model. An LLM can take this role instead.',
        failure: 'A correct answer to a misread question.',
      },
      {
        id: 'reasoner',
        label: 'Symbolic reasoner',
        kind: 'symbolic',
        role: 'Applies versioned business rules to authorized records under three-valued logic, proving or refuting each rule.',
        inputs: 'Candidate goals, rule set version, authorized records.',
        outputs: 'Proved, refuted, or unknown — with the derivation.',
        why: 'This is where the decision is made, and it is deterministic. The same facts and rules always give the same verdict.',
        failure: 'Fluent assertions with nothing behind them.',
      },
      {
        id: 'verification',
        label: 'Verification',
        kind: 'gate',
        role: 'Deterministic checks that must pass before the answer is allowed out, each reporting why it passed or failed.',
        inputs: 'Derivation, evidence, grounding.',
        outputs: 'Release, or withhold with a stated reason.',
        why: 'A gate, not a confidence score. Nothing is released on a guess.',
        failure: 'Unsupported claims reaching the user because the system was only measuring confidence.',
      },
      {
        id: 'release',
        label: 'Release',
        kind: 'io',
        role: 'The answer, with the checks that justified it — or an abstention.',
        inputs: 'Verified answer.',
        outputs: 'Answer, abstention, or a request for more evidence.',
        why: 'An abstention is a correct output. The benchmark counts coverage separately from accuracy for exactly this reason.',
        failure: 'A system that is never allowed to say “I cannot answer that”.',
      },
    ],

    /* Walkthrough examples checked against a small stated rule set. */
    walkthrough: {
      rules: [
        'R1 — A refund is permitted when the order is within 30 days of delivery.',
        'R2 — A refund is denied when the item is marked final sale.',
        'R3 — Store credit requires an active account in good standing.',
      ],
      records: [
        'order #4471 — delivered 12 days ago, item not final sale, account active.',
        'order #8890 — delivered 51 days ago, item final sale, account active.',
      ],
      cases: [
        {
          id: 'proved',
          query: 'Can order #4471 be refunded?',
          goals: 'refund_permitted(#4471)',
          derivation: 'R1 holds — delivered 12 days ago, inside the 30-day window. R2 does not apply — the item is not final sale.',
          verdict: 'PROVED',
          verification: 'Both checks pass: every premise maps to an authorized record, and the derivation covers the question asked.',
          answer: 'Yes. Order #4471 is inside the 30-day window and is not final sale, so a refund is permitted under R1.',
        },
        {
          id: 'refuted',
          query: 'Can order #8890 be refunded?',
          goals: 'refund_permitted(#8890)',
          derivation: 'R1 fails — delivered 51 days ago, outside the window. R2 applies — the item is final sale.',
          verdict: 'REFUTED',
          verification: 'Checks pass. The refutation is grounded in two authorized records.',
          answer: 'No. Order #8890 is outside the 30-day window and the item is final sale, so R2 denies the refund.',
        },
        {
          id: 'unknown',
          query: 'Will a refund for #4471 be credited to the original card?',
          goals: 'refund_destination(#4471)',
          derivation: 'No rule covers refund destination. The goal resolves to unknown rather than false.',
          verdict: 'UNKNOWN',
          verification: 'Verification withholds the answer: nothing in the rule set addresses this, so there is no derivation to ground.',
          answer:
            'I cannot answer that from the policy I have. No rule covers where a refund is credited — ' +
            'this needs either the payments policy or a human.',
        },
      ],
    },
  },

  /* ══ ARCHIVE ══════════════════════════════════════════════ */
  {
    id: 'footballgpt',
    title: 'FootballGPT',
    category: 'Transformer language model from scratch',
    year: '2026',
    featured: false,
    status: 'Complete',
    image: { src: 'assets/img/football.webp', alt: 'FootballGPT training output' },
    tagline: 'A 10M-parameter GPT built without reaching for a high-level ML library.',
    summary:
      'A full transformer implemented from scratch — tokenizer, multi-head self-attention, positional ' +
      'encoding, residual connections, layer normalisation — as a 6-layer, 10M parameter model, written ' +
      'to understand query-key-value attention rather than to call it.',
    tech: ['Python', 'PyTorch'],
    links: { source: 'https://github.com/A-Pravin02/FootballGPT', demo: null },
    details: {
      problem:
        'Attention is easy to use and hard to picture. Building the block stack by hand was the only ' +
        'way to stop treating it as an API call.',
      architecture:
        '6 transformer layers, ~10M parameters, trained on a 15 MB World Cup corpus. Autoregressive ' +
        'decoding produces football commentary and question answering.',
      verified: ['Cross-entropy loss of 1.82 after 5,000 iterations on a 15 MB football dataset.'],
      limitations: [
        'A 15 MB single-domain corpus. The model is coherent inside football and nowhere else.',
        'No instruction tuning, no evaluation beyond training loss and reading the samples.',
      ],
    },
  },
  {
    id: 'face3d',
    title: 'Deep3DFaceRecon',
    category: 'Computer vision · 3D reconstruction',
    year: '2026',
    featured: false,
    status: 'Complete',
    image: { src: 'assets/img/face-3d.webp', alt: 'Reconstructed 3D face mesh' },
    tagline: 'Textured facial geometry from a single RGB image.',
    summary:
      'A weakly supervised CNN pipeline — ResNet-50 with BFM 2019, 53K-vertex mesh — reconstructing ' +
      'textured facial geometry from one photograph, with landmark alignment, photometric refinement, ' +
      'texture transfer and OBJ export.',
    tech: ['Python', 'PyTorch', 'OpenCV', 'Open3D', 'ResNet-50'],
    links: { source: 'https://github.com/A-Pravin02/3D-face-reconstruction', demo: null },
    pipeline: [
      { id: 'input', label: 'Input image', mono: 'RGB' },
      { id: 'landmarks', label: 'Landmark detection', mono: 'align' },
      { id: 'fit', label: '3DMM fitting', mono: 'BFM 2019' },
      { id: 'optimize', label: 'Photometric refinement', mono: 'optimize' },
      { id: 'mesh', label: '3D reconstruction', mono: '53K verts' },
    ],
    details: {
      problem:
        'One image gives you no depth. A 3D morphable model supplies the missing prior; the work is in ' +
        'fitting it without the result collapsing into artifacts.',
      challenges:
        'Rendering artifacts around the eye sockets. Fixed with surface-normal-based correction and ' +
        'depth-based vertex classification, then extended with an Open3D interactive viewer so the mesh ' +
        'could be inspected in real time instead of guessed at from renders.',
      limitations: [
        'A morphable-model prior constrains the output to the face space it was built from.',
        'Single-image reconstruction is inherently ambiguous in depth.',
        'Not suitable for identification, biometrics or any medical use.',
      ],
    },
  },
  {
    id: 'agrow',
    title: 'Agrow',
    category: 'Full-stack platform · Supply chain',
    year: '2025',
    featured: false,
    status: 'Complete — simulated marketplace',
    image: { src: 'assets/img/agrow.webp', alt: 'Agrow marketplace interface' },
    tagline: 'A marketplace that removes the middleman, with traceability built into the batch.',
    summary:
      'A full-stack agricultural marketplace connecting simulated farmers, buyers and logistics ' +
      'providers for direct trade, with live market price feeds, blockchain batch identification for ' +
      'crop traceability, and smart-contract escrow that releases funds only on delivery confirmation.',
    tech: ['Python', 'SQL', 'REST APIs', 'Blockchain'],
    links: { source: 'https://github.com/A-Pravin02/Agrow', demo: null },
    details: {
      problem:
        'Growers lose margin to intermediaries and buyers cannot verify provenance. Both problems are ' +
        'really one problem: nobody can see the batch.',
      architecture:
        'Marketplace over SQL with REST price-feed integration, a blockchain batch identification ' +
        'system spanning three supply-chain tiers, and a location-based order-grouping algorithm for ' +
        'transport consolidation.',
      verified: [
        '50+ simulated farmers, buyers and logistics providers; 100% crop traceability across 3 supply-chain tiers.',
        'Simulated transaction fraud reduced ~40% via escrow releasing only on delivery confirmation.',
        'Order grouping cut simulated transport cost 25%; 200+ concurrent order records with sub-200ms query response.',
      ],
      limitations: [
        'All participants and transactions are simulated. The figures above are measured against that simulation, not a live market.',
      ],
    },
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const archiveProjects = projects.filter((p) => !p.featured);
export const getProject = (id) => projects.find((p) => p.id === id);
