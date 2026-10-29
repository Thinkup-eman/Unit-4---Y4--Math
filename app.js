(function(){
'use strict';
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[rnd(0,a.length-1)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const T=(h,m=0)=>h*60+m, p2=n=>String(n).padStart(2,'0');
const d24=t=>{t=((t%1440)+1440)%1440;return p2(Math.floor(t/60))+':'+p2(t%60)};
const d12=t=>{t=((t%1440)+1440)%1440;const h=Math.floor(t/60),m=t%60;return ((h%12)||12)+':'+p2(m)+' '+(h<12?'a.m.':'p.m.')};
const ap=t=>((t%1440)<720?'a.m.':'p.m.');
const hm=n=>{const h=Math.floor(n/60),m=n%60,o=[];if(h)o.push(h+(h===1?' hour':' hours'));if(m||!h)o.push(m+(m===1?' minute':' minutes'));return o.join(' ')};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const NS='http://www.w3.org/2000/svg';

/* ---------- clock drawing ---------- */
function clockSVG(h,m,big){
  let s='<svg viewBox="0 0 200 200" class="clock'+(big?' big':'')+'" role="img" aria-label="'+(h==null?'blank clock':'analogue clock')+'"><circle class="face" cx="100" cy="100" r="94"/>';
  for(let i=0;i<60;i++){const a=i*Math.PI/30,r1=94-(i%5?4:10),r2=90;s+='<line class="tk" stroke-width="'+(i%5?1.2:2.6)+'" x1="'+(100+r1*Math.sin(a)).toFixed(1)+'" y1="'+(100-r1*Math.cos(a)).toFixed(1)+'" x2="'+(100+r2*Math.sin(a)).toFixed(1)+'" y2="'+(100-r2*Math.cos(a)).toFixed(1)+'"/>'}
  for(let n=1;n<=12;n++){const a=n*Math.PI/6;s+='<text class="nm" x="'+(100+70*Math.sin(a)).toFixed(1)+'" y="'+(100-70*Math.cos(a)).toFixed(1)+'">'+n+'</text>'}
  if(h!=null){
    const ha=((h%12)*30+m*0.5)*Math.PI/180, ma=m*6*Math.PI/180;
    s+='<line class="hh" x1="100" y1="100" x2="'+(100+44*Math.sin(ha)).toFixed(1)+'" y2="'+(100-44*Math.cos(ha)).toFixed(1)+'"/>';
    s+='<line class="mh" x1="100" y1="100" x2="'+(100+68*Math.sin(ma)).toFixed(1)+'" y2="'+(100-68*Math.cos(ma)).toFixed(1)+'"/>';
  }
  return s+'<circle class="pin" cx="100" cy="100" r="5"/></svg>';
}
const clockBox=(t,label,big)=>'<div class="cw">'+clockSVG(Math.floor(t/60),t%60,big)+'<span>'+(label||'')+'</span></div>';

/* ---------- answer parsing ---------- */
function parseTime(v){ // returns {t, padded}
  v=String(v).trim().replace(/[.\s]/g,':').replace(/:+/g,':');
  if(/^\d{4}$/.test(v))v=v.slice(0,2)+':'+v.slice(2);
  const m=/^(\d{1,2}):(\d{2})$/.exec(v);if(!m)return null;
  return {t:T(+m[1],+m[2]),padded:m[1].length===2};
}
const num=v=>{v=String(v).trim().replace(/,/g,'');return /^-?\d+(\.\d+)?$/.test(v)?Number(v):NaN};

/* ---------- question building blocks ---------- */
function inputs(box,spec){ // spec: [{id,label,suffix,w}]
  const row=document.createElement('div');row.className='row';const refs={};
  spec.forEach(s=>{
    if(s.label){const l=document.createElement('label');l.textContent=s.label;row.appendChild(l)}
    const i=document.createElement('input');i.type='text';i.inputMode=s.mode||'text';i.autocomplete='off';i.setAttribute('aria-label',s.aria||s.label||'answer');
    if(s.w)i.style.width=s.w;refs[s.id]=i;row.appendChild(i);
    if(s.suffix){const x=document.createElement('span');x.textContent=s.suffix;row.appendChild(x)}
  });
  box.appendChild(row);return refs;
}
function choices(box,opts,answer){
  const wrap=document.createElement('div');wrap.className='opts';let sel=null;const btns=[];
  opts.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='opt';b.textContent=o;
    b.onclick=()=>{if(b.disabled)return;btns.forEach(x=>x.classList.remove('sel'));b.classList.add('sel');sel=o};
    wrap.appendChild(b);btns.push(b)});
  box.appendChild(wrap);
  return {get:()=>sel,lock:()=>btns.forEach(b=>{b.disabled=true;if(b.textContent===answer)b.classList.add('right')}),reveal:()=>btns.forEach(b=>{if(b.textContent===answer)b.classList.add('right')})};
}

/* ---------- the questions ---------- */
const SECTIONS=[
 {id:'units',title:'Seconds, minutes and hours',sub:'Change between units of time.'},
 {id:'h24',title:'a.m., p.m. and the 24-hour clock',sub:'After midday, add 12 to the hours: 1:00 p.m. = 13:00.'},
 {id:'clocks',title:'Reading and setting clocks',sub:'Look at the hands. Check the label: a.m. or p.m.?'},
 {id:'elapsed',title:'How much time passes?',sub:'Count on to the next hour, then add the minutes.'},
 {id:'cal',title:'Calendars',sub:'Days, weeks, months and leap years.'},
 {id:'tt',title:'Timetables',sub:'Read the table carefully, then work out the time.'}
];
const QS=[];const add=(sec,gen,tag)=>QS.push({sec,gen,tag});

/* A. units */
add('units',()=>{const n=rnd(3,9);return{prompt:n+' minutes = ? seconds',
  render(b){this.r=inputs(b,[{id:'a',suffix:'seconds',mode:'numeric'}])},
  check(){const v=num(this.r.a.value);return v===n*60?{ok:true}:{ok:false,hint:'1 minute = 60 seconds. Multiply '+n+' × 60.'}},answer:String(n*60)+' seconds'}});
add('units',()=>{const h=rnd(2,4),m=pick([10,15,20,25,30,40,45,50]);const t=h*60+m;return{prompt:t+' minutes = ? hours and ? minutes',
  render(b){this.r=inputs(b,[{id:'h',suffix:'hours',mode:'numeric',w:'4.2em'},{id:'m',suffix:'minutes',mode:'numeric',w:'4.2em'}])},
  check(){const a=num(this.r.h.value),c=num(this.r.m.value);return a===h&&c===m?{ok:true}:{ok:false,hint:'How many whole hours fit in '+t+' minutes? Use 60 minutes = 1 hour. Then count what is left.'}},answer:h+' hours '+m+' minutes'}});
add('units',()=>{const n=rnd(2,6),k=pick([['days','hours',24],['weeks','days',7],['years','months',12]]);return{prompt:n+' '+k[0]+' = ? '+k[1],
  render(b){this.r=inputs(b,[{id:'a',suffix:k[1],mode:'numeric'}])},
  check(){return num(this.r.a.value)===n*k[2]?{ok:true}:{ok:false,hint:'1 '+k[0].slice(0,-1)+' = '+k[2]+' '+k[1]+'. Multiply '+n+' × '+k[2]+'.'}},answer:String(n*k[2])}});
add('units',()=>({prompt:'Which is the <b>shortest</b> time?',
  render(b){this.c=choices(b,shuffle(['2 hours','100 minutes','1½ hours','150 minutes']),'1½ hours')},
  check(){return this.c.get()==='1½ hours'?{ok:true}:{ok:false,hint:'Change every time to minutes first: 2 hours = 120, 1½ hours = 90.'}},answer:'1½ hours (90 minutes)',lock(){this.c.lock()}}),'Think');
add('units',()=>{const it=pick([['a sneeze','seconds'],['a football match','hours'],['brushing your teeth','minutes'],['a school term','weeks']]);
  return{prompt:'Which unit would you use to measure '+it[0]+'?',
  render(b){this.c=choices(b,['seconds','minutes','hours','weeks'],it[1])},
  check(){return this.c.get()===it[1]?{ok:true}:{ok:false,hint:'Think about how long '+it[0]+' really takes.'}},answer:it[1],lock(){this.c.lock()}}});

/* B. 12h / 24h */
add('h24',()=>{const h=rnd(1,11),m=pick([0,5,10,15,20,25,30,35,40,45,50,55]),pm=Math.random()<.7;const t=T(h%12+(pm?12:0),m);
  return{prompt:'Write <b>'+h+':'+p2(m)+' '+(pm?'p.m.':'a.m.')+'</b> using the 24-hour clock.',
  render(b){this.r=inputs(b,[{id:'a',aria:'24-hour time'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);if(p&&p.t===t)return{ok:true,note:p.padded?'':'Write two digits for the hours: '+d24(t)};return{ok:false,hint:pm?'It is after midday, so add 12 to the hour.':'Before midday the hour stays the same. Write two digits, like 08:05.'}},answer:d24(t)}});
add('h24',()=>{const h=rnd(13,23),m=pick([5,10,15,20,25,30,35,40,45,50,55]);const t=T(h,m);const right=d12(t);
  const set=new Set([right]);while(set.size<4){const hh=rnd(1,12),c=hh+':'+p2(m)+' '+pick(['a.m.','p.m.']);set.add(c)}
  return{prompt:'Which 12-hour time is the same as <b>'+d24(t)+'</b>?',
  render(b){this.c=choices(b,shuffle([...set]),right)},
  check(){return this.c.get()===right?{ok:true}:{ok:false,hint:'Take away 12 from the hour, and remember it is after midday.'}},answer:right,lock(){this.c.lock()}}});
add('h24',()=>{const t=pick([[0,'midnight'],[12,'midday'],[18,'6 p.m.'],[6,'6 a.m.']]);const c=t[1];
  return{prompt:'What does <b>'+p2(t[0])+':00</b> mean?',
  render(b){this.c=choices(b,['midnight','midday','6 a.m.','6 p.m.'],c)},
  check(){return this.c.get()===c?{ok:true}:{ok:false,hint:'00:00 is the start of the day, 12:00 is the middle, and after 12:00 you add 12.'}},answer:c,lock(){this.c.lock()}}});
add('h24',()=>{const h=pick([5,7,8,9]);const t=T(h+12,0);
  return{prompt:'Ava changes '+h+' p.m. to '+p2(h+10)+':00. She made a mistake. Write the correct 24-hour time.',
  render(b){this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);return p&&p.t===t?{ok:true}:{ok:false,hint:'Ava added 10. For p.m. times you add 12 to the hour.'}},answer:d24(t)}},'Think');

/* C. clocks */
add('clocks',()=>{const t=T(rnd(1,23),rnd(0,11)*5);
  return{prompt:'Write the time shown on the clock using the <b>24-hour clock</b>. (Label: '+ap(t)+')',
  render(b){const d=document.createElement('div');d.className='clocks';d.innerHTML=clockBox(t,ap(t),true);b.appendChild(d);this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);if(p&&p.t===t)return{ok:true,note:p.padded?'':'Two digits for the hours: '+d24(t)};return{ok:false,hint:'The short hand shows the hour, the long hand shows the minutes (count in 5s). Then use the '+ap(t)+' label for 24-hour time.'}},answer:d24(t)}});
add('clocks',()=>{const t=T(rnd(13,23),rnd(0,11)*5);
  return{prompt:'Write the time shown on the clock using the <b>24-hour clock</b>. (Label: '+ap(t)+')',
  render(b){const d=document.createElement('div');d.className='clocks';d.innerHTML=clockBox(t,ap(t),true);b.appendChild(d);this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);if(p&&p.t===t)return{ok:true,note:p.padded?'':'Two digits for the hours: '+d24(t)};return{ok:false,hint:'Read it as a 12-hour time first, then add 12 to the hour because it is p.m.'}},answer:d24(t)}});
