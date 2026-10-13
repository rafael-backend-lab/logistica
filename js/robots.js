/* ==========================================================================
   Robôs vivos · camadas SVG de luz posicionadas nas coordenadas da imagem.
   Olhos que processam, leitura óptica de documentos, conexões e reação ao
   visitante e às demonstrações. Pausa fora da tela; respeita reduced motion.
   ========================================================================== */
(function(){
'use strict';

var NS='http://www.w3.org/2000/svg';
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var uid=0;

function el(tag,a,p){var e=document.createElementNS(NS,tag);if(a)for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
function lerp(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
function pts(a){return a.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}
/* ponto (u,v) dentro de um quadrilátero [TL,TR,BR,BL] */
function quadPt(q,u,v){return lerp(lerp(q[0],q[1],u),lerp(q[3],q[2],u),v);}
function smooth(p){
  var d='M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1);
  for(var i=0;i<p.length-1;i++){
    var p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2;
    d+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+','+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+' '+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+','+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
function radial(defs,id,stops){var g=el('radialGradient',{id:id},defs);stops.forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1],'stop-opacity':s[2]},g);});return g;}
function linear(defs,id,stops){var g=el('linearGradient',{id:id,gradientUnits:'userSpaceOnUse'},defs);stops.forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1],'stop-opacity':s[2]},g);});return g;}
function setLine(g,a,b){g.setAttribute('x1',a[0]);g.setAttribute('y1',a[1]);g.setAttribute('x2',b[0]);g.setAttribute('y2',b[1]);}
function restart(e,cls){e.classList.remove(cls);void e.getBoundingClientRect();e.classList.add(cls);}

/* Coordenadas em frações da imagem original (conferidas sobre grade). R = raio do núcleo do olho / largura. */
var ROBOTS=[
  {key:'hero',sel:'#heroImg',fit:'cover',eye:[.451,.284],R:.016,lens:false,gaze:true,zone:'#inicio',
   lights:[[.81,.42,.011],[.758,.531,.01],[.72,.287,.007]]},
  {key:'desafio',sel:'#desafio .scene-robot img',eye:[.381,.31],R:.011,demo:'compare',
   panel:{q:[[.012,.49],[.333,.447],[.437,.805],[.096,.803]],dots:[[.22,.2],[.62,.3],[.36,.48],[.7,.62],[.46,.8]]},
   touch:[[.372,.655]],lights:[[.6,.18,.012],[.82,.62,.012]]},
  {key:'lab',sel:'.lab-robot img',eye:[.478,.336],R:.011,demo:'lab',
   panel:{q:[[.69,.152],[.995,.028],[.942,.80],[.632,.672]],dots:[[.32,.15],[.66,.22],[.36,.42],[.72,.55],[.3,.76],[.74,.86]],links:true},
   touch:[[.828,.253],[.883,.58]],lights:[[.25,.237,.016],[.175,.561,.016],[.647,.364,.012]]},
  {key:'rotina',sel:'#rotina .scene-robot img',eye:[.375,.281],R:.013,
   panel:{q:[[.012,.444],[.397,.43],[.5,.83],[.19,.795]],dots:[[.3,.2],[.68,.34],[.4,.55],[.62,.74]]}},
  {key:'rkos',sel:'#rkos .frame-clip img',fit:'cover',eye:[.249,.237],R:.009,demo:'rkos',mode:'rkos',
   panels:[[[.573,.25],[.786,.253],[.766,.572],[.543,.572]],[[.838,.253],[.994,.247],[.994,.409],[.833,.411]],[[.815,.45],[.994,.442],[.994,.656],[.789,.65]]]},
  {key:'atlas',sel:'#atlas .frame-clip img',fit:'cover',eye:[.606,.287],R:.01,demo:'atlas',mode:'atlas',
   cards:[[[.056,.206],[.174,.206],[.174,.331],[.056,.331]],[[.056,.37],[.174,.37],[.174,.486],[.056,.486]],[[.045,.539],[.174,.539],[.174,.664],[.045,.664]]]},
  {key:'convite',sel:'.sig-robot img',eye:[.722,.219],R:.013,gaze:true,
   lights:[[.50,.117,.024],[.20,.389,.026],[.10,.65,.022],[.313,.664,.018]],
   arm:[[.205,.40],[.15,.50],[.105,.62],[.20,.655],[.313,.664],[.42,.63],[.52,.585],[.613,.522]]}
];

