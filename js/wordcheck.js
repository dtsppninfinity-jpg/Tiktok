/*
 * ตัวตรวจคำเสี่ยง — ยกตรรกะ bwFold / bwMatch / bwHighlight มาจาก TikTok Dashboard ของ PN (Index.html "ผู้ช่วยโพสต์")
 * เพื่อให้ผลตรวจในหน้านี้ตรงกับระบบหลังบ้านคำต่อคำ
 *
 * WORD = {keyword, exceptions, match}
 *   match ''      = หลวม: ช่องว่าง ขีด จุด วงเล็บ ฯลฯ คั่นกลางคำได้ ("รัก ษา" ยังเจอ)
 *   match 'exact' = ตรงตัว: ช่องว่างหลายตัวนับเป็นตัวเดียว
 *   exceptions    = วลีที่มีคำนี้อยู่แต่ไม่ผิด คั่นด้วย , หรือขึ้นบรรทัดใหม่
 */
(function (root) {
  'use strict';

  function codes(list) { var o = {}; list.forEach(function (c) { o[c] = 1; }); return o; }
  var ZW = codes([0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00AD, 0x0D]);
  // ต่างจาก TikTok Dashboard 1 จุด: ขึ้นบรรทัดใหม่นับเป็นตัวคั่น (ข้อความบนจอ/แคปชันมักตัดบรรทัดกลางวลี
  // เช่น "แพทย์⏎แนะนำ" — ถ้าตัดคำที่ขึ้นบรรทัดจะหลุดคำเสี่ยงสูงไปเงียบ ๆ)
  var NL = [0x0A, 0x0B, 0x0C, 0x2028, 0x2029];
  var SOFT = codes([0x20, 0x09, 0xA0, 0x2E, 0x2D, 0x5F, 0xB7, 0x2022, 0x2A, 0x2F, 0x7C, 0x7E, 0x2C, 0x22, 0x27, 0x201C, 0x201D,
    0x2018, 0x2019, 0x28, 0x29, 0x5B, 0x5D, 0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015].concat(NL));
  var WS = codes([0x20, 0x09, 0xA0].concat(NL));
  var DIGIT_RE = /[0-9๐-๙]/;

  function isMark(c) { return c === 0x0E31 || (c >= 0x0E34 && c <= 0x0E3A) || (c >= 0x0E47 && c <= 0x0E4E); }
  function isTone(c) { return c >= 0x0E48 && c <= 0x0E4B; }
  function isUpper(c) { return c === 0x0E31 || (c >= 0x0E34 && c <= 0x0E37) || c === 0x0E47; }
  function isLower(c) { return c >= 0x0E38 && c <= 0x0E3A; }

  /**
   * พับข้อความ → {s, a[], b[]}: s = ข้อความที่พับแล้ว · a[i]/b[i] = ช่วง [from, to) บนข้อความดิบของ s[i]
   * พับ: ตัวเต็มความกว้าง → ASCII · ตัวพิมพ์เล็ก · เลขไทย → อารบิก · เเ → แ · สระอำ 4 แบบ
   *      · วรรณยุกต์/ทัณฑฆาตก่อนสระบน-ล่าง · เครื่องหมายซ้ำ
   */
  function fold(raw, loose) {
    var t = String(raw == null ? '' : raw), s = [], a = [], b = [];
    function put(code, from, to) {
      if (isMark(code) && s.length && s[s.length - 1] === code) { b[b.length - 1] = to; return; }
      s.push(code); a.push(from); b.push(to);
    }
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      if (ZW[c]) continue;
      if (loose && SOFT[c]) continue;
      if (!loose && WS[c]) {
        if (s.length && s[s.length - 1] === 0x20) { b[b.length - 1] = i + 1; continue; }
        put(0x20, i, i + 1); continue;
      }
      if (c >= 0xFF01 && c <= 0xFF5E) c -= 0xFEE0;
      if (c >= 0x41 && c <= 0x5A) c += 32;
      if (c >= 0x0E50 && c <= 0x0E59) c = 0x30 + (c - 0x0E50);
      var n1 = i + 1 < t.length ? t.charCodeAt(i + 1) : -1, n2 = i + 2 < t.length ? t.charCodeAt(i + 2) : -1;
      if (c === 0x0E40 && n1 === 0x0E40) { put(0x0E41, i, i + 2); i++; continue; }
      if (c === 0x0E33 && isTone(n1)) { put(n1, i, i + 2); put(0x0E33, i, i + 2); i++; continue; }
      if (c === 0x0E4D && isTone(n1) && n2 === 0x0E32) { put(n1, i, i + 3); put(0x0E33, i, i + 3); i += 2; continue; }
      if (c === 0x0E4D && n1 === 0x0E32) { put(0x0E33, i, i + 2); i++; continue; }
      if ((isTone(c) || c === 0x0E4C) && (isUpper(n1) || isLower(n1))) { put(n1, i, i + 2); put(c, i, i + 2); i++; continue; }
      put(c, i, i + 1);
    }
    return { s: String.fromCharCode.apply(null, s), a: a, b: b };
  }

  function key(word, match) { return fold(word, match !== 'exact').s.replace(/\n/g, '').trim(); }

  /**
   * words = [WORD] → hits [{word, i, from, to}] บนข้อความดิบ เรียงตามตำแหน่ง
   *   คำ ASCII ล้วน = ต้องเป็นขอบคำ · คำที่ขึ้นต้น/ลงท้ายด้วยตัวเลข = ตัวเลขติดกันไม่นับ ("อันดับ 1" ≠ "อันดับ 10")
   *   อยู่ในวลียกเว้น = ไม่นับ · คำสั้นที่อยู่ในคำยาวของอีกรายการ = ตัดทิ้ง
   */
  function match(text, words) {
    var raw = String(text == null ? '' : text), cache = {}, hits = [];
    function folded(m) { return cache[m] || (cache[m] = fold(raw, m !== 'exact')); }
    (words || []).forEach(function (wd, wi) {
      var mode = wd.match === 'exact' ? 'exact' : '', f = folded(mode), s = f.s;
      var k = key(wd.keyword, mode);
      if (k.length < 2) return;
      var ex = [];
      String(wd.exceptions || '').split(/[,\n]/).forEach(function (e) {
        var ek = key(e, mode);
        if (ek) for (var p = s.indexOf(ek); p >= 0; p = s.indexOf(ek, p + 1)) ex.push([p, p + ek.length]);
      });
      var ascii = /^[a-z0-9]+$/.test(k);
      for (var p = s.indexOf(k); p >= 0; p = s.indexOf(k, p + 1)) {
        var q = p + k.length, from = f.a[p], to = f.b[q - 1];
        if (ascii && (/[A-Za-z0-9]/.test(raw.charAt(from - 1)) || /[A-Za-z0-9]/.test(raw.charAt(to)))) continue;
        if (/[0-9]$/.test(k) && DIGIT_RE.test(raw.charAt(to))) continue;
        if (/^[0-9]/.test(k) && (DIGIT_RE.test(raw.charAt(from - 1)) || raw.charAt(from - 1) === '-')) continue;
        if (ex.some(function (r) { return r[0] <= p && q <= r[1]; })) continue;
        hits.push({ word: wd, i: wi, from: from, to: to });
      }
    });
    hits.sort(function (p, q) { return (p.from - q.from) || ((q.to - q.from) - (p.to - p.from)); });
    var kept = [];
    hits.forEach(function (h) {
      if (kept.some(function (k) { return k.i !== h.i && k.from <= h.from && h.to <= k.to && (k.to - k.from) > (h.to - h.from); })) return;
      if (kept.some(function (k) { return k.i === h.i && k.from === h.from && k.to === h.to; })) return;
      kept.push(h);
    });
    return kept;
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** ช่วงบนข้อความดิบ → HTML (escape ทีละท่อน) */
  function highlight(text, hits) {
    var raw = String(text == null ? '' : text);
    var r = (hits || []).map(function (h) { return [h.from, h.to]; }).sort(function (p, q) { return p[0] - q[0]; }), m = [];
    r.forEach(function (x) { if (m.length && x[0] <= m[m.length - 1][1]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], x[1]); else m.push(x.slice()); });
    var out = '', at = 0;
    m.forEach(function (x) { out += esc(raw.slice(at, x[0])) + '<mark>' + esc(raw.slice(x[0], x[1])) + '</mark>'; at = x[1]; });
    return out + esc(raw.slice(at));
  }

  var api = { fold: fold, match: match, highlight: highlight, esc: esc };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WordCheck = api;
})(this);
