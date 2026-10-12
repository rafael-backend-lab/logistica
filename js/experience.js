/* Logística Inteligente 3.0 — camada de experiência.
   Carregado com defer depois do GSAP (opcional). Sem este arquivo, todo o conteúdo continua visível. */
(function(){
'use strict';
window.__xp=1;
var root=document.documentElement;
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var hasGsap=!!(window.gsap&&window.ScrollTrigger);
if(reduce)root.classList.remove('motion');
if(hasGsap)gsap.registerPlugin(ScrollTrigger);

function $$(s,c){return [].slice.call((c||document).querySelectorAll(s));}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}
function onView(el,cb,th,margin){
  if(!('IntersectionObserver' in window)){cb(true,{disconnect:function(){}});return null;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){cb(e.isIntersecting,io);});},{threshold:th||0,rootMargin:margin||'0px'});
  io.observe(el); return io;
}

/* ---------- títulos: palavras com máscara ---------- */
$$('[data-split]').forEach(function(el){
  var w=0, isH=/^H[1-6]$/.test(el.tagName);
  if(isH)el.setAttribute('aria-label',el.textContent.replace(/\s+/g,' ').trim());
  (function walk(node){
    [].slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){
        if(!n.nodeValue.trim())return;
        var f=document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function(part){
          if(!part)return;
          if(/^\s+$/.test(part)){f.appendChild(document.createTextNode(' '));return;}
          var m=document.createElement('span'); m.className='wm'; if(isH)m.setAttribute('aria-hidden','true');
          var i=document.createElement('span'); i.className='wi'; i.textContent=part; i.style.setProperty('--w',w++);
          m.appendChild(i); f.appendChild(m);
        });
        node.replaceChild(f,n);
      } else if(n.nodeType===1&&n.tagName!=='BR'){ walk(n); }
    });
  })(el);
});

/* ---------- entrada: um único observador para tudo ---------- */
var pending=$$('[data-r],[data-split],[data-line],.frame');
function reveal(el){ el.classList.add('in'); }
if('IntersectionObserver' in window&&!reduce){
  var rio=new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting){reveal(e.target);rio.unobserve(e.target);} });},{rootMargin:'0px 0px -8% 0px',threshold:0.01});
  pending.forEach(function(el){rio.observe(el);});
} else pending.forEach(reveal);

/* ---------- abertura ---------- */
var hero=document.getElementById('inicio'), heroImg=document.getElementById('heroImg');
if(hero)requestAnimationFrame(function(){
  hero.classList.add('is-live');
  $$('[data-r],[data-split]',hero).forEach(reveal);
  setTimeout(function(){hero.classList.add('settled');},2600);
});
var NW=864, NH=1536;
function anchor(fx,fy){
  var box=heroImg.getBoundingClientRect(), h=hero.getBoundingClientRect(), pos=getComputedStyle(heroImg).objectPosition.split(' ');
  var px=parseFloat(pos[0])/100, py=parseFloat(pos[1])/100, s=Math.max(box.width/NW,box.height/NH), w=NW*s, hh=NH*s;
  return {x:box.left-h.left+(box.width-w)*px+fx*w, y:box.top-h.top+(box.height-hh)*py+fy*hh};
}
var callouts=hero?$$('.callout',hero):[];
function placeHud(){
  if(!heroImg||!hero)return;
  var e=anchor(.445,.285), hw=hero.clientWidth, hh=hero.clientHeight;
  hero.style.setProperty('--ex',e.x.toFixed(1)+'px'); hero.style.setProperty('--ey',e.y.toFixed(1)+'px');
  callouts.forEach(function(c){
    var a=c.getAttribute('data-anchor').split(','), p=anchor(+a[0],+a[1]), room=hw-p.x-24, flip=room<260;
    c.style.setProperty('--cx',p.x.toFixed(1)+'px'); c.style.setProperty('--cy',p.y.toFixed(1)+'px');
    c.style.setProperty('--lw',(flip?40:clamp(room-230,24,90)).toFixed(0)+'px');
    c.classList.toggle('flip',flip);
    c.classList.toggle('off',p.y<110||p.y>hh-130||p.x<0||p.x>hw);
  });
}
placeHud();
if(hero&&fine&&!reduce){
  hero.addEventListener('pointermove',function(e){
    var r=hero.getBoundingClientRect();
    hero.style.setProperty('--hx',((e.clientX-r.left)/r.width-.5).toFixed(3));
    hero.style.setProperty('--hy',((e.clientY-r.top)/r.height-.5).toFixed(3));
  },{passive:true});
  hero.addEventListener('pointerleave',function(){hero.style.setProperty('--hx','0');hero.style.setProperty('--hy','0');});
}