var pointer={x:-1e4,y:-1e4,t:0};
var robots=[];

function Robot(c,img){
  var self=this, W=this.W=+img.getAttribute('width'), H=this.H=+img.getAttribute('height');
  this.c=c; this.img=img; this.r=c.R*W; this.busy=0; this.near=0; this.vis=false; this.clock=0;
  this.P=function(p){return [p[0]*W,p[1]*H];};
  var id=this.id='rl'+(++uid), r=this.r;
  var svg=this.svg=el('svg',{class:'rl rl-'+c.key,viewBox:'0 0 '+W+' '+H,preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});
  var defs=el('defs',null,svg);
  radial(defs,id+'g',[[0,'#ffd6a8',.95],[.18,'#ff9640',.55],[.55,'#ff7a1a',.14],[1,'#ff7a1a',0]]);
  radial(defs,id+'c',[[0,'#fff3e0',1],[.35,'#ffc07a',.9],[1,'#ff7a1a',0]]);
  this.beamG=linear(defs,id+'b',[[0,'#ffb067',.34],[1,'#ff7a1a',.03]]);
  this.bandG=linear(defs,id+'s',[[0,'#ff7a1a',0],[1,'#ffb067',.26]]);

  if(c.fit==='cover'){
    this.root=img.parentElement;
    var box=document.createElement('div'); box.className='rl-box';
    box.appendChild(svg); this.root.appendChild(box); this.cover=true;
  } else { this.root=img.parentElement; this.root.appendChild(svg); }

  /* camadas: varredura e feixe ficam abaixo do olho */
  this.scanG=el('g',{class:'rl-scan',opacity:0},svg);
  this.fx=el('g',null,svg);

  /* luzes de mecanismo */
  this.lights=(c.lights||[]).map(function(l,i){
    var p=self.P(l), m=el('circle',{class:'mech',cx:p[0],cy:p[1],r:l[2]*W*1.6,fill:'url(#'+id+'g)'},svg);
    m.style.animationDuration=(3.7+i*1.1).toFixed(1)+'s'; m.style.animationDelay=(-i*1.37-uid*.6).toFixed(2)+'s';
    var f=el('circle',{cx:p[0],cy:p[1],r:l[2]*W*3.2,fill:'url(#'+id+'g)',opacity:0},svg);
    return {p:p,flare:f,heat:0,at:-1};
  });

  /* olho */
  var E=this.E=this.P(c.eye);
  var eye=this.eye=el('g',{transform:'translate('+E[0].toFixed(1)+','+E[1].toFixed(1)+')'},svg);
  this.eyeScale=el('g',null,eye);
  var halo=el('circle',{class:'halo',r:r*4.4,fill:'url(#'+id+'g)'},this.eyeScale);
  halo.style.animationDelay=(-uid*.83).toFixed(2)+'s';
  if(c.lens!==false){
    var C1=2*Math.PI*r*2.3, C2=2*Math.PI*r*3.4;
    el('circle',{class:'lens',r:r*2.3,fill:'none',stroke:'#ffb067','stroke-width':(r*.14).toFixed(2),'stroke-dasharray':(C1/3*.56).toFixed(2)+' '+(C1/3*.44).toFixed(2),opacity:.5},eye);
    el('circle',{class:'lens2',r:r*3.4,fill:'none',stroke:'#ff7a1a','stroke-width':(r*.06).toFixed(2),'stroke-dasharray':(C2/24*.3).toFixed(2)+' '+(C2/24*.7).toFixed(2),opacity:.4},eye);
  }
  this.pupil=el('g',null,eye);
  var core=el('circle',{class:'core',r:r*1.05,fill:'url(#'+id+'c)'},this.pupil);
  core.style.animationDelay=(-uid*.47).toFixed(2)+'s';
  var fl=el('circle',{class:'flash',r:r*1.5,fill:'none',stroke:'#ffd2a1','stroke-width':(r*.16).toFixed(2)},eye);
  fl.style.animationDuration=(8.6+uid*1.3).toFixed(1)+'s'; fl.style.animationDelay=(-uid*2.1).toFixed(1)+'s';
  this.doneC=el('circle',{class:'done',r:r*2.2,fill:'none',stroke:'#ffd2a1','stroke-width':(r*.14).toFixed(2)},eye);

  /* toques na tela holográfica */
  (c.touch||[]).forEach(function(t,i){
    var p=self.P(t), rp=el('circle',{class:'ripple',cx:p[0],cy:p[1],r:r*2.2,fill:'none',stroke:'#ffd2a1','stroke-width':(r*.14).toFixed(2)},svg);
    rp.style.animationDelay=(-i*1.4).toFixed(1)+'s';
    el('circle',{cx:p[0],cy:p[1],r:r*1.2,fill:'url(#'+id+'g)',opacity:.85},svg);
  });

  if(c.panel)this.panel=this.buildPanel(c.panel.q,c.panel.dots,c.panel.links,true);
  if(c.mode==='rkos')this.buildRkos();
  if(c.mode==='atlas')this.buildAtlas();
  if(c.arm)this.buildArm();
  this.state={phase:'rest',t:0,time:-.6};
}

