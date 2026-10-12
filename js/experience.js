/* Camada de experiência: abertura, capítulos, simulação, RKOS e ATLAS.
   Carregado com defer depois do GSAP (opcional): tudo funciona sem ele, só sem o scroll pinado. */
(function(){
'use strict';
var root=document.documentElement;
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var hasGsap=!!(window.gsap&&window.ScrollTrigger);
if(hasGsap)gsap.registerPlugin(ScrollTrigger);
function $$(s,c){return [].slice.call((c||document).querySelectorAll(s));}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}
function onView(el,cb,th){
  if(!('IntersectionObserver' in window)){cb(true);return;}
  new IntersectionObserver(function(es){es.forEach(function(e){cb(e.isIntersecting);});},{threshold:th||0.25}).observe(el);
}

/* ---------- abertura ---------- */
var hero=document.getElementById('inicio'), title=document.getElementById('heroTitle'), heroImg=document.getElementById('heroImg');
if(title){
  var ci=0;
  $$('.word',title).forEach(function(w){
    var t=w.textContent; w.textContent=''; w.setAttribute('aria-hidden','true');
    for(var k=0;k<t.length;k++){var s=document.createElement('span');s.className='ch';s.textContent=t.charAt(k);s.style.setProperty('--i',ci++);w.appendChild(s);}
  });
}
function whenIntroDone(cb){
  if(!root.classList.contains('is-intro')){cb();return;}
  var mo=new MutationObserver(function(){ if(!root.classList.contains('is-intro')){mo.disconnect();cb();} });
  mo.observe(root,{attributes:true,attributeFilter:['class']});
}
if(hero)whenIntroDone(function(){ requestAnimationFrame(function(){ hero.classList.add('is-live'); setTimeout(function(){hero.classList.add('settled');},2600); }); });

/* pontos da imagem do robô (object-fit: cover) convertidos para coordenadas da seção */
var NW=864, NH=1536;
function anchor(fx,fy){
  var box=heroImg.getBoundingClientRect(), h=hero.getBoundingClientRect(), pos=getComputedStyle(heroImg).objectPosition.split(' ');
  var px=parseFloat(pos[0])/100, py=parseFloat(pos[1])/100, s=Math.max(box.width/NW,box.height/NH), w=NW*s, hh=NH*s;
  return {x:box.left-h.left+(box.width-w)*px+fx*w, y:box.top-h.top+(box.height-hh)*py+fy*hh};
}
var callouts=$$('#callouts .callout');
function placeHud(){
  if(!heroImg||!hero)return;
  var e=anchor(.445,.285), hw=hero.clientWidth;
  hero.style.setProperty('--ex',e.x.toFixed(1)+'px'); hero.style.setProperty('--ey',e.y.toFixed(1)+'px');
  callouts.forEach(function(c){
    var a=c.getAttribute('data-anchor').split(','), p=anchor(+a[0],+a[1]);
    var hh=hero.clientHeight, room=hw-p.x-24, flip=room<260;
    c.style.setProperty('--cx',p.x.toFixed(1)+'px'); c.style.setProperty('--cy',p.y.toFixed(1)+'px');
    c.style.setProperty('--lw',(flip?40:clamp(room-230,24,90)).toFixed(0)+'px');
    c.classList.toggle('flip',flip);
    c.classList.toggle('off',p.y<110||p.y>hh-130||p.x<0||p.x>hw);
  });
}
placeHud();
window.addEventListener('resize',debounce(placeHud,120),{passive:true});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeHud);

if(hero&&fine&&!reduce){
  hero.addEventListener('pointermove',function(e){
    var r=hero.getBoundingClientRect();
    hero.style.setProperty('--hx',((e.clientX-r.left)/r.width-.5).toFixed(3));
    hero.style.setProperty('--hy',((e.clientY-r.top)/r.height-.5).toFixed(3));
  },{passive:true});
  hero.addEventListener('pointerleave',function(){hero.style.setProperty('--hx','0');hero.style.setProperty('--hy','0');});
}
var embers=document.getElementById('embers');
if(embers&&!reduce){
  var small=window.innerWidth<700, en=small?8:16;
  for(var j=0;j<en;j++){
    var d=document.createElement('i');
    d.style.cssText='--x:'+(small?5+Math.random()*90:36+Math.random()*60).toFixed(1)+'%;--s:'+(1.5+Math.random()*2.5).toFixed(1)+'px;--t:'+(9+Math.random()*9).toFixed(1)+'s;--d:-'+(Math.random()*14).toFixed(1)+'s;--o:'+(.3+Math.random()*.5).toFixed(2)+';--dx:'+((Math.random()-.5)*120).toFixed(0)+'px';
    embers.appendChild(d);
  }
}

