/**
 * Points the officer looks at, surfaced from what the user already told us.
 *
 * The line this must not cross: we are not assessing the application. A licensed
 * consultant assessing someone's chances is advice, and advice is the paid
 * consultation. What this does is narrower and defensible: it names the factors
 * an officer weighs under IRPR 179(b) (will this person leave at the end of the
 * authorised stay) and points out which ones the user's own answers touch.
 *
 * Two rules follow from that, and both matter:
 *
 *   1. FLAG ONLY, NEVER REASSURE. There is no "you look fine" branch and no
 *      score. Telling someone their application looks strong is both advice and
 *      a liability if they are then refused -- it is the licensed consultant who
 *      wears that. Silence on a factor means we said nothing about it, not that
 *      it is fine.
 *   2. NO VERDICT. Touching a factor is not a prediction. A refusal history is
 *      not fatal and a clean one is not a pass; that is exactly why it takes a
 *      human looking at the whole file, which is the honest reason to consult.
 *   3. NAME THE FACTOR, EXPLAIN NOTHING. Each line just restates what the user
 *      told us. Spelling out how an officer weighs it would be a bigger target
 *      if we got it wrong -- peers read this page too -- and reads as an opinion
 *      whatever the disclaimer says. The explaining is the consultation.
 *
 * Everything is derived in the page from answers the user already gave. Nothing
 * is sent anywhere.
 */

/** @returns {{id,title}[]} -- the factor named, and nothing else. */
export function riskFlags(state, rows) {
  const f = [];
  const has = (v) => v === 'Y';

  // ── immigration history ──────────────────────────────────────────────────
  if (has(state.vc2)) {
    f.push({
      id: 'refused',
      title: '你曾被拒签、被拒入境或被要求离境',
    });
  }
  if (has(state.vc1)) {
    f.push({
      id: 'status',
      title: '你曾在加拿大逾期居留、无授权工作或无授权学习',
    });
  }
  if (has(state.bg3)) {
    f.push({
      id: 'criminal',
      title: '你有犯罪、被捕、被指控或被判刑的记录',
    });
  }

  // ── ties to home: family ─────────────────────────────────────────────────
  const kids = (rows?.children || []).filter((r) => r.name);
  const allAccompanying =
    kids.length > 0 && kids.every((r) => r.acc === 'Y') && (state.hasSpouse !== 'Y' || state.spouse5645Acc === 'Y');
  if (allAccompanying) {
    f.push({
      id: 'ties-family-all',
      title: '你的配偶和子女都与你同行',
    });
  } else if (state.marital === '02' && kids.length === 0) {
    f.push({
      id: 'ties-family-single',
      title: '你单身且没有子女',
    });
  }

  // ── ties to home: employment ─────────────────────────────────────────────
  // Read the current job off the employment rows -- the same ones both forms use.
  const job = (rows?.employment || []).find((r) => r.position || r.employer) || {};
  const occ = String(job.position || '').toLowerCase();
  if (!job.position || /retired|unemployed|homemaker|student|无业|退休/.test(occ)) {
    f.push({
      id: 'ties-work',
      title: '你目前没有在职工作（退休 / 待业 / 学生 / 家庭主妇）',
    });
  }

  // ── travel history ───────────────────────────────────────────────────────
  const trips = (rows?.travel || []).filter((r) => r.from || r.description);
  if (trips.length === 0) {
    f.push({
      id: 'no-travel',
      title: '你没有填写任何出入境记录',
    });
  }

  // ── purpose and length ───────────────────────────────────────────────────
  if (state.purpose === '03') {
    f.push({
      id: 'purpose-other',
      title: '你的访问目的选了「其它」',
    });
  }
  const days = daysBetween(state.stayFrom, state.stayTo);
  if (days != null && days > 180) {
    f.push({
      id: 'long-stay',
      title: `你计划停留约 ${days} 天（超过 6 个月）`,
    });
  }

  return f;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const d = (new Date(b) - new Date(a)) / 86400000;
  return Number.isFinite(d) ? Math.round(d) : null;
}