Robot.prototype.buildPanel=function(qf,dots,links,beam){
  var self=this, r=this.r, q=qf.map(this.P);
  var pn={q:q,beam:beam,dots:[],links:[],last:null};
  pn.edge=el('polygon',{points:pts(q),fill:'none',stroke:'#ffb067','stroke-width':(r*.16).toFixed(2),'stroke-linejoin':'round',opacity:0},this.fx);
  if(beam)pn.beamEl=el('polygon',{fill:'url(#'+this.id+'b)'},this.scanG);
  pn.band=el('polygon',{fill:'url(#'+this.id+'s)'},this.scanG);
  pn.line=el('polyline',{fill:'none',stroke:'#ffe0bd','stroke-width':(r*.16).toFixed(2),'stroke-linecap':'round',opacity:.85},this.scanG);
  if(links)for(var i=0;i<3;i++)pn.links.push({el:el('line',{stroke:'#ffb067','stroke-width':(r*.12).toFixed(2),'stroke-linecap':'round',opacity:0},this.fx),life:0});
  (dots||[]).forEach(function(d){
    var p=quadPt(q,d[0],d[1]);
    pn.dots.push({p:p,v:d[1],heat:0,hit:false,
      ring:el('circle',{cx:p[0],cy:p[1],r:r,fill:'none',stroke:'#ffd2a1','stroke-width':(r*.12).toFixed(2),opacity:0},self.fx),
      dot:el('circle',{cx:p[0],cy:p[1],r:r*.55,fill:'#ffe3c4',opacity:0},self.fx)});
  });
  return pn;
};

/* posiciona varredura (v em 0..1) e o feixe do olho até a linha lida */
Robot.prototype.scanPanel=function(pn,v){
  var q=pn.q, a=clamp(v-.085,0,1), b=clamp(v,0,1);
  var A0=quadPt(q,0,a),A1=quadPt(q,1,a),B0=quadPt(q,0,b),B1=quadPt(q,1,b);
  pn.band.setAttribute('points',pts([A0,A1,B1,B0]));
  setLine(this.bandG,lerp(A0,A1,.5),lerp(B0,B1,.5));
  pn.line.setAttribute('points',pts([quadPt(q,.015,b),quadPt(q,.985,b)]));
  if(pn.beamEl){var L=quadPt(q,.12,b),R=quadPt(q,.88,b);pn.beamEl.setAttribute('points',pts([this.E,L,R]));setLine(this.beamG,this.E,lerp(L,R,.5));}
  var self=this;
  pn.dots.forEach(function(d){
    if(!d.hit&&b>=d.v){d.hit=true;d.heat=1;
      if(pn.links.length&&pn.last){var k=pn.links.shift();k.life=1;k.el.setAttribute('x1',pn.last.p[0]);k.el.setAttribute('y1',pn.last.p[1]);k.el.setAttribute('x2',d.p[0]);k.el.setAttribute('y2',d.p[1]);pn.links.push(k);}
      pn.last=d;}
  });
};
Robot.prototype.resetPanel=function(pn){pn.dots.forEach(function(d){d.hit=false;});pn.last=null;};
Robot.prototype.decayPanel=function(pn,dt,edgeT){
  var r=this.r;
  pn.dots.forEach(function(d){
    d.heat=Math.max(0,d.heat-dt*.55);
    d.dot.setAttribute('opacity',(d.heat*.95).toFixed(3));
    d.ring.setAttribute('opacity',(d.heat*.7).toFixed(3));
    d.ring.setAttribute('r',(r*(.9+(1-d.heat)*2.2)).toFixed(2));
  });
  pn.links.forEach(function(k){k.life=Math.max(0,k.life-dt*.7);k.el.setAttribute('opacity',(k.life*.75).toFixed(3));});
  pn.edgeHeat=Math.max(edgeT||0,(pn.edgeHeat||0)-dt*.9);
  pn.edge.setAttribute('opacity',(pn.edgeHeat*.9).toFixed(3));
};