add('clocks',()=>{const h=rnd(1,11),m=pick([15,45]);const t=T(rnd(0,1)?h+12:h,m);const sw=T(Math.floor(t/60),m===15?45:15),oth=T((Math.floor(t/60)+12)%24,m);
  const opts=shuffle([d24(t),d24(sw),d24(oth)]);
  return{prompt:'Circle the correct 24-hour time shown on the clock. (Label: '+ap(t)+')',
  render(b){const d=document.createElement('div');d.className='clocks';d.innerHTML=clockBox(t,ap(t),true);b.appendChild(d);this.c=choices(b,opts,d24(t))},
  check(){return this.c.get()===d24(t)?{ok:true}:{ok:false,hint:'The long hand on 3 means quarter past (15 minutes). On 9 it means quarter to (45 minutes). Check a.m. or p.m. too.'}},answer:d24(t),lock(){this.c.lock()}}});
function dragClock(box,start,fixPm){
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 200 200');svg.setAttribute('class','clock big drag');svg.setAttribute('role','img');svg.setAttribute('aria-label','Clock. Drag the hands to set the time.');
  svg.innerHTML=clockSVG(null,0,true).replace(/^<svg[^>]*>/,'').replace('</svg>','')+'<line class="hh" id="h" x1="100" y1="100" x2="100" y2="56"/><line class="mh" id="m" x1="100" y1="100" x2="100" y2="32"/><circle class="handle" id="hd" cx="100" cy="32" r="11"/><circle class="handle hh2" id="hd2" cx="100" cy="56" r="10"/><g id="sun"><circle cx="30" cy="30" r="8" fill="#E0A21B"/><g stroke="#E0A21B" stroke-width="2.5" stroke-linecap="round"><line x1="30" y1="14" x2="30" y2="18"/><line x1="30" y1="42" x2="30" y2="46"/><line x1="14" y1="30" x2="18" y2="30"/><line x1="42" y1="30" x2="46" y2="30"/><line x1="19" y1="19" x2="22" y2="22"/><line x1="38" y1="38" x2="41" y2="41"/><line x1="19" y1="41" x2="22" y2="38"/><line x1="38" y1="22" x2="41" y2="19"/></g></g><path id="moon" d="M34 16a14 14 0 1 0 8 24a11 11 0 0 1 -8 -24z" fill="#8FA8D8"/><circle class="pin" cx="100" cy="100" r="5"/>';
  const cur=document.createElement('div');cur.className='big';
  const t0=fixPm==null?(start==null?720:start):(fixPm?720:0)+((start==null?0:start)%720);const st={tot:t0,min:t0%60,onChange:null};
  const hh=svg.querySelector('#h'),mh=svg.querySelector('#m'),hd=svg.querySelector('#hd'),hd2=svg.querySelector('#hd2');
  const draw=()=>{if(fixPm!=null)st.tot=(st.tot%720)+(fixPm?720:0);const ma=st.min*6*Math.PI/180,ha=((st.tot%720)/720)*2*Math.PI;
    const hx=100+44*Math.sin(ha),hy=100-44*Math.cos(ha);
    hh.setAttribute('x2',hx.toFixed(1));hh.setAttribute('y2',hy.toFixed(1));hd2.setAttribute('cx',hx.toFixed(1));hd2.setAttribute('cy',hy.toFixed(1));
    mh.setAttribute('x2',(100+68*Math.sin(ma)).toFixed(1));mh.setAttribute('y2',(100-68*Math.cos(ma)).toFixed(1));
    hd.setAttribute('cx',(100+68*Math.sin(ma)).toFixed(1));hd.setAttribute('cy',(100-68*Math.cos(ma)).toFixed(1));
    cur.textContent=d24(st.tot)+' · '+ap(st.tot);svg.classList.toggle('night',st.tot>=720);svg.querySelector('#sun').style.display=st.tot>=720?'none':'';svg.querySelector('#moon').style.display=st.tot>=720?'':'none';pm.classList.toggle('sel',st.tot>=720);am.classList.toggle('sel',st.tot<720);if(st.onChange)st.onChange(st.tot)};
  let mode=null;
  const pos=e=>{const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*200-100,y:(e.clientY-r.top)/r.height*200-100}};
  const ang=(x,y)=>{let a=Math.atan2(x,-y)*180/Math.PI;if(a<0)a+=360;return a};
  const move=e=>{const{x,y}=pos(e);if(Math.hypot(x,y)<10)return;const a=ang(x,y);
    if(mode==='m'){const nm=(Math.round(a/30)*5)%60;let d=nm-st.min;if(d<-30)d+=60;if(d>30)d-=60;st.min=nm;st.tot=((st.tot+d)%1440+1440)%1440}
    else{const h=Math.round(a/30)%12;const base=st.tot>=720?720:0;st.tot=base+h*60+st.min}
    draw()};
  svg.addEventListener('pointerdown',e=>{if(st.locked)return;const{x,y}=pos(e);mode=Math.hypot(x,y)<55?'h':'m';try{svg.setPointerCapture(e.pointerId)}catch(_){}move(e);e.preventDefault()});
  svg.addEventListener('pointermove',e=>{if(mode)move(e)});
  ['pointerup','pointercancel'].forEach(ev=>svg.addEventListener(ev,()=>{mode=null}));
  const row=document.createElement('div');row.className='opts';
  const am=document.createElement('button'),pm=document.createElement('button');
  [am,pm].forEach((x,i)=>{x.type='button';x.className='opt';x.textContent=i?'p.m. (afternoon / night)':'a.m. (morning)';x.onclick=()=>{if(st.locked)return;st.tot=(st.tot%720)+(i?720:0);draw()};row.appendChild(x)});
  const wrap=document.createElement('div');wrap.className='clocks';const cw=document.createElement('div');cw.className='cw';cw.appendChild(svg);wrap.appendChild(cw);
  const hint=document.createElement('div');hint.className='hint';hint.innerHTML='Drag the <b>gold dot</b> for the minutes (long hand). Drag the <b>teal dot</b> on the short hand for the hour. '+(fixPm==null?'Then choose a.m. (sun) or p.m. (moon).':'The sun or moon shows if it is morning or afternoon.');
  if(fixPm!=null)row.hidden=true;box.append(wrap,cur,row,hint);draw();
  return{st,get:()=>st.tot,lock:()=>{st.locked=true;row.querySelectorAll('button').forEach(x=>x.disabled=true)}};
}
function dragHint(g,t){const hh=Math.floor(t/60),mm=t%60,gh=Math.floor(g/60),gm=g%60;const p=[];
  if(gm!==mm)p.push('the long hand should point to '+(mm/5||12)+' ('+mm+' minutes), it points to '+(gm/5||12));
  if((gh%12)!==(hh%12))p.push('the short hand should be at '+((hh%12)||12)+' (the hour of '+d24(t)+' is '+((hh%12)||12)+' on a clock), it is at '+((gh%12)||12));
  return p.length?'Fix this: '+p.join('; ')+'.':'Look again.'}
