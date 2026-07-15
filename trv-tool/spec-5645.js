/**
 * IMM5645 (Family Information) form definition.
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

const person = (id, zh, base, opts = {}) => [
  { id: `${id}Name`, latin: true, label: `${zh}姓名（拼音）`, type: 'text', row: 'two',
    req: opts.req, showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.nameField}`]: v }) },
  { id: `${id}DOB`, label: `${zh}出生日期`, type: 'date', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.dobField}`]: v }) },
  { id: `${id}COB`, romanize: 'address', label: `${zh}出生国家`, type: 'text', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.cobField}`]: v }) },
  { id: `${id}MStatus`, label: `${zh}婚姻状况`, type: 'select', row: 'two', showIf: opts.showIf,
    options: opts.mstatus,
    paths: (v) => ({ [`${base}/ChildMStatus`]: v }) },
  { id: `${id}Address`, romanize: 'address', label: `${zh}现居地址`, hint: '已故填 Deceased', type: 'text', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.addrField}`]: v }) },
  { id: `${id}Occupation`, label: `${zh}职业`, type: 'occupation', row: 'two', showIf: opts.showIf,
    paths: (v) => ({ [`${base}/${opts.occField}`]: v }) },
  ...(opts.accYes
    ? [{ id: `${id}Acc`, label: `${zh}是否与你同行前往加拿大？`, type: 'yn', row: 'two', showIf: opts.showIf,
        paths: acc(`${base}/${opts.accYes}`, `${base}/${opts.accNo}`) }]
    : []),
];

export const SPEC_5645 = {
  title: '家庭信息',
  boxes: [
    {
      num: 'A',
      title: '申请人本人',
      hint: '这几项从前面自动带过来，核对即可。',
      fields: [
        { id: 'f5645AppName', latin: true, label: '姓名（拼音）', type: 'text', req: true, row: 'two',
          paths: (v) => ({ [`${P}/SectionA/Applicant/AppName`]: v }) },
        { id: 'f5645AppDOB', label: '出生日期', type: 'date', req: true, row: 'two',
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
          hint: '已故配偶也要填 —— 选「是」，地址栏写 Deceased', type: 'yn', req: true, paths: () => ({}) },
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
      hint: '已故的也要填，婚姻状况选对应项、地址写 Deceased。',
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
      hint: '所有子女都要填，不论年龄、是否同住、是否随行。最多 4 位。',
      repeat: {
        key: 'children',
        max: 4, // the blank pre-creates 4 <Child> nodes
        addLabel: '添加子女',
        base: (i) => `${P}/SectionB/Child${i ? `[${i}]` : ''}`,
        fields: [
          { id: 'name', latin: true, label: '姓名（拼音）', type: 'text', row: 'two', path: 'ChildName' },
          { id: 'rel', label: '关系', type: 'select', row: 'two', path: 'ChildRelationship',
            options: [
              { code: 'Son', label: '儿子 Son' }, { code: 'Daughter', label: '女儿 Daughter' },
              { code: 'Step-son', label: '继子 Step-son' }, { code: 'Step-daughter', label: '继女 Step-daughter' },
              { code: 'Adopted son', label: '养子 Adopted son' }, { code: 'Adopted daughter', label: '养女 Adopted daughter' },
            ] },
          { id: 'dob', label: '出生日期', type: 'date', row: 'two', path: 'ChildDOB' },
          { id: 'mstatus', label: '婚姻状况', type: 'select', row: 'two', path: 'ChildMStatus', options: MSTATUS_7 },
          { id: 'cob', romanize: 'address', label: '出生国家', type: 'text', row: 'two', path: 'ChildCOB' },
          { id: 'occ', label: '职业', type: 'occupation', row: 'two', path: 'ChildOccupation' },
          { id: 'addr', romanize: 'address', label: '现居地址', type: 'text', path: 'ChildAddress' },
          { id: 'acc', label: '是否与你同行？', type: 'yn', path: 'ChildYes/ChildNo', kind: 'acc' },
        ],
      },
    },
    {
      num: 'C',
      title: '兄弟姐妹',
      hint: '包括同父异母 / 同母异父。最多 7 位。',
      repeat: {
        key: 'siblings',
        max: 7, // the blank pre-creates 7 <Child> nodes under SectionC
        addLabel: '添加兄弟姐妹',
        base: (i) => `${P}/SectionC/Child${i ? `[${i}]` : ''}`,
        fields: [
          { id: 'name', latin: true, label: '姓名（拼音）', type: 'text', row: 'two', path: 'ChildName' },
          { id: 'rel', label: '关系', type: 'select', row: 'two', path: 'ChildRelationship',
            options: [
              { code: 'Brother', label: '兄弟 Brother' }, { code: 'Sister', label: '姐妹 Sister' },
              { code: 'Half-brother', label: '同父异母/同母异父兄弟 Half-brother' },
              { code: 'Half-sister', label: '同父异母/同母异父姐妹 Half-sister' },
              { code: 'Step-brother', label: '继兄弟 Step-brother' }, { code: 'Step-sister', label: '继姐妹 Step-sister' },
            ] },
          { id: 'dob', label: '出生日期', type: 'date', row: 'two', path: 'ChildDOB' },
          { id: 'mstatus', label: '婚姻状况', type: 'select', row: 'two', path: 'ChildMStatus', options: MSTATUS_7 },
          { id: 'cob', romanize: 'address', label: '出生国家', type: 'text', row: 'two', path: 'ChildCOB' },
          { id: 'occ', label: '职业', type: 'occupation', row: 'two', path: 'ChildOccupation' },
          { id: 'addr', romanize: 'address', label: '现居地址', type: 'text', path: 'ChildAddress' },
          { id: 'acc', label: '是否与你同行？', type: 'yn', path: 'ChildYes/ChildNo', kind: 'acc' },
        ],
      },
    },
  ],
};

/** Signature dates. The drawn signature stays empty for the applicant. */
export const dates5645 = (d) => ({
  'IMM_5645/page1/SectionA/SectionAdate': d,
  'IMM_5645/page1/SectionB/SectionBdate': d,
  'IMM_5645/page1/SectionC/SectionCdate': d,
});

/** The application-type checkboxes at the top of the form. */
export const visaTypeBoxes = (visaType) => ({
  [`IMM_5645/page1/Subform1/Visitor`]: '1',
  [`IMM_5645/page1/Subform1/Worker`]: '0',
  [`IMM_5645/page1/Subform1/Student`]: '0',
  [`IMM_5645/page1/Subform1/Other`]: '0',
});