Robot.prototype.buildRkos=function(){
  var self=this;
  this.pans=this.c.panels.map(function(q){var pn=self.buildPanel(q,[[.3,.22],[.7,.4],[.4,.62],[.65,.82]],false,true);return pn;});
  this.links=this.pans.map(function(){return el('line',{stroke:'#ffb067','stroke-width':(self.r*.22).toFixed(2),'stroke-linecap':'round',opacity:0},self.fx);});
  this.sources=[0,2];
};
Robot.prototype.buildAtlas=function(){
  var self=this, r=this.r;
  this.cards=this.c.cards.map(function(qf){
    var pn=self.buildPanel(qf,[[.5,.35],[.5,.65]],false,false), q=pn.q;
    var cw=q[1][0]-q[0][0], cx=q[1][0]-cw*.02, cy=q[1][1]+cw*.02, mr=cw*.15;
    var m=el('g',{transform:'translate('+cx.toFixed(1)+','+cy.toFixed(1)+')',opacity:0},self.fx);
    var ring=el('circle',{r:mr,fill:'rgba(11,9,7,.82)','stroke-width':(mr*.16).toFixed(2)},m);
    var ok=el('path',{d:'M'+(-mr*.45)+','+0+' L'+(-mr*.1)+','+(mr*.35)+' L'+(mr*.5)+','+(-mr*.35),fill:'none',stroke:'#8fe3b5','stroke-width':(mr*.2).toFixed(2),'stroke-linecap':'round','stroke-linejoin':'round'},m);
    var ex=el('g',null,m); el('line',{x1:0,y1:-mr*.5,x2:0,y2:mr*.12,stroke:'#ffb067','stroke-width':(mr*.22).toFixed(2),'stroke-linecap':'round'},ex); el('circle',{cx:0,cy:mr*.45,r:mr*.12,fill:'#ffb067'},ex);
    pn.mark={g:m,ring:ring,ok:ok,ex:ex,on:false,o:0}; return pn;
  });
  this.flags=[0,1,0];
  this.link=el('line',{stroke:'#ffb067','stroke-width':(r*.2).toFixed(2),'stroke-linecap':'round','stroke-dasharray':(r*1.2)+' '+(r*1.4),opacity:0},this.fx);
};
Robot.prototype.buildArm=function(){
  var self=this, r=this.r, p=this.c.arm.map(this.P), d=smooth(p);
  this.armGlow=el('path',{d:d,fill:'none',stroke:'#ff7a1a','stroke-width':(r*2.6).toFixed(1),'stroke-linecap':'round',opacity:0},this.fx);
  this.armCore=el('path',{d:d,fill:'none',stroke:'#ffe0bd','stroke-width':(r*.7).toFixed(1),'stroke-linecap':'round',opacity:0},this.fx);
  var L=this.armL=this.armCore.getTotalLength()||1;
  this.lights.forEach(function(l){
    var best=0,bd=1e12;for(var i=0;i<=80;i++){var q=self.armCore.getPointAtLength(L*i/80),dd=(q.x-l.p[0])*(q.x-l.p[0])+(q.y-l.p[1])*(q.y-l.p[1]);if(dd<bd){bd=dd;best=i/80;}}
    l.at=bd<Math.pow(r*9,2)?best:-1;
  });
  var tip=p[p.length-1];
  this.tip=el('circle',{cx:tip[0],cy:tip[1],r:r*5,fill:'url(#'+this.id+'g)',opacity:0},this.fx);
  this.pulse=null; this.lastPulse=-1e9;
};
Robot.prototype.firePulse=function(now){if(this.pulse||now-this.lastPulse<2600)return;this.pulse={t:0};this.lastPulse=now;};