function setClockQ(t){return{prompt:'Set the clock to <b>'+d24(t)+'</b> ('+ap(t)+'). Drag the hands yourself.',
  render(b){this.dc=dragClock(b,null,t>=720)},
  check(){const g=this.dc.get();return g===t?{ok:true}:{ok:false,hint:dragHint(g,t)}},
  answer:d24(t),lock(){this.dc.lock()}}}
add('clocks',()=>setClockQ(T(rnd(13,23),rnd(0,11)*5)));
add('clocks',()=>setClockQ(T(rnd(1,11),rnd(0,11)*5)));
add('clocks',()=>{const aft=Math.random()<.5,n=pick([5,10,15,20,25]);const base=T(rnd(6,20),pick([0,5,10,15,20,25,30,35,40,45,50,55]));const res=aft?base+n:base-n;
  return{prompt:n+' minutes <b>'+(aft?'after':'before')+'</b> '+d24(base)+' is what time? Write it using the 24-hour clock.',
  render(b){const d=document.createElement('div');d.className='clocks';d.innerHTML=clockBox(base,d24(base),false);b.appendChild(d);this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);return p&&p.t===res?{ok:true,note:p.padded?'':'Two digits for the hours: '+d24(res)}:{ok:false,hint:aft?'Move the minute hand '+n+' minutes forward. Take care if you pass the hour.':'Count back '+n+' minutes. If you pass the hour, the hour goes down by 1.'}},answer:d24(res)}},'Think');

