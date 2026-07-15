/**
 * Client-side IMM5257 filler.
 *
 * IRCC's IMM5257 is a certified XFA form: it carries a DocMDP signature (/P 2 =
 * form fill-in only) and a UR3 Reader-Extensions signature granting /FillIn and
 * /BarcodePlaintext. Those Reader rights are what let a free Adobe Reader user
 * press Validate, which is what regenerates the PDF417 barcode the IRCC portal
 * checks. Rewriting the file (what pdf-lib and pypdf both do) changes the signed
 * bytes and voids both signatures, so the form stops being fillable and the
 * portal rejects it.
 *
 * So we do what Acrobat does: leave every original byte alone and append a new
 * revision containing just the rewritten datasets stream and a new xref stream.
 *
 * No pdf-lib, no crypto library: the blank form we ship is fixed, so its AES
 * object key is a constant, and AES-CBC + zlib are both native to the browser.
 *
 * Nothing here leaves the tab.
 */

// Constants of the specific blank we ship. Re-derive them with tools/pin-blank.py
// whenever the pinned canada.ca PDF is refreshed; see web/trv-tool/README.md.
// Pinned to IMM5257 FormVersion .ENU-09-2023 (canada.ca imm5257/01-09-2023).
export const BLANK = {
  datasetsObj: 117,
  // AES-128 object key for the datasets object, gen 0. Not a secret: the PDF uses
  // the standard security handler with an empty user password, so anyone holding
  // the public form can derive this. It only exists to satisfy the encryption.
  objectKeyHex: 'b48521648277a36fa19a485e35b4a679',
  expectedSize: 1364527,
};

const te = new TextEncoder();
const td = new TextDecoder();

const hexToBytes = (h) => Uint8Array.from(h.match(/../g).map((b) => parseInt(b, 16)));