/* ---------- menu: marcador deslizante ---------- */
var nav=document.querySelector('.nav'), pill=nav&&nav.querySelector('.nav-pill'), navHover=false;
function movePill(a){
  if(!pill)return;
  if(!a){nav.classList.remove('has-pill');return;}
  pill.style.width=a.offsetWidth+'px'; pill.style.transform='translateX('+a.offsetLeft+'px)'; nav.classList.add('has-pill');
}
if(pill){
  $$('a',nav).forEach(function(a){a.addEventListener('pointerenter',function(){navHover=true;movePill(a);});});
  nav.addEventListener('pointerleave',function(){navHover=false;movePill(nav.querySelector('a[aria-current="true"]'));});
}

/* ---------- capítulos e saída da abertura ---------- */
var chapLinks=$$('#chap a'), chapTrack=document.querySelector('.chap-track');
var chapOf={inicio:'inicio',profissional:'profissional',desafio:'desafio','antes-depois':'desafio',drive:'drive',exemplos:'drive',rotina:'drive',rkos:'rkos','rkos-na-pratica':'rkos',atlas:'atlas','atlas-na-pratica':'atlas',valor:'resultado',resultado:'resultado',demonstracao:'resultado',proposta:'resultado'};
var order=chapLinks.map(function(a){return a.getAttribute('data-chap');});
var secs=$$('main > section[id]'), starts={};
function measure(){
  starts={};
  secs.forEach(function(s){ var c=chapOf[s.id], top=s.getBoundingClientRect().top+window.scrollY; if(c&&(starts[c]===undefined||top<starts[c]))starts[c]=top; });
}
function spy(){
  var y=window.scrollY, vh=window.innerHeight, probe=y+vh*.4, idx=0;
  for(var i=0;i<order.length;i++){ if(starts[order[i]]!==undefined&&probe>=starts[order[i]])idx=i; }
  chapLinks.forEach(function(a,i){ if(i===idx)a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); a.classList.toggle('done',i<idx); });
  if(chapTrack&&order.length>1){
    var st=starts[order[idx]]||0, en=idx<order.length-1?starts[order[idx+1]]:document.documentElement.scrollHeight-vh*.6;
    var lp=clamp((probe-st)/Math.max(1,en-st),0,1);
    chapTrack.style.setProperty('--cp',clamp((idx+lp)/(order.length-1),0,1).toFixed(4));
  }
  if(!navHover&&nav)movePill(nav.querySelector('a[aria-current="true"]'));
  if(hero&&!reduce)hero.style.setProperty('--out',clamp(y/(hero.offsetHeight*.85),0,1).toFixed(3));
}
measure(); spy();
var spyTick=false;
window.addEventListener('scroll',function(){ if(!spyTick){spyTick=true;requestAnimationFrame(function(){spyTick=false;spy();});} },{passive:true});
window.addEventListener('resize',debounce(function(){measure();spy();},150),{passive:true});
window.addEventListener('load',function(){ if(hasGsap)ScrollTrigger.refresh(); measure(); spy(); placeHud(); });

/* ---------- cenas: marcação das molduras e profundidade na rolagem ---------- */
$$('.scene .frame-clip').forEach(function(c){
  var sc=c.closest('.scene'), g=sc&&sc.querySelector('[data-ghost]'), num=g?g.textContent.trim():'';
  var h=document.createElement('span'); h.className='frame-hud'; h.setAttribute('aria-hidden','true');
  var t=document.createElement('span'); t.className='frame-tick tl'; t.setAttribute('aria-hidden','true'); t.textContent='CENA '+num;
  var b=document.createElement('span'); b.className='frame-tick br'; b.setAttribute('aria-hidden','true'); b.textContent='R / LOG';
  c.appendChild(h); c.appendChild(t); c.appendChild(b);
});
if(hasGsap&&!reduce){
  $$('.scene:not(.hero) .frame-clip').forEach(function(c){
    gsap.fromTo(c,{yPercent:5},{yPercent:-5,ease:'none',scrollTrigger:{trigger:c,start:'top bottom',end:'bottom top',scrub:true}});
  });
  $$('.scene:not(.hero) .title').forEach(function(t){
    gsap.fromTo(t,{x:-16},{x:12,ease:'none',scrollTrigger:{trigger:t,start:'top bottom',end:'bottom top',scrub:true}});
  });
}