/* D. elapsed time */
function elapsedQ(){const s=T(rnd(7,18),rnd(0,11)*5);let dmin=pick([25,30,35,40,45,50,65,75,95,100,140,155,190]);const e=s+dmin;
  return{prompt:'How much time passes from the first clock to the second clock? Both times are on the same day.',
  render(b){const d=document.createElement('div');d.className='clocks';d.innerHTML=clockBox(s,ap(s)+' · '+d24(s))+'<div class="cw" style="font-size:22px;padding:0 4px 60px">→</div>'+clockBox(e,ap(e)+' · '+d24(e));b.appendChild(d);
    this.r=inputs(b,[{id:'h',suffix:'hours',mode:'numeric',w:'4.2em'},{id:'m',suffix:'minutes',mode:'numeric',w:'4.2em'}])},
  check(){const h=num(this.r.h.value||'0'),m=num(this.r.m.value||'0');return h*60+m===dmin?{ok:true}:{ok:false,hint:'Count on from '+d24(s)+' to the next hour, then add whole hours, then the last minutes.'}},answer:hm(dmin)}}
add('elapsed',elapsedQ);add('elapsed',elapsedQ);add('elapsed',elapsedQ);
add('elapsed',()=>{const h=pick([3,4,5]),mm=pick([5,10,15,20,25]),d=pick([1,2])*60+pick([20,30,40,50]);const s=T(h+12,mm*1);const e=s+d;
  return{prompt:'A film starts at '+d12(s)+' and lasts '+hm(d)+'. What time does it end? Write the answer using the 24-hour clock.',
  render(b){this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);return p&&p.t===e?{ok:true,note:p.padded?'':'Two digits for the hours: '+d24(e)}:{ok:false,hint:'Start at '+d24(s)+'. Add the hours first, then the minutes.'}},answer:d24(e)}});
add('elapsed',()=>{const s=T(rnd(21,23),pick([10,20,30,40,50])),e=T(rnd(5,7),pick([5,15,25,35,45]));const d=(e-s+1440)%1440;
  return{prompt:'A flight leaves at '+d24(s)+' and lands at '+d24(e)+' the next morning. How long is the flight? (Hint: go to midnight first.)',
  render(b){this.r=inputs(b,[{id:'h',suffix:'hours',mode:'numeric',w:'4.2em'},{id:'m',suffix:'minutes',mode:'numeric',w:'4.2em'}])},
  check(){const h=num(this.r.h.value||'0'),m=num(this.r.m.value||'0');return h*60+m===d?{ok:true}:{ok:false,hint:'From '+d24(s)+' to 00:00 is '+hm(1440-s)+'. Then add the time from 00:00 to '+d24(e)+'.'}},answer:hm(d)}},'Think');

