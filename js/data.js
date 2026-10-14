/*
 * ข้อมูลที่ทีม PN แก้ได้เอง — แบรนด์ · แคมเปญ · สินค้า
 * ค่าไหนยังไม่รู้ให้ใส่ null → หน้าเว็บจะขึ้นป้าย "รอข้อมูล" ให้เอง (อย่าเดาเลข อย. หรือจุดขาย)
 *
 * รูปภาพ: วางไฟล์ตามชื่อด้านล่างลงในโฟลเดอร์ assets/ แล้วหน้าเว็บจะใช้รูปจริงแทนกราฟิกชั่วคราวเอง
 *   assets/logo.png            โลโก้ PN Infinity (สี่เหลี่ยมจัตุรัส พื้นโปร่งใส)
 *   assets/hero.jpg            ภาพปกหน้าแรก (แนวตั้ง 4:5)
 *   assets/products/<id>.jpg   รูปสินค้า (จัตุรัส) เช่น assets/products/hayeon.jpg
 */
window.PN_DATA = {
  brand: {
    name: 'PN Infinity',
    hub: 'TikTok Creator Hub',
    logo: 'assets/logo.png',
    hero: 'assets/hero.jpg',
    welcome: 'Welcome to PN Infinity Creator Club',
    tagline: 'พื้นที่ของครีเอเตอร์ที่ทำคลิป TikTok ขายสินค้า PN Infinity — บรีฟสินค้า ไอเดียคลิป และกติกาครบในที่เดียว',
    footnote: 'ข้อมูลที่ขึ้นป้าย “รอข้อมูล” ทีม PN กำลังเตรียม — ห้ามใช้ข้อมูลจากแหล่งอื่นแทน',
  },

  campaign: {
    // [หัวข้อ, ค่า] — ค่า null = รอประกาศ
    rows: [
      ['ช่วงแคมเปญ', null],
      ['อัตราคอมมิชชั่น', null],
      ['สินค้าในแคมเปญ', 'Hayeon · พลูคาว พ่อทองชิต · Probiova · MerryCollagen · venorra'],
      ['ช่องทางที่ใช้', 'TikTok Shop'],
      ['สิ่งที่คุณได้', 'บรีฟสินค้า + ไอเดียคลิป + เครื่องผสมคลิป + ตัวตรวจคำเสี่ยง'],
      ['สิ่งที่คุณทำ', 'ถ่ายรีวิวสินค้าเอง หรือตัดจากฟุตเทจแบรนด์เมื่อทีมแจก แล้วโพสต์พร้อมปักตะกร้า'],
      ['จำนวนคลิปที่แนะนำ', null],
      ['ผู้ดูแล Affiliate', null],
    ],
    // สิทธิประโยชน์ [หัวข้อ, รายละเอียด] — ว่าง = ขึ้น "รอประกาศ"
    perks: [],
    perksTitle: 'สิทธิประโยชน์ครีเอเตอร์',
    // เกณฑ์การนับรางวัล — null = รอประกาศ
    rankRule: null,
    // ทีมแจกฟุตเทจแบรนด์แล้วหรือยัง — false = เครื่องผสมคลิปจะไม่สุ่มไอเดีย/รูปแบบที่ต้องใช้ฟุตเทจแบรนด์
    footageReady: false,
    contact: {
      title: 'ผู้ดูแล Affiliate',
      line: null, // เช่น '@pninfinity'
      note: 'ส่งสคริปต์หรือคลิปหมวดเสี่ยงสูงมาให้ทีมตรวจก่อนโพสต์ได้ที่ช่องทางเดียวกัน',
    },
  },

  /*
   * สินค้า — 1 การ์ดต่อ 1 ไลน์สินค้า
   *   group     skincare | supplement | general  (ใช้จับคู่ Hook กับหมวดคำต้องห้าม)
   *   kind      ภาพชั่วคราว: jar | capsule | sachet | leaf | box
   *   fdaLabel  เครื่องสำอาง = เลขที่ใบรับจดแจ้ง · อาหาร = เลขสารบบอาหาร
   *   says      จุดขายที่ทีม QA อนุมัติแล้ว (สูงสุด 10 ข้อ) — ว่าง = รอข้อมูล
   *   noSay     คำห้ามพูดเฉพาะตัวสินค้า (คำห้ามตามหมวดจะต่อท้ายให้อัตโนมัติ)
   *   guard     ชื่อหมวดใน "คำเสี่ยง → เปลี่ยนเป็น" ที่ใช้กับสินค้านี้
   *   risk      ต่ำ | ปานกลาง | สูง | สูงสุด
   *   push      true = ติดป้าย "ดันรอบนี้"
   */
  products: [
    // ประเภทสินค้าอ้างอิงตารางรหัสสินค้าในระบบคีย์ออเดอร์ (Key OrderAuto · 17 ก.ย. 69)
    //   U4: NS = เซรั่มนาโน · S = สบู่นาโน · HYC = ฮายองคอลลาเจน · UN1: PKC = ครีมพลูคาว · PKS = สบู่พลูคาว
    {
      id: 'hayeon', name: 'Hayeon', shop: 'Hayeong', unit: 'U4',
      type: 'สกินแคร์ — ครีม · เซรั่มนาโน · สบู่นาโน (มีฮายองคอลลาเจนด้วย)', category: 'สกินแคร์', group: 'skincare', kind: 'jar', color: '#F4A6C0',
      price: null, sku: null, fda: null, fdaLabel: 'เลขที่ใบรับจดแจ้ง',
      says: [], noSay: [],
      guard: ['ทุกหมวด (หลักกลาง)', 'ครีม / สกินแคร์', 'คอลลาเจน', 'Before/After', 'ราคาและโปรโมชัน', 'การเปรียบเทียบ', 'การรีวิวและประสบการณ์'],
      risk: 'ปานกลาง', push: false,
    },
    {
      id: 'plukaw', name: 'พลูคาว พ่อทองชิต', shop: 'พลูคาว พ่อทองชิต', unit: 'UN1',
      type: 'เครื่องสำอางสมุนไพร — ครีมพลูคาว · สบู่พลูคาว', category: 'สกินแคร์', group: 'skincare', kind: 'leaf', color: '#7BC47F',
      price: null, sku: null, fda: null, fdaLabel: 'เลขที่ใบรับจดแจ้ง',
      says: [], noSay: [],
      guard: ['ทุกหมวด (หลักกลาง)', 'ครีม / สกินแคร์', 'สมุนไพร', 'Before/After', 'ราคาและโปรโมชัน', 'การเปรียบเทียบ', 'การรีวิวและประสบการณ์'],
      risk: 'ปานกลาง', push: false,
    },
    {
      id: 'probiova', name: 'Probiova', shop: 'Presiva Thailand', unit: 'UN8',
      type: 'ผลิตภัณฑ์เสริมอาหารโพรไบโอติก', category: 'อาหารเสริม', group: 'supplement', kind: 'capsule', color: '#7FB3F5',
      price: null, sku: null, fda: null, fdaLabel: 'เลขสารบบอาหาร',
      says: [], noSay: [],
      guard: ['ทุกหมวด (หลักกลาง)', 'ผลิตภัณฑ์เสริมอาหาร (ทั่วไป)', 'โพรไบโอติก / การขับถ่าย', 'Before/After', 'ราคาและโปรโมชัน', 'การเปรียบเทียบ', 'การรีวิวและประสบการณ์'],
      risk: 'สูงสุด', push: false,
    },
    {
      id: 'merrycollagen', name: 'MerryCollagen', shop: 'MerryCollagen', unit: 'U18',
      type: 'ผลิตภัณฑ์เสริมอาหารคอลลาเจน (รอยืนยัน)', category: 'อาหารเสริม', group: 'supplement', kind: 'sachet', color: '#F7C873',
      price: null, sku: null, fda: null, fdaLabel: 'เลขสารบบอาหาร',
      says: [], noSay: [],
      guard: ['ทุกหมวด (หลักกลาง)', 'ผลิตภัณฑ์เสริมอาหาร (ทั่วไป)', 'คอลลาเจน', 'Before/After', 'ราคาและโปรโมชัน', 'การเปรียบเทียบ', 'การรีวิวและประสบการณ์'],
      risk: 'สูง', push: false,
    },
    {
      id: 'venorra', name: 'venorra', shop: 'venorra shop', unit: 'Seller',
      type: null, category: 'รอระบุหมวด', group: 'general', kind: 'box', color: '#B9A6F2',
      price: null, sku: null, fda: null, fdaLabel: 'เลข อย.',
      says: [], noSay: [],
      guard: ['ทุกหมวด (หลักกลาง)', 'Before/After', 'ราคาและโปรโมชัน', 'การเปรียบเทียบ', 'การรีวิวและประสบการณ์'],
      risk: null, push: false,
    },
  ],
};