Robot.prototype.layout=function(){
  if(!this.cover)return;
  var img=this.img, bw=img.clientWidth, bh=img.clientHeight; if(!bw||!bh)return;
  var pos=getComputedStyle(img).objectPosition.split(' '), px=parseFloat(pos[0])/100, py=parseFloat(pos[1])/100;
  if(isNaN(px))px=.5; if(isNaN(py))py=.5;
  var s=Math.max(bw/this.W,bh/this.H), w=this.W*s, h=this.H*s, st=this.svg.style;
  st.left=(img.offsetLeft+(bw-w)*px).toFixed(1)+'px'; st.top=(img.offsetTop+(bh-h)*py).toFixed(1)+'px';
  st.width=w.toFixed(1)+'px'; st.height=h.toFixed(1)+'px';
};

Robot.prototype.signal=function(type,data){
  var now=performance.now();
  if(type==='start'||type==='step'){this.busy=now+2600;return;}
  this.busy=0;
  if(type==='done'||type==='approve'){
    restart(this.doneC,'go');
    var all=(this.panel?[this.panel]:[]).concat(this.pans||[],this.cards||[]);
    all.forEach(function(pn){pn.edgeHeat=1;});
    if(this.c.mode==='atlas'){
      var n=type==='approve'?0:(data&&data.pend)||0;
      this.flags=[0,n>0?1:0,n>1?1:0]; this.state={phase:'scan',k:0,t:0,time:0};
      this.cards.forEach(function(c){c.mark.on=false;});
    }
    if(this.c.mode==='rkos'&&data&&data.n)this.sources=data.n>1?[0,2]:[0];
  }
};

Robot.prototype.update=function(dt,now){
  var c=this.c, busy=this.busy>now, r=this.r;
  this.clock+=dt;
  /* proximidade do cursor e direção do olhar */
  var target=0, gx=0, gy=0;
  if(fine&&now-pointer.t<6000&&(c.gaze||c.arm)){
    var b=this.svg.getBoundingClientRect(), sx=b.width/this.W, ex=b.left+this.E[0]*sx, ey=b.top+this.E[1]*(b.height/this.H);
    var dx=pointer.x-ex, dy=pointer.y-ey, dist=Math.sqrt(dx*dx+dy*dy)||1, reach=Math.max(260,b.width*1.1);
    target=clamp(1-dist/reach,0,1);
    if(c.gaze){var m=r*.55*Math.min(1,dist/280);gx=dx/dist*m;gy=dy/dist*m;}
    if(c.zone){var z=document.querySelector(c.zone).getBoundingClientRect();if(pointer.y<z.top||pointer.y>z.bottom)target=0,gx=gy=0;}
  }
  var k=Math.min(1,dt*3.2);
  this.near+=(target-this.near)*k;
  this.gx=(this.gx||0)+(gx-(this.gx||0))*k; this.gy=(this.gy||0)+(gy-(this.gy||0))*k;
  this.pupil.setAttribute('transform','translate('+this.gx.toFixed(2)+','+this.gy.toFixed(2)+')');
  var lvl=.66+this.near*.34+(busy?.22:0);
  this.eye.setAttribute('opacity',Math.min(1,lvl).toFixed(3));
  this.eyeScale.setAttribute('transform','scale('+(1+this.near*.32+(busy?.12:0)).toFixed(3)+')');

  if(this.panel)this.runPanel(this.panel,dt,busy);
  if(c.mode==='rkos')this.runRkos(dt,busy);
  if(c.mode==='atlas')this.runAtlas(dt,busy);
  if(c.arm)this.runArm(dt,now);
};

/* leitura contínua: varre, pausa, recomeça */
Robot.prototype.runPanel=function(pn,dt,busy){
  var s=this.state, dur=busy?1.35:3.9, rest=busy?.25:1.1;
  s.time+=dt;
  if(s.phase==='rest'){ if(s.time>=rest){s.phase='scan';s.time=0;this.resetPanel(pn);} }
  else if(s.time>=dur){s.phase='rest';s.time=0;}
  var v=s.phase==='scan'?ease(s.time/dur)*1.04:1.04;
  var o=s.phase==='scan'?Math.min(1,s.time*4,(dur-s.time)*5+.15):Math.max(0,.15-s.time*.6);
  this.scanG.setAttribute('opacity',(clamp(o,0,1)*(busy?1:.82)).toFixed(3));
  if(s.phase==='scan')this.scanPanel(pn,v);
  this.decayPanel(pn,dt,busy?.35:0);
};