/* E. calendars */
function calHTML(y,m,mark){const first=new Date(y,m-1,1).getDay(),days=new Date(y,m,0).getDate();let s='<div class="tbl"><table class="cal"><tr><th colspan="7">'+['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]+' '+y+'</th></tr><tr>'+['Su','Mo','Tu','We','Th','Fr','Sa'].map(x=>'<th>'+x+'</th>').join('')+'</tr><tr>';
  for(let i=0;i<first;i++)s+='<td></td>';for(let d=1;d<=days;d++){if((first+d-1)%7===0&&d>1)s+='</tr><tr>';s+='<td>'+d+'</td>'}return s+'</tr></table></div>'}
add('cal',()=>{const y=pick([2028,2032,2036]);return{prompt:y+' is a leap year. How many days are in the first three months (January, February and March) of '+y+'?',
  render(b){this.r=inputs(b,[{id:'a',suffix:'days',mode:'numeric'}])},
  check(){return num(this.r.a.value)===91?{ok:true}:{ok:false,hint:'In a leap year February has 29 days. Add 31 + 29 + 31.'}},answer:'91 days'}});
add('cal',()=>{const mo=pick([[2024,1],[2024,4],[2024,9],[2025,10]]);const[y,m]=mo;const days=new Date(y,m,0).getDate();const tues=[],fri=[];for(let d=1;d<=days;d++){const w=new Date(y,m-1,d).getDay();if(w===2)tues.push(d);if(w===5)fri.push(d)}
  return{prompt:'Look at the calendar. a) What is the date of the <b>second Tuesday</b>? b) What is the date of the <b>last Friday</b>?',
  render(b){const d=document.createElement('div');d.innerHTML=calHTML(y,m);b.appendChild(d);this.r=inputs(b,[{id:'a',label:'a)',mode:'numeric',w:'4.2em'},{id:'b',label:'b)',mode:'numeric',w:'4.2em'}])},
  check(){const a=num(this.r.a.value)===tues[1],c=num(this.r.b.value)===fri[fri.length-1];return a&&c?{ok:true}:{ok:false,hint:(!a?'Find the first Tuesday, then count on 7 days for the second. ':'')+(!c?'Look at the last row of the calendar for the last Friday.':'')}},answer:'a) '+tues[1]+'  b) '+fri[fri.length-1]}});
add('cal',()=>{const d1=pick(['Monday','Tuesday','Wednesday']),n=pick([2,3]),h1=pick([6,7,8]);const tot=(n)*24+(16-h1);
  return{prompt:'Arun leaves on a trip on Monday at '+h1+':00 a.m. and comes back '+n+' days later, on '+(n===2?'Wednesday':'Thursday')+', at 4:00 p.m. How many hours is the trip?',
  render(b){this.r=inputs(b,[{id:'a',suffix:'hours',mode:'numeric'}])},
  check(){return num(this.r.a.value)===tot?{ok:true}:{ok:false,hint:n+' whole days = '+n+' × 24 hours. Then add the hours from '+h1+':00 to 16:00.'}},answer:tot+' hours'}},'Think');

/* F. timetables */
add('tt',()=>{const rows=[['Time','Subject'],['8:45','Registration'],['9:30','Maths'],['11:00','Break'],['11:30','English'],['13:00','Lunch']];
  return{prompt:'Here is a timetable for Monday morning. What is Lila doing at <b>10:15</b>?',
  render(b){b.insertAdjacentHTML('beforeend','<div class="tbl"><table>'+rows.map((r,i)=>'<tr>'+r.map(c=>i?'<td>'+c+'</td>':'<th>'+c+'</th>').join('')+'</tr>').join('')+'</table></div>');this.c=choices(b,['Registration','Maths','Break','English'],'Maths')},
  check(){return this.c.get()==='Maths'?{ok:true}:{ok:false,hint:'Find the last time that is before 10:15. Maths starts at 9:30 and the next lesson is at 11:00.'}},answer:'Maths',lock(){this.c.lock()}}});
add('tt',()=>{const rows=[['Stop','Bus 1','Bus 2','Bus 3','Bus 4'],['Hall','11:20','12:40','13:00','14:20'],['Mill','11:46','13:06','13:22','14:42'],['Park','12:25','13:40','13:55','15:10']];
  return{prompt:'Eva must arrive at her office before <b>14:15</b>. She gets off at Park and walks for 15 minutes. What is the latest bus she can catch from Mill?',
  render(b){b.insertAdjacentHTML('beforeend','<div class="tbl"><table>'+rows.map((r,i)=>'<tr>'+r.map((c,j)=>i&&j?'<td>'+c+'</td>':'<th>'+c+'</th>').join('')+'</tr>').join('')+'</table></div>');this.c=choices(b,['11:46','13:06','13:22','14:42'],'13:22')},
  check(){return this.c.get()==='13:22'?{ok:true}:{ok:false,hint:'Subtract the walk: she must be at Park by 14:00. Which bus reaches Park by then?'}},answer:'13:22 (Bus 3 reaches Park at 13:55, then 15 minutes walking = 14:10)',lock(){this.c.lock()}}},'Think');
add('tt',()=>{const rows=[['','Bus 1','Bus 2','Bus 3'],['Station A','13:40','14:55','16:10'],['Station B','14:25','15:40','16:55']];
  return{prompt:'Safia leaves home at 13:30 and walks 15 minutes to Station A. She takes the next bus to Station B. What time does she arrive at Station B?',
  render(b){b.insertAdjacentHTML('beforeend','<div class="tbl"><table>'+rows.map((r,i)=>'<tr>'+r.map((c,j)=>i&&j?'<td>'+c+'</td>':'<th>'+c+'</th>').join('')+'</tr>').join('')+'</table></div>');this.r=inputs(b,[{id:'a'}]);this.r.a.placeholder='__:__'},
  check(){const p=parseTime(this.r.a.value);return p&&p.t===T(15,40)?{ok:true}:{ok:false,hint:'She reaches Station A at 13:45. Is the 13:40 bus still there? Take the next bus.'}},answer:'15:40'}},'Think');

[23,24,25].forEach(i=>{QS[i].fixed=true});
/* ---------- storage, results ---------- */
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){return null}};
const R={race:+ls('t4race')||0,mem:+ls('t4mem')||0,drag:+ls('t4drag')||0,solved:0,total:0};
document.getElementById('artog').onclick=()=>{const h=document.body.classList.toggle('noar');document.getElementById('artog').textContent=h?'إظهار الشرح بالعربي / Show Arabic help':'إخفاء الشرح بالعربي / Hide Arabic help'};
const nmEl=document.getElementById('nm');nmEl.value=ls('t4name')||'';
nmEl.addEventListener('input',()=>{ls('t4name',nmEl.value);queueSave()});
const myName=()=>(nmEl.value||'').trim()||'Student';
function resultText(){return 'ThinkUp Year 4 · Unit 4 Time\nName: '+myName()+'\nQuestions solved: '+R.solved+' / '+R.total+'\nTime Race best: '+(R.race||'not played')+'\nMemory Match: '+(R.mem?R.mem+' moves':'not played')+'\nDrag the Clock: '+R.drag+' / 5 rounds'}
function confetti(){for(let i=0;i<18;i++){const e=document.createElement('div');e.className='conf';e.textContent=['⭐','🎉','✨','🌟'][i%4];e.style.left=Math.random()*100+'vw';e.style.animationDelay=(Math.random()*.4)+'s';document.body.appendChild(e);setTimeout(()=>e.remove(),2200)}}
function showResult(){const w=document.getElementById('wa');if(w)w.href='https://wa.me/201026794126?text='+encodeURIComponent(resultText());document.getElementById('resulttext').textContent=resultText();document.getElementById('resultcard').classList.add('show')}
let dbRef=null,saveTimer=null;
function queueSave(){showResult();if(!dbRef)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{dbRef.set({name:myName(),solved:R.solved,total:R.total,race:R.race,mem:R.mem,drag:R.drag,updated:Date.now()}).catch(()=>{})},1200)}
document.getElementById('copyres').onclick=()=>{const t=resultText(),fb=document.getElementById('copyfb');
  const ok=()=>{fb.className='fb good';fb.textContent='Copied! Send it to your teacher.'};const no=()=>{fb.className='fb info';fb.textContent='Select the text above and copy it.'};
  try{navigator.clipboard.writeText(t).then(ok,no)}catch(_){no()}};

/* ---------- games ---------- */
const gamesEl=document.getElementById('games');
function gcard(title,pill,desc,ar,em){const g=document.createElement('div');g.className='g';g.innerHTML='<div class="gribbon"><img alt="ThinkUp" src="logo.png"><span>ThinkUp Games · Think Better. Aim Higher.</span></div><h3><span class="mascot" style="font-size:34px">'+em+'</span>'+title+' <span class="pill">'+pill+'</span></h3><div class="gtip">'+desc+(ar?'<div class="ar" lang="ar">'+ar+'</div>':'')+'</div><div class="gbody"></div>';gamesEl.appendChild(g);return g.querySelector('.gbody')}
const mkbtn=(t,fn,cls)=>{const b=document.createElement('button');b.type='button';b.textContent=t;if(cls)b.className=cls;b.onclick=fn;return b};

/* Game 1: drag the clock */
(function(){
  const body=gcard('Drag the Clock','5 rounds','<b>How to play:</b> read the time in the yellow box. Drag the <b>gold ball</b> (long hand = minutes) and the <b>green ball</b> (short hand = hours) until the clock shows that time. Then press <b>Check my clock</b>. The sun means morning, the moon means afternoon.','طريقة اللعب: اقرأ الوقت المكتوب في المربع الأصفر. اسحب الكورة الدهبي (العقرب الكبير = الدقايق) والكورة الخضرا (العقرب الصغير = الساعة) لحد ما الساعة تعرض نفس الوقت، وبعدين دوس Check my clock. الشمس = صباح، والقمر = بعد الظهر.','🕰️');
  let round=0,won=0,t0=0,dc=null;
  const box=document.createElement('div');box.className='gbody';const msg=document.createElement('div');msg.className='fb';msg.setAttribute('aria-live','polite');
  const info=document.createElement('div');info.className='big';
  const chk=mkbtn('Check my clock',()=>{
    if(dc.get()===t0){won++;R.drag=Math.max(R.drag,won);ls('t4drag',R.drag);msg.className='fb good';msg.textContent='✓ Yes!';confetti();queueSave();chk.disabled=true;dc.lock();setTimeout(next,900)}
    else{msg.className='fb bad';msg.textContent=dragHint(dc.get(),t0)}
  });
  const startB=mkbtn('Start',()=>{round=0;won=0;next()});
  function next(){
    box.innerHTML='';msg.textContent='';chk.disabled=false;
    if(round>=5){info.textContent='Finished: '+won+' / 5 ★';box.append(info);body.append(startB);startB.textContent='Play again';return}
    round++;t0=T(rnd(1,23),rnd(0,11)*5);info.textContent='Round '+round+' / 5 · Show '+d24(t0);
    box.append(info);dc=dragClock(box,null,t0>=720);box.append(chk);startB.remove()}
  body.append(box,msg,startB);
})();

