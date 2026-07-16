/**
 * IMM5645 (Family Information) form definition.
 *
 * Names here are NOT the same rule as IMM5257. 5257 must match the passport, so
 * it refuses Chinese. 5645 wants the Chinese characters as well: 98% of 104
 * portal-accepted submissions write the name as "Hongyang Ren 任红阳" -- pinyin
 * then the Chinese name. So each person here has a separate 中文名 field, and
 * that one field is exempt from the CJK guard.
 *
 * Formats verified against 112 Acrobat-filled, portal-accepted copies rather than
 * against fill_forms.py output -- that pipeline is the same one that wrote
 * "CAD 17,000" into a numeric field for years.
 *
 * The trap here: `ChildMStatus` is one field name but the template gives it a
 * DIFFERENT item list depending on where it sits. Applicant and spouse get 8
 * options (Married is split into physically present / not), everyone else gets 7.
 * So code 5 means "Married-physically present" in the first block and plain
 * "Married" everywhere else, and 7 means "Single" in the first block but
 * "Widowed" in the rest. One shared code table would silently write the wrong
 * marital status, so each block carries its own.
 */

const P = 'IMM_5645/page1';

// 8-option list: applicant + spouse only
export const MSTATUS_8 = [
  { code: '7', label: '单身 Single' },
  { code: '5', label: '已婚（配偶同住）Married - physically present' },
  { code: '6', label: '已婚（配偶不同住）Married - not physically present' },
  { code: '2', label: '同居 Common-law' },
  { code: '3', label: '离异 Divorced' },
  { code: '4', label: '分居 Legally separated' },
  { code: '8', label: '丧偶 Widowed' },
  { code: '1', label: '婚姻撤销 Annulled marriage' },
];

// 7-option list: parents, children, siblings
export const MSTATUS_7 = [
  { code: '6', label: '单身 Single' },
  { code: '5', label: '已婚 Married' },
  { code: '2', label: '同居 Common-law' },
  { code: '3', label: '离异 Divorced' },
  { code: '4', label: '分居 Legally separated' },
  { code: '7', label: '丧偶 Widowed' },
  { code: '1', label: '婚姻撤销 Annulled marriage' },
];

/** Accompanying-to-Canada is a pair of independent 0/1 checkboxes, not an
 *  exclGroup, so both have to be written. */
const acc = (yesPath, noPath) => (v) => ({ [yesPath]: v === 'Y' ? '1' : '0', [noPath]: v === 'Y' ? '0' : '1' });

/** "WANG, Xiulan 王秀兰" -- Steven's convention: SURNAME, Given, then the Chinese
 *  characters. The form asks for names "in English AND in your native language",
 *  so English alone is wrong. */
export const joinName = (pinyin, zh) => [String(pinyin || '').trim(), String(zh || '').trim()].filter(Boolean).join(' ');

const person = (id, zh, base, opts = {}) => [
  // no `upper` here: the convention is "SURNAME, Given", so upper-casing the lot
  // would give "SURNAME, GIVEN".
  { id: `${id}Name`, latin: true, label: `${zh}姓名（拼音）`, hint: '请写成 SURNAME, Given', type: 'text', row: 'two',
    req: opts.req, showIf: opts.showIf,
    paths: (v, s) => ({ [`${base}/${opts.nameField}`]: joinName(v, s[`${id}Zh`]) }) },
  { id: `${id}Zh`, cjk: true, label: `${zh}中文名`, hint: 'IMM5645 要求同时填写中文姓名', type: 'text', row: 'two',
    showIf: opts.showIf,
    paths: () => ({}) },  // folded into the name field above
  { id: `${id}DOB`, past: true, label: `${zh}出生日期`, type: 'date', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.dobField}`]: v }) },
  { id: `${id}COB`, romanize: 'address', label: `${zh}出生国家`, type: 'text', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.cobField}`]: v }) },
  { id: `${id}MStatus`, label: `${zh}婚姻状况`, type: 'select', row: 'two', showIf: opts.showIf,
    options: opts.mstatus,
    paths: (v) => ({ [`${base}/ChildMStatus`]: v }) },
  { id: `${id}Address`, romanize: 'address', label: `${zh}现居地址`, hint: '已故请按表头要求填写：Deceased + 城市, 国家, 日期', type: 'text', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.addrField}`]: v }) },
  { id: `${id}Occupation`, label: `${zh}职业`, type: 'occupation', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.occField}`]: v }) },
  ...(opts.accYes
    ? [{ id: `${id}Acc`, label: `${zh}是否与您同行前往加拿大？`, type: 'yn', row: 'two', showIf: opts.showIf,
        paths: acc(`${base}/${opts.accYes}`, `${base}/${opts.accNo}`) }]
    : []),
];