/* ---------- molduras das cenas ---------- */
$$('.scene .frame-clip').forEach(function(c){
  var sc=c.closest('.scene'), g=sc&&sc.querySelector('.ghost'), num=g?g.textContent.trim():'';
  var t=document.createElement('span'); t.className='frame-tick tl'; t.setAttribute('aria-hidden','true'); t.textContent='CENA '+num;
  var b=document.createElement('span'); b.className='frame-tick br'; b.setAttribute('aria-hidden','true'); b.textContent='R / LOG';
  c.appendChild(t); c.appendChild(b);
});

/* ---------- menu ---------- */
var menuBtn=document.getElementById('menuBtn'), mnav=document.getElementById('mnav'), hdr=document.getElementById('hdr');
function setMenu(open){menuBtn.setAttribute('aria-expanded',String(open));mnav.hidden=!open;document.body.style.overflow=open?'hidden':'';}
if(menuBtn&&mnav){
  menuBtn.addEventListener('click',function(){setMenu(mnav.hidden);});
  $$('a',mnav).forEach(function(a){a.addEventListener('click',function(){setMenu(false);});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!mnav.hidden){setMenu(false);menuBtn.focus();}});
}
var nav=document.querySelector('.nav'), pill=nav&&nav.querySelector('.nav-pill'), navHover=false;
function movePill(a){
  if(!pill)return;
  if(!a||!a.offsetWidth){nav.classList.remove('has-pill');return;}
  pill.style.width=a.offsetWidth+'px'; pill.style.transform='translateX('+a.offsetLeft+'px)'; nav.classList.add('has-pill');
}
if(pill){
  $$('a',nav).forEach(function(a){a.addEventListener('pointerenter',function(){navHover=true;movePill(a);});});
  nav.addEventListener('pointerleave',function(){navHover=false;movePill(nav.querySelector('a[aria-current="true"]'));});
}