/* Game 2: time race */
(function(){
  const body=gcard('Time Race','45 seconds','<b>How to play:</b> press <b>Start</b>. Look at the clock and tap the correct 24-hour time. Each right answer gives 10 points (3 in a row gives bonus points). A wrong answer takes away 2 points. You have 45 seconds.','طريقة اللعب: دوس Start. بص على الساعة واختار الوقت الصح بنظام 24 ساعة. كل إجابة صح = 10 نقط (3 ورا بعض = نقط زيادة)، والغلط بينقّص 2 نقطة. معاك 45 ثانية.','🏎️');
  const area=document.createElement('div');area.className='gbody';area.style.width='100%';const bar=document.createElement('div');bar.className='timer';bar.innerHTML='<i></i>';const fill=bar.firstChild;
  const info=document.createElement('div');info.className='big';info.textContent='Best: '+(R.race||'–');
  let score=0,streak=0,left=0,iv=null,cur=null;
  const play=document.createElement('div');play.className='gbody';
  function q(){const t=T(rnd(1,23),rnd(0,11)*5);const pool=new Set();[t+720,t+60,t-60,t+5,t-5,t+600].forEach(x=>{const v=((x%1440)+1440)%1440;if(v!==t)pool.add(v)});
    const wr=shuffle([...pool]).slice(0,2);const opts=shuffle([t,...wr]);cur=t;play.innerHTML='';
    const cw=document.createElement('div');cw.innerHTML=clockBox(t,ap(t),true);play.append(cw.firstChild);
    const o=document.createElement('div');o.className='opts';opts.forEach(v=>{const b=mkbtn(d24(v),()=>{if(v===cur){streak++;score+=10+(streak>=3?5:0);info.textContent='Score: '+score;q()}else{streak=0;b.classList.add('shake');b.disabled=true;score=Math.max(0,score-2);info.textContent='Score: '+score}},'opt');o.append(b)});play.append(o)}
  function end(){clearInterval(iv);play.innerHTML='';if(score>R.race){R.race=score;ls('t4race',score)}info.textContent='Time! Score: '+score+(score>=R.race?' ★ best':'')+' · Best: '+R.race;queueSave();startB.hidden=false;startB.textContent='Play again'}
  const startB=mkbtn('Start',()=>{score=0;streak=0;left=45;startB.hidden=true;info.textContent='Score: 0';q();fill.style.width='100%';clearInterval(iv);iv=setInterval(()=>{left-=0.25;fill.style.width=Math.max(0,left/45*100)+'%';if(left<=0)end()},250)});
  area.append(info,bar,play,startB);body.append(area);
})();

/* Game 3: memory match */
(function(){
  const body=gcard('Memory Match','6 pairs','<b>How to play:</b> press <b>Start</b>. Turn over two cards. If a clock matches its 24-hour time, the pair stays. Find all 6 pairs with as few moves as you can.','طريقة اللعب: دوس Start. اقلب كارتين. لو الساعة والوقت بنظام 24 ساعة متطابقين، الكارتين بيفضلوا. دوّر على الـ 6 أزواج بأقل عدد محاولات.','🧠');
  const info=document.createElement('div');info.className='big';info.textContent='Best: '+(R.mem?R.mem+' moves':'–');
  const grid=document.createElement('div');grid.className='mem';
  let moves=0,open=[],lock=false,found=0;
  const startB=mkbtn('Start',deal);
  function deal(){
    startB.hidden=true;moves=0;open=[];found=0;lock=false;grid.innerHTML='';info.textContent='Moves: 0';
    const times=new Set();while(times.size<6)times.add(T(rnd(1,23),rnd(0,11)*5));
    const cards=shuffle([...times].flatMap(t=>[{t,k:'c'},{t,k:'d'}]));
    cards.forEach(c=>{const el=document.createElement('button');el.type='button';el.className='card';el.innerHTML='<span class="qm">?</span>';el.setAttribute('aria-label','Hidden card');
      el.onclick=()=>{if(lock||el.classList.contains('up')||el.classList.contains('gone'))return;
        el.classList.add('up');el.innerHTML=c.k==='c'?clockSVG(Math.floor(c.t/60),c.t%60,false)+'<span class="apl">'+ap(c.t)+'</span>':d24(c.t)+'<span class="apl">'+ap(c.t)+'</span>';
        open.push({el,c});if(open.length===2){moves++;info.textContent='Moves: '+moves;lock=true;const[a,b]=open;
          if(a.c.t===b.c.t&&a.c.k!==b.c.k){setTimeout(()=>{[a,b].forEach(x=>{x.el.classList.remove('up');x.el.classList.add('gone')});open=[];lock=false;found++;
            if(found===6){if(!R.mem||moves<R.mem){R.mem=moves;ls('t4mem',moves)}info.textContent='You did it in '+moves+' moves! Best: '+R.mem;queueSave();startB.hidden=false;startB.textContent='Play again'}},500)}
          else setTimeout(()=>{[a,b].forEach(x=>{x.el.classList.remove('up');x.el.innerHTML='<span class="qm">?</span>'});open=[];lock=false},900)}};
      grid.append(el)})}
  body.append(info,grid,startB);
})();

