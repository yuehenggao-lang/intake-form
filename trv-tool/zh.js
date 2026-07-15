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


/** Full-width punctuation has to become ASCII: the forms take Latin text, and a
 *  stray ，would survive romanisation and land in the PDF. */
const PUNCT = [
  ['，', ', '], ['、', ', '], ['。', '. '], ['；', '; '], ['：', ': '],
  ['（', ' ('], ['）', ') '], ['\u3000', ' '], ['－', '-'],
];
const normalizePunct = (s) =>
  PUNCT.reduce((acc, [zh, en]) => acc.split(zh).join(en), String(s ?? ''));

/** Place names, because pinyin is simply wrong for them: 东京 is Tokyo, not
 *  "Dongjing", and 中国 is China. Only the ones a Chinese applicant plausibly
 *  types; anything else falls through to pinyin, which the user can correct. */
const PLACES = [
  ['中国', 'China'], ['香港', 'Hong Kong'], ['澳门', 'Macau'], ['台湾', 'Taiwan'],
  ['日本', 'Japan'], ['东京', 'Tokyo'], ['大阪', 'Osaka'], ['京都', 'Kyoto'], ['名古屋', 'Nagoya'],
  ['韩国', 'South Korea'], ['首尔', 'Seoul'], ['泰国', 'Thailand'], ['曼谷', 'Bangkok'],
  ['普吉', 'Phuket'], ['清迈', 'Chiang Mai'], ['新加坡', 'Singapore'], ['马来西亚', 'Malaysia'],
  ['吉隆坡', 'Kuala Lumpur'], ['越南', 'Vietnam'], ['菲律宾', 'Philippines'],
  ['印度尼西亚', 'Indonesia'], ['印尼', 'Indonesia'], ['巴厘岛', 'Bali'], ['柬埔寨', 'Cambodia'],
  ['缅甸', 'Myanmar'], ['印度', 'India'],
  ['美国', 'United States'], ['纽约', 'New York'], ['洛杉矶', 'Los Angeles'],
  ['旧金山', 'San Francisco'], ['夏威夷', 'Hawaii'], ['西雅图', 'Seattle'],
  ['加拿大', 'Canada'], ['多伦多', 'Toronto'], ['温哥华', 'Vancouver'], ['蒙特利尔', 'Montreal'],
  ['英国', 'United Kingdom'], ['伦敦', 'London'], ['法国', 'France'], ['巴黎', 'Paris'],
  ['德国', 'Germany'], ['柏林', 'Berlin'], ['意大利', 'Italy'], ['罗马', 'Rome'],
  ['西班牙', 'Spain'], ['瑞士', 'Switzerland'], ['荷兰', 'Netherlands'],
  ['俄罗斯', 'Russia'], ['莫斯科', 'Moscow'], ['澳大利亚', 'Australia'], ['悉尼', 'Sydney'],
  ['墨尔本', 'Melbourne'], ['新西兰', 'New Zealand'], ['迪拜', 'Dubai'],
  ['土耳其', 'Turkey'], ['埃及', 'Egypt'], ['南非', 'South Africa'], ['巴西', 'Brazil'],
  ['北京', 'Beijing'], ['上海', 'Shanghai'], ['广州', 'Guangzhou'], ['深圳', 'Shenzhen'],
  ['杭州', 'Hangzhou'], ['南京', 'Nanjing'], ['成都', 'Chengdu'], ['重庆', 'Chongqing'],
  ['武汉', 'Wuhan'], ['西安', "Xi'an"], ['天津', 'Tianjin'], ['苏州', 'Suzhou'],
  ['青岛', 'Qingdao'], ['大连', 'Dalian'], ['沈阳', 'Shenyang'], ['哈尔滨', 'Harbin'],
  ['长春', 'Changchun'], ['济南', 'Jinan'], ['郑州', 'Zhengzhou'], ['长沙', 'Changsha'],
  ['福州', 'Fuzhou'], ['厦门', 'Xiamen'], ['昆明', 'Kunming'], ['南宁', 'Nanning'],
  ['合肥', 'Hefei'], ['南昌', 'Nanchang'], ['太原', 'Taiyuan'], ['石家庄', 'Shijiazhuang'],
  ['浙江', 'Zhejiang'], ['江苏', 'Jiangsu'], ['广东', 'Guangdong'], ['山东', 'Shandong'],
  ['河南', 'Henan'], ['河北', 'Hebei'], ['四川', 'Sichuan'], ['湖北', 'Hubei'],
  ['湖南', 'Hunan'], ['福建', 'Fujian'], ['安徽', 'Anhui'], ['辽宁', 'Liaoning'],
  ['吉林', 'Jilin'], ['黑龙江', 'Heilongjiang'], ['陕西', 'Shaanxi'], ['山西', 'Shanxi'],
  ['江西', 'Jiangxi'], ['云南', 'Yunnan'], ['贵州', 'Guizhou'], ['广西', 'Guangxi'],
  ['甘肃', 'Gansu'], ['内蒙古', 'Inner Mongolia'], ['新疆', 'Xinjiang'], ['西藏', 'Tibet'],
  ['宁夏', 'Ningxia'], ['青海', 'Qinghai'], ['海南', 'Hainan'],
];

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
/** Ordinals in institution names: 第三 is "No. 3", not "Disan". */
const ORDINALS = [
  ['第一', 'No. 1 '], ['第二', 'No. 2 '], ['第三', 'No. 3 '], ['第四', 'No. 4 '],
  ['第五', 'No. 5 '], ['第六', 'No. 6 '], ['第七', 'No. 7 '], ['第八', 'No. 8 '],
  ['第九', 'No. 9 '], ['第十', 'No. 10 '],
];