/* ---------- capítulos: progresso, luz ambiente, menu ativo, trilha final ---------- */
var chapLinks=$$('#chap a'), chapTrack=document.querySelector('.chap-track'), navLinks=nav?$$('a',nav):[];
var chapOf={inicio:'inicio',profissional:'profissional',desafio:'desafio','antes-depois':'desafio',drive:'desafio',laboratorio:'desafio',exemplos:'desafio',rotina:'rotina',prazos:'rotina',rkos:'rkos','rkos-na-pratica':'rkos',atlas:'atlas','atlas-na-pratica':'atlas',resultado:'resultado'};
var navOf={inicio:'#inicio',profissional:'#profissional',desafio:'#desafio',rotina:'#prazos',rkos:'#rkos',atlas:'#atlas',resultado:'#resultado'};
/* iluminação de cada capítulo: posição x, posição y (%) e intensidade */
var LIGHT={inicio:[72,22,1],profissional:[18,30,.6],desafio:[82,62,.55],rotina:[30,58,.65],rkos:[50,42,.8],atlas:[78,36,.9],resultado:[50,96,.85]};
var order=chapLinks.map(function(a){return a.getAttribute('data-chap');});
var secs=$$('main > section[id]'), starts={}, curChap=null;
var progress=document.getElementById('progress'), trail=document.querySelector('[data-trail]'), trailItems=trail?$$('li',trail):[];
trailItems.forEach(function(li,i){li.setAttribute('data-n','0'+(i+1));});
$$('.trail-svg path').forEach(function(p){p.setAttribute('pathLength','1');});
function measure(){
  starts={};
  secs.forEach(function(s){ var c=chapOf[s.id], top=s.getBoundingClientRect().top+window.scrollY; if(c&&(starts[c]===undefined||top<starts[c]))starts[c]=top; });
}
function spy(){
  var y=window.scrollY, vh=window.innerHeight, dh=document.documentElement.scrollHeight-vh, probe=y+vh*.4, idx=0;
  for(var i=0;i<order.length;i++){ if(starts[order[i]]!==undefined&&probe>=starts[order[i]])idx=i; }
  var chap=order[idx];
  if(progress)progress.style.setProperty('--pg',(dh>0?y/dh:0).toFixed(4));
  if(hdr)hdr.classList.toggle('scrolled',y>40);
  chapLinks.forEach(function(a,i){ if(i===idx)a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); a.classList.toggle('done',i<idx); });
  if(chapTrack&&order.length>1){
    var st=starts[chap]||0, en=idx<order.length-1?starts[order[idx+1]]:document.documentElement.scrollHeight-vh*.6;
    chapTrack.style.setProperty('--cp',clamp((idx+clamp((probe-st)/Math.max(1,en-st),0,1))/(order.length-1),0,1).toFixed(4));
  }
  if(chap!==curChap){
    curChap=chap;
    var L=LIGHT[chap]; if(L){root.style.setProperty('--lx',L[0]+'%');root.style.setProperty('--ly',L[1]+'%');root.style.setProperty('--li',String(L[2]));}
    navLinks.forEach(function(a){ if(a.getAttribute('href')===navOf[chap])a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); });
  }
  if(!navHover&&nav)movePill(nav.querySelector('a[aria-current="true"]'));
  if(hero&&!reduce)hero.style.setProperty('--out',clamp(y/(hero.offsetHeight*.85),0,1).toFixed(3));
  if(trail){
    var r=trail.getBoundingClientRect(), tp=reduce?1:clamp((vh*.85-r.top)/(vh*.6),0,1);
    trail.style.setProperty('--tp',tp.toFixed(3));
    trailItems.forEach(function(li,i){li.classList.toggle('on',tp>=i/(trailItems.length-1)-.001);});
  }
}
measure(); spy();
var spyTick=false;
window.addEventListener('scroll',function(){ if(!spyTick){spyTick=true;requestAnimationFrame(function(){spyTick=false;spy();});} },{passive:true});

/* ---------- profundidade na rolagem (GSAP) ---------- */
if(hasGsap&&!reduce){
  $$('.scene .frame-clip').forEach(function(c){
    var img=c.querySelector('img');
    gsap.fromTo(c,{yPercent:4},{yPercent:-4,ease:'none',scrollTrigger:{trigger:c,start:'top bottom',end:'bottom top',scrub:true}});
    if(img)gsap.fromTo(c.querySelectorAll('img,.rl-box'),{scale:1.16},{scale:1.04,ease:'none',scrollTrigger:{trigger:c,start:'top bottom',end:'bottom top',scrub:true}});
  });
  $$('.scene .ghost').forEach(function(g){
    gsap.fromTo(g,{yPercent:12},{yPercent:-12,ease:'none',scrollTrigger:{trigger:g.parentNode,start:'top bottom',end:'bottom top',scrub:true}});
  });
  $$('.feature-media img').forEach(function(img){
    gsap.fromTo(img,{yPercent:-4},{yPercent:4,ease:'none',scrollTrigger:{trigger:img.parentNode,start:'top bottom',end:'bottom top',scrub:true}});
  });
}