async function inflate(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function deflate(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function aesKey(hex) {
  return crypto.subtle.importKey('raw', hexToBytes(hex), { name: 'AES-CBC' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function aesDecrypt(keyHex, data) {
  const key = await aesKey(keyHex);
  const iv = data.slice(0, 16);
  const body = data.slice(16);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, body));
}

async function aesEncrypt(keyHex, data) {
  const key = await aesKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

const latin1 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
};

const fromLatin1 = (str) => {
  const b = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 0xff;
  return b;
};

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Find `<num> 0 obj <<dict>> stream\n`, returning the dict text and the stream slice.
 *
 *  Takes the LAST match: the canada.ca blank is itself an incrementally-updated
 *  file where object 116 appears twice, and only the later one is live. Reading
 *  the first would silently resurrect the superseded revision.
 *
 *  Sized by the declared /Length: the encrypted payload can contain "endstream". */
function findStream(pdf, num) {
  const hay = latin1(pdf);
  const re = new RegExp(`(?<![0-9])${num} 0 obj`, 'g');
  let m = null;
  for (let hit; (hit = re.exec(hay)); ) m = hit;
  if (!m) throw new Error(`object ${num} not found`);
  const kw = hay.indexOf('stream', m.index);
  const dict = hay.slice(m.index + `${num} 0 obj`.length, kw);
  const len = parseInt(/\/Length\s+(\d+)/.exec(dict)[1], 10);
  let s = kw + 'stream'.length;
  if (hay.substr(s, 2) === '\r\n') s += 2;
  else if (hay[s] === '\n' || hay[s] === '\r') s += 1;
  return { dict, start: s, bytes: pdf.slice(s, s + len) };
}

// exclGroup (Y/N radio) tags. Acrobat binds plain text on the group itself but
// only renders the check state from a nested <Yes>/<No> child.
const EXCL_TAGS = [
  'AliasNameIndicator', 'PCRIndicator', 'SameAsCORIndicator', 'PrevMarriedIndicator',
  'natIDIndicator', 'usCardIndicator', 'SameAsMailingIndicator', 'EducationIndicator',
  'LanguageTest', 'VisaChoice1', 'VisaChoice2', 'VisaChoice3', 'Choice',
];

function nestExclGroups(xml) {
  for (const tag of EXCL_TAGS) {
    xml = xml.replace(new RegExp(`<${tag}\\b[^>]*>([YN])</${tag}\\s*>`, 'g'), (_m, v) =>
      v === 'Y'
        ? `<${tag}><Yes>Y</Yes><No /></${tag}>`
        : `<${tag}><Yes /><No>N</No></${tag}>`
    );
  }
  return xml;
}

/** Walk a `Page1/PersonalDetails/Name/FamilyName` path, honouring `Tag[2]` indices.
 *  Only ever writes to leaves that already exist: adding nodes would exceed what
 *  DocMDP /P 2 allows and Acrobat would refuse to open the file. */
function setValue(root, path, value) {
  let node = root;
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    const m = /^(.+?)(?:\[(\d+)\])?$/.exec(parts[i]);
    const name = m[1];
    const idx = m[2] ? parseInt(m[2], 10) : 0;
    const kids = Array.from(node.children).filter((c) => c.tagName === name);
    if (kids.length <= idx) return false;
    node = kids[idx];
  }
  node.textContent = value;
  return true;
}

export class Imm5257Filler {
  constructor(pdfBytes) {
    this.pdf = pdfBytes;
  }

  async load() {
    // findStream takes the FIRST `116 0 obj`, so this only ever works on the
    // pristine blank: hand it an already-filled PDF and it would silently read
    // the superseded original object instead of the appended one.
    if (this.pdf.length !== BLANK.expectedSize) {
      throw new Error(
        `expected the pinned blank IMM5257 (${BLANK.expectedSize} bytes), got ${this.pdf.length}`
      );
    }
    const { dict, bytes } = findStream(this.pdf, BLANK.datasetsObj);
    this.dsDict = dict;
    this.flate = dict.includes('FlateDecode');
    const raw = await aesDecrypt(BLANK.objectKeyHex, bytes);
    this.xml = td.decode(this.flate ? await inflate(raw) : raw);
    return this;
  }

  /** values: { "form1/Page1/PersonalDetails/Name/FamilyName": "ZHANG", ... } */
  setValues(values) {
    const doc = new DOMParser().parseFromString(this.xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('datasets XML did not parse');

    const form1 = doc.getElementsByTagName('form1')[0];
    if (!form1) throw new Error('no form1 node in datasets');

    const filled = [];
    const missing = [];
    for (const [path, value] of Object.entries(values)) {
      if (value === '' || value == null) continue;
      const rel = path.startsWith('form1/') ? path.slice('form1/'.length) : path;
      (setValue(form1, rel, String(value)) ? filled : missing).push(path);
    }

    // XMLSerializer never emits an <?xml?> declaration here; one would make
    // Acrobat fail with error 17.
    this.xml = nestExclGroups(new XMLSerializer().serializeToString(doc));
    return { filled, missing };
  }

  /** Append the new revision. Returns the complete PDF bytes. */
  async save() {
    let body = te.encode(this.xml);
    if (this.flate) body = await deflate(body);
    body = await aesEncrypt(BLANK.objectKeyHex, body);

    const newDict = this.dsDict.trim().replace(/\/Length\s+\d+/, `/Length ${body.length}`);

    const hay = latin1(this.pdf);
    const prev = parseInt(/startxref\s+(\d+)/.exec(hay.slice(-2048))[1], 10);
    const idm = /\/ID\s*\[\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\]/.exec(hay.slice(prev, prev + 400));
    if (!idm) throw new Error('could not read /ID from the previous xref stream');
    const size = parseInt(/\/Size\s+(\d+)/.exec(hay.slice(prev, prev + 400))[1], 10);
    const rootNum = parseInt(/\/Root\s+(\d+) 0 R/.exec(hay.slice(prev, prev + 400))[1], 10);
    const infoNum = parseInt(/\/Info\s+(\d+) 0 R/.exec(hay.slice(prev, prev + 400))[1], 10);
    const encNum = parseInt(/\/Encrypt\s+(\d+) 0 R/.exec(hay.slice(prev, prev + 400))[1], 10);

    const head = this.pdf[this.pdf.length - 1] === 0x0a ? this.pdf : concat([this.pdf, te.encode('\n')]);
    const offDs = head.length;
    const dsChunk = concat([
      te.encode(`${BLANK.datasetsObj} 0 obj\n${newDict}\nstream\n`),
      body,
      te.encode('\nendstream\nendobj\n'),
    ]);

    const offXref = offDs + dsChunk.length;
    const xrefNum = size;
    const entry = (off) => {
      const b = new Uint8Array(7);
      b[0] = 1;
      new DataView(b.buffer).setUint32(1, off);
      return b; // type(1) offset(4) gen(2, zero)
    };
    const xdata = await deflate(concat([entry(offDs), entry(offXref)]));
    const xdict =
      `<</Type/XRef/Size ${size + 1}/Prev ${prev}/Root ${rootNum} 0 R/Info ${infoNum} 0 R` +
      `/Encrypt ${encNum} 0 R/ID[<${idm[1]}><${idm[2]}>]` +
      `/Index[${BLANK.datasetsObj} 1 ${xrefNum} 1]/W[1 4 2]/Filter/FlateDecode/Length ${xdata.length}>>`;

    return concat([
      head,
      dsChunk,
      te.encode(`${xrefNum} 0 obj\n${xdict}\nstream\n`),
      xdata,
      te.encode(`\nendstream\nendobj\nstartxref\n${offXref}\n%%EOF\n`),
    ]);
  }
}

export async function fillImm5257(blankBytes, values) {
  const f = await new Imm5257Filler(blankBytes).load();
  const report = f.setValues(values);
  const pdf = await f.save();
  if (latin1(pdf.slice(0, blankBytes.length)) !== latin1(blankBytes)) {
    throw new Error('original bytes were modified -- the certification would be void');
  }
  return { pdf, ...report };
}
