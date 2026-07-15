/**
 * Form definition, rendering, and value mapping for the IMM5257 tool.
 *
 * The form mirrors the real IMM5257's own section numbering so a user can hold
 * the generated PDF next to this page and check item by item.
 *
 * Everything stays in this tab: no network calls beyond fetching the blank form
 * and the code itself.
 */
import { fillImm5257 } from './xfa-fill.js';

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
          { id: 'familyName', label: '姓（与护照一致，拼音）', type: 'text', req: true, upper: true, row: 'two',
            paths: (v) => ({ [`${P1}/Name/FamilyName`]: v }) },
          { id: 'givenName', label: '名（与护照一致，拼音）', type: 'text', upper: true, row: 'two',
            paths: (v) => ({ [`${P1}/Name/GivenName`]: v }) },
          { id: 'aliasInd', label: '是否曾用过其他姓名？', hint: '曾用名、婚前姓、别名等', type: 'yn', req: true,
            paths: (v) => ({ [`${P1}/AliasName/AliasNameIndicator/AliasNameIndicator`]: v }) },
          { id: 'aliasFamily', label: '曾用姓', type: 'text', upper: true, row: 'two', showIf: (s) => s.aliasInd === 'Y',
            paths: (v) => ({ [`${P1}/AliasName/AliasFamilyName`]: v }) },
          { id: 'aliasGiven', label: '曾用名', type: 'text', upper: true, row: 'two', showIf: (s) => s.aliasInd === 'Y',
            paths: (v) => ({ [`${P1}/AliasName/AliasGivenName`]: v }) },
          { id: 'sex', label: '性别', type: 'select', req: true, lov: 'GenderMelList', row: 'two',
            paths: (v) => ({ [`${P1}/Sex/Sex`]: v }) },
          { id: 'dob', label: '出生日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { y: `${P1}/DOBYear`, m: `${P1}/DOBMonth`, d: `${P1}/DOBDay` }) },
          { id: 'birthCity', label: '出生城市', type: 'text', req: true, row: 'two',
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
          { id: 'corOther', label: '其他身份说明', type: 'text', showIf: (s) => s.corStatus === '06',
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
          { id: 'spouseFamily', label: '配偶姓', type: 'text', upper: true, row: 'two', showIf: (s) => ['01', '03'].includes(s.marital),
            paths: (v) => ({ [`${P1M}/FamilyName`]: v }) },
          { id: 'spouseGiven', label: '配偶名', type: 'text', upper: true, row: 'two', showIf: (s) => ['01', '03'].includes(s.marital),
            paths: (v) => ({ [`${P1M}/GivenName`]: v }) },
          { id: 'prevMarried', label: '是否曾有过其他婚姻或同居关系？', type: 'yn', req: true,
            paths: (v) => ({ [`${P2M}/PrevMarriedIndicator`]: v }) },
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
          { id: 'aptUnit', label: '公寓 / 单元号', type: 'text', row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/Apt/AptUnit`]: v }) },
          { id: 'streetNum', label: '门牌号', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/StreetNum/StreetNum`]: v }) },
          { id: 'streetName', label: '街道名', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow1/Streetname/Streetname`]: v }) },
          { id: 'city', label: '城市', type: 'text', req: true, row: 'three',
            paths: (v) => ({ [`${CT}/AddressRow2/CityTow/CityTown`]: v }) },
          { id: 'province', label: '省 / 州', type: 'text', row: 'three',
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
          { id: 'purposeOther', label: '其他目的说明', type: 'text', row: 'two', showIf: (s) => s.purpose === '03',
            paths: (v) => ({ [`${DV}/PurposeRow1/Other/Other`]: v }) },
          { id: 'stayFrom', label: '计划入境日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${DV}/PurposeRow1/HowLongStay/FromDate`, y: `${DV}/PurposeRow1/HowLongStay/StayDates/FromYr`, m: `${DV}/PurposeRow1/HowLongStay/StayDates/FromMM`, d: `${DV}/PurposeRow1/HowLongStay/StayDates/FromDD` }) },
          { id: 'stayTo', label: '计划离境日期', type: 'date', req: true, row: 'two',
            paths: (v) => spread(v, { whole: `${DV}/PurposeRow1/HowLongStay/ToDate`, y: `${DV}/PurposeRow1/HowLongStay/StayDates/ToYr`, m: `${DV}/PurposeRow1/HowLongStay/StayDates/ToMM`, d: `${DV}/PurposeRow1/HowLongStay/StayDates/ToDD` }) },
          // Funds is a numeric field: Acrobat's Validate rejects "CAD 15,000" or
          // anything with a currency word, comma, or space.
          { id: 'funds', label: '此行可用资金', hint: '只填数字，不要写 CAD、逗号或空格', type: 'digits', req: true,
            paths: (v) => ({ [`${DV}/PurposeRow1/Funds/Funds`]: String(v).replace(/[^\d]/g, '') }) },
          { id: 'hostName', label: '在加拿大的联系人姓名', type: 'text', row: 'two',
            paths: (v) => ({ [`${DV}/Contacts_Row1/Name/Name`]: v }) },
          { id: 'hostRel', label: '与你的关系', type: 'text', row: 'two',
            paths: (v) => ({ [`${DV}/Contacts_Row1/RelationshipToMe/RelationshipToMe`]: v }) },
          { id: 'hostAddr', label: '在加拿大的地址', type: 'text',
            paths: (v) => ({ [`${DV}/Contacts_Row1/AddressInCanada/AddressInCanada`]: v }) },
        ],
      },
      {
        num: '1',
        title: '教育',
        fields: [
          { id: 'eduInd', label: '高中毕业后是否上过大专或大学？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/Education/EducationIndicator': v }) },
        ],
      },
      {
        num: '1',
        title: '工作经历',
        hint: '填写过去十年的工作。退休或无业也请如实填写。',
        fields: [1, 2, 3].flatMap((n) => {
          const R = `form1/Page3/Occupation/OccupationRow${n}`;
          const only1 = (s) => n === 1 || s[`occ${n}Show`] === 'Y';
          return [
            ...(n > 1
              ? [{ id: `occ${n}Show`, label: `填写第 ${n} 段工作经历？`, type: 'yn',
                  paths: () => ({}) }]
              : []),
            { id: `occ${n}From`, label: '起始（年-月）', type: 'month', req: n === 1, row: 'two', showIf: only1,
              paths: (v) => (v ? { [`${R}/FromYear`]: v.split('-')[0], [`${R}/FromMonth`]: v.split('-')[1] } : {}) },
            { id: `occ${n}To`, label: '结束（年-月）', hint: '至今填当前月份', type: 'month', row: 'two', showIf: only1,
              paths: (v) => (v ? { [`${R}/ToYear`]: v.split('-')[0], [`${R}/ToMonth`]: v.split('-')[1] } : {}) },
            { id: `occ${n}Title`, label: '职位', type: 'text', req: n === 1, row: 'two', showIf: only1,
              paths: (v) => ({ [`${R}/Occupation/Occupation`]: v }) },
            { id: `occ${n}Employer`, label: '雇主 / 公司', type: 'text', req: n === 1, row: 'two', showIf: only1,
              paths: (v) => ({ [`${R}/Employer`]: v }) },
            { id: `occ${n}City`, label: '城市', type: 'text', row: 'three', showIf: only1,
              paths: (v) => ({ [`${R}/CityTown/CityTown`]: v }) },
            { id: `occ${n}Prov`, label: '省 / 州', type: 'text', row: 'three', showIf: only1,
              paths: (v) => ({ [`${R}/ProvState`]: v }) },
            { id: `occ${n}Country`, label: '国家或地区', type: 'select', lov: 'CountryList', row: 'three', showIf: only1,
              paths: (v) => ({ [`${R}/Country/Country`]: v }) },
          ];
        }),
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
          { id: 'bgMedical', label: '如上面任一题答「是」，请简要说明', type: 'text', showIf: (s) => s.bg1a === 'Y' || s.bg1b === 'Y',
            paths: (v) => ({ 'form1/Page3/BackgroundInfo/Details/MedicalDetails': v }) },
          { id: 'vc1', label: '2a. 你是否曾在加拿大逾期居留、无授权工作或无授权学习？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/VisaChoice1': v }) },
          { id: 'vc2', label: '2b. 你是否曾被任何国家拒签、拒绝入境或被要求离境？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/VisaChoice2': v }) },
          { id: 'vc3', label: '2c. 你此前是否申请过来加拿大？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/Details/VisaChoice3': v }) },
          { id: 'refusedDetails', label: '2d. 如上面任一题答「是」，请简要说明', hint: '字数有限，写要点即可', type: 'text',
            showIf: (s) => [s.vc1, s.vc2, s.vc3].includes('Y'),
            paths: (v) => ({ 'form1/Page3/BackgroundInfo2/Details/refusedDetails': v }) },
          { id: 'bg3', label: '3. 你是否曾犯罪、被捕、被指控或被判刑？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/BackgroundInfo3/Choice': v }) },
          { id: 'bg3d', label: '请简要说明', type: 'text', showIf: (s) => s.bg3 === 'Y',
            paths: (v) => ({ 'form1/Page3/PageWrapper/BackgroundInfo3/details': v }) },
          { id: 'military', label: '4. 你是否曾在军队、民兵或民防部队服役？', type: 'yn', req: true,
            paths: (v) => ({ 'form1/Page3/PageWrapper/Military/Choice': v }) },
          { id: 'militaryD', label: '请简要说明', type: 'text', showIf: (s) => s.military === 'Y',
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
        ],
      },
    ],
  },
];

