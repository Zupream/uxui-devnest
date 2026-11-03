/* =========================================================
   SUMDAY · shared store (store.js)
   ข้อมูลกลางที่ "หน้าร้าน" (coffee-landing.html) กับ "หลังบ้าน" ใช้ร่วมกัน
   เก็บใน localStorage ของเบราว์เซอร์ — เดโม ไม่มีเซิร์ฟเวอร์
   → เปิดหน้าร้านกับหลังบ้านคนละแท็บ สั่งจากหน้าร้าน ออเดอร์จะเด้งเข้าหลังบ้านทันที
   ========================================================= */
(function(){
  const K={orders:'sumday.orders',menu:'sumday.menu',settings:'sumday.settings',session:'sumday.session',seeded:'sumday.seeded.v2'};

  const CATS=[{k:'coffee',n:'☕ กาแฟ'},{k:'milk',n:'🥛 นม & ชานม'},{k:'tea',n:'🍵 ชา & น้ำผลไม้'}];
  const SWEET=['0%','25%','50%','75%','100%'];

  /* เมนูตั้งต้น — ตรงกับ PRODUCTS ในหน้าร้าน */
  const BASE_MENU=[
    {id:35,en:'Americano',th:'อเมริกาโน่',price:55,cat:'coffee',img:'35.png',tag:'hot'},
    {id:36,en:'Black Orange',th:'แบล็คออเรนจ์',price:65,cat:'coffee',img:'36.png',rec:true},
    {id:37,en:'Latte',th:'ลาเต้',price:60,cat:'coffee',img:'37.png',rec:true},
    {id:38,en:'Cappuccino',th:'คาปูชิโน่',price:60,cat:'coffee',img:'38.png'},
    {id:39,en:'Banana Coffee',th:'กาแฟกล้วย',price:65,cat:'coffee',img:'39.png',rec:true},
    {id:40,en:'Thai Tea',th:'ชาไทย',price:60,cat:'milk',img:'40.png',tag:'hot',rec:true},
    {id:43,en:'Rose Milk Tea',th:'ชานมกุหลาบ',price:60,cat:'milk',img:'43.png'},
    {id:44,en:'Rose Tea',th:'ชากุหลาบ',price:60,cat:'milk',img:'44.png',tag:'new'},
    {id:46,en:'Banana Milk',th:'บานาน่ามิลค์',price:60,cat:'milk',img:'46.png'},
    {id:47,en:'Fresh Milk',th:'นมสด',price:60,cat:'milk',img:'47.png'},
    {id:48,en:'Melon Milk',th:'นมเมล่อน',price:60,cat:'milk',img:'48.png',tag:'new'},
    {id:49,en:'Taro Milk',th:'นมเผือก',price:60,cat:'milk',img:'49.png'},
    {id:50,en:'Green Tea Latte',th:'ชาเขียวนม',price:60,cat:'milk',img:'50.png'},
    {id:52,en:'Matcha Latte',th:'มัทฉะลาเต้',price:70,cat:'milk',img:'52.png',tag:'hot',rec:true},
    {id:33,en:'Orange Juice',th:'น้ำส้มคั้นสด',price:65,cat:'tea',img:'33.png',tag:'new'},
    {id:34,en:'Punch',th:'น้ำพั้นซ์',price:65,cat:'tea',img:'34.png'},
    {id:41,en:'Lemon Tea',th:'ชามะนาว',price:60,cat:'tea',img:'41.png',rec:true},
    {id:42,en:'Jasmine Tea',th:'ชามะลิ',price:60,cat:'tea',img:'42.png'},
    {id:45,en:'Lemon Honey',th:'น้ำผึ้งมะนาว',price:60,cat:'tea',img:'45.png'},
    {id:51,en:'Pure Matcha',th:'มัทฉะเพียว',price:65,cat:'tea',img:'51.png'},
    {id:53,en:'Coconut Matcha',th:'มัทฉะมะพร้าว',price:65,cat:'tea',img:'53.png'},
  ].map(m=>({on:true,...m}));

  const DEFAULT_SETTINGS={
    storeOpen:true,    // ปิด = หน้าร้านกดชำระเงินไม่ได้
    pickup:true,       // หน้าร้าน: รับเองที่ร้าน
    callback:true,     // หน้าร้าน: ให้ติดต่อกลับ
    autoAccept:false,  // ข้ามขั้นตรวจสลิป → เข้า "กำลังทำ" ทันที
    sound:true, popup:true,
    shop:{name:'SUMDAY Coffee',phone:'02-123-4567',branch:'สีลม',address:'123 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพฯ 10500'},
    hours:{wk:['07:00','18:00'],we:['08:00','17:00']},
    promptpay:{name:'SUMDAY Coffee',id:'0-2123-45678-9'},
  };

  /* ลำดับสถานะออเดอร์ — ตรงกับสิ่งที่ลูกค้าทำในหน้าร้าน */
  const STATUS={
    verify:{label:'รอตรวจสลิป',cls:'st-verify'},
    doing: {label:'กำลังทำ',cls:'st-doing'},
    ready: {label:'พร้อมรับ',cls:'st-ready'},
    coming:{label:'โทรแจ้งแล้ว · รอมารับ',cls:'st-coming'},
    picked:{label:'รับแล้ว',cls:'st-picked'},
    cancel:{label:'ยกเลิก',cls:'st-cancel'},
  };
  const TYPES={pickup:'🏃 รับเองที่ร้าน',callback:'📞 ให้ติดต่อกลับ'};

  /* ---------- storage helpers ---------- */
  function read(k,fb){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch(e){return fb;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}

  /* ---------- menu ---------- */
  function getMenu(){const m=read(K.menu,null);return Array.isArray(m)&&m.length?m:BASE_MENU.map(x=>({...x}));}
  function saveMenu(list){write(K.menu,list);}
  function findItem(id){return getMenu().find(m=>m.id===id)||BASE_MENU.find(m=>m.id===id);}

  /* ---------- settings ---------- */
  function getSettings(){const s=read(K.settings,{});return {...DEFAULT_SETTINGS,...s,
    shop:{...DEFAULT_SETTINGS.shop,...(s.shop||{})},hours:{...DEFAULT_SETTINGS.hours,...(s.hours||{})},
    promptpay:{...DEFAULT_SETTINGS.promptpay,...(s.promptpay||{})}};}
  function saveSettings(s){write(K.settings,s);}

  /* ---------- orders ---------- */
  function getOrders(){seedIfNeeded();return read(K.orders,[]);}
  function saveOrders(list){
    if(write(K.orders,list))return true;
    // พื้นที่เต็ม (รูปสลิปใหญ่) → ลบรูปสลิปของออเดอร์ที่ปิดแล้วทีละใบจนบันทึกได้
    for(const o of [...list].reverse()){
      if(o.slip&&(o.status==='picked'||o.status==='cancel')){o.slip=null;o.slipRemoved=true;if(write(K.orders,list))return true;}
    }
    return false;
  }
  function nextNo(list){let n;do{n='#SD-'+String(Math.floor(1000+Math.random()*9000));}while(list.some(o=>o.no===n));return n;}

  /* หน้าร้านเรียกตอนลูกค้ากด "ยืนยันการชำระเงิน" */
  function addOrder(o){
    const list=getOrders(), now=Date.now(), s=getSettings();
    const status=s.autoAccept?'doing':'verify';
    const order={no:o.no&&!list.some(x=>x.no===o.no)?o.no:nextNo(list),createdAt:now,
      name:o.name,phone:o.phone,note:o.note||'',type:o.type==='callback'?'callback':'pickup',
      items:o.items.map(it=>({id:it.id||null,en:it.en,th:it.th||'',img:it.img||null,price:it.price,sweet:it.sweet||'100%',qty:it.qty,custom:!!it.custom})),
      slip:o.slip||null,source:o.source||'web',status,
      history:[{s:'verify',at:now}].concat(status==='doing'?[{s:'doing',at:now,auto:true}]:[])};
    list.unshift(order);
    if(!saveOrders(list)){order.slip=null;order.slipRemoved=true;saveOrders(list);}
    return order;
  }
  function setStatus(no,status,extra){
    const list=getOrders(), o=list.find(x=>x.no===no); if(!o)return null;
    o.status=status; o.history=(o.history||[]).concat([{s:status,at:Date.now()}]);
    Object.assign(o,extra||{}); saveOrders(list); return o;
  }
  const orderTotal=o=>o.items.reduce((s,i)=>s+i.price*i.qty,0);
  const orderQty=o=>o.items.reduce((s,i)=>s+i.qty,0);

  /* ---------- demo slip (SVG) — ใช้กับออเดอร์ตัวอย่างที่ไม่มีรูปสลิปจริง ---------- */
  function demoSlip(o){
    const t=new Date(o.createdAt), time=t.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560">
<rect width="360" height="560" rx="18" fill="#fff"/><rect width="360" height="120" rx="18" fill="#1E3A8A"/><rect y="100" width="360" height="20" fill="#1E3A8A"/>
<text x="180" y="52" fill="#fff" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle">โอนเงินสำเร็จ</text>
<text x="180" y="82" fill="#C7D2FE" font-family="sans-serif" font-size="13" text-anchor="middle">สลิปตัวอย่าง (เดโม)</text>
<circle cx="180" cy="160" r="26" fill="#3FAE7E"/><path d="M168 160l8 8 16-16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="180" y="232" fill="#3E3127" font-family="monospace" font-size="34" font-weight="700" text-anchor="middle">฿${orderTotal(o).toFixed(2)}</text>
<line x1="28" y1="262" x2="332" y2="262" stroke="#ECE0CD" stroke-dasharray="5 5"/>
<text x="28" y="300" fill="#A1907A" font-family="sans-serif" font-size="13">จาก</text><text x="332" y="300" fill="#3E3127" font-family="sans-serif" font-size="15" font-weight="600" text-anchor="end">${esc(o.name)}</text>
<text x="28" y="340" fill="#A1907A" font-family="sans-serif" font-size="13">ไปยัง</text><text x="332" y="340" fill="#3E3127" font-family="sans-serif" font-size="15" font-weight="600" text-anchor="end">SUMDAY Coffee</text>
<text x="28" y="380" fill="#A1907A" font-family="sans-serif" font-size="13">พร้อมเพย์</text><text x="332" y="380" fill="#3E3127" font-family="monospace" font-size="14" text-anchor="end">x-xxxx-x5678-9</text>
<text x="28" y="420" fill="#A1907A" font-family="sans-serif" font-size="13">เวลา</text><text x="332" y="420" fill="#3E3127" font-family="sans-serif" font-size="15" text-anchor="end">${time} น.</text>
<text x="28" y="460" fill="#A1907A" font-family="sans-serif" font-size="13">อ้างอิง</text><text x="332" y="460" fill="#3E3127" font-family="monospace" font-size="13" text-anchor="end">${o.createdAt.toString(36).toUpperCase()}</text>
<rect x="28" y="492" width="304" height="40" rx="10" fill="#FBF5EB"/><text x="180" y="517" fill="#6E5D4B" font-family="sans-serif" font-size="12" text-anchor="middle">ภาพจำลองเพื่อการสอน · ไม่ใช่สลิปจริง</text>
</svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function slipSrc(o){return o.slip||(o.slipRemoved?null:demoSlip(o));}

  /* ---------- demo orders ---------- */
  const NAMES=['พิมพ์ชนก','อริสา บุญมี','กานต์ ศรีสุข','ธนวัฒน์','นภา วงศ์ทอง','วิทยา','ชนิดา','ปรียา','สมชาย','เมธาวี','ภูริ','ดวงใจ','กิตติ','ฟ้าใส','ณัฐพล'];
  const NOTES=['','','','หวานน้อยทุกแก้ว','ไม่ใส่หลอด','ขอหลอดเพิ่ม','น้ำแข็งน้อย','จะถึงร้านประมาณ 10 นาที'];
  const rnd=a=>a[Math.floor(Math.random()*a.length)];
  function randPhone(){const d=()=>Math.floor(Math.random()*10);return rnd(['08','09','06'])+d()+'-'+d()+d()+d()+'-'+d()+d()+d()+d();}
  function randItems(){
    const menu=getMenu().filter(m=>m.on), n=1+Math.floor(Math.random()*3), items=[];
    for(let i=0;i<n;i++){const m=rnd(menu), sweet=rnd(SWEET), ex=items.find(x=>x.id===m.id&&x.sweet===sweet);
      if(ex)ex.qty++; else items.push({id:m.id,en:m.en,th:m.th,img:m.img,price:m.price,sweet,qty:1+(Math.random()<.25?1:0)});}
    return items;
  }
  /* จำลองลูกค้าสั่งจากหน้าร้าน (ปุ่ม "จำลองออเดอร์ใหม่") */
  function simulateOrder(){
    return addOrder({name:rnd(NAMES),phone:randPhone(),note:rnd(NOTES),type:Math.random()<.65?'pickup':'callback',items:randItems(),source:'demo'});
  }
  function seedIfNeeded(){
    if(read(K.seeded,false))return;
    const now=Date.now(), min=60000, list=[];
    const plan=[ // [minsAgo, status, type, note]
      [3,'verify','pickup','หวานน้อยทุกแก้ว'],[7,'verify','callback',''],
      [12,'doing','pickup',''],[16,'doing','callback','ไม่ใส่หลอด'],
      [24,'ready','pickup',''],[31,'ready','callback','จะถึงร้านประมาณ 10 นาที'],
      [38,'coming','callback',''],[55,'picked','pickup',''],[72,'picked','callback',''],[90,'cancel','pickup',''],
    ];
    const flow={pickup:['verify','doing','ready','picked'],callback:['verify','doing','ready','coming','picked']};
    plan.forEach(([ago,status,type,note],i)=>{
      const at=now-ago*min, steps=status==='cancel'?['verify','cancel']:flow[type].slice(0,flow[type].indexOf(status)+1);
      list.push({no:nextNo(list),createdAt:at,name:NAMES[i],phone:randPhone(),note,type,items:randItems(),slip:null,source:'demo',status,
        history:steps.map((s,j)=>({s,at:at+j*4*min})),reason:status==='cancel'?'ยอดโอนไม่ตรงกับยอดสั่งซื้อ':undefined});
    });
    write(K.orders,list); write(K.seeded,true);
  }
  function resetDemo(){[K.orders,K.menu,K.settings,K.seeded].forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});}

  /* ---------- sales history (รายงาน) ----------
     ยอดย้อนหลังสร้างแบบสุ่มคงที่ตามวันที่ (วันเดิมได้ตัวเลขเดิมเสมอ) แล้วรวมกับออเดอร์จริงของวันนี้ */
  function prng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  function dayKey(d){return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
  function historyDay(date){
    const r=prng(dayKey(date)), dow=date.getDay(), weekend=dow===0||dow===6;
    const nOrders=Math.round((weekend?46:34)+r()*16), sold={};
    const weights=BASE_MENU.map(m=>({id:m.id,w:(m.tag==='hot'?3:m.rec?2:1)+r()}));
    const sumW=weights.reduce((s,x)=>s+x.w,0); let cups=0;
    for(let i=0;i<nOrders;i++){
      const c=1+Math.floor(r()*2.4);
      for(let j=0;j<c;j++){let x=r()*sumW;const pick=weights.find(w=>(x-=w.w)<=0)||weights[0];sold[pick.id]=(sold[pick.id]||0)+1;cups++;}
    }
    return {orders:nOrders,sold};
  }
  /* คืนข้อมูลรายวัน days วันล่าสุด (รวมวันนี้) → [{date, orders, sold:{id:qty}, revenue, cups}] */
  function salesByDay(days){
    const out=[], menu=getMenu(), price=id=>(menu.find(m=>m.id===id)||BASE_MENU.find(m=>m.id===id)||{price:60}).price;
    const today=new Date(); today.setHours(0,0,0,0);
    for(let i=days-1;i>=0;i--){
      const d=new Date(today); d.setDate(d.getDate()-i);
      let rec;
      if(i===0){ // วันนี้ = ออเดอร์จริงใน store (ไม่นับที่ยกเลิก / ยังไม่ผ่านการตรวจสลิป)
        const list=getOrders().filter(o=>o.createdAt>=d.getTime()&&o.status!=='cancel'&&o.status!=='verify');
        const sold={}, custom={qty:0,rev:0};
        list.forEach(o=>o.items.forEach(it=>{if(it.id)sold[it.id]=(sold[it.id]||0)+it.qty;else{custom.qty+=it.qty;custom.rev+=it.price*it.qty;}}));
        rec={date:d,orders:list.length,sold,revenue:list.reduce((s,o)=>s+orderTotal(o),0),customQty:custom.qty,customRev:custom.rev,live:true};
      }else{
        const h=historyDay(d); rec={date:d,orders:h.orders,sold:h.sold,customQty:0,customRev:0,
          revenue:Object.entries(h.sold).reduce((s,[id,q])=>s+price(+id)*q,0)};
      }
      rec.cups=Object.values(rec.sold).reduce((s,q)=>s+q,0)+rec.customQty;
      out.push(rec);
    }
    return out;
  }

  /* ---------- session (ล็อกอินเดโม) ---------- */
  function getSession(){return read(K.session,null);}
  function login(user){write(K.session,{...user,at:Date.now()});}
  function logout(){try{localStorage.removeItem(K.session);}catch(e){}}

  /* ---------- sync ข้ามแท็บ ---------- */
  function subscribe(cb){window.addEventListener('storage',e=>{
    const key=Object.keys(K).find(k=>K[k]===e.key); if(key)cb(key);
  });}

  window.SUMDAY={K,CATS,SWEET,BASE_MENU,STATUS,TYPES,
    getMenu,saveMenu,findItem,getSettings,saveSettings,
    getOrders,saveOrders,addOrder,setStatus,orderTotal,orderQty,slipSrc,simulateOrder,resetDemo,
    salesByDay,getSession,login,logout,subscribe};
})();
