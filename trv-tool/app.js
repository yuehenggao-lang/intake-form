/**
 * Form definition, rendering, and value mapping for the IMM5257 tool.
 *
 * The form mirrors the real IMM5257's own section numbering so a user can hold
 * the generated PDF next to this page and check item by item.
 *
 * Everything stays in this tab: no network calls beyond fetching the blank form
 * and the code itself.
 */
import { fillForm, FORMS } from './xfa-fill.js';
import { hasCJK, romanizeAddress, romanizeCompany, OCCUPATIONS } from './zh.js';
import { SPEC_5645, visaTypeBoxes, dates5645, joinName } from './spec-5645.js';
import { SPEC_0104, signature0104 } from './spec-0104.js';
import { riskFlags } from './risk.js';

const P1 = 'form1/Page1/PersonalDetails';
const P1M = 'form1/Page1/MaritalStatus/SectionA';
const P2M = 'form1/Page2/MaritalStatus/SectionA';
const CT = 'form1/Page2/ContactInformation/contact';
const DV = 'form1/Page3/DetailsOfVisit';

/** Split "YYYY-MM-DD" across the whole/year/month/day paths a section uses. */
const spread = (v, { whole, y, m, d }) => {
  if (!v) return {};
  const [Y, M, D] = v.split('-');
  const out = {};
  if (whole) out[whole] = v;
  if (y) out[y] = Y;
  if (m) out[m] = M;
  if (d) out[d] = D;
  return out;
};