const MISS_OF={units:1,h24:1,clocks:2,elapsed:4,cal:4,tt:4,final:5};
SECTIONS.push({id:'final',title:'Unit 4 Challenge',sub:'10 mixed questions on everything in Unit 4. Two of them are hard (Think harder). Can you get all 10?'});
[1,5,6,9,11,12,14,15,18,19].forEach(i=>QS.push({sec:'final',gen:QS[i].gen,tag:QS[i].tag,src:i,fixed:false}));
/* ---------- engine ---------- */
const AR=["حوّل الدقايق لثواني: كل دقيقة = 60 ثانية.", "حوّل الدقايق لساعات ودقايق: كل ساعة = 60 دقيقة.", "حوّل بين وحدات الزمن: اليوم = 24 ساعة، الأسبوع = 7 أيام، السنة = 12 شهر.", "حوّل كل الأزمنة لدقايق الأول، وبعدين اختار الأقصر.", "اختار الوحدة المناسبة لقياس الزمن (ثواني، دقايق، ساعات أو أسابيع).", "حوّل الوقت من نظام 12 ساعة لنظام 24 ساعة. بعد الظهر (p.m.) ضيف 12 على الساعة، واكتب رقمين للساعة.", "حوّل الوقت من نظام 24 ساعة لنظام 12 ساعة، والشمس معناها صباح والقمر معناه مساء (بتتحدد لوحدها).", "إيه معنى الوقت ده؟ 00:00 = منتصف الليل، 12:00 = الظهر، وبعد الظهر بنزود 12.", "أفا غلطت في التحويل (ضافت 10 بدل 12). اكتب الوقت الصح بنظام 24 ساعة.", "اقرأ الساعة واكتب الوقت بنظام 24 ساعة. العقرب الصغير = الساعة، الكبير = الدقايق، وبص على a.m./p.m. المكتوبة.", "اقرأ الساعة بنظام 12 ساعة الأول، وبعدين لأنها p.m. ضيف 12 على الساعة.", "اختار الوقت الصح: العقرب الكبير على 3 = وربع (15 دقيقة)، وعلى 9 = إلا ربع (45 دقيقة).", "حرّك العقربين بإيدك: النقطة الدهبي للدقايق (العقرب الكبير)، والنقطة الخضرا (التيل) للساعة (العقرب الصغير). والشمس معناها صباح والقمر معناه مساء، وبتتحدد تلقائي.", "حرّك العقربين بإيدك لحد ما الساعة تعرض الوقت المطلوب (الدهبي للدقايق، التيل للساعة)، والشمس معناها صباح والقمر معناه مساء (بتتحدد لوحدها).", "after معناها بعد، before معناها قبل. اتحرك بعدد الدقايق المكتوب واكتب الوقت الجديد بنظام 24 ساعة.", "احسب الزمن اللي عدّى من الساعة الأولى للتانية: روح لأقرب ساعة كاملة، وبعدين ضيف الساعات والدقايق.", "احسب الزمن اللي عدّى من الساعة الأولى للتانية.", "احسب الزمن اللي عدّى من الساعة الأولى للتانية.", "الفيلم بيبدأ في وقت معين وبيستمر مدة معينة. اكتب وقت النهاية بنظام 24 ساعة.", "الرحلة بتعدّي منتصف الليل: احسب لحد 00:00 الأول، وبعدين كمّل لحد وقت الوصول.", "السنة الكبيسة فبراير فيها 29 يوم. اجمع أيام يناير وفبراير ومارس.", "اقرأ التقويم: لاقي أول يوم ثلاثاء وعدّ 7 أيام عشان التاني، وبص على آخر صف لآخر جمعة.", "احسب عدد الساعات بين وقت الذهاب ووقت الرجوع: الأيام الكاملة × 24 بعدين ضيف باقي الساعات.", "اقرأ الجدول: إيه الحصة اللي شغالة الساعة 10:15؟ دوّر على آخر وقت قبل 10:15.", "إيڤا لازم توصل قبل 14:15 وبتمشي 15 دقيقة بعد ما تنزل في Park. اختار آخر أتوبيس من Mill يوصّلها في الوقت.", "صفية بتمشي 15 دقيقة لمحطة A، وبعدين بتركب أول أتوبيس لسه موجود. اكتب وقت وصولها لمحطة B."];
const main=document.getElementById('main'),nav=document.getElementById('nav');
let solved=0;const secCount={},secDone={};
function updateScore(){
  const _t=(typeof CUR!=='undefined'&&CUR&&CUR.secs)?CUR.secs.reduce((a,k)=>a+secCount[k],0):QS.length,_d=(typeof CUR!=='undefined'&&CUR&&CUR.secs)?CUR.secs.reduce((a,k)=>a+secDone[k],0):solved;
  document.getElementById('score').textContent=(typeof CUR!=='undefined'&&CUR&&!CUR.secs)?'Games':'★ '+_d+' / '+_t;
  document.getElementById('barfill').style.width=(100*_d/Math.max(1,_t))+'%';
  SECTIONS.forEach(s=>{const a=document.getElementById('chip-'+s.id);if(a)a.classList.toggle('done',secDone[s.id]===secCount[s.id]);const c=document.getElementById('cnt-'+s.id);if(c)c.textContent=secDone[s.id]+' / '+secCount[s.id]});
  if(typeof MIS!=='undefined')MIS.forEach(m=>{let d=0,t=0;m.secs&&m.secs.forEach(k=>{d+=secDone[k];t+=secCount[k]});const sv=+ls('t4m'+m.n)||0;if(!CUR||CUR.n!==m.n)d=sv;const e=document.getElementById('st-'+m.n);if(e&&t)e.textContent=d+' / '+t+(d===t?' ★ complete':' questions')});
  MIS.forEach(m=>{if(!m.secs)return;let d=0;m.secs.forEach(k=>d+=secDone[k]);if(CUR&&CUR.n===m.n)ls('t4m'+m.n,d)});
  R.solved=solved;R.total=QS.length;queueSave();
  if(_t>0&&_d===_t)document.getElementById('win').classList.add('show');
}
SECTIONS.forEach(s=>{
  secCount[s.id]=QS.filter(q=>q.sec===s.id).length;secDone[s.id]=0;
  const a=document.createElement('a');a.href='#';a.id='chip-'+s.id;a.textContent=s.title;a.onclick=e=>{e.preventDefault();document.getElementById('sec-'+s.id).scrollIntoView({behavior:'smooth',block:'start'})};nav.appendChild(a);
  const sec=document.createElement('section');sec.id='sec-'+s.id;sec.innerHTML='<h2>'+esc(s.title)+' <small id="cnt-'+s.id+'"></small></h2><p class="sub">'+esc(s.sub)+'</p>';main.appendChild(sec);
});
let n=0;const MCOUNT={};
QS.forEach(def=>{
  n++;const sec=document.getElementById('sec-'+def.sec);
  const card=document.createElement('div');card.className='q';sec.appendChild(card);
  let inst,attempts=0,done=false;
  const build=()=>{
    inst=def.gen();attempts=0;
    card.innerHTML='<div class="qh"><div class="num">'+qnum+'</div><div class="prompt">'+(def.tag?'<span class="tag">Think harder</span>':'')+inst.prompt+'</div></div><div class="body"></div>';
    const pr=card.querySelector('.prompt');const ar=document.createElement('div');ar.className='ar';ar.lang='ar';ar.textContent=AR[def.src!=null?def.src:n-1]||'';if(ar.textContent)pr.appendChild(ar);
    const body=card.querySelector('.body');inst.render(body);
    const row=document.createElement('div');row.className='row';
    const chk=document.createElement('button');chk.type='button';chk.textContent='Check';
    const nw=document.createElement('button');nw.type='button';nw.className='ghost';nw.textContent='New numbers';nw.hidden=!!def.fixed;
    const sh=document.createElement('button');sh.type='button';sh.className='ghost';sh.textContent='Show answer';sh.hidden=true;
    const fb=document.createElement('div');fb.className='fb';fb.setAttribute('aria-live','polite');
    row.append(chk,nw,sh);body.append(row,fb);
    const lockAll=()=>{body.querySelectorAll('input').forEach(i=>i.disabled=true);if(inst.lock)inst.lock();chk.disabled=true;nw.hidden=true;sh.hidden=true};
    chk.onclick=()=>{
      if(done)return;
      const r=inst.check();
      if(r.ok){done=true;card.classList.add('ok');fb.className='fb good';fb.textContent='✓ Correct! '+(r.note||'');confetti();lockAll();solved++;secDone[def.sec]++;updateScore()}
      else{attempts++;fb.className='fb bad';fb.textContent='Not yet. '+(r.hint||'Try again.');if(attempts>=2)sh.hidden=false}
    };
    sh.onclick=()=>{fb.className='fb info';fb.textContent='Answer: '+inst.answer+''+(def.fixed?'':'. Press "New numbers" to try another one.');if(inst.c&&inst.c.reveal)inst.c.reveal()};
    nw.onclick=()=>{if(!done)build()};
    body.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')chk.click()}));
  };
  const qnum=(MCOUNT[MISS_OF[def.sec]]=(MCOUNT[MISS_OF[def.sec]]||0)+1);build();
});