/* ---------- transformação manual → assistido ---------- */
$$('[data-xf]').forEach(function(xf){
  var field=xf.querySelector('.xf-field'), status=xf.querySelector('[data-xf-status]');
  var trackA=$$('.xf-track:not(.xf-track-b) span',xf), trackB=$$('.xf-track-b span',xf), tray=xf.querySelector('.xf-tray');
  var modeBtns=$$('[data-xf-mode]',xf), play=xf.querySelector('[data-xf-play]');
  var N=6, EXC=[1,4], docs=[], timers=[], mode='manual', autoDone=false;
  if(!field||!status)return;
  for(var i=0;i<N;i++){var d=document.createElement('span');d.className='xf-doc';field.appendChild(d);docs.push(d);}
  function T(fn,ms){timers.push(setTimeout(fn,ms));}
  function stop(){timers.forEach(clearTimeout);timers=[];}
  function place(m){
    var w=field.clientWidth, h=field.clientHeight, dw=62, dh=80;
    docs.forEach(function(d,i){
      var x,y;
      if(m==='manual'){
        var cols=w<440?3:6, gap=(w-cols*dw)/(cols+1), row=Math.floor(i/cols), col=i%cols, rows=Math.ceil(N/cols);
        x=gap+col*(dw+gap); y=(h-rows*dh-(rows-1)*24)/2+row*(dh+24);
      } else {
        var ex=EXC.indexOf(i);
        if(ex>=0){ x=w*.64+(w*.36-dw)/2+(ex?16:-16); y=h*.5-dh/2+(ex?24:-12); }
        else { var k=i-EXC.filter(function(e){return e<i;}).length; x=w*.29-dw/2+(k-1.5)*12; y=h*.5-dh/2+(k-1.5)*10; }
      }
      d.style.setProperty('--x',x.toFixed(1)+'px'); d.style.setProperty('--y',y.toFixed(1)+'px');
    });
  }
  function clearStates(){docs.forEach(function(d){d.className='xf-doc';});trackA.concat(trackB).forEach(function(s){s.classList.remove('on');});if(tray)tray.classList.remove('ok');}
  function setMode(m){
    mode=m; xf.setAttribute('data-mode',m);
    modeBtns.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-xf-mode')===m));});
  }
  var MSG_M='As mesmas quatro ações, repetidas para cada documento.', MSG_A='Exceções separadas para conferência humana. Demais resultados consolidados e verificáveis.';
  function finalState(m){
    clearStates(); setMode(m); place(m);
    if(m==='manual'){docs.forEach(function(d){d.classList.add('done');}); status.textContent=MSG_M;}
    else {docs.forEach(function(d,i){d.classList.add(EXC.indexOf(i)>=0?'flag':'done');}); trackB.forEach(function(s){s.classList.add('on');}); if(tray)tray.classList.add('ok'); status.textContent=MSG_A;}
  }
  function runManual(done){
    stop(); clearStates(); setMode('manual'); place('manual');
    var t=300, STEP=230;
    docs.forEach(function(d,i){
      T(function(){d.classList.add('act');status.textContent='Documento '+(i+1)+' de '+N+' · abrir, ler, conferir, registrar.';},t);
      trackA.forEach(function(s,k){ T(function(){trackA.forEach(function(o){o.classList.remove('on');});s.classList.add('on');},t+k*STEP); });
      t+=trackA.length*STEP;
      T(function(){d.classList.remove('act');d.classList.add('done');},t);
      t+=120;
    });
    T(function(){trackA.forEach(function(o){o.classList.remove('on');});status.textContent=MSG_M;},t+100);
    if(done)T(done,t+1500);
  }
  function runAssisted(){
    stop(); clearStates(); setMode('assisted');
    status.textContent='Documentos reunidos em um conjunto, com as regras definidas antes.';
    T(function(){place('assisted');},60);
    var t=1100;
    trackB.forEach(function(s,k){ T(function(){s.classList.add('on');},t+k*520); });
    T(function(){status.textContent='Leitura e atualização aplicadas ao conjunto inteiro.';},t+520);
    T(function(){docs.forEach(function(d,i){ if(EXC.indexOf(i)<0)d.classList.add('done'); });},t+1300);
    T(function(){EXC.forEach(function(i){docs[i].classList.add('flag');}); if(tray)tray.classList.add('ok'); status.textContent=MSG_A;},t+2200);
  }
  function run(m){ autoDone=true; if(reduce){finalState(m);return;} if(m==='manual')runManual(); else runAssisted(); }
  modeBtns.forEach(function(b){b.addEventListener('click',function(){run(b.getAttribute('data-xf-mode'));});});
  if(play)play.addEventListener('click',function(){run(mode);});
  finalState('manual');
  window.addEventListener('resize',debounce(function(){place(mode);},150),{passive:true});
  if(!reduce)onView(xf,function(v,io){ if(v&&!autoDone){autoDone=true; io.disconnect(); runManual(runAssisted);} },.35);
});

