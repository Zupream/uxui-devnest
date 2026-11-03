/* =========================================================
   SUMDAY · Back-office shell (shell.js)
   sidebar + ล็อกอิน + แจ้งเตือนออเดอร์ใหม่ ใช้ร่วมกันทุกหน้าหลังบ้าน
   ต้องโหลด store.js ก่อน · เรียก Shell.init('orders'|'menu'|'reports'|'settings')
   ========================================================= */
(function(){
  const S=window.SUMDAY;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const baht=n=>'฿'+Number(n).toLocaleString();
  function ago(at){const m=Math.floor((Date.now()-at)/60000);
    return m<1?'เมื่อสักครู่':m<60?m+' นาทีที่แล้ว':m<1440?Math.floor(m/60)+' ชม.ที่แล้ว':Math.floor(m/1440)+' วันที่แล้ว';}
  const clock=at=>new Date(at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})+' น.';

  /* ล็อกอินก่อนถึงจะเข้าได้ */
  const session=S.getSession();
  if(!session){
    location.replace('login.html');
    const noop=()=>{}; // กันสคริปต์ของหน้าพังระหว่างรอ redirect
    window.Shell={$,esc,baht,ago,clock,mini:noop,beep:noop,session:{},init:noop,onChange:noop,refresh:noop,setActive:noop,announce:noop};
    return;
  }

  let page='';
  function navHTML(){
    const c=k=>S.getOrders().filter(o=>o.status===k).length;
    const a=(href,key,ico,label,pin)=>`<a href="${href}" class="${page===key?'on':''}" data-nav="${key}"><span class="ico">${ico}</span> ${label}<span class="pin">${pin||''}</span></a>`;
    return `
      <div class="lg"><img class="badge-logo" src="../../img/logo/logo-transparent.png" alt="SUMDAY">
        <div class="t"><b>Back-office</b><small>ระบบหลังร้าน</small></div></div>
      <div class="navlabel">ออเดอร์</div>
      ${a('orders.html','orders','📥','ออเดอร์เข้า',c('verify'))}
      ${a('orders.html#doing','doing','👩‍🍳','กำลังทำ',c('doing'))}
      ${a('orders.html#ready','ready','✅','พร้อมรับ',c('ready')+c('coming'))}
      ${a('orders.html#done','done','📦','ปิดแล้ว','')}
      <div class="navlabel">จัดการร้าน</div>
      ${a('reports.html','reports','📊','รายงานยอดขาย')}
      ${a('menu.html','menu','🍽️','เมนู &amp; ราคา')}
      ${a('settings.html','settings','⚙️','ตั้งค่าร้าน')}
      <a href="../coffee-landing.html" target="_blank" rel="noopener" class="shop-link"><span class="ico">🛒</span> เปิดหน้าร้าน ↗</a>
      <div class="who">
        <span class="av">${esc((session.name||'S').replace(/^คุณ/,'').trim().charAt(0))}</span>
        <div class="t"><b>${esc(session.name)}</b><small>${esc(session.role||'พนักงานหน้าร้าน')}</small></div>
        <button class="out" id="logoutBtn" title="ออกจากระบบ">⎋</button>
      </div>`;
  }
  function renderSide(){const el=$('#side');if(el)el.innerHTML=navHTML();}

  function closeSide(){$('#side')?.classList.remove('open');$('#scrim')?.classList.remove('show');}

  /* ---------- toasts ---------- */
  function mini(msg){let t=$('#miniToast');if(!t){t=document.createElement('div');t.id='miniToast';t.className='mini-toast';document.body.appendChild(t);}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}
  function orderToast(o,onClick){
    let wrap=$('#toastWrap');if(!wrap){wrap=document.createElement('div');wrap.id='toastWrap';wrap.className='toast-wrap';document.body.appendChild(wrap);}
    const el=document.createElement('div');el.className='toast';
    el.innerHTML=`<span class="ic">🛎️</span><div class="tx"><b>ออเดอร์ใหม่ ${esc(o.no)}</b>
      <p>${esc(o.name)} · ${S.orderQty(o)} แก้ว · ${baht(S.orderTotal(o))}<br>${o.status==='verify'?'รอตรวจสลิป — แตะเพื่อดู':'เข้าคิว “กำลังทำ” อัตโนมัติ'}</p></div>`;
    el.onclick=()=>{el.remove();onClick?onClick(o):location.href='orders.html#'+encodeURIComponent(o.no);};
    wrap.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),320);},6500);
  }
  let actx;
  function beep(){
    try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
      [0,.18].forEach(d=>{const o=actx.createOscillator(),g=actx.createGain(),t=actx.currentTime+d;
        o.connect(g);g.connect(actx.destination);o.type='sine';o.frequency.value=d?1175:880;
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.16,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
        o.start(t);o.stop(t+.32);});
    }catch(e){}
  }

  /* ---------- ออเดอร์ใหม่จากหน้าร้าน (แท็บอื่น) ---------- */
  let known=new Set(S.getOrders().map(o=>o.no));
  const listeners=[];
  function notifyNew(list){
    const st=S.getSettings();
    list.forEach(o=>{ if(st.popup)orderToast(o,Shell.onOrderClick); });
    if(list.length&&st.sound)beep();
  }
  /* เรียกเมื่อสร้างออเดอร์ในแท็บนี้เอง (ปุ่มจำลอง) */
  function announce(o){known.add(o.no);notifyNew([o]);renderSide();}
  function checkNew(){
    const orders=S.getOrders(), fresh=orders.filter(o=>!known.has(o.no));
    known=new Set(orders.map(o=>o.no));
    if(fresh.length)notifyNew(fresh);
    return fresh;
  }

  function closedBanner(){
    const el=$('#closedBanner'); if(!el)return;
    const open=S.getSettings().storeOpen;
    el.innerHTML=open?'':`<div class="closed-banner">⛔ <span><b>ร้านปิดรับออเดอร์อยู่</b> — ลูกค้าจะกดชำระเงินที่หน้าร้านไม่ได้</span>
      <button class="btn btn-sm btn-primary" id="reopenBtn">เปิดรับออเดอร์</button></div>`;
  }

  const Shell={
    $,esc,baht,ago,clock,mini,beep,session,onOrderClick:null,
    init(p){
      page=p; renderSide(); closedBanner();
      document.addEventListener('click',e=>{
        if(e.target.closest('#logoutBtn')){S.logout();location.href='login.html';return;}
        if(e.target.closest('#menuBtn')){$('#side').classList.add('open');$('#scrim').classList.add('show');return;}
        if(e.target.closest('#scrim'))closeSide();
        if(e.target.closest('#reopenBtn')){const s=S.getSettings();s.storeOpen=true;S.saveSettings(s);closedBanner();listeners.forEach(f=>f('settings'));mini('เปิดรับออเดอร์แล้ว ✓');}
        if(e.target.closest('.side a'))closeSide();
      });
      S.subscribe(key=>{
        if(key==='session'&&!S.getSession()){location.replace('login.html');return;}
        if(key==='orders')checkNew();
        renderSide(); closedBanner(); listeners.forEach(f=>f(key));
      });
      setInterval(()=>listeners.forEach(f=>f('tick')),30000);
    },
    /* หน้าเพจลงทะเบียนเพื่อ re-render เมื่อข้อมูลเปลี่ยน (จากแท็บอื่น / ทุก 30 วิ) */
    onChange(f){listeners.push(f);},
    refresh(){renderSide();closedBanner();},
    setActive(p){page=p;renderSide();},
    announce,
  };
  window.Shell=Shell;
})();
