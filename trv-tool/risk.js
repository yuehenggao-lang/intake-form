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
 *
 * Everything is derived in the page from answers the user already gave. Nothing
 * is sent anywhere.
 */

/** @returns {{id,title,why}[]} in rough order of how much weight officers give them. */
export function riskFlags(state, rows) {
  const f = [];
  const has = (v) => v === 'Y';

  // ── immigration history ──────────────────────────────────────────────────
  if (has(state.vc2)) {
    f.push({
      id: 'refused',
      title: '你曾被拒签、被拒入境或被要求离境',
      why: '签证官会调阅上一次的拒签理由。如果这次递交的材料没有正面回应当初被拒的那一点，很容易按同样的理由再拒一次。',
    });
  }
  if (has(state.vc1)) {
    f.push({
      id: 'status',
      title: '你曾在加拿大逾期居留、无授权工作或无授权学习',
      why: '这直接影响签证官对「你会不会按时离境」的判断，通常也是审查最严的一类历史。',
    });
  }
  if (has(state.bg3)) {
    f.push({
      id: 'criminal',
      title: '你有犯罪、被捕、被指控或被判刑的记录',
      why: '这涉及可入境性（admissibility），与「会不会按时离境」是两条独立的审查线，可能需要单独处理。',
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
      why: '签证官会看你在国内还剩下什么牵挂。直系亲属全部随行时，这一项通常需要用其它方面的联系来补。',
    });
  } else if (state.marital === '02' && kids.length === 0) {
    f.push({
      id: 'ties-family-single',
      title: '你单身且没有子女',
      why: '家庭牵挂是签证官评估「会按时回国」时看的一项。这不是缺点，但意味着工作、财产等其它方面的联系会被看得更重。',
    });
  }

  // ── ties to home: employment ─────────────────────────────────────────────
  const occ = String(state.occ1Title || '').toLowerCase();
  if (/retired|unemployed|homemaker|student/.test(occ) || !state.occ1Employer) {
    f.push({
      id: 'ties-work',
      title: '你目前没有在职工作（退休 / 待业 / 学生 / 家庭主妇）',
      why: '在职工作是签证官常看的一项联系。没有的话，通常靠资金、房产、家庭等其它方面来体现。',
    });
  }

  // ── travel history ───────────────────────────────────────────────────────
  const trips = (rows?.travel || []).filter((r) => r.from || r.description);
  if (trips.length === 0) {
    f.push({
      id: 'no-travel',
      title: '你没有填写任何出入境记录',
      why: '过往按时回国的出行记录，是证明「这次也会按时回」最直接的一种材料。完全没有出境史的申请，签证官通常看得更仔细。',
    });
  }

  // ── purpose and length ───────────────────────────────────────────────────
  if (state.purpose === '03') {
    f.push({
      id: 'purpose-other',
      title: '你的访问目的选了「其它」',
      why: '不属于标准选项的目的，需要把来意讲清楚。这一栏字数有限，通常要靠说明信补充。',
    });
  }
  const days = daysBetween(state.stayFrom, state.stayTo);
  if (days != null && days > 180) {
    f.push({
      id: 'long-stay',
      title: `你计划停留约 ${days} 天（超过 6 个月）`,
      why: '一般访客身份最长停留 6 个月。超过就涉及不同的申请方式和材料，不是把日期填长就可以。',
    });
  }

  return f;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const d = (new Date(b) - new Date(a)) / 86400000;
  return Number.isFinite(d) ? Math.round(d) : null;
}