/* RKOS: consulta painel a painel; fontes encontradas se ligam ao olho */
Robot.prototype.runRkos=function(dt,busy){
  var s=this.state, self=this, per=busy?.75:1.5;
  if(s.k===undefined){s.k=0;s.phase='scan';s.time=0;}
  s.time+=dt;
  var cur=this.pans[s.k];
  if(s.phase==='scan'){
    this.scanPanel(cur,ease(Math.min(1,s.time/per))*1.04);
    this.scanG.setAttribute('opacity',Math.min(1,s.time*5,(per-s.time)*6+.1).toFixed(3));
    if(s.time>=per){s.time=0;this.resetPanel(cur);if(s.k<this.pans.length-1){s.k++;this.pans.forEach(function(p,i){p.band.setAttribute('points','');p.line.setAttribute('points','');if(p.beamEl)p.beamEl.setAttribute('points','');});}else{s.phase='found';}}
  } else if(s.phase==='found'){
    this.scanG.setAttribute('opacity',0);
    var f=Math.min(1,s.time/.5);
    this.sources.forEach(function(i){self.pans[i].edgeHeat=Math.max(self.pans[i].edgeHeat||0,.85);
      var q=self.pans[i].q, m=quadPt(q,0,.5), e=lerp(self.E,m,f);
      var ln=self.links[i]; ln.setAttribute('x1',m[0]);ln.setAttribute('y1',m[1]);ln.setAttribute('x2',lerp(m,self.E,f)[0]);ln.setAttribute('y2',lerp(m,self.E,f)[1]);ln.setAttribute('opacity',(.7*Math.min(1,(2.2-s.time)*2)).toFixed(3));});
    if(s.time>=2.2){s.phase='rest';s.time=0;this.links.forEach(function(l){l.setAttribute('opacity',0);});}
  } else if(s.time>=(busy?.2:.9)){s.phase='scan';s.k=0;s.time=0;}
  this.pans.forEach(function(p){self.decayPanel(p,dt,0);});
};

/* ATLAS: confere documento a documento e marca conformidade ou pendência */
Robot.prototype.runAtlas=function(dt,busy){
  var s=this.state, self=this, per=busy?.55:1.15;
  if(s.k===undefined){s.k=0;s.phase='scan';s.time=0;}
  s.time+=dt;
  if(s.phase==='scan'){
    var cur=this.cards[s.k];
    this.scanPanel(cur,ease(Math.min(1,s.time/per))*1.04);
    this.scanG.setAttribute('opacity',Math.min(1,s.time*5,(per-s.time)*6+.1).toFixed(3));
    var mid=quadPt(cur.q,1,.5);
    this.link.setAttribute('x1',mid[0]);this.link.setAttribute('y1',mid[1]);this.link.setAttribute('x2',this.E[0]);this.link.setAttribute('y2',this.E[1]);
    this.link.setAttribute('stroke-dashoffset',(-this.clock*this.r*6).toFixed(1));
    this.link.setAttribute('opacity',(.42*Math.min(1,s.time*4)).toFixed(3));
    if(s.time>=per){cur.mark.on=true;cur.edgeHeat=this.flags[s.k]?1:.55;s.time=0;this.resetPanel(cur);
      if(s.k<this.cards.length-1)s.k++;else s.phase='hold';}
  } else {
    this.scanG.setAttribute('opacity',0); this.link.setAttribute('opacity',0);
    if(s.phase==='hold'&&s.time>=3.2){s.phase='clear';s.time=0;}
    if(s.phase==='clear'){this.cards.forEach(function(c){c.mark.on=false;});if(s.time>=.9){s.phase='scan';s.k=0;s.time=0;}}
  }
  this.cards.forEach(function(c,i){
    var m=c.mark, pend=self.flags[i]===1;
    m.o+=((m.on?1:0)-m.o)*Math.min(1,dt*6);
    m.ok.style.display=pend?'none':''; m.ex.style.display=pend?'':'none';
    m.ring.setAttribute('stroke',pend?'#ff7a1a':'#8fe3b5');
    var pulse=pend&&m.on?.75+.25*Math.sin(self.clock*5):1;
    m.g.setAttribute('opacity',(m.o*pulse).toFixed(3));
    if(pend&&m.on)c.edgeHeat=Math.max(c.edgeHeat||0,.5+.3*Math.sin(self.clock*5));
    self.decayPanel(c,dt,0);
  });
};