/* ---------- RKOS: fontes → organização → consulta → resposta ---------- */
$$('[data-kgraph]').forEach(function(kg){
  var stage=kg.querySelector('.kg-stage'), svg=kg.querySelector('.kg-wires'), docs=$$('.kg-doc',kg), core=kg.querySelector('.kg-core');
  var phases=$$('.kg-phases li',kg), qbtns=$$('.kg-qbtn',kg), ans=kg.querySelector('.kg-a'), ansText=kg.querySelector('[data-kg-answer]'), src=kg.querySelector('[data-kg-src]'), coreState=kg.querySelector('[data-kg-state]');
  if(!stage||!svg||!core||!ans)return;
  var Q=[
    {docs:[0,1],text:'O período de vigência aparece no contrato e a prorrogação no termo aditivo. A resposta indica o trecho de cada documento.',src:['CONTRATO · CLÁUSULA DE VIGÊNCIA','ADITIVO · PRORROGAÇÃO']},
    {docs:[3,0],text:'A designação está na portaria correspondente, relacionada ao contrato pelo número do processo.',src:['PORTARIA · DESIGNAÇÃO','CONTRATO · PROCESSO']},
    {docs:[4,2,0],text:'Fatura, planilha de controle e contrato aparecem lado a lado, com a origem de cada valor, para a equipe conferir.',src:['FATURA · VALOR','PLANILHA · REGISTRO','CONTRATO · PREÇO']}
  ];
  var NS='http://www.w3.org/2000/svg', paths={}, busy=false, organized=false, coreLabel=coreState?coreState.innerHTML:'';
  function rel(el){var r=el.getBoundingClientRect(), s=stage.getBoundingClientRect();return {l:r.left-s.left,t:r.top-s.top,r:r.right-s.left,b:r.bottom-s.top,cx:r.left-s.left+r.width/2,cy:r.top-s.top+r.height/2};}
  function curve(p,q,h){
    if(h){var mx=(p.x+q.x)/2;return 'M'+p.x+','+p.y+' C'+mx+','+p.y+' '+mx+','+q.y+' '+q.x+','+q.y;}
    var my=(p.y+q.y)/2;return 'M'+p.x+','+p.y+' C'+p.x+','+my+' '+q.x+','+my+' '+q.x+','+q.y;
  }
  function add(id,d){var p=document.createElementNS(NS,'path');p.setAttribute('d',d);svg.appendChild(p);paths[id]=p;}
  function layout(){
    if(busy)return;
    while(svg.firstChild)svg.removeChild(svg.firstChild); paths={};
    var c=rel(core), a=rel(ans);
    docs.forEach(function(d,i){
      var r=rel(d);
      if(c.l>r.r+10)add('d'+i,curve({x:r.r,y:r.cy},{x:c.l+4,y:c.cy+(i-2)*10},true));
      else if(c.t>r.b)add('d'+i,curve({x:r.cx,y:r.b},{x:c.cx+(i-2)*12,y:c.t+4},false));
      else add('d'+i,curve({x:r.l,y:r.cy},{x:c.r-4,y:c.cy+(i-2)*10},true));
    });
    if(c.r<a.l)add('a',curve({x:c.r-4,y:c.cy},{x:a.l,y:a.cy},true));
    else add('a',curve({x:c.cx,y:c.b-4},{x:a.cx,y:a.t},false));
    svg.setAttribute('viewBox','0 0 '+stage.clientWidth+' '+stage.clientHeight);
    Object.keys(paths).forEach(function(k){
      var p=paths[k], L=p.getTotalLength(), shown=organized&&(k!=='a'||ans.classList.contains('show'));
      p._len=L; p.style.strokeDasharray=L; p.style.strokeDashoffset=(shown||reduce)?0:L;
      if(organized&&k!=='a')p.classList.add('lit');
    });
  }
  function packet(id,dur,cb){
    var p=paths[id]; if(!p||reduce){if(cb)cb();return;}
    var dot=document.createElementNS(NS,'circle'); dot.setAttribute('r','3.4'); svg.appendChild(dot);
    var L=p._len, t0=performance.now(); p.classList.add('hot');
    (function f(now){
      var k=clamp((now-t0)/dur,0,1), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, pt=p.getPointAtLength(e*L);
      dot.setAttribute('cx',pt.x.toFixed(1)); dot.setAttribute('cy',pt.y.toFixed(1));
      if(k<1)requestAnimationFrame(f); else {if(dot.parentNode)dot.parentNode.removeChild(dot);p.classList.remove('hot');if(cb)cb();}
    })(t0);
  }
  function phase(n){phases.forEach(function(li,i){li.classList.toggle('on',i<=n);});}
  function organize(cb){
    if(organized){if(cb)cb();return;}
    organized=true; phase(0);
    Object.keys(paths).filter(function(k){return k!=='a';}).forEach(function(k,i){var p=paths[k];p.style.transition='stroke-dashoffset 1.2s cubic-bezier(.65,0,.35,1) '+(i*0.09).toFixed(2)+'s';p.style.strokeDashoffset=0;});
    setTimeout(function(){phase(1); if(coreState)coreState.textContent='ORGANIZANDO';},500);
    docs.forEach(function(d,j){setTimeout(function(){d.classList.add('org'); if(paths['d'+j])paths['d'+j].classList.add('lit');},700+j*160);});
    setTimeout(function(){ if(coreState)coreState.innerHTML=coreLabel; if(cb)cb(); },700+docs.length*160+300);
  }
  function show(q){
    phase(3); core.classList.remove('pulse'); ans.classList.remove('busy'); ans.classList.add('show');
    ansText.textContent=q.text;
    while(src.firstChild)src.removeChild(src.firstChild);
    q.src.forEach(function(s){var sp=document.createElement('span');sp.textContent=s;src.appendChild(sp);});
  }
  function ask(qi){
    if(busy)return; var q=Q[qi]; if(!q)return; busy=true;
    qbtns.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===qi));});
    organize(function(){
      phase(2); kg.classList.add('asking'); ans.classList.remove('show'); ans.classList.add('busy');
      docs.forEach(function(d,i){d.classList.toggle('pick',q.docs.indexOf(i)>=0);});
      if(reduce){show(q);busy=false;return;}
      core.classList.add('pulse');
      var left=q.docs.length;
      q.docs.forEach(function(i,j){ setTimeout(function(){ packet('d'+i,800,function(){ if(--left===0){
        var pa=paths.a; if(pa){pa.style.transition='stroke-dashoffset .8s cubic-bezier(.65,0,.35,1)';pa.style.strokeDashoffset=0;}
        packet('a',850,function(){show(q);busy=false;});
      } }); },j*180); });
    });
  }
  qbtns.forEach(function(b){b.addEventListener('click',function(){ask(+b.getAttribute('data-q'));});});
  if(reduce){organized=true;docs.forEach(function(d){d.classList.add('org');});phase(1);}
  layout();
  onView(kg,function(v,io){ if(v){ io.disconnect(); layout(); organize(function(){ setTimeout(function(){ask(0);},reduce?0:400); }); } },.3);
  kg._layout=layout;
});