export const SPEC_5645 = {
  title: '家庭信息',
  boxes: [
    {
      num: 'A',
      title: '申请人本人',
      hint: '以下几项已从前面的回答自动带入，请核对。',
      fields: [
        { id: 'f5645AppName', latin: true, label: '姓名（拼音）', hint: '请写成 SURNAME, Given', type: 'text', req: true, row: 'two',
          paths: (v, s) => ({ [`${P}/SectionA/Applicant/AppName`]: joinName(v, s.f5645AppZh) }) },
        { id: 'f5645AppZh', cjk: true, label: '中文名', hint: 'IMM5645 要求同时填写中文姓名', type: 'text', req: true, row: 'two',
          paths: () => ({}) },
        { id: 'f5645AppDOB', past: true, label: '出生日期', type: 'date', req: true, row: 'two',
          paths: (v) => ({ [`${P}/SectionA/Applicant/AppDOB`]: v }) },
        { id: 'f5645AppCOB', romanize: 'address', label: '出生国家', type: 'text', req: true, row: 'two',
          paths: (v) => ({ [`${P}/SectionA/Applicant/AppCOB`]: v }) },
        { id: 'f5645AppMStatus', label: '婚姻状况', type: 'select', req: true, row: 'two', options: MSTATUS_8,
          paths: (v) => ({ [`${P}/SectionA/Applicant/ChildMStatus`]: v }) },
        { id: 'f5645AppAddress', romanize: 'address', label: '现居地址', type: 'text', req: true,
          paths: (v) => ({ [`${P}/SectionA/Applicant/AppAddress`]: v }) },
        { id: 'f5645AppOcc', label: '职业', type: 'occupation', req: true, row: 'two',
          paths: (v) => ({ [`${P}/SectionA/Applicant/AppOccupation`]: v }) },
      ],
    },
    {
      num: 'A',
      title: '配偶 / 同居伴侣',
      fields: [
        // A widow answering "no" here would drop her late spouse off the form,
        // and IRCC wants him listed. Ask it as "is there a spouse to record".
        { id: 'hasSpouse', label: '需要填写配偶 / 同居伴侣吗？',
          hint: '已故配偶也需要填写，请选「是」', type: 'yn', req: true, paths: () => ({}) },
        ...person('spouse5645', '配偶', `${P}/SectionA/Spouse`, {
          showIf: (s) => s.hasSpouse === 'Y',
          nameField: 'SpouseName', dobField: 'SpouseDOB', cobField: 'SpouseCOB',
          addrField: 'SpouseAddress', occField: 'SpouseOccupation',
          accYes: 'SpouseYes', accNo: 'SpouseNo', mstatus: MSTATUS_8,
        }),
      ],
    },
    {
      num: 'A',
      title: '父母',
      hint: '已故的父母也需要填写。婚姻状况按生前情况填写；地址栏按表头要求写「Deceased + 城市, 国家, 去世日期」。',
      fields: [
        ...person('mother', '母亲', `${P}/SectionA/Mother`, {
          nameField: 'MotherName', dobField: 'MotherDOB', cobField: 'MotherCOB',
          addrField: 'MotherAddress', occField: 'MotherOccupation',
          accYes: 'MotherYes', accNo: 'MotherNo', mstatus: MSTATUS_7,
        }),
        ...person('father', '父亲', `${P}/SectionA/Father`, {
          nameField: 'FatherName', dobField: 'FatherDOB', cobField: 'FatherCOB',
          addrField: 'FatherAddress', occField: 'FatherOccupation',
          accYes: 'FatherYes', accNo: 'FatherNo', mstatus: MSTATUS_7,
        }),
      ],
    },
    {
      num: 'B',
      title: '子女',
      hint: '所有子女都需要填写，不论年龄、是否同住、是否随行。最多 4 位。',
      repeat: {
        key: 'children',
        max: 4, // the blank pre-creates 4 <Child> nodes
        addLabel: '添加子女',
        base: (i) => `${P}/SectionB/Child${i ? `[${i}]` : ''}`,
        fields: [
          { id: 'name', latin: true, label: '姓名（拼音）', hint: 'SURNAME, Given', type: 'text', row: 'two', path: 'ChildName', joinZh: 'zh' },
          { id: 'zh', cjk: true, label: '中文名', type: 'text', row: 'two' },
          { id: 'rel', label: '关系', type: 'select', row: 'two', path: 'ChildRelationship',
            options: [
              { code: 'Son', label: '儿子 Son' }, { code: 'Daughter', label: '女儿 Daughter' },
              { code: 'Step-son', label: '继子 Step-son' }, { code: 'Step-daughter', label: '继女 Step-daughter' },
              { code: 'Adopted son', label: '养子 Adopted son' }, { code: 'Adopted daughter', label: '养女 Adopted daughter' },
            ] },
          { id: 'dob', past: true, label: '出生日期', type: 'date', row: 'two', path: 'ChildDOB' },
          { id: 'mstatus', label: '婚姻状况', type: 'select', row: 'two', path: 'ChildMStatus', options: MSTATUS_7 },
          { id: 'cob', romanize: 'address', label: '出生国家', type: 'text', row: 'two', path: 'ChildCOB' },
          { id: 'occ', label: '职业', type: 'occupation', row: 'two', path: 'ChildOccupation' },
          { id: 'addr', romanize: 'address', label: '现居地址', type: 'text', path: 'ChildAddress' },
          { id: 'acc', label: '是否与您同行？', type: 'yn', path: 'ChildYes/ChildNo', kind: 'acc' },
        ],
      },
    },
    {
      num: 'C',
      title: '兄弟姐妹',
      hint: '包括同父异母、同母异父的兄弟姐妹。最多 7 位。',
      repeat: {
        key: 'siblings',
        max: 7, // the blank pre-creates 7 <Child> nodes under SectionC
        addLabel: '添加兄弟姐妹',
        base: (i) => `${P}/SectionC/Child${i ? `[${i}]` : ''}`,
        fields: [
          { id: 'name', latin: true, label: '姓名（拼音）', hint: 'SURNAME, Given', type: 'text', row: 'two', path: 'ChildName', joinZh: 'zh' },
          { id: 'zh', cjk: true, label: '中文名', type: 'text', row: 'two' },
          { id: 'rel', label: '关系', type: 'select', row: 'two', path: 'ChildRelationship',
            options: [
              { code: 'Brother', label: '兄弟 Brother' }, { code: 'Sister', label: '姐妹 Sister' },
              { code: 'Half-brother', label: '同父异母/同母异父兄弟 Half-brother' },
              { code: 'Half-sister', label: '同父异母/同母异父姐妹 Half-sister' },
              { code: 'Step-brother', label: '继兄弟 Step-brother' }, { code: 'Step-sister', label: '继姐妹 Step-sister' },
            ] },
          { id: 'dob', past: true, label: '出生日期', type: 'date', row: 'two', path: 'ChildDOB' },
          { id: 'mstatus', label: '婚姻状况', type: 'select', row: 'two', path: 'ChildMStatus', options: MSTATUS_7 },
          { id: 'cob', romanize: 'address', label: '出生国家', type: 'text', row: 'two', path: 'ChildCOB' },
          { id: 'occ', label: '职业', type: 'occupation', row: 'two', path: 'ChildOccupation' },
          { id: 'addr', romanize: 'address', label: '现居地址', type: 'text', path: 'ChildAddress' },
          { id: 'acc', label: '是否与您同行？', type: 'yn', path: 'ChildYes/ChildNo', kind: 'acc' },
        ],
      },
    },
  ],
};

