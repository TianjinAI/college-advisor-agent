import React, { useState, useMemo } from 'react';

/* ─── Types ──────────────────────────────────────────── */
type VocabCategory = 'Aid Terms' | 'Application Terms' | 'Testing Terms' | 'Deadlines';

interface VocabTerm {
  id: string;
  term: string;
  definition: string;
  category: VocabCategory;
  whyMatter?: string;
}

/* ─── Data ───────────────────────────────────────────── */
const TERMS: VocabTerm[] = [
  {
    id: 'fafsa',
    term: 'FAFSA',
    definition:
      'The Free Application for Federal Student Aid is the form you submit to the U.S. government each year to apply for federal grants, loans, and work-study funds. Most colleges also require it for their own need-based aid.',
    category: 'Aid Terms',
    whyMatter: 'Without it, you\'re leaving free money on the table — most schools won\'t consider you for need-based aid at all.',
  },
  {
    id: 'css-profile',
    term: 'CSS Profile',
    definition:
      'A detailed financial aid application from College Board used by ~400 private colleges to award their own institutional grant money. It asks deeper questions than FAFSA, including home equity and non-custodial parent income.',
    category: 'Aid Terms',
    whyMatter: 'Many schools with the biggest grants require it, so skipping it means missing out on potentially tens of thousands of dollars per year.',
  },
  {
    id: 'efc',
    term: 'Expected Family Contribution (EFC)',
    definition:
      'The old federal formula\'s estimate of how much your family can pay toward college per year, calculated from FAFSA data. It was replaced by the Student Aid Index (SAI) starting in 2024–25.',
    category: 'Aid Terms',
    whyMatter: 'Older award letters and many college materials still reference EFC — knowing it equals SAI saves confusion.',
  },
  {
    id: 'sai',
    term: 'Student Aid Index (SAI)',
    definition:
      'The number the new FAFSA formula produces to indicate how much your family is expected to contribute annually. Unlike EFC, SAI can be negative (as low as −1500), signaling very high need.',
    category: 'Aid Terms',
    whyMatter: 'Colleges subtract your SAI from their Cost of Attendance to determine how much aid you "need" — a lower SAI means more potential aid.',
  },
  {
    id: 'need-based-aid',
    term: 'Need-Based Aid',
    definition:
      'Financial aid awarded because a family demonstrates financial need, calculated from FAFSA/CSS data. Can include grants, subsidized loans, and work-study.',
    category: 'Aid Terms',
    whyMatter: 'This is the primary way families with limited income access free money for college.',
  },
  {
    id: 'merit-aid',
    term: 'Merit Aid',
    definition:
      'Scholarships or grants awarded based on academic achievement, talent, or other accomplishments rather than financial need. Available at most colleges regardless of income.',
    category: 'Aid Terms',
    whyMatter: 'High-achieving students can receive significant discounts at schools that use merit aid to attract them.',
  },
  {
    id: 'coa',
    term: 'Cost of Attendance (COA)',
    definition:
      'The total estimated annual cost to attend a college, including tuition, fees, room, board, books, supplies, and personal expenses. COA is the ceiling for all financial aid.',
    category: 'Aid Terms',
    whyMatter: 'It\'s the baseline number from which your actual out-of-pocket cost is calculated — net price = COA minus grants/scholarships.',
  },
  {
    id: 'net-price',
    term: 'Net Price',
    definition:
      'What your family actually pays after grants and scholarships are subtracted from the Cost of Attendance. Does not subtract loans or work-study since those must be repaid or earned.',
    category: 'Aid Terms',
    whyMatter: 'This is the real cost to compare schools — a higher-sticker school with big grants can be cheaper than a lower-sticker school with little aid.',
  },
  {
    id: 'grant',
    term: 'Grant',
    definition:
      'Free money for college from the government or a college that does not need to be repaid. The most common federal grant is the Pell Grant, awarded based on financial need.',
    category: 'Aid Terms',
    whyMatter: 'Every grant dollar is a dollar your family does not owe back, so maximizing grants is the highest priority in aid packaging.',
  },
  {
    id: 'scholarship',
    term: 'Scholarship',
    definition:
      'Free money for college from a college, company, nonprofit, or organization that does not need to be repaid. Can be merit-based, need-based, or both.',
    category: 'Aid Terms',
    whyMatter: 'Stacking outside scholarships on top of school aid can reduce or even eliminate out-of-pocket costs.',
  },
  {
    id: 'student-loan',
    term: 'Student Loan',
    definition:
      'Borrowed money for college that must be repaid with interest. Federal loans (Direct Subsidized, Unsubsidized, PLUS) come with more protections than private loans from banks.',
    category: 'Aid Terms',
    whyMatter: 'Loans inflate the real cost of college — always borrow federal before private and keep totals manageable relative to expected starting salary.',
  },
  {
    id: 'work-study',
    term: 'Work-Study',
    definition:
      'A federal program that funds part-time campus jobs for students with financial need. You earn a paycheck (up to your award limit) and can use it for expenses.',
    category: 'Aid Terms',
    whyMatter: 'It\'s not free money upfront — you must work to earn it — but jobs are often flexible and campus-based.',
  },
  {
    id: 'npc',
    term: 'Net Price Calculator (NPC)',
    definition:
      'A free tool every college must publish on its website that estimates your family\'s net price based on basic financial info. Accuracy varies widely by school.',
    category: 'Aid Terms',
    whyMatter: 'Running every target school\'s NPC before applying gives a realistic cost range and helps avoid "dream school" sticker shock.',
  },
  {
    id: 'ed',
    term: 'Early Decision (ED)',
    definition:
      'A binding early application round (typically November deadline) where you commit to attend if admitted and withdraw all other applications. Schools often admit at higher rates in ED.',
    category: 'Application Terms',
    whyMatter: 'ED can boost admission odds, but binding commitment is risky if the financial aid package turns out insufficient.',
  },
  {
    id: 'ea',
    term: 'Early Action (EA)',
    definition:
      'A non-binding early application round that lets you hear back sooner (often December) without any obligation to attend or withdraw other applications.',
    category: 'Application Terms',
    whyMatter: 'EA gives you more time to compare offers and is generally lower risk than ED since you\'re not locked in.',
  },
  {
    id: 'rea',
    term: 'Restricted Early Action (REA)',
    definition:
      'A non-binding early round offered at a handful of elite schools (e.g., Harvard, Stanford) that restricts you from applying ED or EA to most other private colleges simultaneously.',
    category: 'Application Terms',
    whyMatter: 'REA at a reach school limits your early options, so weigh the potential admission boost against losing EA flexibility elsewhere.',
  },
  {
    id: 'rd',
    term: 'Regular Decision (RD)',
    definition:
      'The standard application round with deadlines typically in January, decisions in March–April, and a May 1 national reply date. Non-binding until you pay the enrollment deposit.',
    category: 'Application Terms',
    whyMatter: 'RD is the broadest round and lets you compare all offers before committing — best default strategy for most students.',
  },
  {
    id: 'psat',
    term: 'PSAT/NMSQT',
    definition:
      'The Preliminary SAT / National Merit Scholarship Qualifying Test taken in 10th or 11th grade. Scores practice for the SAT and high 11th-grade scorers qualify for National Merit recognition.',
    category: 'Testing Terms',
    whyMatter: 'National Merit Finalist status can unlock significant scholarships at hundreds of colleges, sometimes full rides.',
  },
  {
    id: 'sat',
    term: 'SAT',
    definition:
      'A standardized college admissions test scored 400–1600, covering evidence-based reading/writing and math. Now offered in a digital adaptive format.',
    category: 'Testing Terms',
    whyMatter: 'Many schools use SAT scores for admissions and merit aid decisions — a strong score can open doors and funding.',
  },
  {
    id: 'act',
    term: 'ACT',
    definition:
      'A standardized college admissions test scored 1–36, covering English, math, reading, and science. Accepted everywhere the SAT is; some students score significantly better on one vs. the other.',
    category: 'Testing Terms',
    whyMatter: 'Taking both tests and submitting the better score is often worth it — test prep ROI can be high relative to merit aid impact.',
  },
];

