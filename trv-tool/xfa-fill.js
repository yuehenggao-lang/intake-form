/**
 * Client-side filler for IRCC's certified XFA forms.
 *
 * These PDFs carry signatures: IMM5257 has a DocMDP certification (/P 2 = form
 * fill-in only) plus a UR3 Reader-Extensions signature; IMM5645 and IMM0104 have
 * UR3 only. UR3 is what grants /FillIn and /BarcodePlaintext, i.e. what lets a
 * free Adobe Reader fill the form and press Validate -- and Validate is what
 * regenerates the PDF417 barcode the IRCC portal checks.
 *
 * Rewriting the file (which is what pdf-lib and pypdf both do) changes the signed
 * bytes and voids all of that. So we do what Acrobat does: leave every original
 * byte alone and append a new revision. Verified: an Acrobat-filled,
 * portal-accepted IMM5257 is byte-identical to its blank for the whole certified
 * range, with the changes appended after.
 *
 * No pdf-lib and no crypto library: each blank we ship is pinned, so its AES
 * object keys are constants, and AES-CBC + zlib are both native to the browser.
 *
 * Nothing here leaves the tab.
 */

/**
 * Pinned blanks. Re-derive with `python3 scripts/xfa_incremental.py --pin FILE`
 * whenever a blank is refreshed; see README.md.
 *
 * Re-pin from canada.ca's current edition; the portal accepts it (verified
 * 2026-07-15 on .ENU-09-2023). What the portal will not accept is a datasets
 * packet whose node tree differs from the blank's -- see setValue below. The
 * form edition was suspected first and is not the issue.
 *
 * Pin a blank, never a submitted form. knowledge/forms/pdfs/IMM5257-working.pdf
 * looks like a blank but is a client's accepted submission, UCI and passport
 * number included; shipping it would publish their file. Check any candidate's
 * datasets for names before pinning it.
 *
 * The object keys are not secrets: these PDFs use the standard security handler
 * with an empty user password, so anyone holding the public form can derive them.
 * They exist only to satisfy the PDF's encryption.
 */
export const FORMS = {
  IMM5257: {
    file: 'IMM5257-blank.pdf',
    size: 1364527, // .ENU-09-2023, canada.ca's current edition
    root: 'form1',
    objs: { datasets: { num: 117, key: 'b48521648277a36fa19a485e35b4a679' } },
  },
  IMM5645: {
    file: 'IMM5645-blank.pdf',
    size: 1495618,
    root: 'IMM_5645',
    objs: { datasets: { num: 58, key: 'dbb1984c13e7bcacbc51da8a945f056f' } },
  },
  IMM0104: {
    file: 'IMM0104-blank.pdf',
    size: 2509788,
    root: 'IMM_0104',
    // Dynamic XFA: rows are instantiated from <occur>, so filling more than one
    // row per table means rewriting the template and clearing the form packet
    // too, not just datasets.
    objs: {
      template: { num: 3, key: 'c07f5917f2ac0792483b6eb731210aca' },
      datasets: { num: 75, key: 'b7cc79104169eab9d5c0353e0db709e0' },
      form: { num: 76, key: '50876c0c13d4072accea26fd4b7c81b0' },
    },
    dynamic: true,
  },
};

const te = new TextEncoder();
const td = new TextDecoder();
const hexToBytes = (h) => Uint8Array.from(h.match(/../g).map((b) => parseInt(b, 16)));

const inflate = async (b) =>
  new Uint8Array(
    await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()
  );
const deflate = async (b) =>
  new Uint8Array(
    await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()
  );

const aesKey = (hex) =>
  crypto.subtle.importKey('raw', hexToBytes(hex), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);

async function aesDecrypt(keyHex, data) {
  const key = await aesKey(keyHex);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-CBC', iv: data.slice(0, 16) }, key, data.slice(16))
  );
}

async function aesEncrypt(keyHex, data) {
  const key = await aesKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data));
  return concat([iv, ct]);
}