/**
 * Two of these three dates are negative declarations; the third is not, and the
 * field names actively mislead about which.
 *
 *   SectionAdate -> NOTE 1 "I certify that I do NOT have a spouse..."   conditional
 *   SectionBdate -> NOTE 2 "I certify that I do NOT have any children"  conditional
 *   SectionCdate -> SECTION D "I certify that the information contained in this
 *                   document is complete, accurate and factual."        ALWAYS
 *
 * Despite the name, SectionCdate has nothing to do with Section C -- Section C
 * (brothers and sisters) carries no declaration at all. In the template the field
 * sits directly under the SECTION D certification text, and across 104
 * portal-accepted submissions it is filled 104 times: 59 with siblings listed and
 * 45 without. SectionAdate meanwhile is empty in 59 of 60 filings that name a
 * spouse.
 *
 * Treating SectionCdate as conditional leaves SECTION D unsigned, which is the
 * one certification the form actually needs.
 */
export const dates5645 = (d, { hasSpouse, children }) => {
  const out = { 'IMM_5645/page1/SectionC/SectionCdate': d }; // SECTION D certification
  if (!hasSpouse) out['IMM_5645/page1/SectionA/SectionAdate'] = d; // NOTE 1
  if (!children) out['IMM_5645/page1/SectionB/SectionBdate'] = d; // NOTE 2
  return out;
};

/** The application-type checkboxes at the top of the form. */
export const visaTypeBoxes = (visaType) => ({
  [`IMM_5645/page1/Subform1/Visitor`]: '1',
  [`IMM_5645/page1/Subform1/Worker`]: '0',
  [`IMM_5645/page1/Subform1/Student`]: '0',
  [`IMM_5645/page1/Subform1/Other`]: '0',
});