/* ─── Category color map ─────────────────────────────── */
const CATEGORY_COLORS: Record<VocabCategory, string> = {
  'Aid Terms':         '#bfdbfe', // blue-100
  'Application Terms': '#d9f99d', // lime-200
  'Testing Terms':     '#fde68a', // amber-200
  'Deadlines':         '#fecaca', // red-200
};

const CATEGORY_TEXT: Record<VocabCategory, string> = {
  'Aid Terms':         '#1d4ed8',
  'Application Terms': '#365314',
  'Testing Terms':     '#92400e',
  'Deadlines':         '#991b1b',
};

const ALL_CATEGORIES: VocabCategory[] = ['Aid Terms', 'Application Terms', 'Testing Terms', 'Deadlines'];

/* ─── Sub-components ─────────────────────────────────── */
const CategoryBadge: React.FC<{ category: VocabCategory }> = ({ category }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 7px',
    borderRadius: 99,
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    background: CATEGORY_COLORS[category],
    color: CATEGORY_TEXT[category],
    flexShrink: 0,
  }}>
    {category}
  </span>
);

const TermCard: React.FC<{ term: VocabTerm }> = ({ term: t }) => (
  <div style={{
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    boxShadow: 'inset 0 1px 0 var(--inner-highlight)',
    marginBottom: 8,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent)', lineHeight: 1.3 }}>
        {t.term}
      </span>
      <CategoryBadge category={t.category} />
    </div>
    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5 }}>
      {t.definition}
    </p>
    {t.whyMatter && (
      <p style={{ margin: '5px 0 0', fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600 }}>Why it matters: </span>{t.whyMatter}
      </p>
    )}
  </div>
);

/* ─── Main component ─────────────────────────────────── */
const FAVocabulary: React.FC = () => {
  const [query, setQuery]             = useState('');
  const [activeCategory, setActiveCategory] = useState<VocabCategory | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMS.filter(t => {
      const matchSearch = !q ||
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.whyMatter?.toLowerCase().includes(q) ?? false);
      const matchCat = !activeCategory || t.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [query, activeCategory]);

  const toggleCategory = (cat: VocabCategory) => {
    setActiveCategory(prev => prev === cat ? null : cat);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '12px 14px 8px', flexShrink: 0 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search terms…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px 12px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '0.82rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 10px', flexShrink: 0 }}>
        {ALL_CATEGORIES.map(cat => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                padding: '3px 11px',
                borderRadius: 99,
                border: active ? `1.5px solid ${CATEGORY_TEXT[cat]}` : '1.5px solid var(--border)',
                background: active ? CATEGORY_COLORS[cat] : 'var(--surface)',
                color: active ? CATEGORY_TEXT[cat] : 'var(--text-dim)',
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Term list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '0.82rem',
            marginTop: 32,
          }}>
            No terms match your search
          </div>
        ) : (
          filtered.map(t => <TermCard key={t.id} term={t} />)
        )}
      </div>
    </div>
  );
};

export default FAVocabulary;