export const SPEC = [
  // ── Step 1 · the form's page 1 ──────────────────────────────────────────
  {
    step: 0,
    title: '个人信息',
    boxes: [
      {
        num: '1-3',
        title: '申请信息',
        fields: [
          { id: 'serviceIn', label: '希望使用的服务语言', type: 'select', req: true,
            options: [{ code: '01', label: 'English 英语' }, { code: '02', label: 'French 法语' }],
            paths: (v) => ({ [`${P1}/ServiceIn/ServiceIn`]: v }) },
          { id: 'visaType', label: '申请的签证类型', type: 'select', req: true,
            options: [{ code: 'VisitorVisa', label: 'Visitor Visa 访问签证' }, { code: 'Transit', label: 'Transit 过境签证' }],
            paths: (v) => ({ [`${P1}/VisaType/VisaType`]: v }) },
          { id: 'uci', label: 'UCI（客户编号）', hint: '没有就留空', type: 'text',
            paths: (v) => ({ [`${P1}/UCIClientID`]: v }) },
        ],
      },
      {
        num: '1-6',
        title: '个人详细信息',
        fields: [
          { id: 'familyName', latin: true, label: '姓（与护照一致，拼音）', type: 'text', req: true, upper: true, row: 'two',
            paths: (v) => ({ [`${P1}/Name/FamilyName`]: v }) },
          { id: 'givenName', latin: true, label: '名（与护照一致，拼音）', type: 'text', upper: true, row: 'two',
            paths: (v) => ({ [`${P1}/Name/GivenName`]: v }) },
          { id: 'aliasInd', label: '是否曾用过其他姓名？', hint: '曾用名、婚前姓、别名等', type: 'yn', req: true,
            paths: (v) => ({ [`${P1}/AliasName/AliasNameIndicator/AliasNameIndicator`]: v }) },
          { id: 'aliasFamily', latin: true, label: '曾用姓', type: 'text', upper: true, row: 'two', showIf: (s) => s.aliasInd === 'Y',
            paths: (v) => ({ [`${P1}/AliasName/AliasFamilyName`]: v }) },
          { id: 'aliasGiven', latin: true, label: '曾用名', type: 'text', upper: true, row: 'two', showIf: (s) => s.aliasInd === 'Y',
            paths: (v) => ({ [`${P1}/AliasName/AliasGivenName`]: v }) },
          { id: 'sex', label: '性别', type: 'select', req: true, lov: 'GenderMelList', row: 'two',
            paths: (v) => ({ [`${P1}/Sex/Sex`]: v }) },
          { id: 'dob', label: '出生日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { y: `${P1}/DOBYear`, m: `${P1}/DOBMonth`, d: `${P1}/DOBDay` }) },
          { id: 'birthCity', romanize: 'address', label: '出生城市', type: 'text', req: true, row: 'two',
            paths: (v) => ({ [`${P1}/PlaceBirthCity`]: v }) },
          { id: 'birthCountry', label: '出生国家或地区', type: 'select', req: true, lov: 'CountryOfBirthList', row: 'two',
            paths: (v) => ({ [`${P1}/PlaceBirthCountry`]: v }) },
          { id: 'citizenship', label: '国籍', type: 'select', req: true, lov: 'CountryOfCitizenshipList',
            paths: (v) => ({ [`${P1}/Citizenship/Citizenship`]: v }) },
        ],
      },
      {
        num: '7-9',
        title: '居住国与申请地',
        fields: [
          { id: 'corCountry', label: '目前居住国家或地区', type: 'select', req: true, lov: 'CountryList', row: 'two',
            paths: (v) => ({ [`${P1}/CurrentCOR/Row2/Country`]: v }) },
          { id: 'corStatus', label: '在该国的身份', type: 'select', req: true, lov: 'ImmigrationStatusList', row: 'two',
            paths: (v) => ({ [`${P1}/CurrentCOR/Row2/Status`]: v }) },
          { id: 'corOther', label: '其他身份说明', hint: '请用英文填写', type: 'text', showIf: (s) => s.corStatus === '06',
            paths: (v) => ({ [`${P1}/CurrentCOR/Row2/Other`]: v }) },
          { id: 'corFrom', label: '该身份起始日期', type: 'date', row: 'two', showIf: (s) => s.corStatus && s.corStatus !== '01',
            paths: (v) => spread(v, { whole: `${P1}/CurrentCOR/Row2/FromDate`, y: `${P1}/CORDates/FromYr`, m: `${P1}/CORDates/FromMM`, d: `${P1}/CORDates/FromDD` }) },
          { id: 'corTo', label: '该身份到期日期', type: 'date', row: 'two', showIf: (s) => s.corStatus && s.corStatus !== '01',
            paths: (v) => spread(v, { whole: `${P1}/CurrentCOR/Row2/ToDate`, y: `${P1}/CORDates/ToYr`, m: `${P1}/CORDates/ToMM`, d: `${P1}/CORDates/ToDD` }) },
          { id: 'pcrInd', label: '过去五年，是否在国籍国和现居国之外的国家住过超过六个月？', type: 'yn', req: true,
            paths: (v) => ({ [`${P1}/PCRIndicator`]: v }) },
          { id: 'pcrCountry', label: '曾居住国家或地区', type: 'select', lov: 'CountryList', row: 'two', showIf: (s) => s.pcrInd === 'Y',
            paths: (v) => ({ [`${P1}/PreviousCOR/Row2/Country`]: v }) },
          { id: 'pcrStatus', label: '在该国的身份', type: 'select', lov: 'ImmigrationStatusList', row: 'two', showIf: (s) => s.pcrInd === 'Y',
            paths: (v) => ({ [`${P1}/PreviousCOR/Row2/Status`]: v }) },
          { id: 'pcrFrom', label: '起始日期', type: 'date', row: 'two', showIf: (s) => s.pcrInd === 'Y',
            paths: (v) => spread(v, { whole: `${P1}/PreviousCOR/Row2/FromDate`, y: `${P1}/PCRDatesR1/FromYr`, m: `${P1}/PCRDatesR1/FromMM`, d: `${P1}/PCRDatesR1/FromDD` }) },
          { id: 'pcrTo', label: '结束日期', type: 'date', row: 'two', showIf: (s) => s.pcrInd === 'Y',
            paths: (v) => spread(v, { whole: `${P1}/PreviousCOR/Row2/ToDate`, y: `${P1}/PCRDatesR1/ToYr`, m: `${P1}/PCRDatesR1/ToMM`, d: `${P1}/PCRDatesR1/ToDD` }) },
          { id: 'sameAsCor', label: '申请递交国就是你目前的居住国吗？', type: 'yn', req: true,
            paths: (v) => ({ [`${P1}/SameAsCORIndicator`]: v }) },
          { id: 'cwaCountry', label: '递交申请所在国家或地区', type: 'select', lov: 'CountryList', row: 'two', showIf: (s) => s.sameAsCor === 'N',
            paths: (v) => ({ [`${P1}/CountryWhereApplying/Row2/Country`]: v }) },
          { id: 'cwaStatus', label: '在该国的身份', type: 'select', lov: 'ImmigrationStatusList', row: 'two', showIf: (s) => s.sameAsCor === 'N',
            paths: (v) => ({ [`${P1}/CountryWhereApplying/Row2/Status`]: v }) },
        ],
      },
      {
        num: '10-11',
        title: '婚姻状况',
        fields: [
          { id: 'marital', label: '目前婚姻状况', type: 'select', req: true, lov: 'MaritalStatusList',
            paths: (v) => ({ [`${P1M}/MaritalStatus`]: v }) },
          { id: 'marriageDate', label: '结婚 / 同居开始日期', type: 'date', row: 'two', showIf: (s) => ['01', '03'].includes(s.marital),
            paths: (v) => spread(v, { whole: `${P1M}/DateOfMarriage`, y: `${P1M}/MarriageDate/FromYr`, m: `${P1M}/MarriageDate/FromMM`, d: `${P1M}/MarriageDate/FromDD` }) },
          { id: 'spouseFamily', latin: true, label: '配偶姓', type: 'text', upper: true, row: 'two', showIf: (s) => ['01', '03'].includes(s.marital),
            paths: (v) => ({ [`${P1M}/FamilyName`]: v }) },
          { id: 'spouseGiven', latin: true, label: '配偶名', type: 'text', upper: true, row: 'two', showIf: (s) => ['01', '03'].includes(s.marital),
            paths: (v) => ({ [`${P1M}/GivenName`]: v }) },
          { id: 'prevMarried', label: '是否曾有过其他婚姻或同居关系？',
            hint: '丧偶 / 离异 / 分居的，这里选「是」，并填下面的前配偶信息', type: 'yn', req: true,
            paths: (v) => ({ [`${P2M}/PrevMarriedIndicator`]: v }) },
          { id: 'pmFamily', latin: true, label: '前配偶姓', type: 'text', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            paths: (v) => ({ [`${P2M}/PMFamilyName`]: v }) },
          { id: 'pmGiven', latin: true, label: '前配偶名', type: 'text', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            paths: (v) => ({ [`${P2M}/GivenName/PMGivenName`]: v }) },
          { id: 'pmDOB', label: '前配偶出生日期', type: 'date', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            paths: (v) => spread(v, { y: `${P2M}/PrevSpouseDOB/DOBYear`, m: `${P2M}/PrevSpouseDOB/DOBMonth`, d: `${P2M}/PrevSpouseDOB/DOBDay` }) },
          { id: 'pmType', label: '关系类型', type: 'select', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            options: [{ code: '01', label: '已婚 Married' }, { code: '03', label: '同居 Common-Law' }],
            paths: (v) => ({ [`${P2M}/TypeOfRelationship`]: v }) },
          { id: 'pmFrom', label: '关系开始日期', type: 'date', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            paths: (v) => spread(v, { whole: `${P2M}/FromDate`, y: `${P2M}/PreviouslyMarriedDates/FromYr`, m: `${P2M}/PreviouslyMarriedDates/FromMM`, d: `${P2M}/PreviouslyMarriedDates/FromDD` }) },
          { id: 'pmTo', label: '关系结束日期', hint: '丧偶填配偶去世日期', type: 'date', row: 'two', showIf: (s) => s.prevMarried === 'Y',
            paths: (v) => spread(v, { whole: `${P2M}/ToDate/ToDate`, y: `${P2M}/PreviouslyMarriedDates/ToYr`, m: `${P2M}/PreviouslyMarriedDates/ToMM`, d: `${P2M}/PreviouslyMarriedDates/ToDD` }) },
        ],
      },
    ],
  },

  // ── Step 2 · the form's page 2 ──────────────────────────────────────────
  {
    step: 1,
    title: '护照与联系方式',
    boxes: [
      {
        num: '1-4',
        title: '护照',
        fields: [
          { id: 'passportNum', label: '护照号码', type: 'text', req: true, upper: true, row: 'two',
            paths: (v) => ({ [`${P2M}/Passport/PassportNum/PassportNum`]: v }) },
          { id: 'passportCountry', label: '签发国家或地区', type: 'select', req: true, lov: 'CountryOfIssueList', row: 'two',
            paths: (v) => ({ [`${P2M}/Passport/CountryofIssue/CountryofIssue`]: v }) },
          { id: 'passportIssue', label: '签发日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${P2M}/Passport/IssueDate/IssueDate`, y: `${P2M}/Passport/IssueYYYY`, m: `${P2M}/Passport/IssueMM`, d: `${P2M}/Passport/IssueDD` }) },
          { id: 'passportExpiry', label: '到期日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${P2M}/Passport/ExpiryDate`, y: `${P2M}/Passport/expiryYYYY`, m: `${P2M}/Passport/expiryMM`, d: `${P2M}/Passport/expiryDD` }) },
        ],
      },
      {
        num: '1',
        title: '语言',
        fields: [
          { id: 'nativeLang', label: '母语', type: 'select', req: true, lov: 'ContactLanguageList', row: 'two',
            paths: (v) => ({ [`${P2M}/Languages/languages/nativeLang/nativeLang`]: v }) },
          { id: 'ableTo', label: '能使用英语或法语交流吗？', type: 'select', req: true, lov: 'AbleCommunicateEnglishOrFrenchList', row: 'two',
            paths: (v) => ({ [`${P2M}/Languages/languages/ableToCommunicate/ableToCommunicate`]: v }) },
          { id: 'langTest', label: '是否参加过指定机构的英语或法语考试？', type: 'yn', req: true,
            paths: (v) => ({ [`${P2M}/Languages/LanguageTest`]: v }) },
        ],
      },
      {
        num: '1-5',
        title: '身份证件',
        fields: [
          { id: 'natIdInd', label: '是否持有身份证（中国居民身份证等）？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page2/natID/q1/natIDIndicator': v }) },
          { id: 'natIdNum', label: '证件号码', type: 'text', row: 'two', showIf: (s) => s.natIdInd === 'Y',
            paths: (v) => ({ 'form1/Page2/natID/natIDdocs/DocNum/DocNum': v }) },
          { id: 'natIdCountry', label: '签发国家或地区', type: 'select', lov: 'CountryOfIssueList', row: 'two', showIf: (s) => s.natIdInd === 'Y',
            paths: (v) => ({ 'form1/Page2/natID/natIDdocs/CountryofIssue/CountryofIssue': v }) },
          { id: 'natIdIssue', label: '签发日期', type: 'date', row: 'two', showIf: (s) => s.natIdInd === 'Y',
            paths: (v) => ({ 'form1/Page2/natID/natIDdocs/IssueDate/IssueDate': v }) },
          { id: 'natIdExpiry', label: '到期日期', type: 'date', row: 'two', showIf: (s) => s.natIdInd === 'Y',
            paths: (v) => ({ 'form1/Page2/natID/natIDdocs/ExpiryDate': v }) },
          { id: 'usCardInd', label: '是否持有美国永久居民卡（绿卡）？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page2/USCard/q1/usCardIndicator': v }) },
          { id: 'usCardNum', label: '绿卡号码', type: 'text', row: 'two', showIf: (s) => s.usCardInd === 'Y',
            paths: (v) => ({ 'form1/Page2/USCard/usCarddocs/DocNum/DocNum': v }) },
          { id: 'usCardExpiry', label: '绿卡到期日期', type: 'date', row: 'two', showIf: (s) => s.usCardInd === 'Y',
            paths: (v) => ({ 'form1/Page2/USCard/usCarddocs/ExpiryDate': v }) },
        ],
      },
      {
        num: '1-3',
        title: '联系方式',
        fields: [
          { id: 'aptUnit', romanize: 'address', label: '公寓 / 单元号', type: 'text', row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/Apt/AptUnit`]: v }) },
          { id: 'streetNum', label: '门牌号', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/StreetNum/StreetNum`]: v }) },
          { id: 'streetName', romanize: 'address', label: '街道名', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/Streetname/Streetname`]: v }) },
          { id: 'city', romanize: 'address', label: '城市', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow2/CityTow/CityTown`]: v }) },
          { id: 'province', romanize: 'address', label: '省 / 州', type: 'text', row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow2/ProvinceState/ProvinceState`]: v }) },
          { id: 'postal', label: '邮编', type: 'text', row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow2/PostalCode/PostalCode`]: v }) },
          { id: 'country', label: '国家或地区', type: 'select', req: true, lov: 'CountryList',
            paths: (v) => ({ [`${CT}/AddressRow2/Country/Country`]: v }) },
          { id: 'sameAsMailing', label: '居住地址与上面的邮寄地址相同吗？', type: 'yn', req: true,
            paths: (v) => ({ [`${CT}/SameAsMailingIndicator`]: v }) },
          { id: 'phoneType', label: '电话类型', type: 'select', req: true, lov: 'PhoneTypeTRVList', row: 'three',
            paths: (v) => ({ [`${CT}/PhoneNumbers/Phone/Type`]: v }) },
          { id: 'phoneCC', label: '国家区号', hint: '中国填 86', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/PhoneNumbers/Phone/NumberCountry`]: v }) },
          { id: 'phoneNum', label: '电话号码', hint: '含国家区号，如 8613800138000', type: 'text', req: true, row: 'three',
            paths: (v) => ({
              [`${CT}/PhoneNumbers/Phone/IntlNumber/IntlNumber`]: v,
              // The form models "Canada/US" vs "Other" as a pair of flags.
              [`${CT}/PhoneNumbers/Phone/CanadaUS`]: '0',
              [`${CT}/PhoneNumbers/Phone/Other`]: '1',
            }) },
          { id: 'email', label: '电子邮箱', type: 'email', req: true,
            paths: (v) => ({ [`${CT}/FaxEmail/Email`]: v }) },
        ],
      },
    ],
  },

  // ── Step 3 · the form's page 3 ──────────────────────────────────────────
  {
    step: 2,
    title: '访问细节与背景',
    boxes: [
      {
        num: '1-5',
        title: '访问细节',
        fields: [
          { id: 'purpose', label: '访问目的', type: 'select', req: true, lov: 'VisitPurposeList', row: 'two',
            paths: (v) => ({ [`${DV}/PurposeRow1/PurposeOfVisit/PurposeOfVisit`]: v }) },
          { id: 'purposeOther', label: '其他目的说明', hint: '请用英文填写', type: 'text', row: 'two', showIf: (s) => s.purpose === '03',
            paths: (v) => ({ [`${DV}/PurposeRow1/Other/Other`]: v }) },
          { id: 'stayFrom', label: '计划入境日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${DV}/PurposeRow1/HowLongStay/FromDate`, y: `${DV}/PurposeRow1/HowLongStay/StayDates/FromYr`, m: `${DV}/PurposeRow1/HowLongStay/StayDates/FromMM`, d: `${DV}/PurposeRow1/HowLongStay/StayDates/FromDD` }) },
          { id: 'stayTo', label: '计划离境日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${DV}/PurposeRow1/HowLongStay/ToDate`, y: `${DV}/PurposeRow1/HowLongStay/StayDates/ToYr`, m: `${DV}/PurposeRow1/HowLongStay/StayDates/ToMM`, d: `${DV}/PurposeRow1/HowLongStay/StayDates/ToDD` }) },
          // Funds is a numeric field: Acrobat's Validate rejects "CAD 15,000" or
          // anything with a currency word, comma, or space.
          { id: 'funds', label: '此行可用资金', hint: '只填数字，不要写 CAD、逗号或空格', type: 'digits', req: true,
            paths: (v) => ({ [`${DV}/PurposeRow1/Funds/Funds`]: String(v).replace(/[^\d]/g, '') }) },
          { id: 'hostName', latin: true, label: '在加拿大的联系人姓名', hint: '照邀请函上的写法填', type: 'text', row: 'two',
            paths: (v) => ({ [`${DV}/Contacts_Row1/Name/Name`]: v }) },
          // A closed list, so there is nothing to romanise and nothing to get wrong.
          { id: 'hostRel', label: '与你的关系', type: 'select', row: 'two',
            options: [
              { code: 'Friend', label: '朋友 Friend' }, { code: 'Spouse', label: '配偶 Spouse' },
              { code: 'Father', label: '父亲 Father' }, { code: 'Mother', label: '母亲 Mother' },
              { code: 'Son', label: '儿子 Son' }, { code: 'Daughter', label: '女儿 Daughter' },
              { code: 'Brother', label: '兄弟 Brother' }, { code: 'Sister', label: '姐妹 Sister' },
              { code: 'Relative', label: '其他亲戚 Relative' }, { code: 'Colleague', label: '同事 Colleague' },
              { code: 'Classmate', label: '同学 Classmate' },
              { code: 'Business contact', label: '商务伙伴 Business contact' },
              { code: 'Hotel', label: '酒店 Hotel' },
            ],
            paths: (v) => ({ [`${DV}/Contacts_Row1/RelationshipToMe/RelationshipToMe`]: v }) },
          { id: 'hostAddr', romanize: 'address', label: '在加拿大的地址', type: 'text',
            paths: (v) => ({ [`${DV}/Contacts_Row1/AddressInCanada/AddressInCanada`]: v }) },
        ],
      },
      {
        num: '1',
        title: '教育',
        fields: [
          // Answered from the education rows on step 5 -- asking twice is how the
          // two forms end up contradicting each other.
          { id: 'eduInd', label: '高中毕业后是否上过大专或大学？',
            hint: '由第 5 步「教育经历」自动作答，在那里填就行', type: 'yn', readonly: true,
            paths: (v) => ({ 'form1/Page3/Education/EducationIndicator': v }) },
        ],
      },
      {
        num: '1-6',
        title: '背景信息',
        hint: '如实回答。答「是」不等于一定被拒，隐瞒才是大问题。',
        fields: [
          { id: 'bg1a', label: '1a. 你是否患有肺结核，或近两年内与肺结核病人密切接触过？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo/Choice': v }) },
          { id: 'bg1b', label: '1b. 你是否有需要持续治疗或监护的身体或精神疾病？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo/Choice[1]': v }) },
          { id: 'bgMedical', label: '如上面任一题答「是」，请简要说明', hint: '请用英文填写', type: 'text', showIf: (s) => s.bg1a === 'Y' || s.bg1b === 'Y',
            paths: (v) => ({ 'form1/Page3/BackgroundInfo/Details/MedicalDetails': v }) },
          { id: 'vc1', label: '2a. 你是否曾在加拿大逾期居留、无授权工作或无授权学习？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/VisaChoice1': v }) },
          { id: 'vc2', label: '2b. 你是否曾被任何国家拒签、拒绝入境或被要求离境？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/VisaChoice2': v }) },
          { id: 'vc3', label: '2c. 你此前是否申请过来加拿大？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/Details/VisaChoice3': v }) },
          { id: 'refusedDetails', label: '2d. 如上面任一题答「是」，请简要说明', hint: '请用英文填写，字数有限，写要点即可', type: 'text',
            showIf: (s) => [s.vc1, s.vc2, s.vc3].includes('Y'),
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/Details/refusedDetails': v }) },
          { id: 'bg3', label: '3. 你是否曾犯罪、被捕、被指控或被判刑？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/BackgroundInfo3/Choice': v }) },
          { id: 'bg3d', label: '请简要说明', hint: '请用英文填写', type: 'text', showIf: (s) => s.bg3 === 'Y',
            paths: (v) => ({ 'form1/Page3/PageWrapper/BackgroundInfo3/details': v }) },
          { id: 'military', label: '4. 你是否曾在军队、民兵或民防部队服役？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/Military/Choice': v }) },
          { id: 'militaryD', label: '请简要说明', hint: '请用英文填写', type: 'text', showIf: (s) => s.military === 'Y',
            paths: (v) => ({ 'form1/Page3/PageWrapper/Military/militaryServiceDetails': v }) },
          { id: 'orgs', label: '5. 你是否曾是暴力、恐怖或推翻政权组织的成员？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/Occupation/Choice': v }) },
          { id: 'govPos', label: '6. 你是否曾担任政府公职？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/GovPosition/Choice': v }) },
        ],
      },
      {
        num: '—',
        title: '同意条款',
        fields: [
          { id: 'consent', label: '是否同意 IRCC 就本申请与你的代表联系？', hint: '没有代表就选「否」', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/Signature/Consent0/Choice': v }) },
          { id: 'signDate', label: '签署日期', hint: '默认今天。你实际签字/递交那天是哪天就填哪天', type: 'date', req: true,
            paths: (v) => ({ 'form1/Page3/Signature/C1CertificateIssueDate': v }) },
        ],
      },
    ],
  },
  { step: 3, ...SPEC_0104 },
  { step: 4, ...SPEC_5645 },
];