/* ---------- simulação manual × assistido ---------- */
$$('[data-sim]').forEach(function(sim){
  var N=24, lanes={}, timers=[], running=false, visible=false, FLAGS=[5,14,19];
  $$('[data-lane]',sim).forEach(function(l){
    var g=l.querySelector('[data-grid]'), arr=[];
    for(var i=0;i<N;i++){var c=document.createElement('span');c.className='c';g.appendChild(c);arr.push(c);}
    lanes[l.getAttribute('data-lane')]={grid:g,cells:arr,state:l.querySelector('[data-state]'),sweep:g.querySelector('.sim-sweep')};
  });
  var m=lanes.manual, a=lanes.assisted;
  if(!m||!a)return;
  function T(fn,ms){timers.push(setTimeout(fn,ms));}
  function clearAll(){timers.forEach(clearTimeout);timers=[];}
  function status(l,txt,cls){l.state.textContent=txt;l.state.className='sim-state'+(cls?' '+cls:'');}
  function cols(){return getComputedStyle(a.grid).gridTemplateColumns.split(' ').length||12;}
  function reset(){clearAll();[m,a].forEach(function(l){l.cells.forEach(function(c){c.className='c';});status(l,'Aguardando');});if(a.sweep)a.sweep.classList.remove('go');}
  function finalState(){
    m.cells.forEach(function(c,i){c.className='c'+(i<9?' done':'');}); status(m,'Em andamento · um por vez','busy');
    a.cells.forEach(function(c,i){c.className='c done'+(FLAGS.indexOf(i)>=0?' flag':'');}); status(a,'Pronto · exceções para revisão humana','ok');
  }
  function run(){
    reset(); running=true;
    var step=330, nc=cols();
    status(m,'Em andamento · um por vez','busy'); status(a,'Aplicando regras ao conjunto','busy');
    m.cells.forEach(function(c,i){
      T(function(){c.classList.add('open');},400+i*step);
      T(function(){c.classList.remove('open');c.classList.add('done');},400+i*step+step*.8);
    });
    T(function(){ if(a.sweep){a.sweep.classList.remove('go');void a.sweep.offsetWidth;a.sweep.classList.add('go');} },700);
    a.cells.forEach(function(c,i){ T(function(){c.classList.add('done');},760+((i%nc)/Math.max(1,nc-1))*1250); });
    T(function(){ FLAGS.forEach(function(i){a.cells[i].classList.add('flag');}); status(a,'Pronto · exceções para revisão humana','ok'); },2300);
    var end=400+N*step+step;
    T(function(){status(m,'Concluído','ok');},end);
    T(function(){running=false; if(visible)run();},end+3400);
  }
  if(reduce)finalState();
  else onView(sim,function(v){ visible=v; if(v&&!running)run(); if(!v&&running){clearAll();running=false;} },.35);
  var rb=sim.querySelector('[data-sim-replay]');
  if(rb)rb.addEventListener('click',function(){ if(reduce){finalState();return;} run(); });
});