/* ---------- Mission Map ---------- */
const MIS=[
 {n:1,id:'mission-1',title:'Time Units and the 24-hour Clock',tag:'SECONDS, MINUTES, HOURS · 24-HOUR CLOCK',ds:'Change units of time, then write times with a.m., p.m. and the 24-hour clock.',secs:['units','h24']},
 {n:2,id:'mission-2',title:'Clock Studio',tag:'READING AND SETTING CLOCKS',ds:'Read clocks, circle the right time, then drag the hands yourself.',secs:['clocks'],games:[0]},
 {n:3,id:'mission-3',title:'Speed and Memory',tag:'TWO GAMES',ds:'Race the clock for 45 seconds, then match clocks with their 24-hour times.',games:[1,2]},
 {n:4,id:'mission-4',title:'Elapsed Time, Calendars and Timetables',tag:'HOW MUCH TIME PASSES?',ds:'Work out how long things take, use calendars and read timetables.',secs:['elapsed','cal','tt']},
 {n:5,id:'mission-5',title:'Unit 4 Challenge',tag:'FINAL TEST: 10 MIXED QUESTIONS',ds:'Questions on everything in Unit 4, with 2 hard ones. Can you get all 10?',secs:['final'],final:true}];
const mapv=document.createElement('div');mapv.id='mapview';
mapv.innerHTML='<h2 style="font-family:var(--display);font-weight:700;font-size:30px;margin:24px 0 0">🗺️ Mission Map</h2><p style="color:var(--muted);margin:2px 0 0">Tap a mission to play. Do them in order. You can play each mission again.</p><div class="maplist">'+MIS.map(m=>'<a class="mc'+(m.final?' final':'')+'" href="mission-'+m.n+'.html"><span class="no">'+m.n+'</span><span class="em" aria-hidden="true">'+['⏱️','🕰️','🏎️','🗓️','🏆'][m.n-1]+'</span><span class="tx"><b>'+esc(m.title)+'</b><span class="tg">'+esc(m.tag)+'</span><span class="ds">'+esc(m.ds)+'</span><span class="st" id="st-'+m.n+'"></span></span><span class="go">PLAY</span></a>').join('')+'</div>';
nav.style.display='none';nav.before(mapv);document.getElementById('sec-games').hidden=true;
const GC=[...gamesEl.children];const missionEls=[];
MIS.forEach(m=>{const c=document.createElement('div');c.className='mission';c.id=m.id;
  c.innerHTML='<div class="mhead"><img alt="" src="logo.png"><span>Year 4 · Unit 4</span></div><a class="back" href="index.html">← Mission Map</a><h2 style="font-family:var(--display);font-weight:700;font-size:28px;margin:6px 0 0">'+m.n+'. '+esc(m.title)+'</h2>';
  (m.games||[]).forEach(g=>{const w=document.createElement('div');w.className='games';w.appendChild(GC[g]);c.appendChild(w)});
  (m.secs||[]).forEach(k=>c.appendChild(document.getElementById('sec-'+k)));
  main.appendChild(c);missionEls.push(c)});
const PAGE=document.body.dataset.page||'map';const CUR=MIS.find(x=>'m'+x.n===PAGE)||null;
mapv.classList.toggle('off',!!CUR);missionEls.forEach(c=>c.classList.toggle('on',!!CUR&&c.id===CUR.id));
if(CUR){document.title='ThinkUp Y4 Unit 4 · '+CUR.title;const hp=document.querySelector('header p');if(hp)hp.textContent='Mission '+CUR.n+': '+CUR.title}
updateScore();

/* ---------- db and teacher board (lights up when available) ---------- */
(async function(){
  try{
    const nv=document.getElementById('nav');const a=document.createElement('a');a.href='#';a.textContent='Games';a.onclick=e=>{e.preventDefault();document.getElementById('sec-games').scrollIntoView({behavior:'smooth'})};nv.prepend(a);
    const note=document.getElementById('savenote');
    const user=window.claude&&await window.claude.use('user'),db=window.claude&&await window.claude.use('db');
    if(user&&db){
      const id=await user.id();
      if(id){dbRef=db.collection('results').doc(String(id));note.hidden=false;note.textContent='Signed in: your score is saved for your teacher automatically. Do not forget to type your name above.';queueSave()}
      if(await user.canEdit()){
        const tb=document.getElementById('teacher');tb.hidden=false;const body=document.querySelector('#ttab tbody');
        db.collection('results').orderBy('updated','desc').onSnapshot(snap=>{body.innerHTML='';snap.docs.forEach(d=>{const x=d.data();const tr=document.createElement('tr');
          [x.name||'?',(x.solved||0)+' / '+(x.total||0),x.race||'–',x.mem||'–',(x.drag||0)+' / 5',x.updated?new Date(x.updated).toLocaleString():''].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});body.append(tr)});
          if(!snap.docs.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.textContent='No results yet.';tr.append(td);body.append(tr)}},()=>{})}
    }else{note.hidden=false;note.textContent='Type your name, play, then press "Copy my result" at the bottom and send it to your teacher.'}
  }catch(e){}
})();
showResult();
})();
