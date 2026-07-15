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
      hint: '按时间倒序填，最近的在最上面。行数写不下时被截掉的是最旧的那些。退休/待业也如实填。',
      repeat: {
        key: 'employment',
        max: 8,
        table: 'EmploymentTbl',
        addLabel: '添加一段工作',
        fields: [
          { id: 'from', label: '起始日期', type: 'date', row: 'two', cell: 'from' },
          { id: 'to', label: '结束日期', hint: '至今填今天的日期', type: 'date', row: 'two', cell: 'to' },
          { id: 'name', romanize: 'company', label: '雇主 / 公司，城市，国家', hint: '不要写街道地址', type: 'text', cell: 'name' },
          { id: 'position', label: '职位', type: 'occupation', cell: 'position' },
        ],
      },
    },
    {
      num: '2',
      title: '教育经历',
      hint: '只填高中之后的（大学 / 大专 / 职业培训）。初中高中不要填。没有就不加。',
      repeat: {
        key: 'education',
        max: 6,
        table: 'EducationTbl',
        addLabel: '添加一段学历',
        fields: [
          { id: 'from', label: '起始日期', type: 'date', row: 'two', cell: 'from' },
          { id: 'to', label: '结束日期', type: 'date', row: 'two', cell: 'to' },
          { id: 'name', romanize: 'company', label: '学校，城市，国家', type: 'text', cell: 'name' },
          { id: 'position', label: '学位 / 专业', hint: "如 Bachelor's degree in English Education", type: 'text', row: 'two', cell: 'position' },
          { id: 'description', label: '就读方式', type: 'select', row: 'two', cell: 'description',
            options: [{ code: 'Full-time', label: '全日制 Full-time' }, { code: 'Part-time', label: '非全日制 Part-time' }] },
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
export const signature0104 = (family, given) => {
  const g = (given || '').trim();
  const titled = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : '';
  const name = [(family || '').trim().toUpperCase(), titled].filter(Boolean).join(', ');
  return name ? { 'IMM_0104/Page1/SignatureSub/name': name } : {};
};