/* ---------- ATLAS: cinco etapas ---------- */
$$('[data-pipeline]').forEach(function(pl){
  var btns=$$('[data-step]',pl), badge=pl.querySelector('[data-badge]'), cap=pl.querySelector('[data-caption]');
  var cnt=pl.querySelector('[data-pl-count]'), ttl=pl.querySelector('[data-pl-title]'), prev=pl.querySelector('[data-pl-prev]'), next=pl.querySelector('[data-pl-next]'), dots=$$('.pl-dots i',pl), doc=pl.querySelector('.pl-doc');
  var TITLES=['DOCUMENTO','ANÁLISE','PENDÊNCIAS','RECOMENDAÇÃO','VALIDAÇÃO HUMANA'];
  var BADGES=['RECEBIDO','EM ANÁLISE','2 PENDÊNCIAS','RECOMENDAÇÃO PRONTA','VALIDADO'];
  var CAPS=[
    'O ATLAS recebe o documento autorizado e a orientação do setor sobre o que conferir.',
    'A leitura organiza os campos principais: objeto, fornecedor, vigência, valor, aditivos e fiscalização.',
    'Divergências e documentos não localizados são sinalizados, sem concluir além do que os documentos mostram.',
    'A recomendação indica o próximo passo e as fontes que sustentam cada ponto.',
    'A pessoa responsável confere as fontes e decide. O ATLAS não decide pela equipe.'
  ];
  $$('.pl-row',pl).forEach(function(r,i){r.style.setProperty('--i',i);});
  var cur=-1, st=null;
  function set(i){
    i=clamp(i,0,4); if(i===cur)return; cur=i;
    pl.setAttribute('data-stage',String(i));
    for(var k=1;k<=4;k++)pl.classList.toggle('s'+k,i>=k);
    btns.forEach(function(b,j){b.setAttribute('aria-pressed',String(j===i));b.classList.toggle('past',j<i);});
    dots.forEach(function(d,j){d.classList.toggle('on',j===i);});
    if(badge)badge.textContent=BADGES[i];
    if(cap)cap.textContent=CAPS[i];
    if(cnt)cnt.textContent='0'+(i+1)+' / 05';
    if(ttl)ttl.textContent=TITLES[i];
    if(prev)prev.disabled=i===0;
    if(next)next.disabled=i===4;
  }
  function go(i){
    i=clamp(i,0,4);
    if(st){ window.scrollTo({top:st.start+(i+.5)/5*(st.end-st.start),behavior:reduce?'auto':'smooth'}); return; }
    set(i);
  }
  btns.forEach(function(b,j){b.addEventListener('click',function(){go(j);});});
  if(prev)prev.addEventListener('click',function(){go(cur-1);});
  if(next)next.addEventListener('click',function(){go(cur+1);});
  if(doc){
    var sx=0, sy=0, tracking=false;
    doc.addEventListener('pointerdown',function(e){tracking=true;sx=e.clientX;sy=e.clientY;},{passive:true});
    doc.addEventListener('pointerup',function(e){
      if(!tracking)return; tracking=false;
      var dx=e.clientX-sx, dy=e.clientY-sy;
      if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4)go(cur+(dx<0?1:-1));
    },{passive:true});
    doc.addEventListener('pointercancel',function(){tracking=false;},{passive:true});
  }
  set(0);
  if(reduce)pl.classList.add('in');
  else onView(pl,function(v,io){ if(v){pl.classList.add('in');io.disconnect();} },.2);
  var canPin=hasGsap&&!reduce&&window.matchMedia('(min-width: 1024px) and (min-height: 760px)').matches;
  if(canPin&&pl.offsetHeight<window.innerHeight-(Number(getComputedStyle(root).getPropertyValue('--hdr').replace('px',''))||72)-60){
    st=ScrollTrigger.create({trigger:pl,start:'center 54%',end:'+=2600',pin:true,anticipatePin:1,
      snap:{snapTo:[.1,.3,.5,.7,.9],duration:{min:.25,max:.6},delay:.12,ease:'power2.inOut'},
      onUpdate:function(s){set(Math.min(4,Math.floor(s.progress*5)));}});
  }
});

/* ---------- recálculo quando a altura muda (fontes, imagens) ---------- */
var refreshAll=debounce(function(){ if(hasGsap)ScrollTrigger.refresh(); measure(); spy(); placeHud(); $$('[data-kgraph]').forEach(function(k){if(k._layout)k._layout();}); },200);
window.addEventListener('resize',refreshAll,{passive:true});
window.addEventListener('load',refreshAll);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshAll);
if('ResizeObserver' in window){ var lastH=0; new ResizeObserver(function(){ var h=document.body.scrollHeight; if(Math.abs(h-lastH)>2){lastH=h;refreshAll();} }).observe(document.body); }
})();