/* convite: pulso percorre o braço até a mão, juntas acendem na passagem */
Robot.prototype.runArm=function(dt,now){
  var self=this;
  if(fine&&this.near>.55)this.firePulse(now);
  if(!this.autoAt)this.autoAt=now+1400;
  if(now>this.autoAt){this.firePulse(now);this.autoAt=now+(fine?9000:7000);}
  var p=this.pulse, L=this.armL, seg=L*.17;
  if(p){
    p.t+=dt/1.45; var e=ease(Math.min(1,p.t));
    var off=(seg-(L+seg)*e).toFixed(1), da=seg.toFixed(1)+' '+(L*2).toFixed(1);
    [this.armGlow,this.armCore].forEach(function(a){a.setAttribute('stroke-dasharray',da);a.setAttribute('stroke-dashoffset',off);});
    var fade=Math.min(1,p.t*6,(1.12-p.t)*8);
    this.armGlow.setAttribute('opacity',(.32*fade).toFixed(3)); this.armCore.setAttribute('opacity',(.9*fade).toFixed(3));
    this.lights.forEach(function(l){if(l.at>=0&&!l.lit&&e>=l.at){l.lit=true;l.heat=1;}});
    if(e>.94&&!p.tip){p.tip=true;this.tipHeat=1;}
    if(p.t>=1.12){this.pulse=null;this.lights.forEach(function(l){l.lit=false;});}
  }
  this.tipHeat=Math.max(0,(this.tipHeat||0)-dt*1.1);
  this.tip.setAttribute('opacity',(this.tipHeat*.95).toFixed(3));
  this.tip.setAttribute('r',(this.r*(3+(1-this.tipHeat)*3.5)).toFixed(1));
  this.lights.forEach(function(l){l.heat=Math.max(0,l.heat-dt*1.4);l.flare.setAttribute('opacity',(l.heat*.9).toFixed(3));});
};

/* ---------- montagem ---------- */
ROBOTS.forEach(function(c){
  var img=document.querySelector(c.sel); if(!img)return;
  try{robots.push(new Robot(c,img));}catch(e){}
});
if(!robots.length)return;

function layoutAll(){robots.forEach(function(r){r.layout();});}
layoutAll();
if('ResizeObserver' in window){var ro=new ResizeObserver(layoutAll);robots.forEach(function(r){ro.observe(r.root);});}
else window.addEventListener('resize',layoutAll,{passive:true});
window.addEventListener('load',layoutAll);

if(reduce)return; /* luz estática; sem varreduras, pulsos ou reações */

/* Telas de toque: luz a ~30 quadros por segundo e pausa enquanto a pessoa rola a página,
   para a rolagem ficar com o processador livre. No computador nada muda. */
var touch=!fine, scrolling=false, scrollEnd=0, html=document.documentElement;
if(touch)window.addEventListener('scroll',function(){
  if(!scrolling){scrolling=true;html.classList.add('rl-scrolling');}
  clearTimeout(scrollEnd);
  scrollEnd=setTimeout(function(){scrolling=false;html.classList.remove('rl-scrolling');wake();},160);
},{passive:true});
var running=false, last=0, acc=0;
function frame(now){
  var dt=Math.min(.05,(now-last)/1000||0); last=now;
  if(scrolling){running=false;return;}
  var any=false;
  if(touch){acc+=dt; if(acc<.031){requestAnimationFrame(frame);return;} dt=Math.min(.066,acc); acc=0;}
  robots.forEach(function(r){if(r.vis){any=true;r.update(dt,now);}});
  if(any&&!document.hidden){requestAnimationFrame(frame);}else running=false;
}
function wake(){if(!running&&!scrolling&&!document.hidden){running=true;last=performance.now();acc=0;requestAnimationFrame(frame);}}

if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){robots.forEach(function(r){if(r.root===e.target){r.vis=e.isIntersecting;r.svg.classList.toggle('rl-on',e.isIntersecting);if(e.isIntersecting&&r.cover)r.layout();}});});
    wake();
  },{rootMargin:'80px 0px'});
  robots.forEach(function(r){io.observe(r.root);});
} else {robots.forEach(function(r){r.vis=true;r.svg.classList.add('rl-on');});wake();}
document.addEventListener('visibilitychange',wake);

if(fine)window.addEventListener('pointermove',function(e){pointer.x=e.clientX;pointer.y=e.clientY;pointer.t=performance.now();},{passive:true});
document.addEventListener('demo:signal',function(e){
  var d=e.detail||{};
  robots.forEach(function(r){if(r.c.demo===d.demo)r.signal(d.type,d.data);});
});
})();
