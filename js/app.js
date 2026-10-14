/* PN Infinity · TikTok Creator Hub — ตัวแอป (ไม่มี build step · ข้อมูลอยู่ใน data.js + library.js) */
(function () {
  'use strict';

  var D = window.PN_DATA, L = window.PN_LIBRARY, WC = window.WordCheck;
  var esc = WC.esc;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  var TABS = { home: 'แคมเปญ', prod: 'สินค้า', rules: 'กฎ', idea: 'ไอเดีย', lib: 'ตัดต่อ' };
  var RISK = { 'ต่ำ': 'lo', 'ปานกลาง': 'mid', 'สูง': 'hi', 'สูงสุด': 'max' };
  var SEV = { high: ['hi', 'เสี่ยงสูง'], medium: ['mid', 'เสี่ยงกลาง'], low: ['lo', 'เสี่ยงต่ำ'] };
  var SCOPE_OF = { skincare: 'เครื่องสำอาง', supplement: 'อาหาร/เสริมอาหาร' };
  var KEY_CHECKS = 'pnhub.checklist.v1';
  var PENDING = '<span class="pending">รอข้อมูล</span>';

  // ค่า null จาก data.js (README บอกให้ใส่ null เมื่อยังไม่รู้) ต้องไม่ทำให้หน้าพัง
  D.campaign = D.campaign || {};
  D.campaign.rows = D.campaign.rows || [];
  D.campaign.perks = D.campaign.perks || [];
  D.campaign.contact = D.campaign.contact || { title: 'ผู้ดูแล Affiliate', line: null, note: '' };
  D.products.forEach(function (p) {
    p.says = p.says || []; p.noSay = p.noSay || []; p.guard = p.guard || [];
    p.category = p.category || 'รอระบุหมวด'; p.fdaLabel = p.fdaLabel || 'เลข อย.';
  });

  var byId = {};
  D.products.forEach(function (p) { byId[p.id] = p; });
  var guardByCat = {};
  L.guard.forEach(function (g) { guardByCat[g.cat] = g; });

  var state = {
    tab: 'home',
    pcat: 'ทั้งหมด',      // ตัวกรองแท็บสินค้า
    open: null,            // id สินค้าที่กางอยู่
    ideaProd: '*',         // * = ทุกสินค้า · all = ใช้ได้ทุกตัว · <id>
    wordScope: '*',        // ตัวตรวจคำ: * = ทุกหมวด · <id>
    cur: null,             // ชุดที่สุ่มได้ {idea, product, hook, format, cta}
    spinning: false,
    spinId: 0,             // เปลี่ยนตัวกรองกลางการสุ่ม = ยกเลิกรอบที่ค้าง
    focusNext: false,      // ข้ามแท็บจากปุ่มในหน้า → ย้ายโฟกัสไปจุดหมาย
  };

  // ---------- utils ----------
  function val(v) { return v == null || v === '' ? PENDING : esc(v); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  // localStorage อาจใช้ไม่ได้ (บล็อกข้อมูลไซต์/โหมดส่วนตัว) → จำในหน่วยความจำของหน้านี้แทน
  var mem = {};
  function store(key, value) {
    if (value === undefined) {
      if (has(mem, key)) return mem[key];
      try { var raw = localStorage.getItem(key); return raw == null ? null : JSON.parse(raw); } catch (e) { return null; }
    }
    mem[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* จำแค่ในหน้านี้ */ }
    return null;
  }
  function fmtCount(n) {
    if (n >= 1e6) return (Math.floor(n / 1e5) / 10) + 'M+';
    if (n >= 1e4) return Math.floor(n / 1e3) + 'K+';
    return n.toLocaleString('th-TH');
  }
  function priceText(p) { return p.price == null || p.price === '' ? null : '฿ ' + p.price; }
  function refocus(attr, value) {
    var el = $$('[' + attr + ']').filter(function (x) { return x.getAttribute(attr) === value; })[0];
    if (el) el.focus();
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? (okMsg || 'คัดลอกแล้ว') : 'คัดลอกไม่ได้ — กดค้างที่ข้อความเพื่อคัดลอกเอง');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || 'คัดลอกแล้ว'); }, fallback);
    } else fallback();
  }

  // ---------- brand marks & product art ----------
  var INF = 'M24 12c-3-5-11-5-11 0s8 5 11 0 11-5 11 0-8 5-11 0';
  function markSvg(cls, id) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + (id ? ' id="' + id + '"' : '') +
      ' viewBox="0 0 48 24" aria-hidden="true" fill="none" stroke-width="3.6" stroke-linecap="round">' +
      '<path d="' + INF + '" stroke="#FE2C55" transform="translate(1.3 1.1)"/>' +
      '<path d="' + INF + '" stroke="#25F4EE" transform="translate(-1.3 -1.1)"/>' +
      '<path d="' + INF + '" stroke="#fff"/></svg>';
  }
  function shapeFor(kind, c) {
    switch (kind) {
      case 'jar': return '<rect x="16" y="20" width="32" height="10" rx="3" fill="' + c + '"/><rect x="14" y="29" width="36" height="21" rx="7" fill="#fff" stroke="' + c + '" stroke-width="2.5"/><path d="M22 39h20" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"/>';
      case 'capsule': return '<rect x="18" y="17" width="28" height="8" rx="2.5" fill="' + c + '"/><rect x="16" y="24" width="32" height="27" rx="6" fill="#fff" stroke="' + c + '" stroke-width="2.5"/><g transform="rotate(-35 32 38)"><rect x="23" y="34" width="18" height="8" rx="4" fill="' + c + '"/><path d="M32 34v8" stroke="#fff" stroke-width="1.6"/></g>';
      case 'sachet': return '<path d="M21 15h22v36a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3V15Z" fill="#fff" stroke="' + c + '" stroke-width="2.5"/><path d="M21 15l2.75 3 2.75-3 2.75 3 2.75-3 2.75 3 2.75-3 2.75 3 2.75-3" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linejoin="round"/><circle cx="32" cy="35" r="6" fill="' + c + '"/>';
      case 'leaf': return '<path d="M32 50c-11-6-15-17-10-30 13 2 20 12 17 26" fill="' + c + '"/><path d="M32 50c-2-9-5-16-10-30" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M33 50c2-10 7-16 13-19 2 9-3 16-13 19Z" fill="' + c + '" opacity=".7"/>';
      default: return '<path d="M32 14 50 23v18L32 50 14 41V23l18-9Z" fill="#fff" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 23l18 9 18-9M32 32v18" stroke="' + c + '" stroke-width="2.5" fill="none" stroke-linejoin="round"/>';
    }
  }
  function artHtml(p, cls) {
    return '<div class="art ' + (cls || '') + '" data-art="' + esc(p.id) + '" style="background:' + esc(p.color) + '22">' +
      '<svg viewBox="0 0 64 64" aria-hidden="true">' + shapeFor(p.kind, p.color) + '</svg></div>';
  }
  // ลองโหลดรูปจริงจาก assets/ — มีไฟล์เมื่อไหร่ก็แทนกราฟิกชั่วคราวเอง
  var realImg = {};
  function probe(src, done) {
    if (!src) return;
    if (has(realImg, src)) { if (realImg[src]) done(src); return; }
    var img = new Image();
    img.onload = function () { realImg[src] = true; done(src); };
    img.onerror = function () { realImg[src] = false; };
    img.src = src;
  }
  function productImage(p) { return p.image || ('assets/products/' + p.id + '.jpg'); }
  function upgradeArt(root) {
    $$('[data-art]', root).forEach(function (el) {
      var p = byId[el.getAttribute('data-art')];
      if (!p) return;
      probe(productImage(p), function (src) { el.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy">'; el.style.background = 'var(--paper)'; });
    });
  }
  function upgradeBrand() {
    probe(D.brand.logo, function (src) {
      $('#hdrMark').innerHTML = '<img src="' + esc(src) + '" alt="">';
      var big = $('#heroLogo');
      if (big) big.outerHTML = '<img id="heroLogo" class="logo-xl img" src="' + esc(src) + '" alt="' + esc(D.brand.name) + '">';
    });
    probe(D.brand.hero, function (src) {
      var h = $('.hero');
      if (h && !$('.photo', h)) h.insertAdjacentHTML('afterbegin', '<img class="photo" src="' + esc(src) + '" alt=""><div class="veil"></div>');
    });
  }

  // ---------- shared fragments ----------
  function head(eyebrow, title, lede, id) {
    return '<div class="eyebrow">' + esc(eyebrow) + '</div><h2 class="ttl" id="' + id + '" tabindex="-1">' + esc(title) + '</h2>' +
      (lede ? '<p class="lede">' + esc(lede) + '</p>' : '');
  }
  function numList(items) {
    return '<div class="stack">' + items.map(function (it, i) {
      return '<div class="card num"><div class="n">' + (i + 1) + '</div><div><b>' + esc(it.title) + '</b><span>' + esc(it.desc) + '</span></div></div>';
    }).join('') + '</div>';
  }
  function riskBadge(p) {
    if (!p.risk) return '<span class="badge">ความเสี่ยง: รอระบุ</span>';
    return '<span class="badge ' + (RISK[p.risk] || '') + '">เสี่ยง' + esc(p.risk) + '</span>';
  }
  function guardFor(p) {
    var hit = p.guard.map(function (name) { return guardByCat[name]; }).filter(Boolean);
    if (!hit.length) hit = L.guard.filter(function (g) { return g.groups.indexOf(p.group) >= 0 || g.groups.indexOf('all') >= 0; });
    return hit;
  }
  function noSayFor(p) {
    var seen = {}, out = [];
    p.noSay.concat.apply(p.noSay, guardFor(p).map(function (g) { return g.no; })).forEach(function (w) {
      var k = String(w).trim();
      if (k && !seen[k]) { seen[k] = 1; out.push(k); }
    });
    return out;
  }

  // ---------- คลังไอเดีย / เครื่องผสม ----------
  // ไอเดีย/รูปแบบที่ต้องใช้ฟุตเทจแบรนด์ — ยังไม่สุ่มให้จนกว่าทีมจะแจก (campaign.footageReady)
  function needsFootage(x) { return /ฟุตเทจแบรนด์|คลิปแบรนด์/.test([x.footage, x.name, x.structure].join(' ')); }
  function footageOk(x) { return D.campaign.footageReady || !needsFootage(x); }
  function ideaPool(filter) {
    if (filter === '*') return L.ideas;
    if (filter === 'all') return L.ideas.filter(function (i) { return i.product === 'all'; });
    return L.ideas.filter(function (i) { return i.product === filter || i.product === 'all'; });
  }
  function mixIdeaPool(filter) {
    var pool = ideaPool(filter).filter(footageOk);
    return pool.length ? pool : ideaPool(filter);
  }
  function productOf(idea) {
    if (idea.product !== 'all') return byId[idea.product] || null;
    return has(byId, state.ideaProd) ? byId[state.ideaProd] : null;
  }
  function hookPool(p) {
    var g = p ? p.group : 'general';
    var pool = L.hooks.filter(function (hk) { return hk.groups.indexOf('all') >= 0 || hk.groups.indexOf(g) >= 0; });
    return pool.length ? pool : L.hooks;
  }
  function formatPool(p) {
    var pool = L.formats.filter(footageOk);
    if (!p || p.group !== 'skincare') pool = pool.filter(function (f) { return !/before|after|ก่อน\s*[-–/]?\s*หลัง/i.test(f.name + ' ' + f.structure); });
    return pool.length ? pool : L.formats;
  }
  // จำนวนชุด (ไอเดีย × Hook × รูปแบบ) ที่เครื่องผสมสุ่มออกมาได้จริง — ไอเดียกลางนับรวมทุกสินค้าที่เลือกได้
  function reachableCombos() {
    var total = 0;
    L.ideas.filter(footageOk).forEach(function (idea) {
      var prods = idea.product === 'all' ? [null].concat(D.products) : [byId[idea.product]];
      var pairs = {};
      prods.forEach(function (p) {
        var fs = formatPool(p);
        hookPool(p).forEach(function (h) { fs.forEach(function (f) { pairs[L.hooks.indexOf(h) + '|' + L.formats.indexOf(f)] = 1; }); });
      });
      total += Object.keys(pairs).length;
    });
    return total;
  }

  // ---------- แคมเปญ ----------
  function renderHome() {
    var b = D.brand, c = D.campaign;
    var combos = reachableCombos();
    var pushed = D.products.filter(function (p) { return p.push; });
    var showList = pushed.length ? pushed : D.products;
    var h = '';
    h += '<div class="hero">' + markSvg('logo-xl', 'heroLogo') +
      '<div class="kicker">' + esc(b.name) + ' · TikTok</div>' +
      '<h2 class="hero-title" id="t-home" tabindex="-1">' + esc(b.welcome).replace(esc(b.name), '<em>' + esc(b.name) + '</em>') + '</h2>' +
      '<p>' + esc(b.tagline) + '</p>' +
      '<div class="brands">' + D.products.map(function (p) { return '<span>' + esc(p.name) + '</span>'; }).join('') + '</div></div>';
    h += '<div class="stats">' +
      '<div class="stat"><b>' + D.products.length + '</b><span>ไลน์สินค้า</span></div>' +
      '<div class="stat"><b>' + L.ideas.length + '</b><span>ไอเดียคลิป</span></div>' +
      '<div class="stat"><b>' + fmtCount(combos) + '</b><span>ชุดที่ไม่ซ้ำ</span></div></div>';
    h += '<div class="sect"><div class="card why"><h3>ทำไมต้องมีเครื่องผสมคลิป ไม่ใช่สคริปต์เดียว</h3>' +
      '<p>' + esc(L.mixerWhy) + '</p>' +
      '<p>แท็บ <b>ไอเดีย</b> จึงมีเครื่องสุ่ม ไอเดีย × Hook × รูปแบบตัดต่อ × คำปิดท้าย ที่จับคู่ตามหมวดสินค้าให้ — สุ่มได้ ' +
      combos.toLocaleString('th-TH') + ' ชุดที่ไม่ซ้ำ (ไม่นับคำปิดท้าย) กดสุ่มใหม่ได้ไม่จำกัด</p>' +
      '<button type="button" class="btn pink" data-go="idea" style="margin-top:12px">ไปที่เครื่องผสมคลิป</button></div></div>';
    h += '<div class="sect"><h3>รายละเอียดแคมเปญ</h3><div class="card kv">' + c.rows.map(function (r) {
      return '<div class="row"><div>' + esc(r[0]) + '</div><div>' + val(r[1]) + '</div></div>';
    }).join('') + '</div></div>';
    h += '<div class="sect"><h3>' + esc(c.perksTitle || 'สิทธิประโยชน์ครีเอเตอร์') + '</h3>' + (c.perks.length
      ? numList(c.perks.map(function (x) { return { title: x[0], desc: x[1] }; }))
      : '<div class="empty">ทีม PN กำลังสรุปสิทธิประโยชน์ของรอบนี้ ' + PENDING + '</div>') +
      '<p class="note"><b>เกณฑ์การนับรางวัล:</b> ' + val(c.rankRule) + '</p></div>';
    h += '<div class="sect"><h3>' + (pushed.length ? 'สินค้าที่ดันรอบนี้ <span>ทำกลุ่มนี้ก่อนจะได้แรงหนุนมากที่สุด</span>' : 'สินค้าในแคมเปญ <span>แตะเพื่อดูบรีฟ</span>') + '</h3>' +
      '<div class="stack">' + showList.map(function (p) {
        return '<button type="button" class="card mini" data-open="' + esc(p.id) + '">' + artHtml(p) +
          '<div class="grow"><div class="pname">' + esc(p.name) + '</div><div class="muted">' + val(p.type) + '</div></div>' +
          '<span class="price">' + (priceText(p) ? esc(priceText(p)) : PENDING) + '</span></button>';
      }).join('') + '</div>' +
      (pushed.length ? '' : '<p class="note">ทีมจะติดป้าย “ดันรอบนี้” ให้สินค้าที่แบรนด์ดันในแต่ละรอบ</p>') + '</div>';
    h += '<div class="sect"><h3>ข้อตกลงและเงื่อนไข</h3>' + numList(L.terms) + '</div>';
    h += '<div class="sect"><h3>กติกาการใช้ฟุตเทจแบรนด์ <span>เฉพาะคลิปที่ใช้ฟุตเทจจากทีม PN' +
      (D.campaign.footageReady ? '' : ' · ทีมยังไม่ได้แจกฟุตเทจ') + '</span></h3>' + numList(L.footageRules) +
      '<div class="card why" style="margin-top:10px"><h3>ทำไมต้องเข้มกว่าปกติ</h3><p>' + esc(L.whyStrict) + '</p></div></div>';
    h += '<div class="sect"><h3>ติดปัญหา ถามใคร</h3><div class="card contact"><div class="muted">' + esc(c.contact.title) + '</div>' +
      '<b>LINE: ' + (c.contact.line ? esc(c.contact.line) : 'รอประกาศ') + '</b><div class="muted" style="margin-top:4px">' + esc(c.contact.note) + '</div></div></div>';
    $('#p-home').innerHTML = h;
    upgradeArt($('#p-home'));
    upgradeBrand();
  }

  // ---------- สินค้า ----------
  function prodCats() {
    var seen = {}, out = ['ทั้งหมด'];
    D.products.forEach(function (p) { if (!seen[p.category]) { seen[p.category] = 1; out.push(p.category); } });
    return out;
  }
  function renderProducts() {
    var h = head('Product Brief', 'บรีฟสินค้า ' + D.products.length + ' ไลน์', 'แตะที่สินค้าเพื่อดูจุดขายที่พูดได้ คำที่ห้ามพูด และเลขจดแจ้ง อย.', 't-prod');
    h += '<div class="chips" role="group" aria-label="หมวดสินค้า">' + prodCats().map(function (c) {
      return '<button type="button" class="chip" data-pcat="' + esc(c) + '" aria-pressed="' + (state.pcat === c) + '">' + esc(c) + '</button>';
    }).join('') + '</div><div id="prodlist">';
    D.products.filter(function (p) { return state.pcat === 'ทั้งหมด' || p.category === state.pcat; }).forEach(function (p) {
      var open = state.open === p.id, nos = noSayFor(p), price = priceText(p);
      h += '<div class="prod' + (open ? ' open' : '') + '" id="prod-' + esc(p.id) + '">' +
        '<button type="button" class="prow" data-toggle="' + esc(p.id) + '" aria-expanded="' + open + '" aria-controls="pb-' + esc(p.id) + '">' + artHtml(p) +
        '<div><div class="pname">' + esc(p.name) + '</div><div class="pmeta">' + (price ? '<span>' + esc(price) + '</span>' : PENDING) +
        (p.push ? '<span class="badge push">ดันรอบนี้</span>' : '') + riskBadge(p) + '</div></div><span class="caret" aria-hidden="true">›</span></button>' +
        '<div class="pbody" id="pb-' + esc(p.id) + '">' +
        '<div class="blk"><h3>ประเภท · ร้านบน TikTok Shop</h3><div>' + val(p.type) + ' · ' + esc(p.shop) + '</div></div>' +
        '<div class="blk"><h3>SKU · ' + esc(p.fdaLabel) + '</h3><div class="mono">' + val(p.sku) + '  ·  ' + val(p.fda) + '</div></div>' +
        '<div class="blk"><h3>พูดได้ · ' + (p.says.length ? p.says.length + ' จุดขาย' : 'จุดขาย') + '</h3>' + (p.says.length
          ? '<div class="say"><ol>' + p.says.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>'
          : '<div class="empty">' + PENDING + ' ทีม QA กำลังเตรียมจุดขายที่อนุมัติแล้ว — ระหว่างนี้พูดได้เฉพาะข้อความที่พิมพ์อยู่บนฉลากสินค้าเท่านั้น</div>') + '</div>' +
        '<div class="blk"><h3>ห้ามพูด · ' + nos.length + ' ข้อ</h3><div class="nosay"><ul>' + nos.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div></div>' +
        '<div class="copyrow"><span>คัดลอกจุดขายไปวางในแคปชั่น</span><button type="button" class="btn-s" data-copysays="' + esc(p.id) + '"' + (p.says.length ? '' : ' disabled') + '>คัดลอก</button></div>' +
        '<div class="copyrow"><span>ไอเดียคลิปของสินค้านี้</span><button type="button" class="btn-s" data-ideas="' + esc(p.id) + '">ดูไอเดีย</button></div>' +
        '</div></div>';
    });
    h += '</div>';
    $('#p-prod').innerHTML = h;
    upgradeArt($('#p-prod'));
  }

  // ---------- กฎ ----------
  function wordsInScope() {
    if (state.wordScope === '*' || !has(byId, state.wordScope)) return L.words;
    var scope = SCOPE_OF[byId[state.wordScope].group];
    if (!scope) return L.words;
    return L.words.filter(function (w) { return w.scope === 'ทั้งหมด' || w.scope === scope; });
  }
  function scopeNote() { return 'ตรวจกับรายการ ' + wordsInScope().length + ' คำ · รายการนี้เป็นตัวอย่างเบื้องต้นจากทีม PN ยังไม่ผ่านการตรวจโดยฝ่ายกฎหมาย'; }
  function renderRules() {
    var h = head('Rules', 'ทำได้ / ห้ามทำ', 'กฎเดียวกันนี้ใช้กับเสียงพูด ซับ และข้อความบนจอ — ซับก็นับเป็นคำโฆษณา ไม่ใช่แค่คำบรรยาย', 't-rules');
    h += '<div class="sect"><h3>ตรวจคำก่อนพูด <span>วางสคริปต์หรือแคปชั่นแล้วกดตรวจ</span></h3>' +
      '<div class="chips" role="group" aria-label="สินค้าที่จะโพสต์"><button type="button" class="chip" data-wscope="*" aria-pressed="' + (state.wordScope === '*') + '">ทุกหมวด</button>' +
      D.products.filter(function (p) { return SCOPE_OF[p.group]; }).map(function (p) {
        return '<button type="button" class="chip" data-wscope="' + esc(p.id) + '" aria-pressed="' + (state.wordScope === p.id) + '">' + esc(p.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="checker"><label class="sr-only" for="scr">สคริปต์หรือแคปชั่น</label>' +
      '<textarea id="scr" placeholder="วางสคริปต์หรือแคปชั่นที่จะใช้ แล้วกดตรวจ (Ctrl+Enter)"></textarea>' +
      '<button type="button" class="btn" id="checkBtn">ตรวจคำ</button><div class="res" id="res" aria-live="polite"></div></div>' +
      '<p class="muted" id="scopeNote" style="margin-top:8px">' + esc(scopeNote()) + '</p></div>';
    h += '<div class="sect"><h3>คำเสี่ยง → เปลี่ยนเป็น <span>' + L.guard.length + ' หมวด</span></h3><div class="stack">' + L.guard.map(function (g) {
      return '<div class="card swap"><div class="cat">' + esc(g.cat) + '</div>' +
        '<div class="ln"><span class="ic no" aria-hidden="true">✕</span><span class="sr-only">ห้าม: </span><div>' + g.no.map(esc).join(' / ') + '</div></div>' +
        '<div class="ln"><span class="ic ok" aria-hidden="true">✓</span><span class="sr-only">ใช้แทน: </span><div>' + esc(g.ok) + '</div></div></div>';
    }).join('') + '</div></div>';
    h += '<div class="sect"><h3>กติกาการถ่ายและโพสต์</h3><div class="stack">' + L.tiktokRules.map(function (r) {
      return '<div class="card rule"><b>' + esc(r.title) + '</b><div>' + esc(r.desc) + '</div></div>';
    }).join('') + '</div></div>';
    h += '<div class="sect" id="checklist"></div>';
    $('#p-rules').innerHTML = h;
    renderChecklist();
  }
  function setWordScope(id) {
    state.wordScope = id;
    $$('[data-wscope]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-wscope') === id)); });
    $('#scopeNote').textContent = scopeNote();
    if ($('#scr').value.trim()) runCheck();
  }
  function renderChecklist() {
    var ticks = store(KEY_CHECKS) || {}, done = L.checklist.filter(function (_, i) { return ticks[i]; }).length;
    $('#checklist').innerHTML = '<h3>เช็กลิสต์ก่อนกดโพสต์</h3>' +
      '<div class="ckhead"><span class="muted">' + done + ' / ' + L.checklist.length + '</span><span class="bar" aria-hidden="true"><i style="width:' + (100 * done / L.checklist.length) + '%"></i></span>' +
      '<button type="button" class="linkbtn" id="ckReset">เริ่มใหม่</button></div>' +
      L.checklist.map(function (t, i) {
        return '<button type="button" class="ck" role="checkbox" aria-checked="' + !!ticks[i] + '" data-ck="' + i + '"><span class="box" aria-hidden="true">✓</span><span class="lbl">' + esc(t) + '</span></button>';
      }).join('') +
      (done === L.checklist.length ? '<div class="clean" style="margin-top:10px">ครบทุกข้อแล้ว โพสต์ได้เลย</div>' : '');
  }
  function runCheck() {
    var text = $('#scr').value, res = $('#res');
    if (!text.trim()) { res.innerHTML = '<div class="warnbox">วางข้อความก่อน แล้วกดตรวจอีกครั้ง</div>'; return; }
    var hits = WC.match(text, wordsInScope());
    if (!hits.length) {
      res.innerHTML = '<div class="clean">ไม่พบคำเสี่ยงในรายการ — แต่ยังต้องเช็กเองว่าทุกคำที่พูดมีอยู่ในบรีฟสินค้าจริง</div>';
      return;
    }
    var uniq = [], byWord = {};
    hits.forEach(function (hh) {
      if (!has(byWord, hh.i)) { byWord[hh.i] = { w: hh.word, n: 0 }; uniq.push(byWord[hh.i]); }
      byWord[hh.i].n++;
    });
    var order = { high: 0, medium: 1, low: 2 };
    uniq.sort(function (a, b) { return (order[a.w.severity] || 0) - (order[b.w.severity] || 0); });
    res.innerHTML = '<div class="sum">เจอคำเสี่ยง <b>' + hits.length + '</b> จุด (' + uniq.length + ' คำ) — ไฮไลต์ในข้อความด้านล่าง</div>' +
      '<div class="preview">' + WC.highlight(text, hits) + '</div>' +
      uniq.map(function (u) {
        var s = SEV[u.w.severity] || SEV.medium;
        return '<div class="hit"><div class="top"><b>“' + esc(u.w.keyword) + '”</b>' + (u.n > 1 ? '<span class="muted">× ' + u.n + '</span>' : '') +
          '<span class="badge ' + s[0] + '">' + s[1] + '</span><span class="badge">' + esc(u.w.category) + '</span></div>' +
          '<div class="to">เปลี่ยนเป็น: <strong>' + esc(u.w.suggestion) + '</strong></div>' +
          '<div class="muted" style="margin-top:2px">ใช้กับ: ' + esc(u.w.scope) + '</div></div>';
      }).join('');
  }

  // ---------- ไอเดีย ----------
  function ideaChips() {
    var opts = [['*', 'ทั้งหมด']].concat(D.products.map(function (p) { return [p.id, p.name]; }), [['all', 'ใช้ได้ทุกตัว']]);
    return '<div class="chips" role="group" aria-label="กรองไอเดียตามสินค้า">' + opts.map(function (o) {
      return '<button type="button" class="chip" data-iprod="' + esc(o[0]) + '" aria-pressed="' + (state.ideaProd === o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function roll(fixedIdea) {
    var pool = mixIdeaPool(state.ideaProd), prev = state.cur;
    var idea = fixedIdea || pick(pool);
    if (!fixedIdea && pool.length > 1 && prev) { var guard = 0; while (idea === prev.idea && guard++ < 8) idea = pick(pool); }
    var p = productOf(idea);
    return { idea: idea, product: p, hook: pick(hookPool(p)), format: pick(formatPool(p)), cta: pick(L.ctas) };
  }
  function hookNote(hk) { return hk.type === 'เล่าเรื่อง' ? hk.type + ' · ใช้เมื่อเรื่องนั้นเกิดขึ้นจริงเท่านั้น' : hk.type; }
  function reelValues(c) {
    return [
      ['ไอเดีย', c.idea.title, c.product ? c.product.name : 'ใช้ได้กับทุกสินค้า'],
      ['Hook 3 วิแรก', '“' + c.hook.text + '”', hookNote(c.hook)],
      ['รูปแบบตัดต่อ', c.format.name, c.format.structure],
      ['ปิดท้ายชวนกดตะกร้า', '“' + c.cta.text + '”', c.cta.style],
    ];
  }
  function paintReel(i, v) {
    var r = $('#reel' + i);
    if (!r) return;
    $('.k', r).textContent = v[0]; $('.v', r).textContent = v[1]; $('.s', r).textContent = v[2];
  }
  function paintMixer() {
    reelValues(state.cur).forEach(function (v, i) { paintReel(i, v); });
    var sc = $('#mixScope');
    if (sc) sc.textContent = state.ideaProd === '*' ? 'สุ่มจากทุกสินค้า' : state.ideaProd === 'all' ? 'สุ่มจากไอเดียที่ใช้ได้ทุกตัว' : 'สุ่มเฉพาะ: ' + byId[state.ideaProd].name;
  }
  function cancelSpin() {
    state.spinId++;
    state.spinning = false;
    $$('.reel.spin').forEach(function (r) { r.classList.remove('spin'); });
  }
  function spin(fixedIdea) {
    if (state.spinning) return;
    var final = roll(fixedIdea);
    if (reducedMotion()) { state.cur = final; paintMixer(); return; }
    var id = ++state.spinId;
    state.spinning = true;
    var reels = $$('.reel'), stopAt = [380, 520, 660, 800], t0 = Date.now();
    reels.forEach(function (r) { r.classList.add('spin'); });
    (function tick() {
      if (id !== state.spinId) return;          // ถูกยกเลิก (เปลี่ยนตัวกรอง/ใช้ไอเดียอื่น)
      var t = Date.now() - t0, fv = reelValues(roll()), real = reelValues(final), running = false;
      for (var i = 0; i < 4; i++) {
        if (t < stopAt[i]) { running = true; paintReel(i, fv[i]); }
        else if (reels[i] && reels[i].classList.contains('spin')) { reels[i].classList.remove('spin'); paintReel(i, real[i]); }
      }
      if (running) setTimeout(tick, 70);
      else { state.cur = final; state.spinning = false; paintMixer(); }
    })();
  }
  function briefText(c) {
    var footage = c.idea.footage + (needsFootage(c.idea) && !D.campaign.footageReady ? ' (รอทีมแจกฟุตเทจ — ระหว่างนี้ถ่ายเองแทน)' : '');
    return [
      D.brand.name + ' — ชุดคลิปของฉัน',
      'สินค้า: ' + (c.product ? c.product.name : 'เลือกสินค้าที่จะทำ'),
      'ไอเดีย: ' + c.idea.title,
      'แนวทาง: ' + c.idea.flow,
      'ฟุตเทจที่ใช้: ' + footage,
      'Hook (3 วิแรก): ' + c.hook.text + (c.hook.type === 'เล่าเรื่อง' ? ' (ใช้เมื่อเรื่องนั้นเกิดขึ้นจริงเท่านั้น)' : ''),
      'รูปแบบตัดต่อ: ' + c.format.name + ' — ' + c.format.structure + ' (' + c.format.duration + ')',
      'เหมาะกับ: ' + c.format.bestFor,
      'ปิดท้าย: ' + c.cta.text,
      'ระวัง: ' + (c.idea.caution || '-'),
      'ก่อนโพสต์: ตรวจคำในแท็บ "กฎ" + ติ๊กเช็กลิสต์ให้ครบ',
    ].join('\n');
  }
  function footageBadge(x) {
    return needsFootage(x) && !D.campaign.footageReady ? '<span class="badge mid">รอทีมแจกฟุตเทจ</span>' : '';
  }
  function renderIdeas() {
    if (!state.cur) state.cur = roll();
    var list = ideaPool(state.ideaProd);
    var h = head('Idea Bank', 'ไอเดียคลิป', 'เริ่มจากกดสุ่ม ถ้ายังไม่ถูกใจค่อยเลื่อนดูไอเดียทั้งหมดด้านล่าง', 't-idea');
    h += '<div class="mixer"><div class="eyebrow">Clip Mixer</div><h3>เครื่องผสมคลิป</h3><div class="scope" id="mixScope"></div><div class="reels">' +
      [0, 1, 2, 3].map(function (i) { return '<div class="reel" id="reel' + i + '"><div class="k"></div><div class="v"></div><div class="s"></div></div>'; }).join('') +
      '</div><button type="button" class="btn pink" id="mixBtn">สุ่มชุดคลิปให้ฉัน</button><button type="button" class="btn ghost" id="mixCopy">คัดลอกชุดนี้</button></div>';
    h += '<div class="sect"><h3>ไอเดียทั้งหมด <span>' + list.length + ' ไอเดีย</span></h3>' + ideaChips() + '<div id="idealist">' +
      list.map(function (it) {
        var n = L.ideas.indexOf(it) + 1, p = byId[it.product];
        return '<div class="idea"><div class="n">' + String(n).padStart(3, '0') + ' · ' + (p ? esc(p.name) : 'ใช้ได้ทุกตัว') + '</div>' +
          '<h3>' + esc(it.title) + '</h3><div class="fl">' + esc(it.flow) + '</div>' +
          '<div class="tags"><span class="badge cy">' + esc(it.footage) + '</span><span class="badge">' + esc(it.style) + '</span>' + footageBadge(it) + '</div>' +
          (it.caution && it.caution !== '-' ? '<div class="wr">ระวัง: ' + esc(it.caution) + '</div>' : '') +
          '<div class="use"><button type="button" class="btn-s" data-use="' + (n - 1) + '">ใช้ไอเดียนี้ในเครื่องผสม</button></div></div>';
      }).join('') + '</div></div>';
    $('#p-idea').innerHTML = h;
    paintMixer();
  }

  // ---------- ตัดต่อ ----------
  function renderLib() {
    var h = head('Editing', 'คำปิดท้ายและรูปแบบตัดต่อ', 'แตะที่คำปิดท้ายเพื่อคัดลอกไปวางในแคปชั่นหรือซับได้เลย', 't-lib');
    h += '<div class="sect"><h3>ปิดท้ายชวนกดตะกร้า <span>' + L.ctas.length + ' แบบ · แตะเพื่อคัดลอก</span></h3>' + L.ctas.map(function (c, i) {
      return '<button type="button" class="cta" data-cta="' + i + '"><div><div class="t">' + esc(c.text) + '</div><div class="s">' + esc(c.style) + '</div></div><span class="btn-s" aria-hidden="true">คัดลอก</span></button>';
    }).join('') + '</div>';
    h += '<div class="sect"><h3>รูปแบบตัดต่อ <span>' + L.formats.length + ' แบบ</span></h3><p class="lede" style="margin-top:0">เปลี่ยนรูปแบบทุก 2–3 คลิป ช่องของคุณจะได้ไม่ดูซ้ำ</p><div class="stack">' +
      L.formats.map(function (f, i) {
        return '<div class="card fmt"><div class="n">' + String(i + 1).padStart(2, '0') + '</div><div class="grow"><h3>' + esc(f.name) + '</h3><div class="st">' + esc(f.structure) + '</div>' +
          '<div class="meta"><span class="badge cy">' + esc(f.duration) + '</span>' + footageBadge(f) + '</div>' +
          '<div class="best"><b>เหมาะกับ</b> ' + esc(f.bestFor) + '</div></div></div>';
      }).join('') + '</div></div>';
    $('#p-lib').innerHTML = h;
  }

  // ---------- routing ----------
  function show(tab, sub) {
    if (!has(TABS, tab)) tab = 'home';
    var focus = state.focusNext;
    state.focusNext = false;
    state.tab = tab;
    $$('.panel').forEach(function (p) { p.classList.toggle('on', p.id === 'p-' + tab); });
    $$('nav button').forEach(function (b) { if (b.getAttribute('data-tab') === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('#tabname').textContent = TABS[tab];
    document.title = TABS[tab] + ' · ' + D.brand.name + ' Creator Hub';
    if (tab === 'prod' && sub && has(byId, sub)) {
      state.open = sub; state.pcat = 'ทั้งหมด'; renderProducts();
      var row = $('#prod-' + sub);
      if (row) { row.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); if (focus) $('.prow', row).focus({ preventScroll: true }); }
      return;
    }
    if (tab === 'idea' && sub && (has(byId, sub) || sub === 'all') && state.ideaProd !== sub) {
      cancelSpin(); state.ideaProd = sub; state.cur = roll(); renderIdeas();
    }
    window.scrollTo(0, 0);
    if (focus) { var t = $('#t-' + tab); if (t) t.focus({ preventScroll: true }); }
  }
  function route() {
    var parts = (location.hash || '#home').slice(1).split('/'), sub = parts[1];
    if (sub) { try { sub = decodeURIComponent(sub); } catch (e) { sub = null; } }
    show(parts[0], sub);
  }
  function go(hash) { if (location.hash === '#' + hash) route(); else location.hash = hash; }

  // ---------- events (delegated) ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    var a;
    if ((a = t.getAttribute('data-tab'))) return go(a);
    if ((a = t.getAttribute('data-go'))) { state.focusNext = true; return go(a); }
    if ((a = t.getAttribute('data-open'))) { state.focusNext = true; return go('prod/' + a); }
    if ((a = t.getAttribute('data-ideas'))) { state.focusNext = true; return go('idea/' + a); }
    if ((a = t.getAttribute('data-pcat'))) { state.pcat = a; renderProducts(); return refocus('data-pcat', a); }
    if ((a = t.getAttribute('data-toggle'))) {
      state.open = state.open === a ? null : a;
      var box = $('#prod-' + a), open = state.open === a;
      $$('.prod.open').forEach(function (x) { if (x !== box) { x.classList.remove('open'); $('.prow', x).setAttribute('aria-expanded', 'false'); } });
      box.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open));
      return;
    }
    if ((a = t.getAttribute('data-copysays'))) {
      var p = byId[a];
      if (p && p.says.length) copy(p.name + '\n' + p.says.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n'), 'คัดลอกจุดขายแล้ว');
      return;
    }
    if ((a = t.getAttribute('data-wscope'))) return setWordScope(a);
    if (t.id === 'checkBtn') return runCheck();
    if ((a = t.getAttribute('data-ck')) !== null) {
      var ticks = store(KEY_CHECKS) || {};
      ticks[a] = !ticks[a]; store(KEY_CHECKS, ticks); renderChecklist();
      return refocus('data-ck', a);
    }
    if (t.id === 'ckReset') { store(KEY_CHECKS, {}); renderChecklist(); return $('#ckReset').focus(); }
    if (t.id === 'mixBtn') return spin();
    if (t.id === 'mixCopy') { if (!state.spinning) copy(briefText(state.cur), 'คัดลอกชุดคลิปแล้ว'); return; }
    if ((a = t.getAttribute('data-iprod'))) { cancelSpin(); state.ideaProd = a; state.cur = roll(); renderIdeas(); return refocus('data-iprod', a); }
    if ((a = t.getAttribute('data-use')) !== null) {
      cancelSpin();
      spin(L.ideas[+a]);
      $('.mixer').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      $('#mixBtn').focus({ preventScroll: true });
      return;
    }
    if ((a = t.getAttribute('data-cta')) !== null) return copy(L.ctas[+a].text, 'คัดลอกคำปิดท้ายแล้ว');
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.id === 'scr' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCheck(); }
  });
  window.addEventListener('hashchange', route);

  // ---------- boot ----------
  $('#hdrMark').innerHTML = markSvg();
  $('#hdrTitle').textContent = D.brand.name + ' Creator Hub';
  $('#foot').innerHTML = '<b>' + esc(D.brand.name) + ' · ' + esc(D.brand.hub) + '</b><br>' + esc(D.brand.footnote);
  renderHome(); renderProducts(); renderRules(); renderIdeas(); renderLib();
  route();
})();