function latin1(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return s;
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Locate `<num> 0 obj <<dict>> stream\n`.
 *
 *  Takes the LAST match: the canada.ca blanks are themselves incrementally
 *  updated files where an object can appear twice, and only the later one is
 *  live. Reading the first would silently resurrect a superseded revision.
 *
 *  Sized by the declared /Length -- the encrypted payload can contain the bytes
 *  "endstream" verbatim. */
function findStream(hay, num) {
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
  return { dict, start: s, length: len };
}

/** Walk `Page1/PersonalDetails/Name/FamilyName`, honouring `Tag[2]` indices.
 *
 *  Only writes leaves that already exist, and only ever as a scalar. The blank's
 *  datasets IS the schema the portal validates against: `<PCRIndicator/>` is a
 *  leaf, so `<PCRIndicator>N</PCRIndicator>` is the only legal fill. Wrapping a
 *  Y/N group in `<Yes>`/`<No>` children -- which Acrobat renders, and which
 *  Validate does not flag or normalise -- invents nodes the schema has no slot
 *  for, and the portal rejects the upload with "You have submitted an invalid
 *  form" (2026-07-15). Every IMM5257 the portal has accepted stores these as
 *  plain scalars, because that is what Acrobat writes when a human fills it.
 *
 *  The rule, for any tag: match the blank's shape exactly. Never add a node. */
function setValue(root, path, value) {
  let node = root;
  for (const part of path.split('/')) {
    const m = /^(.+?)(?:\[(\d+)\])?$/.exec(part);
    const kids = Array.from(node.children).filter((c) => c.tagName === m[1]);
    const idx = m[2] ? parseInt(m[2], 10) : 0;
    if (kids.length <= idx) return false;
    node = kids[idx];
  }
  node.textContent = value;
  return true;
}

export class XfaFiller {
  constructor(formId, pdfBytes) {
    this.form = FORMS[formId];
    if (!this.form) throw new Error(`unknown form ${formId}`);
    this.formId = formId;
    this.pdf = pdfBytes;
    this.packets = {};
    this.dirty = new Set();
  }

  async load() {
    if (this.pdf.length !== this.form.size) {
      throw new Error(
        `${this.formId}: expected the pinned blank (${this.form.size} bytes), got ${this.pdf.length}`
      );
    }
    this.hay = latin1(this.pdf);
    for (const [name, { num, key }] of Object.entries(this.form.objs)) {
      const { dict, start, length } = findStream(this.hay, num);
      const raw = await aesDecrypt(key, this.pdf.slice(start, start + length));
      const flate = dict.includes('FlateDecode');
      this.packets[name] = { dict, flate, xml: td.decode(flate ? await inflate(raw) : raw) };
    }
    return this;
  }

  setValues(values) {
    const ds = this.packets.datasets;
    const doc = new DOMParser().parseFromString(ds.xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('datasets XML did not parse');
    const root = doc.getElementsByTagName(this.form.root)[0];
    if (!root) throw new Error(`no <${this.form.root}> in datasets`);

    const filled = [];
    const missing = [];
    for (const [path, value] of Object.entries(values)) {
      if (value === '' || value == null) continue;
      const rel = path.startsWith(this.form.root + '/') ? path.slice(this.form.root.length + 1) : path;
      (setValue(root, rel, String(value)) ? filled : missing).push(path);
    }
    // XMLSerializer emits no <?xml?> declaration; one would make Acrobat fail
    // with error 17.
    ds.xml = new XMLSerializer().serializeToString(doc);
    this.dirty.add('datasets');
    return { filled, missing };
  }

  /**
   * Dynamic-XFA tables (IMM0104). Three things have to line up or nothing renders:
   *   1. datasets gets N same-named <Row1> siblings (XFA's InstanceManager binds
   *      instance N to sibling N -- not Row1/Row2/Row3 with different tags);
   *   2. the template's <occur max="-1"> becomes min="N" initial="N" so Acrobat
   *      instantiates exactly N rows on load (initial alone is not enough);
   *   3. the form packet is cleared so Acrobat reads from datasets.
   * Ported from scripts/fill_imm0104_multirow.py.
   */
  setRows(tables) {
    const ds = this.packets.datasets;
    const tpl = this.packets.template;
    // The occur patch is positional across all three tables, so normalise first:
    // a table the user left empty still has to resolve to 0 rows, not be skipped.
    tables = {
      EmploymentTbl: tables.EmploymentTbl || [],
      EducationTbl: tables.EducationTbl || [],
      TravelTbl: tables.TravelTbl || [],
    };

    for (const [table, rows] of Object.entries(tables)) {
      const cells = (r) =>
        ['<BtnSub xfa:dataNode="dataGroup"\n/>', vn('TimePeriodFrom', r.from), vn('TimePeriodFrom', r.to)]
          .concat(TABLE_FIELDS[table].slice(2).map((f) => vn(f, r[f])))
          .join('');
      const xml = rows.map((r) => `<Row1\n>${cells(r)}</Row1\n>`).join('');

      const re = new RegExp(`(<${table}\\b[^>]*>)([\\s\\S]*?)(</${table}\\s*>)`);
      const m = re.exec(ds.xml);
      if (!m) throw new Error(`table ${table} not found in datasets`);
      // keep the table's head (HeaderRow etc), drop any existing rows, append ours
      const body = m[2].replace(/<Row\d+\b[^>]*>[\s\S]*?<\/Row\d+\s*>/g, '');
      ds.xml = ds.xml.slice(0, m.index) + m[1] + body + xml + m[3] + ds.xml.slice(m.index + m[0].length);
    }

    // The three `<occur max="-1"/>` tags appear in document order --
    // Employment, Education, Travel -- and are not near their table's name.
    //
    // min stays at 1: forcing min=N spawns extra empty header+row instances
    // (found on a real case 2026-06-25). initial=N alone drives exactly N
    // data-bound rows. Ported from scripts/fill_imm0104_multirow.py.
    const counts = ['EmploymentTbl', 'EducationTbl', 'TravelTbl'].map((t) => (tables[t] || []).length);
    let seen = 0;
    const before = tpl.xml;
    tpl.xml = tpl.xml.replace(/<occur max="-1"\n\/>/g, (m) =>
      seen < 3 ? `<occur min="1" max="-1" initial="${counts[seen++]}"\n/>` : m
    );
    if (seen !== 3) throw new Error(`expected 3 <occur max="-1"/> in the template, patched ${seen}`);
    if (before === tpl.xml) throw new Error('template occur patch did not apply');

    this.packets.form.xml = '<form xmlns="http://www.xfa.org/schema/xfa-form/2.8/"/>\n';
    this.dirty.add('datasets').add('template').add('form');
  }

  /** Append one revision carrying every packet we touched. */
  async save() {
    const prev = parseInt(/startxref\s+(\d+)/.exec(this.hay.slice(-2048))[1], 10);
    const head = this.hay.slice(prev, prev + 400);
    const idm = /\/ID\s*\[\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\]/.exec(head);
    if (!idm) throw new Error('could not read /ID from the previous xref stream');
    const size = parseInt(/\/Size\s+(\d+)/.exec(head)[1], 10);
    const num = (k) => parseInt(new RegExp(`/${k}\\s+(\\d+) 0 R`).exec(head)[1], 10);

    const parts = [this.pdf[this.pdf.length - 1] === 0x0a ? this.pdf : concat([this.pdf, te.encode('\n')])];
    let off = parts[0].length;
    const entries = [];

    for (const name of this.dirty) {
      const pk = this.packets[name];
      const { num: objNum, key } = this.form.objs[name];
      let body = te.encode(pk.xml);
      if (pk.flate) body = await deflate(body);
      body = await aesEncrypt(key, body);
      const dict = pk.dict.trim().replace(/\/Length\s+\d+/, `/Length ${body.length}`);
      const chunk = concat([
        te.encode(`${objNum} 0 obj\n${dict}\nstream\n`),
        body,
        te.encode('\nendstream\nendobj\n'),
      ]);
      entries.push({ objNum, off });
      parts.push(chunk);
      off += chunk.length;
    }

    const xrefNum = size;
    entries.push({ objNum: xrefNum, off });
    entries.sort((a, b) => a.objNum - b.objNum);

    const entry = (o) => {
      const b = new Uint8Array(7);
      b[0] = 1;
      new DataView(b.buffer).setUint32(1, o);
      return b;
    };
    const index = entries.map((e) => `${e.objNum} 1`).join(' ');
    const xdata = await deflate(concat(entries.map((e) => entry(e.off))));
    const xdict =
      `<</Type/XRef/Size ${size + 1}/Prev ${prev}/Root ${num('Root')} 0 R/Info ${num('Info')} 0 R` +
      `/Encrypt ${num('Encrypt')} 0 R/ID[<${idm[1]}><${idm[2]}>]` +
      `/Index[${index}]/W[1 4 2]/Filter/FlateDecode/Length ${xdata.length}>>`;

    parts.push(te.encode(`${xrefNum} 0 obj\n${xdict}\nstream\n`), xdata,
               te.encode(`\nendstream\nendobj\nstartxref\n${off}\n%%EOF\n`));

    const out = concat(parts);
    if (latin1(out.slice(0, this.pdf.length)) !== this.hay) {
      throw new Error('original bytes were modified -- the signatures would be void');
    }
    return out;
  }
}

const TABLE_FIELDS = {
  EmploymentTbl: ['from', 'to', 'name', 'position', 'description'],
  EducationTbl: ['from', 'to', 'name', 'position', 'description'],
  TravelTbl: ['from', 'to', 'name', 'description'],
};

const vn = (name, value) =>
  value
    ? `<${name}\n>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${name}\n>`
    : `<${name}\n/>`;

/** Fill one form. `rows` is only meaningful for dynamic tables (IMM0104). */
export async function fillForm(formId, blankBytes, values, rows) {
  const f = await new XfaFiller(formId, blankBytes).load();
  const report = f.setValues(values);
  if (rows) f.setRows(rows);
  return { pdf: await f.save(), ...report };
}
