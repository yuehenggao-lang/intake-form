/**
 * Chinese -> Latin for the fields that reach the PDF.
 *
 * IMM5257 rejects CJK: type 北京 into City/Town and Acrobat flags the field and
 * Validate fails. So anything a user types in Chinese has to be romanized before
 * it is written into the form.
 *
 * This runs entirely in the page. Nothing is sent anywhere, which is the whole
 * privacy proposition, so a translation API is not an option here.
 *
 * Three different jobs, deliberately not one:
 *   - names      -> refuse. The passport's romanization is the only authority and
 *                   pinyin is ambiguous (单 is Shan as a surname but Dan as a word;
 *                   pinyin-pro gets 单田芳 wrong). A wrong guess means the form no
 *                   longer matches the passport, which is a refusal, so we make the
 *                   user copy it instead.
 *   - addresses  -> pinyin plus a term table. Nothing has to match a document, and
 *                   pinyin addresses are the norm.
 *   - vocabulary -> a table, never pinyin. 会计 is "Accountant"; "hui ji" is noise.
 *                   Closed sets are dropdowns instead (see SPEC).
 */
import { pinyin } from './vendor/pinyin-pro.mjs';

const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ]/;

export const hasCJK = (s) => CJK.test(String(s ?? ''));

const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

/** Address vocabulary, longest-first so 自治区 wins over 区. */
const ADDRESS_TERMS = [
  ['自治区', ' '], ['特别行政区', ' '], ['自治州', ' Prefecture'], ['自治县', ' County'],
  ['开发区', ' Development Zone'], ['高新区', ' Hi-Tech Zone'], ['经济区', ' Economic Zone'],
  ['住宅小区', ' Residential Community'], ['小区', ' Residential Community'],
  ['大厦', ' Building'], ['大楼', ' Building'], ['公寓', ' Apartment'],
  ['省', ' Province'], ['市辖区', ' District'], ['市', ' City'], ['区', ' District'],
  ['县', ' County'], ['镇', ' Town'], ['乡', ' Township'], ['村', ' Village'],
  ['街道', ' Street'], ['大街', ' Street'], ['街', ' Street'], ['大道', ' Avenue'],
  ['路', ' Road'], ['巷', ' Lane'], ['弄', ' Alley'],
  ['房', ' Room '],
];

/** Occupation vocabulary. Pinyin would be meaningless here, so unknown terms stay
 *  in Chinese and the caller reports them rather than guessing. */
export const OCCUPATIONS = [
  ['会计', 'Accountant'], ['教师', 'Teacher'], ['学生', 'Student'], ['工程师', 'Engineer'],
  ['软件工程师', 'Software Engineer'], ['医生', 'Doctor'], ['护士', 'Nurse'], ['律师', 'Lawyer'],
  ['经理', 'Manager'], ['销售', 'Sales Representative'], ['销售经理', 'Sales Manager'],
  ['市场经理', 'Marketing Manager'], ['总经理', 'General Manager'], ['董事长', 'Chairman'],
  ['公务员', 'Civil Servant'], ['司机', 'Driver'], ['厨师', 'Cook'], ['农民', 'Farmer'],
  ['工人', 'Worker'], ['技术员', 'Technician'], ['文员', 'Clerk'], ['秘书', 'Secretary'],
  ['人事', 'Human Resources Officer'], ['financial', 'Financial Analyst'],
  ['退休', 'Retired'], ['无业', 'Unemployed'], ['家庭主妇', 'Homemaker'], ['自雇', 'Self-employed'],
  ['个体户', 'Self-employed'], ['商人', 'Businessperson'], ['设计师', 'Designer'],
  ['建筑师', 'Architect'], ['翻译', 'Translator'], ['记者', 'Journalist'], ['警察', 'Police Officer'],
  ['研究员', 'Researcher'], ['教授', 'Professor'], ['助理', 'Assistant'], ['主管', 'Supervisor'],
];

/** Company-name suffixes. Everything else in a company name becomes pinyin, which
 *  is what Chinese companies' own English names usually do anyway. */
const COMPANY_TERMS = [
  ['有限责任公司', ' Co., Ltd.'], ['股份有限公司', ' Co., Ltd.'], ['有限公司', ' Co., Ltd.'],
  ['集团', ' Group'], ['公司', ' Company'], ['厂', ' Factory'], ['医院', ' Hospital'],
  ['学校', ' School'], ['大学', ' University'], ['中学', ' Middle School'], ['小学', ' Primary School'],
  ['银行', ' Bank'], ['酒店', ' Hotel'], ['科技', ' Technology'], ['贸易', ' Trading'],
  ['建筑', ' Construction'], ['商店', ' Store'], ['餐厅', ' Restaurant'],
];

/** Pinyin for a run of Han characters, joined into one capitalised word.
 *  Chinese place names are written solid in English (Beijing, Chaoyang), and
 *  pinyin-pro has no word segmentation, so a run becomes a single word. Long runs
 *  therefore come out mashed together -- which is why the caller converts in place
 *  and lets the user correct the result rather than hiding it. */
function py(s) {
  const parts = pinyin(s, { toneType: 'none', type: 'array' });
  return cap(parts.join(''));
}

/** `<digits><unit>` reads the other way round in English: 88号 -> No. 88. */
const NUMBERED = [
  ['单元', 'Unit'], ['号楼', 'Building'], ['栋', 'Building'], ['幢', 'Building'],
  ['号', 'No.'], ['室', 'Room'], ['层', 'Floor'], ['楼', 'Floor'],
];

function flipNumbered(s) {
  for (const [zh, en] of NUMBERED) {
    s = s.replace(new RegExp(`(\\d+)\\s*${zh}`, 'g'), ` ${en} $1 `);
  }
  return s;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Split on the known terms (keeping them), map each term to English and romanize
 *  the Han runs in between. Terms are matched longest-first so 自治区 beats 区. */
function translate(s, terms) {
  const src = flipNumbered(String(s ?? '').trim());
  if (!src) return src;
  if (!terms.length) return hasCJK(src) ? py(src) : src.replace(/\s+/g, ' ').trim();

  const sorted = [...terms].sort((a, b) => b[0].length - a[0].length);
  const table = new Map(sorted);
  const re = new RegExp(`(${sorted.map(([zh]) => esc(zh)).join('|')})`, 'g');

  const out = src
    .split(re)
    .map((chunk) => {
      if (!chunk) return '';
      if (table.has(chunk)) return table.get(chunk);
      return hasCJK(chunk) ? ` ${py(chunk)}` : chunk;
    })
    .join('');

  return out.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

export const romanizeAddress = (s) => translate(s, ADDRESS_TERMS);
export const romanizeCompany = (s) => translate(s, COMPANY_TERMS);

/** Plain pinyin, for free text with no useful vocabulary (city names etc). */
export const romanize = (s) => (hasCJK(s) ? translate(s, []) : String(s ?? '').trim());
