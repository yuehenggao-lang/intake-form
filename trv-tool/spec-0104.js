/**
 * IMM0104 (Schedule 1 - Details of Education / Employment / Travel) definition.
 *
 * This one is dynamic XFA: the blank pre-creates only ONE row per table, and rows
 * come from <occur>. Filling N rows means datasets gets N same-named <Row1>
 * siblings, the template's <occur> gets min/initial=N, and the form packet is
 * cleared -- see XfaFiller.setRows, ported from scripts/fill_imm0104_multirow.py.
 *
 * Content rules below are Steven's, learned the hard way on real cases; they are
 * mechanical formatting, not advice about what to declare.
 */

export const SPEC_0104 = {
  title: '教育 / 工作 / 旅行史',
  boxes: [
    {
      num: '1',
      title: '工作经历',
      hint: '按时间倒序填，最近的在最上面。这里填一次，IMM5257 和 IMM0104 都会用到。退休/待业也如实填。注意：IMM5257 只有 3 行，会取最上面 3 条（它只问近 10 年）；IMM0104 会全部收录。',
      repeat: {
        key: 'employment',
        max: 8,
        table: 'EmploymentTbl',
        addLabel: '添加一段工作',
        fields: [
          { id: 'from', label: '起始日期', type: 'date', row: 'two', cell: 'from' },
          { id: 'to', label: '结束日期', hint: '至今填今天的日期', type: 'date', row: 'two', cell: 'to' },
          { id: 'position', label: '职位', type: 'occupation', row: 'two', cell: 'position' },
          { id: 'employer', romanize: 'company', label: '雇主 / 公司', hint: '不要写街道地址', type: 'text', row: 'two' },
          { id: 'city', romanize: 'address', label: '城市', type: 'text', row: 'three' },
          { id: 'prov', romanize: 'address', label: '省 / 州', type: 'text', row: 'three' },
          { id: 'country', label: '国家或地区', type: 'select', lov: 'CountryList', row: 'three' },
        ],
      },
    },
    {
      num: '2',
      title: '教育经历',
      hint: '只填高中之后的（大学 / 大专 / 职业培训）。初中高中不要填。没有就不加 —— IMM5257 上「是否上过大专或大学」会据此自动作答。IMM5257 只问最高学历，会取下面的第 1 条：如果你的最高学历不是最近这段，把它排到第 1 条。',
      repeat: {
        key: 'education',
        max: 6,
        table: 'EducationTbl',
        addLabel: '添加一段学历',
        fields: [
          { id: 'from', label: '起始日期', type: 'date', row: 'two', cell: 'from' },
          { id: 'to', label: '结束日期', type: 'date', row: 'two', cell: 'to' },
          { id: 'position', label: '学位 / 专业', hint: "如 Bachelor's degree in English Education", type: 'text', cell: 'position' },
          { id: 'school', romanize: 'company', label: '学校', type: 'text', row: 'two' },
          { id: 'description', label: '就读方式', type: 'select', row: 'two', cell: 'description',
            options: [{ code: 'Full-time', label: '全日制 Full-time' }, { code: 'Part-time', label: '非全日制 Part-time' }] },
          { id: 'city', romanize: 'address', label: '城市', type: 'text', row: 'three' },
          { id: 'prov', romanize: 'address', label: '省 / 州', type: 'text', row: 'three' },
          { id: 'country', label: '国家或地区', type: 'select', lov: 'CountryList', row: 'three' },
        ],
      },
    },
    {
      num: '3',
      title: '出入境记录',
      hint: '按时间倒序填，最近的在最上面。',
      repeat: {
        key: 'travel',
        max: 10,
        table: 'TravelTbl',
        addLabel: '添加一次出行',
        fields: [
          { id: 'from', label: '起始日期', type: 'date', row: 'two', cell: 'from' },
          { id: 'to', label: '结束日期', type: 'date', row: 'two', cell: 'to' },
          // The form's columns read the other way round from the field names.
          { id: 'name', label: '出行目的', type: 'select', row: 'two', cell: 'name',
            options: [
              { code: 'Tourism', label: '旅游 Tourism' }, { code: 'Business', label: '商务 Business' },
              { code: 'Family Visit', label: '探亲 Family Visit' }, { code: 'Study', label: '学习 Study' },
              { code: 'Work', label: '工作 Work' }, { code: 'Transit', label: '过境 Transit' },
            ] },
          { id: 'description', romanize: 'address', label: '城市，国家', hint: '必须写城市，如 Bangkok, Thailand', type: 'text', row: 'two', cell: 'description' },
        ],
      },
    },
  ],
};

/** Signature block: print the name, leave the drawn signature empty for the
 *  applicant to sign. Steven's convention is "SURNAME, Given" -- surname upper,
 *  given name title case. */
export const signature0104 = (family, given, date) => {
  const g = (given || '').trim();
  const titled = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : '';
  const name = [(family || '').trim().toUpperCase(), titled].filter(Boolean).join(', ');
  const out = {};
  if (name) out['IMM_0104/Page1/SignatureSub/name'] = name;
  if (date) out['IMM_0104/Page1/SignatureSub/dateSigned'] = date;
  return out;
};