// ── state ────────────────────────────────────────────────────────────────
const state = {};
let LOV = {};
let step = 0;
let generated = null;
let blobUrl = null;

const allFields = () => SPEC.flatMap((s) => s.boxes.flatMap((b) => b.fields));
const visible = (f) => !f.showIf || f.showIf(state);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ── render ───────────────────────────────────────────────────────────────
function fieldHtml(f) {
  const req = f.req ? '<span class="req" aria-hidden="true">*</span>' : '';
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  const v = state[f.id] || '';

  if (f.type === 'yn') {
    return `<div class="q" data-fid="${f.id}">
      <div class="qt">${req}${esc(f.label)} ${hint}</div>
      <div class="yn" role="radiogroup" aria-label="${esc(f.label)}">
        <label><input type="radio" name="${f.id}" value="N" ${v === 'N' ? 'checked' : ''}>否 No</label>
        <label><input type="radio" name="${f.id}" value="Y" ${v === 'Y' ? 'checked' : ''}>是 Yes</label>
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
  } else if (f.type === 'digits') {
    control = `<input type="text" inputmode="numeric" pattern="[0-9]*" name="${f.id}" value="${esc(v)}">`;
  } else {
    control = `<input type="${f.type === 'email' ? 'email' : 'text'}" name="${f.id}" value="${esc(v)}"${f.upper ? ' style="text-transform:uppercase"' : ''}>`;
  }

  return `<label class="f" data-fid="${f.id}">
    <span class="lab">${req}${esc(f.label)}${hint}</span>
    ${control}
    <span class="err">此项必填</span>
  </label>`;
}

function boxHtml(b) {
  const fields = b.fields.filter(visible);
  if (!fields.length) return '';
  // group consecutive fields that share a row hint
  const groups = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (last && last.row && last.row === f.row) last.items.push(f);
    else groups.push({ row: f.row, items: [f] });
  }
  return `<fieldset class="box">
    <legend><span class="box-hd"><span class="num">${esc(b.num)}</span><span class="t">${esc(b.title)}</span></span></legend>
    <div class="box-body">
      ${b.hint ? `<p style="margin:0;font-size:13px;color:var(--ink-soft)">${esc(b.hint)}</p>` : ''}
      ${groups.map((g) => `<div class="row ${g.row || ''}">${g.items.map(fieldHtml).join('')}</div>`).join('')}
    </div>
  </fieldset>`;
}

function render() {
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
  for (const f of SPEC[step].boxes.flatMap((b) => b.fields)) {
    if (!visible(f) || !f.req) continue;
    const ok = !!state[f.id];
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
    Object.assign(out, f.paths(v, s));
  }
  return out;
}

function releaseUrl() {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = null;
}

// ── events ───────────────────────────────────────────────────────────────
/** All DOM wiring lives here so importing this module has no side effects and
 *  the pure parts (SPEC, buildValues) stay testable without a page. */
function wire() {
document.getElementById('form').addEventListener('input', (e) => {
  const n = e.target.name;
  if (!n) return;
  const fld = allFields().find((x) => x.id === n);
  if (fld?.type === 'digits') e.target.value = e.target.value.replace(/[^\d]/g, '');
  state[n] = e.target.value;
  const ctl = e.target;
  if (ctl.getAttribute('aria-invalid') === 'true' && ctl.value) ctl.setAttribute('aria-invalid', 'false');
  // conditional fields may need to appear or disappear
  const f = allFields().find((x) => x.id === n);
  if (f && allFields().some((x) => x.showIf)) {
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
  }
});

document.getElementById('rail').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { step = +go.dataset.go; render(); }
});

document.getElementById('prev').addEventListener('click', () => { if (step > 0) { step--; render(); } });

document.getElementById('next').addEventListener('click', async () => {
  if (!validateStep()) return;
  if (step < SPEC.length - 1) { step++; render(); return; }

  const busy = document.getElementById('busy');
  const next = document.getElementById('next');
  busy.textContent = '正在生成…';
  next.disabled = true;
  try {
    const blank = new Uint8Array(await (await fetch('./IMM5257-blank.pdf')).arrayBuffer());
    const { pdf, missing } = await fillImm5257(blank, buildValues(state));
    if (missing.length) console.warn('paths not found in the form:', missing);
    releaseUrl();
    generated = pdf;
    document.getElementById('form').hidden = true;
    document.getElementById('rail').hidden = true;
    document.getElementById('result').hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    busy.textContent = '';
    alert('生成失败：' + err.message + '\n\n请刷新页面重试。你填的内容没有离开这台电脑。');
    console.error(err);
  } finally {
    busy.textContent = '';
    next.disabled = false;
  }
});

document.getElementById('back').addEventListener('click', () => {
  releaseUrl();
  document.getElementById('result').hidden = true;
  document.getElementById('form').hidden = false;
  document.getElementById('rail').hidden = false;
  render();
});

document.getElementById('download').addEventListener('click', () => {
  const name = [state.familyName, state.givenName].filter(Boolean).join('-').toUpperCase() || 'IMM5257';
  // Keep the URL alive: revoking straight after click races the download in some
  // browsers, and people reasonably click download more than once.
  if (!blobUrl) blobUrl = URL.createObjectURL(new Blob([generated], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${name}-IMM5257.pdf`;
  a.click();
});
}

// ── boot ─────────────────────────────────────────────────────────────────
export async function boot() {
  LOV = await (await fetch('./imm5257-lov.json')).json();
  wire();
  render();
}
if (document.getElementById('form')) await boot();