// ── state ────────────────────────────────────────────────────────────────
const state = { children: [], siblings: [], employment: [{}], education: [], travel: [] };
let LOV = {};
let step = 0;
let generated = [];
let blobUrl = null;

const allBoxes = () => SPEC.flatMap((s) => s.boxes);
const allFields = () => allBoxes().flatMap((b) => b.fields || []);
const visible = (f) => !f.showIf || f.showIf(state);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ── render ───────────────────────────────────────────────────────────────
function fieldHtml(f) {
  const req = f.req ? '<span class="req" aria-hidden="true">*</span>' : '';
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  const v = ('value' in f ? f.value : state[f.id]) || '';

  if (f.type === 'yn') {
    return `<div class="q" data-fid="${f.id}">
      <div class="qt">${req}${esc(f.label)} ${hint}</div>
      <div class="yn${f.readonly ? ' ro' : ''}" role="radiogroup" aria-label="${esc(f.label)}">
        <label><input type="radio" name="${f.id}" value="N" ${v === 'N' ? 'checked' : ''}${f.readonly ? ' disabled' : ''}>否 No</label>
        <label><input type="radio" name="${f.id}" value="Y" ${v === 'Y' ? 'checked' : ''}${f.readonly ? ' disabled' : ''}>是 Yes</label>
      </div>
      <span class="err">请选择</span>
    </div>`;
  }

  let control;
  if (f.type === 'select') {
    const opts = f.options || LOV[f.lov] || [];
    control = `<select name="${f.id}">
      <option value="">— 请选择 —</option>
      ${opts.map((o) => `<option value="${esc(o.code)}" ${v === o.code ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>`;
  } else if (f.type === 'date') {
    control = `<input type="date" name="${f.id}" value="${esc(v)}">`;
  } else if (f.type === 'month') {
    control = `<input type="month" name="${f.id}" value="${esc(v)}">`;
  } else if (f.type === 'occupation') {
    // A datalist, not a select: the term table covers the common cases but people
    // hold jobs it doesn't list, and those must still be typeable (in English).
    control = `<input type="text" name="${f.id}" list="occ-list" value="${esc(v)}" placeholder="选择或用英文填写">
      <datalist id="occ-list">
        ${OCCUPATIONS.map(([zh, en]) => `<option value="${esc(en)}">${esc(zh)}</option>`).join('')}
      </datalist>`;
  } else if (f.type === 'digits') {
    control = `<input type="text" inputmode="numeric" pattern="[0-9]*" name="${f.id}" value="${esc(v)}">`;
  } else {
    control = `<input type="${f.type === 'email' ? 'email' : 'text'}" name="${f.id}" value="${esc(v)}"${f.upper ? ' style="text-transform:uppercase"' : ''}>`;
  }

  return `<label class="f" data-fid="${f.id}">
    <span class="lab">${req}${esc(f.label)}${hint}</span>
    ${control}
    <span class="err">${f.latin ? '请填护照上的拼音，不要填中文' : '此项必填'}</span>
    <span class="note" hidden></span>
  </label>`;
}

/** A repeat box renders N instances of a row spec, backed by state[key] (an array).
 *  IMM5645's children/siblings and IMM0104's tables all work this way. */
function repeatHtml(b) {
  const r = b.repeat;
  const rows = state[r.key] || [];
  const body = rows.map((row, i) => `
    <div class="rep" data-rep="${r.key}" data-i="${i}">
      <div class="rep-hd"><span>${esc(b.title)} ${i + 1}</span>
        <button type="button" class="lnk" data-del="${r.key}:${i}">删除</button></div>
      ${groupRows(r.fields).map((g) => `<div class="row ${g.row || ''}">${g.items
        .map((f) => fieldHtml({ ...f, id: `${r.key}.${i}.${f.id}`, value: row[f.id] }))
        .join('')}</div>`).join('')}
    </div>`).join('');

  return `<fieldset class="box">
    <legend><span class="box-hd"><span class="num">${esc(b.num)}</span><span class="t">${esc(b.title)}</span></span></legend>
    <div class="box-body">
      ${b.hint ? `<p class="bhint">${esc(b.hint)}</p>` : ''}
      ${body || '<p class="bhint">还没有添加。</p>'}
      ${rows.length < r.max
        ? `<button type="button" class="btn add" data-add="${r.key}">+ ${esc(r.addLabel)}</button>`
        : `<p class="bhint">已达上限 ${r.max} 条。</p>`}
    </div>
  </fieldset>`;
}

/** Group consecutive fields that share a row hint. */
function groupRows(fields) {
  const groups = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (last && last.row && last.row === f.row) last.items.push(f);
    else groups.push({ row: f.row, items: [f] });
  }
  return groups;
}

function boxHtml(b) {
  if (b.repeat) return repeatHtml(b);
  const fields = b.fields.filter(visible);
  if (!fields.length) return '';
  const groups = groupRows(fields);
  return `<fieldset class="box">
    <legend><span class="box-hd"><span class="num">${esc(b.num)}</span><span class="t">${esc(b.title)}</span></span></legend>
    <div class="box-body">
      ${b.hint ? `<p style="margin:0;font-size:13px;color:var(--ink-soft)">${esc(b.hint)}</p>` : ''}
      ${groups.map((g) => `<div class="row ${g.row || ''}">${g.items.map(fieldHtml).join('')}</div>`).join('')}
    </div>
  </fieldset>`;
}

function render() {
  // keep derived answers in step with their source
  state.eduInd = (state.education || []).some((r) => r.school || r.position) ? 'Y' : 'N';
  document.querySelectorAll('.step').forEach((el, i) => {
    el.hidden = i !== step;
    if (i === step) el.innerHTML = SPEC[i].boxes.map(boxHtml).join('');
  });
  document.getElementById('rail').innerHTML = SPEC.map(
    (s, i) => `<button type="button" data-go="${i}" aria-current="${i === step}">
      <span class="n">STEP ${i + 1}</span>${esc(s.title)}</button>`
  ).join('');
  document.getElementById('prev').disabled = step === 0;
  document.getElementById('next').textContent = step === SPEC.length - 1 ? '生成表格' : '下一步';
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── validation ───────────────────────────────────────────────────────────
function validateStep() {
  let firstBad = null;
  for (const f of SPEC[step].boxes.flatMap((b) => b.fields || [])) {
    if (!visible(f)) continue;
    if (!f.req && !f.latin) continue;
    // Names are never romanised for the user: pinyin is ambiguous (单 is Shan as a
    // surname, Dan as a word) and the passport spelling is the only one IRCC will
    // accept, so a guess here means the form no longer matches the passport.
    const ok = f.latin ? (f.req ? !!state[f.id] : true) && !hasCJK(state[f.id] || '') : !!state[f.id];
    const host = document.querySelector(`[data-fid="${f.id}"]`);
    if (!host) continue;
    const ctl = host.querySelector('input, select');
    if (ctl) ctl.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok && !firstBad) firstBad = host;
  }
  if (firstBad) {
    firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    firstBad.querySelector('input, select')?.focus();
    return false;
  }
  return true;
}

// ── build the XFA value map ──────────────────────────────────────────────
/** Pure: answers -> XFA paths. Exported so tests can exercise it without the DOM. */
export function buildValues(s) {
  const out = {};
  for (const f of allFields()) {
    if (f.showIf && !f.showIf(s)) continue;
    let v = s[f.id];
    if (v == null || v === '') continue;
    if (f.upper) v = String(v).toUpperCase();
    // IRCC's PDF parser rejects em/en dashes in free text.
    if (typeof v === 'string') v = v.replace(/[—–]/g, '-');
    if (hasCJK(v)) {
      // The form rejects CJK outright, so refuse rather than emit a PDF that
      // fails Validate with nothing to explain why.
      throw new Error(`「${f.label}」还是中文，请改成英文或拼音`);
    }
    Object.assign(out, f.paths(v, s));
  }
  return out;
}

function releaseUrl() {
  for (const g of generated || []) if (g.url) { URL.revokeObjectURL(g.url); g.url = null; }
}

/** IMM5645's repeat rows: map each row onto its pre-created <Child> node. */
function buildRepeatValues(box, out) {
  const r = box.repeat;
  if (!r.base) return; // IMM0104 tables go through setRows instead
  (state[r.key] || []).forEach((row, i) => {
    const base = r.base(i);
    for (const f of r.fields) {
      if (!f.path) continue;  // e.g. the 中文名 column, folded into the name below
      let v = row[f.id];
      if (v == null || v === '') continue;
      if (f.upper) v = String(v).toUpperCase();
      if (f.joinZh) v = joinName(v, row[f.joinZh]);
      if (typeof v === 'string') v = v.replace(/[—–]/g, '-');
      if (!f.cjk && !f.joinZh && hasCJK(v)) {
        throw new Error(`「${box.title} ${i + 1} · ${f.label}」还是中文，请改成英文或拼音`);
      }
      if (f.kind === 'acc') {
        // Accompanying is two independent 0/1 checkboxes, not an exclGroup.
        const [yes, no] = f.path.split('/');
        out[`${base}/${yes}`] = v === 'Y' ? '1' : '0';
        out[`${base}/${no}`] = v === 'Y' ? '0' : '1';
      } else {
        out[`${base}/${f.path}`] = v;
      }
    }
  });
}

/** IMM0104's dynamic tables: rows out, in the order the user entered them. */
function buildTables() {
  const tables = {};
  for (const box of allBoxes()) {
    if (!box.repeat?.table) continue;
    tables[box.repeat.table] = (state[box.repeat.key] || [])
      .filter((row) => Object.values(row).some((v) => v))
      .map((row) => {
        const out = {};
        for (const f of box.repeat.fields) {
          let v = row[f.id] || '';
          if (typeof v === 'string') v = v.replace(/[—–]/g, '-');
          if (hasCJK(v)) throw new Error(`「${box.title} · ${f.label}」还是中文，请改成英文或拼音`);
          if (f.cell) out[f.cell] = v;
        }
        // IMM0104 wants employer, city and country in one column; IMM5257 wants
        // them apart. We collect the parts and join them here.
        if (box.repeat.table === 'EmploymentTbl') {
          out.name = [row.employer, row.city, row.prov, lovLabel('CountryList', row.country)]
            .filter(Boolean).join(', ');
        }
        if (box.repeat.table === 'EducationTbl') {
          out.name = [row.school, row.city, row.prov, lovLabel('CountryList', row.country)]
            .filter(Boolean).join(', ');
        }
        return out;
      });
  }
  return tables;
}

function valuesFor(stepIdx) {
  const out = {};
  for (const box of SPEC[stepIdx].boxes) {
    if (box.repeat) { buildRepeatValues(box, out); continue; }
    for (const f of box.fields || []) {
      if (f.showIf && !f.showIf(state)) continue;
      let v = state[f.id];
      if (v == null || v === '') continue;
      if (f.upper) v = String(v).toUpperCase();
      if (typeof v === 'string') v = v.replace(/[—–]/g, '-');
      // f.cjk marks the fields that are SUPPOSED to be Chinese (IMM5645 names).
      if (!f.cjk && hasCJK(v)) throw new Error(`「${f.label}」还是中文，请改成英文或拼音`);
      Object.assign(out, f.paths(v, state));
    }
  }
  return out;
}

// ── events ───────────────────────────────────────────────────────────────
/** All DOM wiring lives here so importing this module has no side effects and
 *  the pure parts (SPEC, buildValues) stay testable without a page. */
const titleCase = (w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '');

const blankOf = async (file) => new Uint8Array(await (await fetch('./' + file)).arrayBuffer());

const lovLabel = (list, code) => (LOV[list] || []).find((o) => o.code === code)?.label || '';

/** IMM5257's marital codes -> IMM5645's 8-option codes. Married splits into
 *  physically present / not, which the form asks and 5257 doesn't, so it lands on
 *  "physically present" and the user can change it. */
const MARITAL_5257_TO_5645 = { '01': '5', '02': '7', '03': '2', '04': '3', '05': '4', '06': '8', '09': '1' };

/** Everything IMM5645 asks that the earlier steps already answered. Prefill only
 *  (never overwrite), so the user stays in charge of anything they edited. */
function prefill5645() {
  const map = {
    f5645AppName: state.familyName ? `${state.familyName.toUpperCase()}, ${titleCase(state.givenName)}` : '',
    f5645AppDOB: state.dob,
    f5645AppCOB: lovLabel('CountryOfBirthList', state.birthCountry),
    f5645AppMStatus: MARITAL_5257_TO_5645[state.marital] || '',
    f5645AppAddress: [state.streetNum, state.streetName, state.city, state.province]
      .filter(Boolean).join(', '),
    f5645AppOcc: (state.employment || [])[0]?.position || '',
    // a spouse named on IMM5257 is the same spouse IMM5645 asks about
    hasSpouse: ['01', '03'].includes(state.marital) ? 'Y' : state.hasSpouse,
    spouse5645Name: state.spouseFamily ? `${state.spouseFamily.toUpperCase()}, ${titleCase(state.spouseGiven)}` : '',
  };
  for (const [k, v] of Object.entries(map)) if (!state[k] && v) state[k] = v;
}

/** IMM5257 asks for the highest level of post-secondary education in one row.
 *  We take the first education row: the box tells the user to put their highest
 *  qualification there, because "most recent" and "highest" are not the same and
 *  choosing between them for them would be a judgement call. */
function educationRow5257() {
  const e = (state.education || []).find((r) => r.school || r.position);
  if (!e) return {};
  const R = 'form1/Page3/Education/Edu_Row1';
  const [fy, fm] = String(e.from || '').split('-');
  const [ty, tm] = String(e.to || '').split('-');
  const out = {};
  if (fy) { out[`${R}/FromYear`] = fy; out[`${R}/FromMonth`] = fm || ''; }
  if (ty) { out[`${R}/ToYear`] = ty; out[`${R}/ToMonth`] = tm || ''; }
  if (e.position) out[`${R}/FieldOfStudy`] = e.position;
  if (e.school) out[`${R}/School`] = e.school;
  if (e.city) out[`${R}/CityTown`] = e.city;
  if (e.prov) out[`${R}/ProvState`] = e.prov;
  if (e.country) out[`${R}/Country/Country`] = e.country;
  return out;
}

/** IMM5257 asks for the same employment IMM0104 does, in its own shape. Derive it
 *  rather than asking twice -- two inputs is two chances to disagree, and an
 *  officer reading both forms is exactly who would notice. */
function occupationRows5257() {
  const out = {};
  (state.employment || []).filter((r) => r.employer || r.position).slice(0, 3).forEach((r, i) => {
    const R = `form1/Page3/Occupation/OccupationRow${i + 1}`;
    const [fy, fm] = String(r.from || '').split('-');
    const [ty, tm] = String(r.to || '').split('-');
    if (fy) { out[`${R}/FromYear`] = fy; out[`${R}/FromMonth`] = fm || ''; }
    if (ty) { out[`${R}/ToYear`] = ty; out[`${R}/ToMonth`] = tm || ''; }
    if (r.position) out[`${R}/Occupation/Occupation`] = r.position;
    if (r.employer) out[`${R}/Employer`] = r.employer;
    if (r.city) out[`${R}/CityTown/CityTown`] = r.city;
    if (r.prov) out[`${R}/ProvState`] = r.prov;
    if (r.country) out[`${R}/Country/Country`] = r.country;
  });
  return out;
}

async function generateAll() {
  const out = [];

  // eduInd is answered by the education rows, not asked twice
  state.eduInd = (state.education || []).some((r) => r.school || r.position) ? 'Y' : 'N';
  const v5257 = valuesFor(0);
  Object.assign(v5257, valuesFor(1), valuesFor(2), occupationRows5257(), educationRow5257());
  const printed = [state.givenName, state.familyName].filter(Boolean).join(' ').toUpperCase();
  if (printed) v5257['form1/Page3/Signature/TextField2'] = printed;
  const r1 = await fillForm('IMM5257', await blankOf(FORMS.IMM5257.file), v5257);
  if (r1.missing.length) console.warn('IMM5257 paths not found:', r1.missing);
  out.push({ id: 'IMM5257', name: '访问签证申请表 IMM5257', pdf: r1.pdf });

  const v5645 = {
    ...valuesFor(4),
    ...visaTypeBoxes(state.visaType),
    // section dates are negative declarations -- only when that section is empty
    ...dates5645(state.signDate, {
      hasSpouse: state.hasSpouse === 'Y',
      children: (state.children || []).some((r) => r.name),
      siblings: (state.siblings || []).some((r) => r.name),
    }),
  };
  const r2 = await fillForm('IMM5645', await blankOf(FORMS.IMM5645.file), v5645);
  if (r2.missing.length) console.warn('IMM5645 paths not found:', r2.missing);
  out.push({ id: 'IMM5645', name: '家庭信息表 IMM5645', pdf: r2.pdf });

  const v0104 = signature0104(state.familyName, state.givenName, state.signDate);
  const r3 = await fillForm('IMM0104', await blankOf(FORMS.IMM0104.file), v0104, buildTables());
  if (r3.missing.length) console.warn('IMM0104 paths not found:', r3.missing);
  out.push({ id: 'IMM0104', name: '教育/工作/旅行史 IMM0104', pdf: r3.pdf });

  return out;
}

/** Name the factors an officer weighs that the user's own answers touch. Flags
 *  only -- there is deliberately no "looks fine" branch; see risk.js. */
function renderRadar() {
  const flags = riskFlags(state, { children: state.children, travel: state.travel, employment: state.employment });
  const box = document.getElementById('radar');
  if (!flags.length) { box.hidden = true; return; }
  document.getElementById('radar-h').textContent = `有 ${flags.length} 项值得你留意`;
  document.getElementById('radar-list').innerHTML = flags
    .map((f) => `<li>${esc(f.title)}</li>`)
    .join('');
  box.hidden = false;
  document.getElementById('cta-h').textContent = '这几项要不要紧？找持牌顾问看一次';
  document.getElementById('cta-p').textContent =
    '上面这些是签证官会看的地方，但每一项要不要紧、该怎么用材料回应，得看你的完整情况才能判断——这正是付费咨询在做的事。表格本身你已经填好了。';
}

function renderDownloads() {
  const base = [state.familyName, state.givenName].filter(Boolean).join('-').toUpperCase() || 'IMM';
  document.getElementById('downloads').innerHTML = generated
    .map((g, i) => `<button type="button" class="btn primary dl" data-dl="${i}">下载 ${esc(g.name)}</button>`)
    .join('');
  document.getElementById('downloads').dataset.base = base;
}

function wire() {
/** "children.0.name" addresses a row field; anything else is a plain field. */
function repeatRef(name) {
  const m = /^([a-z]+)\.(\d+)\.(.+)$/.exec(name || '');
  if (!m) return null;
  const box = allBoxes().find((b) => b.repeat?.key === m[1]);
  if (!box) return null;
  return { key: m[1], i: +m[2], field: box.repeat.fields.find((f) => f.id === m[3]) };
}

document.getElementById('form').addEventListener('input', (e) => {
  const n = e.target.name;
  if (!n) return;
  const rep = repeatRef(n);
  if (rep) {
    if (rep.field?.type === 'digits') e.target.value = e.target.value.replace(/[^\d]/g, '');
    state[rep.key][rep.i][rep.field.id] = e.target.value;
    return;
  }
  const fld = allFields().find((x) => x.id === n);
  if (fld?.type === 'digits') e.target.value = e.target.value.replace(/[^\d]/g, '');

  const ctl = e.target;
  if (ctl.getAttribute('aria-invalid') === 'true' && ctl.value) ctl.setAttribute('aria-invalid', 'false');

  // Re-render only when this edit actually changes which fields are shown.
  // The old guard was `allFields().some(x => x.showIf)`, which is always true, so
  // every keystroke rebuilt the step and the caret had to be put back by hand.
  const before = visibleSignature();
  state[n] = ctl.value;
  if (visibleSignature() === before) return;

  const active = document.activeElement?.name;
  const pos = document.activeElement?.selectionStart;
  render();
  if (active) {
    const el = document.querySelector(`[name="${active}"]`);
    if (el) {
      el.focus();
      if (pos != null && el.setSelectionRange && el.type === 'text') el.setSelectionRange(pos, pos);
    }
  }
});

/** Which conditional fields are currently shown, as a cheap comparable string. */
function visibleSignature() {
  return SPEC[step].boxes
    .flatMap((b) => b.fields || [])
    .filter((f) => f.showIf)
    .map((f) => (f.showIf(state) ? f.id : ''))
    .join(',');
}

// Romanise when the user leaves the field. In place and visible: the conversion
// is imperfect (no word segmentation, so long runs mash together), so the honest
// move is to show the result and let them fix it, not to transform silently.
document.getElementById('form').addEventListener('focusout', (e) => {
  const rep = repeatRef(e.target.name);
  const f = rep ? rep.field : allFields().find((x) => x.id === e.target.name);
  if (!f?.romanize || !hasCJK(e.target.value)) return;
  const fn = f.romanize === 'company' ? romanizeCompany : romanizeAddress;
  e.target.value = fn(e.target.value);
  if (rep) state[rep.key][rep.i][f.id] = e.target.value;
  else state[f.id] = e.target.value;
  const host = e.target.closest('[data-fid]');
  const note = host?.querySelector('.note');
  if (note) { note.textContent = '已转为拼音，请核对'; note.hidden = false; }
});

document.getElementById('form').addEventListener('click', (e) => {
  const add = e.target.dataset?.add;
  if (add) { state[add].push({}); render(); return; }
  const del = e.target.dataset?.del;
  if (del) {
    const [key, i] = del.split(':');
    state[key].splice(+i, 1);
    render();
  }
});

document.getElementById('rail').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { step = +go.dataset.go; render(); }
});

document.getElementById('prev').addEventListener('click', () => { if (step > 0) { step--; render(); } });

document.getElementById('next').addEventListener('click', async () => {
  if (!validateStep()) return;
  if (step < SPEC.length - 1) {
    step++;
    prefill5645();
    render();
    return;
  }

  const busy = document.getElementById('busy');
  const next = document.getElementById('next');
  busy.textContent = '正在生成…';
  next.disabled = true;
  try {
    generated = await generateAll();
    renderRadar();
    document.getElementById('form').hidden = true;
    document.getElementById('rail').hidden = true;
    document.getElementById('result').hidden = false;
    renderDownloads();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    alert('生成失败：' + err.message + '\n\n你填的内容没有离开这台电脑。');
    console.error(err);
  } finally {
    busy.textContent = '';
    next.disabled = false;
  }
});


document.getElementById('downloads').addEventListener('click', (e) => {
  const i = e.target.dataset?.dl;
  if (i == null) return;
  const g = generated[+i];
  const base = document.getElementById('downloads').dataset.base;
  g.url = g.url || URL.createObjectURL(new Blob([g.pdf], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = g.url;
  a.download = `${base}-${g.id}.pdf`;
  a.click();
});

document.getElementById('back').addEventListener('click', () => {
  releaseUrl();
  document.getElementById('result').hidden = true;
  document.getElementById('form').hidden = false;
  document.getElementById('rail').hidden = false;
  render();
});


}

// ── boot ─────────────────────────────────────────────────────────────────
/** `?demo=1` fills a sample applicant and jumps to the result, so the flags and
 *  the CTA can be seen without typing five steps of answers. Wholly invented
 *  data; nothing about it is a real person. Unlinked -- it exists for checking
 *  the funnel end to end. */
const DEMO = {
  serviceIn: '01', visaType: 'VisitorVisa',
  familyName: 'CHEN', givenName: 'XIAOMEI', aliasInd: 'N',
  sex: 'Female', dob: '1985-07-19', birthCity: 'Ningbo', birthCountry: '202', citizenship: '202',
  corCountry: '202', corStatus: '01', pcrInd: 'N', sameAsCor: 'Y',
  marital: '01', marriageDate: '2011-10-02', spouseFamily: 'LIN', spouseGiven: 'HAO', prevMarried: 'N',
  passportNum: 'E90887766', passportCountry: '202',
  passportIssue: '2023-02-08', passportExpiry: '2033-02-07',
  nativeLang: '299', ableTo: 'English', langTest: 'N',
  natIdInd: 'Y', natIdNum: '330203198507190028', natIdCountry: '202',
  natIdIssue: '2017-11-20', natIdExpiry: '2037-11-20', usCardInd: 'N',
  streetNum: '66', streetName: 'Zhongshan East Road', city: 'Ningbo', province: 'Zhejiang',
  country: '202', sameAsMailing: 'Y',
  phoneType: '02', phoneCC: '86', phoneNum: '8613806668888', email: 'demo@example.com',
  purpose: '02', stayFrom: '2026-12-05', stayTo: '2026-12-26', funds: '120000',
  hostName: 'Sarah Thompson', hostRel: 'Friend', hostAddr: '250 Yonge Street, Toronto, ON',
  bg1a: 'N', bg1b: 'N', vc1: 'N', vc2: 'Y', vc3: 'Y',
  refusedDetails: 'Canadian TRV refused 11 Mar 2022 (V987654321, IRPR 179(b)).',
  bg3: 'N', military: 'N', orgs: 'N', govPos: 'N', consent: 'N',
  f5645AppZh: '陈晓梅',
  spouse5645Zh: '林浩', spouse5645DOB: '1983-05-11', spouse5645COB: 'China',
  spouse5645MStatus: '5', spouse5645Address: 'No. 66 Zhongshan East Road, Haishu District, Ningbo, Zhejiang',
  spouse5645Occupation: 'Engineer', spouse5645Acc: 'N',
  motherName: 'XU, Guiyun', motherZh: '徐桂云', motherDOB: '1958-03-30', motherCOB: 'China',
  motherMStatus: '5', motherAddress: 'Haishu District, Ningbo, Zhejiang', motherOccupation: 'Retired', motherAcc: 'N',
  fatherName: 'CHEN, Jianping', fatherZh: '陈建平', fatherDOB: '1956-12-08', fatherCOB: 'China',
  fatherMStatus: '5', fatherAddress: 'Haishu District, Ningbo, Zhejiang', fatherOccupation: 'Retired', fatherAcc: 'N',
};
const DEMO_ROWS = {
  children: [
    { name: 'LIN, Zixuan', zh: '林梓萱', rel: 'Daughter', dob: '2013-06-21', mstatus: '6',
      cob: 'China', occ: 'Student', addr: 'No. 66 Zhongshan East Road, Ningbo, Zhejiang', acc: 'N' },
    { name: 'LIN, Zihang', zh: '林梓航', rel: 'Son', dob: '2018-09-03', mstatus: '6',
      cob: 'China', occ: 'Student', addr: 'No. 66 Zhongshan East Road, Ningbo, Zhejiang', acc: 'N' },
  ],
  siblings: [
    { name: 'CHEN, Xiaodong', zh: '陈晓东', rel: 'Brother', dob: '1982-02-14', mstatus: '5',
      cob: 'China', occ: 'Driver', addr: 'Jiangbei District, Ningbo, Zhejiang', acc: 'N' },
  ],
  employment: [
    { from: '2014-04-01', to: '2026-07-15', position: 'Accountant',
      employer: 'Ningbo Yangli Trading Co., Ltd.', city: 'Ningbo', prov: 'Zhejiang', country: '202' },
    { from: '2009-07-01', to: '2014-03-31', position: 'Clerk',
      employer: 'Ningbo No. 2 Textile Factory', city: 'Ningbo', prov: 'Zhejiang', country: '202' },
  ],
  education: [
    { from: '2006-09-01', to: '2009-06-30', position: "Bachelor's degree in Accounting",
      school: 'Zhejiang Gongshang University', city: 'Hangzhou', prov: 'Zhejiang', country: '202',
      description: 'Full-time' },
    { from: '2003-09-01', to: '2006-06-30', position: 'Diploma in Business',
      school: 'Ningbo Yangli Vocational and Technical College', city: 'Ningbo', prov: 'Zhejiang',
      country: '202', description: 'Full-time' },
  ],
  travel: [
    { from: '2024-08-03', to: '2024-08-12', name: 'Tourism', description: 'Tokyo, Japan' },
    { from: '2019-05-01', to: '2019-05-08', name: 'Tourism', description: 'Seoul, South Korea' },
    { from: '2017-02-11', to: '2017-02-18', name: 'Tourism', description: 'Bangkok, Thailand' },
  ],
};

export async function boot() {
  LOV = await (await fetch('./imm5257-lov.json')).json();
  state.signDate ||= new Date().toISOString().slice(0, 10);
  wire();

  if (new URLSearchParams(location.search).get('demo')) {
    Object.assign(state, DEMO);
    Object.assign(state, DEMO_ROWS);
    prefill5645();   // the demo never walks the steps, so carry the answers over by hand
    try {
      generated = await generateAll();
      renderRadar();
      document.getElementById('form').hidden = true;
      document.getElementById('rail').hidden = true;
      document.getElementById('result').hidden = false;
      renderDownloads();
      return;
    } catch (e) {
      console.error('demo failed', e);
    }
  }
  render();
}
if (document.getElementById('form')) await boot();