/* ---------- RKOS: mapa de conhecimento ---------- */
$$('[data-kgraph]').forEach(function(kg){
  var stage=kg.querySelector('.kg-stage'), svg=kg.querySelector('.kg-wires'), docs=$$('.kg-doc',kg), core=kg.querySelector('.kg-core');
  var q=kg.querySelector('.kg-q'), ans=kg.querySelector('.kg-a'), qText=kg.querySelector('[data-kg-q]'), runBtn=kg.querySelector('[data-kg-run]');
  if(!stage||!svg||!core||!docs.length)return;
  var NS='http://www.w3.org/2000/svg', paths={}, drawn=false, busy=false, visible=false, ambT=null, question=qText.textContent;
  function rel(el){var r=el.getBoundingClientRect(), s=stage.getBoundingClientRect();return {l:r.left-s.left,t:r.top-s.top,r:r.right-s.left,b:r.bottom-s.top,cx:r.left-s.left+r.width/2,cy:r.top-s.top+r.height/2};}
  function curve(p,p2,h){
    if(h){var mx=(p.x+p2.x)/2;return 'M'+p.x+','+p.y+' C'+mx+','+p.y+' '+mx+','+p2.y+' '+p2.x+','+p2.y;}
    var my=(p.y+p2.y)/2;return 'M'+p.x+','+p.y+' C'+p.x+','+my+' '+p2.x+','+my+' '+p2.x+','+p2.y;
  }
  function add(id,d){var p=document.createElementNS(NS,'path');p.setAttribute('d',d);svg.appendChild(p);paths[id]=p;}
  function layout(){
    if(busy)return;
    while(svg.firstChild)svg.removeChild(svg.firstChild); paths={};
    var c=rel(core), h=c.l>rel(docs[0]).r+10;
    docs.forEach(function(d,i){
      var r=rel(d);
      add('d'+i, h?curve({x:r.r,y:r.cy},{x:c.l+4,y:c.cy+(i-2)*12},true):curve({x:r.cx,y:r.b},{x:c.cx+(i-2)*14,y:c.t+4},false));
    });
    var qr=rel(q), ar=rel(ans);
    if(h){ add('q',curve({x:c.r-4,y:c.cy-12},{x:qr.l,y:qr.cy},true)); add('a',curve({x:c.r-4,y:c.cy+12},{x:ar.l,y:ar.cy},true)); }
    else { add('q',curve({x:c.cx-12,y:c.b-4},{x:qr.cx,y:qr.t},false)); add('a',curve({x:c.cx+12,y:c.b-4},{x:ar.r-30,y:ar.t},false)); }
    svg.setAttribute('viewBox','0 0 '+stage.clientWidth+' '+stage.clientHeight);
    Object.keys(paths).forEach(function(k){var p=paths[k],L=p.getTotalLength();p._len=L;p.style.strokeDasharray=L;p.style.strokeDashoffset=(drawn||reduce)?0:L;});
  }
  function draw(){
    if(drawn)return; drawn=true;
    Object.keys(paths).forEach(function(k,i){var p=paths[k];p.style.transition='stroke-dashoffset 1.4s cubic-bezier(.6,0,.2,1) '+(i*0.1).toFixed(2)+'s';p.style.strokeDashoffset=0;});
    docs.forEach(function(d,j){setTimeout(function(){d.classList.add('lit');},300+j*140);});
  }
  function packet(id,rev,dur,cb){
    var p=paths[id]; if(!p){if(cb)cb();return;}
    var dot=document.createElementNS(NS,'circle'); dot.setAttribute('r','3.6'); svg.appendChild(dot);
    var L=p._len, t0=performance.now(); p.classList.add('hot');
    (function f(now){
      var k=clamp((now-t0)/dur,0,1), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, pt=p.getPointAtLength((rev?1-e:e)*L);
      dot.setAttribute('cx',pt.x.toFixed(1)); dot.setAttribute('cy',pt.y.toFixed(1));
      if(k<1)requestAnimationFrame(f); else {if(dot.parentNode)dot.parentNode.removeChild(dot);p.classList.remove('hot');if(cb)cb();}
    })(t0);
  }
  function typeText(el,txt,cb){var i=0;el.textContent='';(function t(){i+=2;el.textContent=txt.slice(0,i);if(i<txt.length)setTimeout(t,24);else{el.textContent=txt;if(cb)cb();}})();}
  function query(){
    if(busy)return; busy=true;
    ans.classList.remove('show'); docs.forEach(function(d){d.classList.remove('pick');}); core.classList.remove('pulse');
    typeText(qText,question,function(){
      packet('q',true,850,function(){
        core.classList.add('pulse');
        var picks=[0,1], left=picks.length;
        picks.forEach(function(i,j){
          docs[i].classList.add('pick');
          setTimeout(function(){ packet('d'+i,false,850,function(){ if(--left===0){ packet('a',false,850,function(){ans.classList.add('show');core.classList.remove('pulse');busy=false;}); } }); },j*200);
        });
      });
    });
  }
  function ambient(){
    clearTimeout(ambT); if(!visible||reduce)return;
    if(!busy&&drawn)packet('d'+((Math.random()*docs.length)|0),false,1100);
    ambT=setTimeout(ambient,1600);
  }
  layout();
  if(reduce){ans.classList.add('show');docs.forEach(function(d){d.classList.add('lit');});}
  onView(kg,function(v){
    visible=v;
    if(v){ layout(); draw(); if(!kg._auto&&!reduce){kg._auto=1;setTimeout(query,1500);} ambient(); }
    else clearTimeout(ambT);
  },.3);
  if(runBtn)runBtn.addEventListener('click',function(){ if(reduce){ans.classList.add('show');return;} query(); });
  window.addEventListener('resize',debounce(layout,150),{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
});

/* ---------- ATLAS: fluxo em cinco etapas ---------- */
$$('[data-pipeline]').forEach(function(pl){
  var btns=$$('[data-step]',pl), badge=pl.querySelector('[data-badge]'), cap=pl.querySelector('[data-caption]');
  var BADGES=['RECEBIDO','EM ANÁLISE','2 PENDÊNCIAS','RECOMENDAÇÃO PRONTA','VALIDADO'];
  var CAPS=[
    'O ATLAS recebe o documento autorizado e a orientação do setor sobre o que conferir.',
    'A leitura organiza os campos principais: objeto, fornecedor, vigência, valor, aditivos e fiscalização.',
    'Divergências e documentos não localizados são sinalizados, sem concluir além do que os documentos mostram.',
    'A recomendação indica o próximo passo e as fontes que sustentam cada ponto.',
    'A pessoa responsável confere as fontes e decide. O ATLAS não decide pela equipe.'
  ];
  var cur=-1, auto=null, st=null, DUR=3400;
  function set(i){
    i=clamp(i,0,4); if(i===cur)return; cur=i;
    pl.setAttribute('data-stage',String(i));
    for(var k=1;k<=4;k++)pl.classList.toggle('s'+k,i>=k);
    btns.forEach(function(b,j){b.setAttribute('aria-pressed',String(j===i));b.classList.toggle('past',j<i);});
    var list=btns[i]&&btns[i].closest('.pl-steps');
    if(list&&list.scrollWidth>list.clientWidth+4){ var li=btns[i].parentNode; list.scrollTo({left:Math.max(0,li.offsetLeft-list.offsetLeft-12),behavior:reduce?'auto':'smooth'}); }
    if(badge)badge.textContent=BADGES[i];
    if(cap)cap.textContent=CAPS[i];
  }
  function stopAuto(){clearInterval(auto);auto=null;pl.classList.remove('auto');}
  function startAuto(){
    if(reduce||st||auto)return;
    pl.style.setProperty('--plt',DUR+'ms'); pl.classList.add('auto');
    auto=setInterval(function(){set((cur+1)%5);},DUR);
  }
  btns.forEach(function(b,j){
    b.addEventListener('click',function(){
      if(st){ window.scrollTo({top:st.start+(j+.5)/5*(st.end-st.start),behavior:reduce?'auto':'smooth'}); return; }
      stopAuto(); set(j);
    });
  });
  var canPin=hasGsap&&!reduce&&window.matchMedia('(min-width: 1024px) and (min-height: 760px)').matches&&pl.offsetHeight<window.innerHeight-60;
  if(canPin){
    set(0);
    st=ScrollTrigger.create({trigger:pl,start:'center center',end:'+=1500',pin:true,anticipatePin:1,
      onUpdate:function(s){set(Math.min(4,Math.floor(s.progress*5)));}});
  } else {
    if(reduce)set(0);
    onView(pl,function(v){ if(v){ if(cur<0)set(0); startAuto(); } else stopAuto(); },.4);
  }
});

/* a altura da página muda quando as fontes e imagens chegam: recalcula pinos, capítulos e âncoras */
var refreshAll=debounce(function(){ if(hasGsap)ScrollTrigger.refresh(); measure(); spy(); placeHud(); },180);
if('ResizeObserver' in window){ var lastH=0; new ResizeObserver(function(){ var h=document.body.scrollHeight; if(Math.abs(h-lastH)>2){lastH=h;refreshAll();} }).observe(document.body); }
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshAll);
if(hasGsap)ScrollTrigger.refresh();
})();
