// node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const WC = require('../js/wordcheck.js');

const W = (keyword, extra) => Object.assign({ keyword, exceptions: '', match: '' }, extra);
const words = (text, list) => WC.match(text, list).map((h) => text.slice(h.from, h.to));

test('finds a plain keyword', () => {
  assert.deepEqual(words('ครีมนี้รักษาสิวได้', [W('รักษา')]), ['รักษา']);
});

test('exceptions suppress harmless phrases', () => {
  const list = [W('รักษา', { exceptions: 'ดูแลรักษา,รักษาความสะอาด' })];
  assert.deepEqual(words('ดูแลรักษาผิวทุกวัน และรักษาความสะอาด', list), []);
  assert.deepEqual(words('ดูแลรักษาผิว แต่ช่วยรักษาสิว', list), ['รักษา']);
});

test('loose mode sees through spaces, dots and zero-width chars', () => {
  assert.equal(WC.match('รัก ษาได้', [W('รักษา')]).length, 1);
  assert.equal(WC.match('รัก.ษา', [W('รักษา')]).length, 1);
  assert.equal(WC.match('รัก​ษา', [W('รักษา')]).length, 1);
});

test('exact mode keeps spaces significant', () => {
  assert.equal(WC.match('ปลอด ภัย', [W('ปลอดภัย', { match: 'exact' })]).length, 0);
  assert.equal(WC.match('ปลอดภัยไหม', [W('ปลอดภัย', { match: 'exact' })]).length, 1);
});

test('numbers do not bleed into longer numbers', () => {
  assert.equal(WC.match('อันดับ 1 ในใจ', [W('อันดับ 1')]).length, 1);
  assert.equal(WC.match('ติดอันดับ 10 ของร้าน', [W('อันดับ 1')]).length, 0);
  assert.equal(WC.match('อันดับ ๑ ในใจ', [W('อันดับ 1')]).length, 1, 'Thai digit folds to 1');
});

test('100% matches and ASCII words respect word edges', () => {
  assert.equal(WC.match('เห็นผล 100% แน่นอน', [W('100%')]).length, 1);
  assert.equal(WC.match('detox ได้', [W('detox')]).length, 1);
  assert.equal(WC.match('antidetoxify', [W('detox')]).length, 0);
});

test('shorter keyword inside a longer hit is dropped', () => {
  const hits = WC.match('ทาแล้วขาวถาวร', [W('ขาว'), W('ขาวถาวร')]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].word.keyword, 'ขาวถาวร');
});

test('tone mark / vowel order variants still match', () => {
  // ไม้เอกพิมพ์ก่อนสระอิ (ลำดับผิดที่พบบ่อยบนมือถือ) ต้องพับให้ตรงกับคำปกติ
  assert.equal(WC.match('ห่ิน', [W('หิ่น')]).length, 1);
});

test('a line break inside a phrase still matches (captions wrap mid-phrase)', () => {
  assert.equal(WC.match('แพทย์\nแนะนำ', [W('แพทย์แนะนำ')]).length, 1);
  assert.equal(WC.match('ไม่มี\r\nผลข้างเคียง', [W('ไม่มีผลข้างเคียง')]).length, 1);
  assert.equal(WC.match('สินค้ามี อย.\nรับรอง', [W('อย. รับรอง')]).length, 1);
  assert.equal(WC.match('ปลอดภัย\nไหม', [W('ปลอดภัย', { match: 'exact' })]).length, 1);
});

test('highlight escapes HTML around marks', () => {
  const text = '<b>รักษา</b>';
  const html = WC.highlight(text, WC.match(text, [W('รักษา')]));
  assert.equal(html, '&lt;b&gt;<mark>รักษา</mark>&lt;/b&gt;');
});