const COMPANY_TERMS = [
  // Longest first: 职业技术学院 must beat 学院, 有限责任公司 must beat 公司.
  ['中国科学院', ' Chinese Academy of Sciences'], ['社会科学院', ' Academy of Social Sciences'],
  ['科学院', ' Academy of Sciences'],
  ['职业技术学院', ' Vocational and Technical College'],
  ['职业技术学校', ' Vocational and Technical School'],
  ['职业学院', ' Vocational College'], ['技术学院', ' Institute of Technology'],
  ['师范大学', ' Normal University'], ['理工大学', ' University of Technology'],
  ['工业大学', ' University of Technology'], ['科技大学', ' University of Science and Technology'],
  ['财经大学', ' University of Finance and Economics'],
  ['医科大学', ' Medical University'], ['农业大学', ' Agricultural University'],
  ['交通大学', ' Jiaotong University'], ['外国语大学', ' International Studies University'],
  ['有限责任公司', ' Co., Ltd.'], ['股份有限公司', ' Co., Ltd.'], ['有限公司', ' Co., Ltd.'],
  ['研究所', ' Research Institute'], ['研究院', ' Research Academy'],
  ['设计院', ' Design Institute'], ['事务所', ' Firm'],
  ['人民医院', " People's Hospital"], ['中医院', ' Hospital of Traditional Chinese Medicine'],
  ['卫生院', ' Health Centre'], ['疾控中心', ' Centre for Disease Control'],
  ['高级中学', ' Senior High School'], ['初级中学', ' Junior High School'],
  ['职业高中', ' Vocational High School'], ['技工学校', ' Technical School'],
  ['幼儿园', ' Kindergarten'], ['培训中心', ' Training Centre'], ['进修学校', ' Continuing Education School'],
  ['分公司', ' Branch'], ['办事处', ' Office'], ['管理局', ' Administration'],
  ['管理处', ' Management Office'], ['委员会', ' Committee'], ['开发公司', ' Development Company'],
  ['集团', ' Group'], ['公司', ' Company'], ['工厂', ' Factory'], ['厂', ' Factory'],
  ['医院', ' Hospital'], ['学院', ' College'], ['大学', ' University'],
  ['中学', ' Middle School'], ['小学', ' Primary School'], ['学校', ' School'],
  ['银行', ' Bank'], ['酒店', ' Hotel'], ['宾馆', ' Hotel'], ['科技', ' Technology'],
  ['贸易', ' Trading'], ['实业', ' Industrial'], ['建筑', ' Construction'],
  ['商店', ' Store'], ['超市', ' Supermarket'], ['餐厅', ' Restaurant'], ['饭店', ' Restaurant'],
  ['物流', ' Logistics'], ['纺织', ' Textile'], ['机械', ' Machinery'], ['电子', ' Electronics'],
  ['化工', ' Chemical'], ['食品', ' Food'], ['服装', ' Garment'], ['汽车', ' Automobile'],
  ['地产', ' Real Estate'], ['保险', ' Insurance'], ['证券', ' Securities'], ['传媒', ' Media'],
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
  // flipNumbered first: 88号 has to become "No. 88" before the term table gets a
  // chance to turn 号 into a trailing "Hao"/"No.".
  let src = flipNumbered(normalizePunct(String(s ?? ''))).trim();
  if (!src) return src;

  // Longest-first so 自治区 beats 区 and 内蒙古 beats 蒙古.
  const table = [...terms, ...PLACES].sort((a, b) => b[0].length - a[0].length);
  if (!table.length) return hasCJK(src) ? py(src) : src;

  const map = new Map(table);
  const re = new RegExp(`(${table.map(([zh]) => esc(zh)).join('|')})`, 'g');

  const out = src
    .split(re)
    .map((chunk) => {
      if (!chunk) return '';
      if (map.has(chunk)) return ` ${map.get(chunk).trim()} `;
      // Romanise each Han run on its own so every word gets capitalised, rather
      // than only the first character of a whole comma-spanning string.
      return chunk.replace(/[㐀-䶿一-鿿豈-﫿぀-ヿ]+/g, (run) => ` ${py(run)} `);
    })
    .join('');

  return out
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim();
}

export const romanizeAddress = (s) => translate(s, ADDRESS_TERMS);
export const romanizeCompany = (s) => translate(s, [...ORDINALS, ...COMPANY_TERMS]);

/** Plain pinyin, for free text with no useful vocabulary (city names etc). */
export const romanize = (s) => translate(s, []);
