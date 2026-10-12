/* Logística Inteligente 4.0 — demonstrações funcionais.
   Tudo roda no navegador com dados fictícios definidos abaixo. Os resultados são calculados
   a partir desses dados (e das alterações feitas pelo visitante); nada é resposta pronta. */
(function(){
'use strict';
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var NS='http://www.w3.org/2000/svg';

/* ---------- utilidades ---------- */
function $(s,c){return (c||document).querySelector(s);}
function $$(s,c){return [].slice.call((c||document).querySelectorAll(s));}
function h(tag,props){
  var el=document.createElement(tag), p=props||{};
  Object.keys(p).forEach(function(k){
    var v=p[k];
    if(v==null||v===false)return;
    if(k==='class')el.className=v;
    else if(k==='text')el.textContent=v;
    else if(k==='on')Object.keys(v).forEach(function(ev){el.addEventListener(ev,v[ev]);});
    else if(k==='style')el.setAttribute('style',v);
    else el.setAttribute(k,v===true?'':v);
  });
  for(var i=2;i<arguments.length;i++)add(el,arguments[i]);
  return el;
}
function add(el,kid){
  if(kid==null||kid===false)return;
  if(Array.isArray(kid)){kid.forEach(function(k){add(el,k);});return;}
  el.appendChild(typeof kid==='string'||typeof kid==='number'?document.createTextNode(String(kid)):kid);
}
function clear(el){while(el.firstChild)el.removeChild(el.firstChild);}
function wait(ms){return new Promise(function(r){setTimeout(r,reduce?0:ms);});}
function clamp(v,a,b){return v<a?a:v>b?b:v;}

/* datas como texto ISO (AAAA-MM-DD), calculadas em UTC para não depender do fuso */
var REF='2026-10-12';
function T(s){var p=s.split('-');return Date.UTC(+p[0],+p[1]-1,+p[2]);}
function fmt(s){if(!s)return '—';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function addDays(s,n){return new Date(T(s)+n*864e5).toISOString().slice(0,10);}
function days(a,b){return Math.round((T(b)-T(a))/864e5);} /* b − a */
function plural(n,s,p){return Math.abs(n)===1?s:p;}
function money(v){return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(T(s));}

/* ---------- dados de exemplo compartilhados (laboratório e RKOS) ---------- */
var BASE={
  contrato:{id:'CT-DEMO-2026',objeto:'Manutenção preventiva de equipamentos (exemplo)',fornecedor:'Empresa Exemplo Ltda.',inicio:'2025-01-01',termino:'2025-12-31',processo:'PROC-DEMO-0001/2024'},
  aditivos:[
    {n:1,inicio:'2026-01-01',termino:'2026-06-30',assinatura:'2025-12-12',publicado:true},
    {n:2,inicio:'2026-07-01',termino:'2026-12-31',assinatura:'2026-06-22',publicado:true}
  ],
  planilha:{termino:'2026-11-30'},
  registro:{termino:'2026-12-31'},
  portaria:{n:'000/2025',fiscal:'Fiscal Exemplo'}
};
var DATA=JSON.parse(JSON.stringify(BASE));
var listeners=[];
function changed(){listeners.forEach(function(f){f();});}
function onData(f){listeners.push(f);}

/* conferência: regras aplicadas aos dados atuais */
function conferir(d){
  var checks=[], prevEnd=d.contrato.termino, docEnd=d.contrato.termino, docSrc='Contrato';
  d.aditivos.forEach(function(a){
    var esperado=addDays(prevEnd,1), gap=days(esperado,a.inicio);
    if(gap>0)checks.push({k:'Encadeamento do '+a.n+'º termo aditivo',ref:'início em '+fmt(esperado),found:'início em '+fmt(a.inicio),ok:false,
      msg:'Lacuna de '+gap+' '+plural(gap,'dia','dias')+' sem cobertura entre '+fmt(esperado)+' e '+fmt(addDays(a.inicio,-1))+'.',act:'Verificar no processo se houve contrato vigente nesse intervalo.'});
    else if(gap<0)checks.push({k:'Encadeamento do '+a.n+'º termo aditivo',ref:'início em '+fmt(esperado),found:'início em '+fmt(a.inicio),ok:false,
      msg:'Sobreposição de '+(-gap)+' '+plural(-gap,'dia','dias')+' com o período anterior.',act:'Conferir as datas do termo aditivo com o extrato publicado.'});
    else checks.push({k:'Encadeamento do '+a.n+'º termo aditivo',ref:'início em '+fmt(esperado),found:'início em '+fmt(a.inicio),ok:true,msg:'Sem lacuna nem sobreposição.'});
    if(!a.publicado)checks.push({k:'Publicação do '+a.n+'º termo aditivo',ref:'extrato publicado',found:'não localizado',ok:false,msg:'Extrato do '+a.n+'º termo aditivo não localizado.',act:'Localizar a publicação antes de considerar a prorrogação regular.'});
    if(days(a.inicio,a.termino)<0)checks.push({k:'Datas do '+a.n+'º termo aditivo',ref:'término após o início',found:fmt(a.inicio)+' → '+fmt(a.termino),ok:false,msg:'Término anterior ao início.',act:'Corrigir as datas informadas.'});
    prevEnd=a.termino; docEnd=a.termino; docSrc=a.n+'º termo aditivo';
  });
  var dp=days(docEnd,d.planilha.termino), dr=days(docEnd,d.registro.termino);
  checks.push({k:'Planilha de controle',ref:fmt(docEnd),found:fmt(d.planilha.termino),ok:dp===0,
    msg:dp===0?'Planilha confere com a vigência documental.':'Planilha registra '+Math.abs(dp)+' '+plural(dp,'dia','dias')+(dp<0?' a menos':' a mais')+' que os documentos.',act:dp===0?null:'Verificar e corrigir o registro da planilha.'});
  checks.push({k:'Registro de vigência',ref:fmt(docEnd),found:fmt(d.registro.termino),ok:dr===0,
    msg:dr===0?'Registro confere com a vigência documental.':'Registro difere em '+Math.abs(dr)+' '+plural(dr,'dia','dias')+' da vigência documental.',act:dr===0?null:'Atualizar o registro de vigência.'});
  var rest=days(REF,docEnd);
  return {checks:checks,docEnd:docEnd,docSrc:docSrc,rest:rest,bad:checks.filter(function(c){return !c.ok;})};
}

/* =====================================================================
   1 · COMPARATIVO MANUAL × ASSISTIDO (faturas × planilha)
   ===================================================================== */
function mountCompare(root){
  var FAT=[
    {n:'FT-1041',ref:'jan/2026',valor:12500},{n:'FT-1042',ref:'fev/2026',valor:12500},{n:'FT-1043',ref:'mar/2026',valor:13100},
    {n:'FT-1044',ref:'abr/2026',valor:12500},{n:'FT-1045',ref:'mai/2026',valor:12500},{n:'FT-1046',ref:'jun/2026',valor:12500}
  ];
  var PLAN={'FT-1041':12500,'FT-1042':12500,'FT-1043':12500,'FT-1044':12500,'FT-1045':12500};
  function check(f){
    var p=PLAN[f.n];
    if(p==null)return {ok:false,plan:'não registrada',msg:'Fatura não registrada na planilha'};
    if(p!==f.valor)return {ok:false,plan:money(p),msg:'Valor diverge em '+money(Math.abs(f.valor-p))};
    return {ok:true,plan:money(p),msg:'Confere'};
  }
  var mode='manual', state={manual:{done:{},actions:0,finished:false},assisted:{done:{},actions:0,finished:false,reviewed:{}}}, busy=0, pend={};

  var seg=h('div',{class:'seg',role:'group','aria-label':'Modo de execução'},h('span',{class:'seg-thumb','aria-hidden':'true'}),
    h('button',{type:'button','data-mode':'manual','aria-pressed':'true',on:{click:function(){setMode('manual');}}},'Manual'),
    h('button',{type:'button','data-mode':'assisted','aria-pressed':'false',on:{click:function(){setMode('assisted');}}},'Assistido'));
  var counter=h('span',{class:'cmp-count'}), hint=h('p',{class:'cmp-hint'});
  var runBtn=h('button',{type:'button',class:'btn btn-primary cmp-run',on:{click:runAssisted}},h('span',null,'EXECUTAR CONFERÊNCIA ASSISTIDA'),h('span',{class:'arr','aria-hidden':'true'},'→'));
  var resetBtn=h('button',{type:'button',class:'ghost-btn',on:{click:reset}},'REINICIAR ↺');
  var grid=h('div',{class:'cmp-grid'});
  var tray=h('div',{class:'cmp-tray'},h('span',{class:'k'},'EXCEÇÕES PARA REVISÃO HUMANA'),h('div',{class:'cmp-exc'}));
  var summary=h('div',{class:'cmp-summary','aria-live':'polite'});
  var tiles=FAT.map(function(f,i){
    var plan=h('b',{class:'ft-plan'},'—'), st=h('span',{class:'ft-st'},'Aguardando'), btn=h('button',{type:'button',class:'ft-btn',on:{click:function(){manualCheck(i);}}},'CONFERIR');
    var t=h('div',{class:'ft'},
      h('div',{class:'ft-top'},h('span',{class:'ft-n'},f.n),h('span',{class:'ft-ref'},f.ref)),
      h('dl',{class:'ft-rows'},h('div',null,h('dt',null,'Fatura'),h('dd',null,money(f.valor))),h('div',null,h('dt',null,'Planilha'),h('dd',null,plan))),
      st,btn,h('span',{class:'ft-scan','aria-hidden':'true'}));
    t._plan=plan; t._st=st; t._btn=btn; grid.appendChild(t); return t;
  });
  add(root,[
    h('div',{class:'demo-bar'},seg,h('div',{class:'cmp-right'},counter,resetBtn)),
    hint,grid,h('div',{class:'cmp-actions'},runBtn),tray,summary
  ]);

  function setMode(m){
    if(busy)return; mode=m; root.setAttribute('data-mode',m);
    $$('[data-mode]',seg).forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-mode')===m));});
    paint();
  }
  function paint(){
    var s=state[mode];
    tiles.forEach(function(t,i){
      var r=s.done[i], f=FAT[i];
      t.className='ft'+(r?(r.ok?' ok':' bad'):'')+(mode==='assisted'&&!r?' locked':'')+(pend[i]?' scan':'');
      t._plan.textContent=r?r.plan:'—';
      t._st.textContent=r?(r.ok?'✓ '+r.msg:'! '+r.msg):(mode==='manual'?'Aguardando você':'Aguardando execução');
      t._btn.hidden=mode!=='manual'||!!r;
      if(mode==='assisted'&&r&&!r.ok&&s.reviewed[i])t.classList.add('rev');
    });
    var exc=$('.cmp-exc',tray); clear(exc);
    if(mode==='assisted'){
      FAT.forEach(function(f,i){
        var r=s.done[i]; if(!r||r.ok)return;
        var rv=!!s.reviewed[i];
        exc.appendChild(h('div',{class:'exc'+(rv?' done':'')},h('span',null,h('b',null,f.n),' '+r.msg),
          rv?h('em',null,'Revisada por você'):h('button',{type:'button',class:'ghost-btn',on:{click:function(){review(i);}}},'REVISAR')));
      });
    }
    tray.hidden=mode!=='assisted'||!Object.keys(s.done).length;
    runBtn.hidden=mode!=='assisted'||Object.keys(s.done).length>0;
    counter.textContent='Suas ações neste modo: '+s.actions;
    hint.textContent=mode==='manual'
      ?'Confira cada fatura com a planilha, uma de cada vez. Cada clique é uma ação sua.'
      :'Uma execução aplica a mesma regra às seis faturas. Você revisa apenas o que foi sinalizado.';
    renderSummary();
  }
  function count(s){return Object.keys(s.done).length;}
  function divergences(s){return Object.keys(s.done).filter(function(k){return !s.done[k].ok;}).length;}
  function renderSummary(){
    clear(summary);
    var m=state.manual, a=state.assisted, mDone=count(m)===FAT.length, aDone=count(a)===FAT.length&&divergences(a)===Object.keys(a.reviewed).length;
    if(!mDone&&!aDone)return;
    var row=function(label,done,s,detail){return h('div',{class:'sum-row'+(done?'':' pending')},h('span',null,label),h('b',null,done?s.actions+' '+plural(s.actions,'ação','ações'):'—'),h('small',null,done?detail:'Ainda não concluído'));};
    add(summary,[
      h('span',{class:'k'},'RESULTADO DA COMPARAÇÃO · CONTADO A PARTIR DAS SUAS AÇÕES'),
      row('Manual',mDone,m,'Uma ação por fatura · '+divergences(m)+' '+plural(divergences(m),'divergência','divergências')+' encontradas'),
      row('Assistido',aDone,a,'1 execução + '+Object.keys(a.reviewed).length+' '+plural(Object.keys(a.reviewed).length,'revisão','revisões')+' de exceção'),
      mDone&&aDone?h('p',null,'Os dois métodos encontram as mesmas divergências. A diferença está em onde a atenção humana é usada: em todas as faturas ou só nas exceções.'):null
    ]);
  }
  function manualCheck(i){
    var s=state.manual, t=tiles[i]; if(s.done[i]||pend[i])return; busy++; pend[i]=1;
    t.classList.add('scan');
    wait(650).then(function(){delete pend[i];t.classList.remove('scan');s.done[i]=check(FAT[i]);s.actions++;busy--;paint();});
  }
  function runAssisted(){
    var s=state.assisted; if(busy||count(s))return; busy=1; s.actions++;
    runBtn.disabled=true;
    var seq=Promise.resolve();
    FAT.forEach(function(f,i){
      seq=seq.then(function(){tiles[i].classList.add('scan');return wait(170);}).then(function(){s.done[i]=check(f);paint();tiles[i].classList.add('scan');return wait(60);}).then(function(){tiles[i].classList.remove('scan');});
    });
    seq.then(function(){busy=0;runBtn.disabled=false;paint();});
  }
  function review(i){var s=state.assisted; if(s.reviewed[i])return; s.reviewed[i]=true; s.actions++; paint();}
  function reset(){if(busy)return; state[mode]={done:{},actions:0,finished:false,reviewed:{}}; paint();}
  setMode('manual');
}

/* =====================================================================
   2 · LABORATÓRIO: conferência documental de vigência
   ===================================================================== */
function mountLab(root){
  var STEPS=['Identificar documentos','Extrair informações','Comparar datas','Destacar divergências','Apresentar resultado'];
  var steps=h('ol',{class:'lab-steps'},STEPS.map(function(s,i){return h('li',null,h('span',null,'0'+(i+1)),s);}));
  var docsCol=h('div',{class:'lab-docs'}), table=h('div',{class:'lab-table'}), result=h('div',{class:'lab-result','aria-live':'polite'});
  var runBtn=h('button',{type:'button',class:'btn btn-primary',on:{click:run}},h('span',null,'EXECUTAR CONFERÊNCIA'),h('span',{class:'arr','aria-hidden':'true'},'→'));
  var restore=h('button',{type:'button',class:'ghost-btn',on:{click:function(){DATA=JSON.parse(JSON.stringify(BASE));fill();changed();stale();}}},'RESTAURAR EXEMPLO');
  var stamp=h('span',{class:'lab-stale'});
  var running=false, ran=false;

  function field(label,input){return h('label',{class:'fld'},h('span',null,label),input);}
  function dateInput(get,set){var i=h('input',{type:'date',min:'2024-01-01',max:'2030-12-31'});i.value=get();i.addEventListener('change',function(){if(validDate(i.value)){set(i.value);changed();stale();}else i.value=get();});i._get=get;return i;}
  var ad2=function(){return DATA.aditivos[1];};
  var inputs=[
    dateInput(function(){return ad2().inicio;},function(v){ad2().inicio=v;}),
    dateInput(function(){return ad2().termino;},function(v){ad2().termino=v;}),
    dateInput(function(){return DATA.planilha.termino;},function(v){DATA.planilha.termino=v;}),
    dateInput(function(){return DATA.registro.termino;},function(v){DATA.registro.termino=v;})
  ];
  var pub=h('button',{type:'button',class:'switch','role':'switch','aria-checked':'true',on:{click:function(){ad2().publicado=!ad2().publicado;fill();changed();stale();}}},h('i',{'aria-hidden':'true'}),h('span',null,'Extrato do 2º aditivo publicado'));
  function fill(){inputs.forEach(function(i){i.value=i._get();});pub.setAttribute('aria-checked',String(ad2().publicado));}
  var editor=h('details',{class:'lab-edit',open:window.matchMedia('(min-width: 901px)').matches?true:null},
    h('summary',null,'AJUSTAR DADOS DE EXEMPLO'),
    h('div',{class:'lab-fields'},field('2º aditivo · início',inputs[0]),field('2º aditivo · término',inputs[1]),field('Planilha · término registrado',inputs[2]),field('Registro de vigência · término',inputs[3]),pub),
    h('p',{class:'note'},'Altere as datas e execute de novo: a conferência é recalculada a partir destes valores.'));

  function docCard(id,title,rows,warn){
    return h('div',{class:'ldoc','data-doc':id},h('div',{class:'ldoc-h'},h('i',{'aria-hidden':'true'}),h('b',null,title),warn?h('em',null,warn):null),
      h('dl',null,rows.map(function(r){return h('div',null,h('dt',null,r[0]),h('dd',null,r[1]));})));
  }
  function renderDocs(){
    clear(docsCol);
    var c=DATA.contrato;
    add(docsCol,[
      docCard('contrato','Contrato '+c.id,[['Início',fmt(c.inicio)],['Término',fmt(c.termino)]]),
      DATA.aditivos.map(function(a){return docCard('ad'+a.n,a.n+'º termo aditivo',[['Início',fmt(a.inicio)],['Término',fmt(a.termino)]],a.publicado?null:'extrato não localizado');}),
      docCard('planilha','Planilha de controle',[['Término registrado',fmt(DATA.planilha.termino)]]),
      docCard('registro','Registro de vigência',[['Término',fmt(DATA.registro.termino)]])
    ]);
  }
  function stale(){renderDocs(); if(ran){stamp.textContent='Dados alterados · execute a conferência de novo'; root.classList.add('is-stale');}}
  function setStep(i){$$('li',steps).forEach(function(li,k){li.className=k<i?'done':k===i?'on':'';});}

  function run(){
    if(running)return; running=true; ran=true; runBtn.disabled=true; root.classList.remove('is-stale'); stamp.textContent='';
    var r=conferir(DATA), cards=$$('.ldoc',docsCol);
    clear(table); clear(result); root.classList.add('running');
    var seq=Promise.resolve();
    seq=seq.then(function(){setStep(0);});
    cards.forEach(function(c,i){seq=seq.then(function(){c.classList.add('id');return wait(160);});});
    seq=seq.then(function(){setStep(1);return wait(250);});
    cards.forEach(function(c){seq=seq.then(function(){c.classList.add('ext');return wait(120);});});
    seq=seq.then(function(){setStep(2);add(table,h('div',{class:'lt-row lt-head'},h('span',null,'Verificação'),h('span',null,'Esperado'),h('span',null,'Encontrado'),h('span',null,'Situação')));});
    r.checks.forEach(function(c){
      seq=seq.then(function(){
        var row=h('div',{class:'lt-row'},h('span',null,c.k),h('span',{'data-l':'Esperado'},c.ref),h('span',{'data-l':'Encontrado'},c.found),h('span',{class:'lt-st'},'…'));
        table.appendChild(row); row._c=c; return wait(260);
      });
    });
    seq=seq.then(function(){setStep(3);});
    seq=seq.then(function(){
      var rows=$$('.lt-row:not(.lt-head)',table), p=Promise.resolve();
      rows.forEach(function(row){p=p.then(function(){row.classList.add(row._c.ok?'ok':'bad');$('.lt-st',row).textContent=row._c.ok?'✓ Confere':'! Divergência';return wait(140);});});
      return p;
    });
    seq=seq.then(function(){setStep(4);return wait(200);}).then(function(){
      var bad=r.bad, c=DATA.contrato;
      var situ=r.rest<0?'Vencido há '+(-r.rest)+' '+plural(r.rest,'dia','dias'):'Vigente · '+r.rest+' '+plural(r.rest,'dia','dias')+' até o término';
      add(result,[
        h('span',{class:'k'},bad.length?'CONFERÊNCIA CONCLUÍDA · '+bad.length+' '+plural(bad.length,'DIVERGÊNCIA','DIVERGÊNCIAS'):'CONFERÊNCIA CONCLUÍDA · SEM DIVERGÊNCIAS'),
        h('dl',{class:'lr-grid'},
          h('div',null,h('dt',null,'Contrato'),h('dd',null,c.id)),
          h('div',null,h('dt',null,'Vigência documental'),h('dd',null,fmt(r.docEnd)+' ('+r.docSrc+')')),
          h('div',null,h('dt',null,'Planilha'),h('dd',null,fmt(DATA.planilha.termino))),
          h('div',null,h('dt',null,'Registro'),h('dd',null,fmt(DATA.registro.termino))),
          h('div',null,h('dt',null,'Em '+fmt(REF)),h('dd',null,situ))),
        bad.length?h('ul',{class:'lr-acts'},bad.map(function(b){return h('li',null,h('b',null,b.msg),' ',b.act||'');})):h('p',{class:'lr-ok'},'Documentos, planilha e registro estão coerentes.'),
        h('p',{class:'note'},'Providências sugeridas para conferência humana. Dados fictícios.')
      ]);
      root.classList.remove('running'); root.classList.add('done'); running=false; runBtn.disabled=false;
      $$('.ldoc',docsCol).forEach(function(c){c.classList.remove('id','ext');});
    });
  }
  add(root,[
    h('div',{class:'demo-bar'},steps),
    h('div',{class:'lab-body'},
      h('div',{class:'lab-left'},h('span',{class:'k'},'DOCUMENTOS DO PROCESSO'),docsCol,editor),
      h('div',{class:'lab-right'},h('div',{class:'lab-run'},runBtn,restore,stamp),table,result))
  ]);
  renderDocs(); setStep(-1);
}

/* =====================================================================
   3 · RKOS: consulta documental sobre os mesmos dados
   ===================================================================== */
function corpus(d){
  var c=d.contrato, last=d.aditivos[d.aditivos.length-1];
  var docs=[
    {id:'contrato',title:'Contrato '+c.id,passages:[
      {id:'c3',ref:'Cláusula terceira · Da vigência',tags:['vigencia','contrato'],parts:['O prazo de vigência deste contrato é de ',{m:fmt(c.inicio)+' a '+fmt(c.termino)},', admitida a prorrogação por termo aditivo.']},
      {id:'c10',ref:'Cláusula décima · Da fiscalização',tags:['fiscal'],parts:['A fiscalização será exercida por empregado designado em ',{m:'portaria da Presidência'},'.']}]}
  ];
  d.aditivos.forEach(function(a){
    docs.push({id:'ad'+a.n,title:a.n+'º termo aditivo',passages:[
      {id:'a'+a.n,ref:'Cláusula segunda · Da prorrogação',tags:['vigencia','aditivo','prorrogacao'],n:a.n,parts:['Fica prorrogado o prazo de vigência do contrato ',c.id+', de ',{m:fmt(a.inicio)+' a '+fmt(a.termino)},'.']},
      {id:'p'+a.n,ref:'Extrato de publicação',tags:['publicacao','aditivo'],n:a.n,parts:a.publicado?['Extrato do ',a.n+'º termo aditivo ',{m:'publicado no Diário Oficial'},' (exemplo).']:['Extrato do ',a.n+'º termo aditivo: ',{m:'publicação não localizada'},' nas fontes de exemplo.']}]});
  });
  docs.push({id:'planilha',title:'Planilha de controle',passages:[{id:'pl',ref:'Linha '+c.id,tags:['registro','planilha','vigencia'],parts:['Contrato ',c.id,' · término registrado: ',{m:fmt(d.planilha.termino)},'.']}]});
  docs.push({id:'portaria',title:'Portaria nº '+d.portaria.n,passages:[{id:'po',ref:'Artigo 1º',tags:['fiscal'],parts:['Designar ',{m:d.portaria.fiscal},' como fiscal titular do contrato ',c.id,'.']}]});
  return docs;
}
var QUESTIONS=[
  {q:'Qual é a vigência deste contrato?',need:['vigencia']},
  {q:'Existe algum termo aditivo?',need:['aditivo']},
  {q:'Qual documento contém a vigência atual?',need:['prorrogacao']},
  {q:'Existe divergência entre os registros?',need:['vigencia','registro']},
  {q:'Quem fiscaliza o contrato?',need:['fiscal']}
];
/* seleciona trechos pelos assuntos da pergunta e monta a resposta a partir deles */
function answer(qi,d){
  var docs=corpus(d), all=[], need=QUESTIONS[qi].need;
  docs.forEach(function(doc){doc.passages.forEach(function(p){p.doc=doc;all.push(p);});});
  var hits=all.filter(function(p){return need.some(function(t){return p.tags.indexOf(t)>=0;});});
  var r=conferir(d), lastA=d.aditivos[d.aditivos.length-1], text, used;
  if(qi===0){
    used=hits.filter(function(p){return p.id==='c3'||p.id==='a'+(lastA?lastA.n:0);});
    var gap=r.bad.filter(function(c){return c.k.indexOf('Encadeamento')===0;});
    text='Vigência de '+fmt(d.contrato.inicio)+' a '+fmt(r.docEnd)+', conforme o '+r.docSrc+'. Em '+fmt(REF)+': '+(r.rest<0?'vencido há '+(-r.rest)+' dias.':r.rest+' dias até o término.')+(gap.length?' Atenção: '+gap.map(function(c){return c.msg;}).join(' '):'');
  } else if(qi===1){
    used=hits.filter(function(p){return p.tags.indexOf('prorrogacao')>=0||p.tags.indexOf('publicacao')>=0;});
    text='Sim. '+d.aditivos.length+' termos aditivos: '+d.aditivos.map(function(a){return 'o '+a.n+'º prorroga até '+fmt(a.termino)+(a.publicado?'':' (extrato não localizado)');}).join('; ')+'.';
  } else if(qi===2){
    used=hits.filter(function(p){return p.n===(lastA&&lastA.n);});
    text='O '+r.docSrc+', cláusula segunda, define o término atual em '+fmt(r.docEnd)+'.';
  } else if(qi===3){
    used=hits.filter(function(p){return p.id==='pl'||p.id==='a'+(lastA?lastA.n:0);});
    var pl=r.checks.filter(function(c){return c.k==='Planilha de controle';})[0];
    var others=r.bad.filter(function(c){return c!==pl;});
    text=(pl.ok?'A planilha registra '+fmt(d.planilha.termino)+', igual à vigência documental.':'Sim. A planilha registra '+fmt(d.planilha.termino)+' e os documentos indicam '+fmt(r.docEnd)+'. '+pl.msg)+(others.length?' Outros pontos encontrados: '+others.map(function(c){return c.msg;}).join(' '):(pl.ok?' Nenhuma outra divergência.':''));
  } else {
    used=hits;
    text='A portaria nº '+d.portaria.n+' designa '+d.portaria.fiscal+' como fiscal titular, conforme prevê a cláusula décima do contrato.';
  }
  return {text:text,used:used,scanned:all.length,matched:hits.length};
}

function mountRkos(root){
  var qs=h('div',{class:'rk-qs',role:'group','aria-label':'Perguntas'}), stage=h('div',{class:'rk-stage'}), svg=document.createElementNS(NS,'svg');
  svg.setAttribute('class','rk-wires'); svg.setAttribute('aria-hidden','true');
  var docsCol=h('div',{class:'rk-docs'}), core=h('div',{class:'rk-core'},h('span',{class:'rk-orbit','aria-hidden':'true'}),h('b',null,'RKOS'),h('small',null,'ÍNDICE · ORIGEM'));
  var meta=h('span',{class:'rk-meta'},'Escolha uma pergunta'), ansText=h('p',{class:'rk-text'},'A resposta é montada a partir dos trechos encontrados e sempre indica a origem.'), srcs=h('div',{class:'rk-srcs'});
  var viewer=h('div',{class:'rk-view',hidden:true});
  var ans=h('div',{class:'rk-ans','aria-live':'polite'},h('span',{class:'k'},'RESPOSTA COM ORIGEM'),meta,ansText,srcs,viewer);
  var cur=-1, busy=false, docEls={}, paths={};
  QUESTIONS.forEach(function(Q,i){qs.appendChild(h('button',{type:'button',class:'rk-q','aria-pressed':'false',on:{click:function(){ask(i);}}},Q.q));});
  svg.appendChild(document.createElementNS(NS,'g'));
  add(stage,[svg,docsCol,h('div',{class:'rk-mid'},core),ans]);
  add(root,[h('div',{class:'demo-bar'},h('span',{class:'k'},'PERGUNTAS DE EXEMPLO'),qs),stage]);

  function renderDocs(){
    clear(docsCol); docEls={};
    corpus(DATA).forEach(function(doc){
      var el=h('div',{class:'rk-doc'},h('i',{'aria-hidden':'true'}),h('b',null,doc.title),h('small',null,doc.passages.length+' '+plural(doc.passages.length,'trecho','trechos')));
      docEls[doc.id]=el; docsCol.appendChild(el);
    });
  }
  function rel(el){var r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();return {l:r.left-s.left,r:r.right-s.left,t:r.top-s.top,b:r.bottom-s.top,cx:r.left-s.left+r.width/2,cy:r.top-s.top+r.height/2};}
  function curve(a,b,hz){if(hz){var mx=(a.x+b.x)/2;return 'M'+a.x+','+a.y+' C'+mx+','+a.y+' '+mx+','+b.y+' '+b.x+','+b.y;}var my=(a.y+b.y)/2;return 'M'+a.x+','+a.y+' C'+a.x+','+my+' '+b.x+','+my+' '+b.x+','+b.y;}
  function wire(id,a,b,hz,cls){var p=document.createElementNS(NS,'path');p.setAttribute('d',curve(a,b,hz));if(cls)p.setAttribute('class',cls);svg.appendChild(p);var L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=reduce?0:L;p._L=L;paths[id]=p;return p;}
  function layout(active){
    while(svg.firstChild)svg.removeChild(svg.firstChild); paths={};
    svg.setAttribute('viewBox','0 0 '+stage.clientWidth+' '+stage.clientHeight);
    var c=rel(core), a=rel(ans), hz=c.l>rel(docsCol).r-4;
    Object.keys(docEls).forEach(function(id){
      var d=rel(docEls[id]), on=active&&active.indexOf(id)>=0;
      var p=hz?wire(id,{x:d.r,y:d.cy},{x:c.l+6,y:c.cy},true,on?'on':''):wire(id,{x:d.r-14,y:d.cy},{x:c.cx,y:c.t+6},false,on?'on':'');
      p.style.strokeDashoffset=0;
    });
    if(active)wire('out',hz?{x:c.r-6,y:c.cy}:{x:c.cx,y:c.b-6},hz?{x:a.l,y:a.t+40}:{x:a.cx,y:a.t},hz,'on out');
  }
  function draw(p,ms){return new Promise(function(r){if(!p||reduce){if(p)p.style.strokeDashoffset=0;r();return;}p.style.transition='stroke-dashoffset '+ms+'ms cubic-bezier(.65,0,.35,1)';requestAnimationFrame(function(){p.style.strokeDashoffset=0;});setTimeout(r,ms);});}
  function showPassage(p){
    clear(viewer); viewer.hidden=false;
    add(viewer,[h('div',{class:'rk-view-h'},h('b',null,p.doc.title),h('span',null,p.ref),h('button',{type:'button',class:'ghost-btn rk-close',on:{click:function(){viewer.hidden=true;$$('.rk-src',srcs).forEach(function(b){b.setAttribute('aria-pressed','false');});}}},'FECHAR')),
      h('p',null,p.parts.map(function(x){return typeof x==='string'?x:h('mark',null,x.m);}))]);
  }
  function ask(i){
    if(busy)return; busy=true; cur=i;
    $$('.rk-q',qs).forEach(function(b,k){b.setAttribute('aria-pressed',String(k===i));});
    renderDocs();
    var res=answer(i,DATA), ids=[];
    res.used.forEach(function(p){if(ids.indexOf(p.doc.id)<0)ids.push(p.doc.id);});
    root.classList.add('asking'); ans.classList.remove('show'); viewer.hidden=true; clear(srcs);
    meta.textContent='Procurando nos '+res.scanned+' trechos indexados…'; ansText.textContent='';
    layout(null);
    Object.keys(docEls).forEach(function(id){docEls[id].classList.add('scan');});
    wait(500).then(function(){
      Object.keys(docEls).forEach(function(id){docEls[id].classList.remove('scan');docEls[id].classList.toggle('hit',ids.indexOf(id)>=0);});
      layout(ids); core.classList.add('pulse');
      Object.keys(paths).forEach(function(k){if(k!=='out'&&ids.indexOf(k)>=0){paths[k].style.strokeDashoffset=paths[k]._L;}});
      return Promise.all(ids.map(function(id,k){return wait(k*120).then(function(){return draw(paths[id],600);});}));
    }).then(function(){return draw(paths.out,500);}).then(function(){
      core.classList.remove('pulse'); ans.classList.add('show');
      meta.textContent=res.matched+' de '+res.scanned+' trechos relacionados · '+res.used.length+' '+plural(res.used.length,'usado','usados')+' na resposta';
      ansText.textContent=res.text;
      res.used.forEach(function(p){srcs.appendChild(h('button',{type:'button',class:'rk-src','aria-pressed':'false',on:{click:function(e){$$('.rk-src',srcs).forEach(function(b){b.setAttribute('aria-pressed','false');});e.currentTarget.setAttribute('aria-pressed','true');showPassage(p);}}},h('b',null,p.doc.title),h('span',null,p.ref+' · ver trecho')));});
      busy=false;
    });
  }
  renderDocs(); layout(null);
  onData(function(){ if(cur>=0&&!busy)ask(cur); else renderDocs(); });
  var rl=function(){if(!busy)layout(cur>=0?Object.keys(docEls).filter(function(id){return docEls[id].classList.contains('hit');}):null);};
  window.addEventListener('resize',debounce(rl,150),{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(rl);
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();rl();setTimeout(function(){if(cur<0)ask(0);},reduce?0:500);}},{threshold:.35});io.observe(root);}
}

/* =====================================================================
   4 · ATLAS: simulador de processo administrativo
   ===================================================================== */
function mountAtlas(root){
  var P0={id:'PROC-DEMO-2026/014',titulo:'Prorrogação contratual',contrato:'CT-DEMO-2027 · Locação de equipamentos (exemplo)',vencimento:'2026-11-20',aditivoAssinado:false,fiscal:true,certidao:'2026-10-05',certTipo:'Certidão de regularidade do FGTS'};
  var P=JSON.parse(JSON.stringify(P0)), stage=-1, running=false, decision=null, log=[], analysis=null, reviewFocus=null;
  var STAGES=['LEITURA','CONFERÊNCIA','IDENTIFICAÇÃO','RECOMENDAÇÃO','VALIDAÇÃO HUMANA'];

  function analyse(p){
    var d=days(REF,p.vencimento), cd=days(REF,p.certidao), pend=[];
    if(d<0)pend.push({id:'venc',sev:'alta',txt:'Contrato vencido há '+(-d)+' '+plural(d,'dia','dias')+': não cabe mais prorrogação.',doc:'contrato'});
    if(cd<0)pend.push({id:'cert',sev:'alta',txt:p.certTipo+' vencida em '+fmt(p.certidao)+'.',doc:'certidao'});
    else if(cd<=15)pend.push({id:'cert',sev:'media',txt:p.certTipo+' vence em '+cd+' '+plural(cd,'dia','dias')+' ('+fmt(p.certidao)+').',doc:'certidao'});
    if(!p.fiscal)pend.push({id:'fiscal',sev:'media',txt:'Falta a manifestação do fiscal sobre a prorrogação.',doc:'acomp'});
    if(!p.aditivoAssinado&&d>=0&&d<=60)pend.push({id:'aditivo',sev:d<=30?'alta':'media',txt:'Termo aditivo ainda em minuta, a '+d+' '+plural(d,'dia','dias')+' do vencimento.',doc:'aditivo'});
    var reco;
    if(d<0)reco='Não prorrogar. Informar a chefia e instruir nova contratação, com orientação da unidade jurídica.';
    else if(pend.some(function(x){return x.id==='cert'&&x.sev==='alta';}))reco='Solicitar à contratada a certidão atualizada antes da assinatura do termo aditivo.';
    else if(!p.fiscal)reco='Solicitar a manifestação do fiscal sobre o interesse na prorrogação.';
    else if(!p.aditivoAssinado&&d<=60)reco='Priorizar a assinatura e a publicação do termo aditivo antes de '+fmt(p.vencimento)+'.';
    else if(pend.length)reco='Acompanhar as pendências indicadas antes do vencimento.';
    else reco='Sem pendências identificadas: processo apto a seguir para assinatura.';
    return {dias:d,certDias:cd,pend:pend,reco:reco};
  }

  /* --- interface --- */
  var status=h('b',{class:'at-status'},'AGUARDANDO ANÁLISE');
  var stageList=h('ol',{class:'at-stages'},STAGES.map(function(s,i){return h('li',null,h('span',null,'0'+(i+1)),s);}));
  function inp(label,el){return h('label',{class:'fld'},h('span',null,label),el);}
  var vIn=h('input',{type:'date',min:'2025-01-01',max:'2030-12-31'}), cIn=h('input',{type:'date',min:'2025-01-01',max:'2030-12-31'});
  function sw(label,key){var b=h('button',{type:'button',class:'switch',role:'switch','aria-checked':String(!!P[key]),on:{click:function(){P[key]=!P[key];b.setAttribute('aria-checked',String(P[key]));edited();}}},h('i',{'aria-hidden':'true'}),h('span',null,label));b._k=key;return b;}
  var swA=sw('Termo aditivo assinado','aditivoAssinado'), swF=sw('Manifestação do fiscal juntada','fiscal');
  vIn.addEventListener('change',function(){if(validDate(vIn.value)){P.vencimento=vIn.value;edited();}else vIn.value=P.vencimento;});
  cIn.addEventListener('change',function(){if(validDate(cIn.value)){P.certidao=cIn.value;edited();}else cIn.value=P.certidao;});
  var startBtn=h('button',{type:'button',class:'btn btn-primary',on:{click:start}},h('span',null,'INICIAR ANÁLISE'),h('span',{class:'arr','aria-hidden':'true'},'→'));
  var resetBtn=h('button',{type:'button',class:'ghost-btn',on:{click:reset}},'REINICIAR ↺');
  var controls=h('div',{class:'at-ctrl'},
    h('span',{class:'k'},'DADOS DO PROCESSO · EDITÁVEIS'),
    inp('Vencimento do contrato',vIn),inp('Validade da certidão',cIn),swA,swF,
    h('div',{class:'at-btns'},startBtn,resetBtn),
    h('p',{class:'note'},'Data de referência da demonstração: '+fmt(REF)+'.'));

  var F={};
  function frow(id,label){var dd=h('dd',null,'');F[id]=h('div',{class:'af'},h('dt',null,label),dd);F[id]._dd=dd;return F[id];}
  var sheet=h('div',{class:'at-sheet'},
    h('div',{class:'at-sheet-h'},h('span',null,P.id),h('b',null,'FOLHA DE ANÁLISE')),
    h('span',{class:'at-scan','aria-hidden':'true'}),
    h('dl',null,frow('contrato','Contrato'),frow('venc','Vencimento'),frow('prazo','Prazo restante'),frow('aditivo','Termo aditivo'),frow('fiscal','Acompanhamento do fiscal'),frow('cert','Certidão de regularidade')),
    h('div',{class:'at-reco'},h('small',null,'PROVIDÊNCIA SUGERIDA PELO ATLAS'),h('p',null,''),h('span',null,''),h('div',{class:'at-stamp'},h('b',null,''),h('small',null,''))));
  var pendBox=h('ul',{class:'at-pend'});
  var decide=h('div',{class:'at-decide',hidden:true},
    h('span',{class:'k'},'DECISÃO HUMANA'),
    h('div',{class:'at-dbtns'},
      h('button',{type:'button',class:'btn btn-primary','data-d':'aprovar',on:{click:function(){choose('aprovar');}}},h('span',null,'APROVAR ENCAMINHAMENTO')),
      h('button',{type:'button',class:'btn btn-ghost','data-d':'revisar',on:{click:function(){choose('revisar');}}},h('span',null,'SOLICITAR REVISÃO')),
      h('button',{type:'button',class:'btn btn-ghost','data-d':'consultar',on:{click:function(){choose('consultar');}}},h('span',null,'CONSULTAR DOCUMENTO'))),
    h('div',{class:'at-reasons',hidden:true},h('span',null,'Motivo da revisão:'),
      ['Conferir datas','Verificar certidão','Confirmar manifestação do fiscal'].map(function(r){return h('button',{type:'button',class:'chip',on:{click:function(){revise(r);}}},r);})),
    h('div',{class:'at-out','aria-live':'polite'}));
  var logEl=h('ol',{class:'at-log'});
  var caption=h('p',{class:'at-cap','aria-live':'polite'},'Ajuste os dados, se quiser, e inicie a análise.');

  add(root,[
    h('div',{class:'demo-bar'},h('div',{class:'at-proc'},h('span',{class:'k'},'PROCESSO DEMONSTRATIVO'),h('b',null,P.titulo.toUpperCase())),status),
    h('div',{class:'at-body'},controls,h('div',{class:'at-center'},stageList,sheet,caption),h('div',{class:'at-side'},h('span',{class:'k'},'PENDÊNCIAS IDENTIFICADAS'),pendBox,decide,h('span',{class:'k'},'REGISTRO DA ANÁLISE'),logEl))
  ]);

  function fillSheet(){
    var a=analyse(P);
    F.contrato._dd.textContent=P.contrato;
    F.venc._dd.textContent=fmt(P.vencimento);
    F.prazo._dd.textContent=a.dias<0?'Vencido há '+(-a.dias)+' '+plural(a.dias,'dia','dias'):a.dias+' '+plural(a.dias,'dia','dias')+' (referência '+fmt(REF)+')';
    F.aditivo._dd.textContent=P.aditivoAssinado?'Assinado':'Minuta, sem assinatura';
    F.fiscal._dd.textContent=P.fiscal?'Manifestação favorável juntada':'Não localizada no processo';
    F.cert._dd.textContent=P.certTipo+' · válida até '+fmt(P.certidao);
    vIn.value=P.vencimento; cIn.value=P.certidao;
    swA.setAttribute('aria-checked',String(P.aditivoAssinado)); swF.setAttribute('aria-checked',String(P.fiscal));
  }
  function addLog(t){log.push(t); logEl.appendChild(h('li',null,h('span',null,String(log.length).padStart(2,'0')),t)); logEl.scrollTop=logEl.scrollHeight;}
  function setStage(i){stage=i; $$('li',stageList).forEach(function(li,k){li.className=k<i?'done':k===i?'on':'';}); root.setAttribute('data-stage',String(i));}
  function setStatus(t,cls){status.textContent=t; status.className='at-status'+(cls?' '+cls:'');}
  function edited(){fillSheet(); if(stage>=0&&!running){setStatus('DADOS ALTERADOS · REANALISAR','warn');caption.textContent='Os dados mudaram. Inicie a análise de novo para atualizar o resultado.';}}
  function hl(ids,cls){Object.keys(F).forEach(function(k){F[k].classList.toggle(cls,ids.indexOf(k)>=0);});}
  function lock(v){[vIn,cIn,swA,swF,startBtn].forEach(function(e){e.disabled=v;});}

  function analysisRun(from){
    running=true; lock(true); decide.hidden=true; $('.at-reasons',decide).hidden=true;
    root.classList.remove('s3','s4','approved','review'); clear(pendBox);
    var a=analyse(P); analysis=a;
    var seq=Promise.resolve();
    if(from<=0)seq=seq.then(function(){setStage(0);setStatus('EM ANÁLISE');caption.textContent='Leitura: os campos relevantes do processo são localizados.';addLog('Leitura do processo '+P.id+'.');root.classList.add('read');
      var ids=['contrato','venc','aditivo','fiscal','cert'],p=Promise.resolve();ids.forEach(function(id){p=p.then(function(){hl([id],'lit');F[id].classList.add('read');return wait(260);});});return p;});
    seq=seq.then(function(){hl([],'lit');setStage(1);caption.textContent='Conferência: vencimento comparado à data de referência; certidão e aditivo verificados.';addLog('Conferência: '+(a.dias<0?'contrato vencido':a.dias+' dias até o vencimento')+'; certidão '+(a.certDias<0?'vencida':'válida por '+a.certDias+' dias')+'.');
      hl(['venc','prazo'],'lit');return wait(700);}).then(function(){hl(['cert','aditivo','fiscal'],'lit');return wait(700);});
    seq=seq.then(function(){hl([],'lit');setStage(2);caption.textContent=a.pend.length?'Identificação: '+a.pend.length+' '+plural(a.pend.length,'pendência','pendências')+' encontrada'+(a.pend.length>1?'s':'')+'.':'Identificação: nenhuma pendência encontrada.';
      var map={venc:['venc','prazo'],cert:['cert'],fiscal:['fiscal'],aditivo:['aditivo']}, ids=[];
      a.pend.forEach(function(p){ids=ids.concat(map[p.id]);pendBox.appendChild(h('li',{class:'sev-'+p.sev},h('b',null,p.sev==='alta'?'ALTA':'MÉDIA'),p.txt));});
      if(!a.pend.length)pendBox.appendChild(h('li',{class:'sev-ok'},h('b',null,'OK'),'Nenhuma pendência nos dados informados.'));
      hl(ids,'flag'); addLog(a.pend.length?a.pend.length+' '+plural(a.pend.length,'pendência identificada','pendências identificadas')+'.':'Nenhuma pendência.');
      return wait(900);});
    seq=seq.then(function(){setStage(3);root.classList.add('s3');$('.at-reco p',sheet).textContent=a.reco;$('.at-reco span',sheet).textContent='Fundamentada nos campos destacados da folha de análise.';caption.textContent='Recomendação: o ATLAS propõe a providência; a decisão continua com a pessoa responsável.';addLog('Providência sugerida: '+a.reco);return wait(800);});
    seq=seq.then(function(){setStage(4);setStatus('AGUARDANDO DECISÃO HUMANA','wait');decide.hidden=false;clear($('.at-out',decide));caption.textContent='Validação humana: escolha como seguir.';running=false;lock(false);
      if(reviewFocus){hl(reviewFocus,'rev');}});
  }
  function start(){ if(running)return; log=[]; clear(logEl); decision=null; reviewFocus=null; hl([],'rev'); hl([],'flag'); $$('.af',sheet).forEach(function(e){e.classList.remove('read');}); analysisRun(0); }
  function choose(d){
    if(running||stage!==4)return; decision=d;
    var out=$('.at-out',decide); clear(out); $('.at-reasons',decide).hidden=true;
    $$('.at-dbtns button',decide).forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-d')===d));});
    if(d==='aprovar'){
      root.classList.add('approved'); setStatus('ENCAMINHADO','ok');
      $('.at-stamp b',sheet).textContent='ENCAMINHADO'; $('.at-stamp small',sheet).textContent='DECISÃO DA PESSOA RESPONSÁVEL';
      addLog('Encaminhamento aprovado pela pessoa responsável.');
      add(out,h('div',{class:'at-doc'},h('span',{class:'k'},'MINUTA DE DESPACHO · DEMONSTRATIVA'),
        h('p',null,'Ao setor competente. Processo '+P.id+' ('+P.contrato+'). Vencimento em '+fmt(P.vencimento)+'. '+(analysis.pend.length?'Pendências: '+analysis.pend.map(function(x){return x.txt;}).join(' '):'Sem pendências identificadas.')+' Providência: '+analysis.reco),
        h('small',null,'Texto gerado a partir da análise demonstrativa, para revisão humana.')));
      caption.textContent='Decisão registrada. O processo segue com a providência aprovada.';
    } else if(d==='revisar'){
      $('.at-reasons',decide).hidden=false; setStatus('REVISÃO SOLICITADA','warn'); caption.textContent='Indique o motivo: a análise volta à etapa de conferência.';
    } else {
      var main=analysis.pend[0], docKey=main?main.doc:'contrato';
      var DOCS={
        certidao:[P.certTipo,'Certidão emitida em nome da contratada. ','Validade: ',{m:fmt(P.certidao)},analysis.certDias<0?' — vencida na data de referência.':' — válida na data de referência.'],
        aditivo:['Termo aditivo (minuta)','Prorroga a vigência a partir de '+fmt(addDays(P.vencimento,1))+'. ','Assinaturas: ',{m:P.aditivoAssinado?'colhidas':'pendentes'},'.'],
        acomp:['Informação de acompanhamento','Manifestação do fiscal sobre a prorrogação: ',{m:P.fiscal?'favorável, juntada ao processo':'não localizada'},'.'],
        contrato:['Contrato '+P.contrato,'Cláusula de vigência: término em ',{m:fmt(P.vencimento)},'.']
      }, dd=DOCS[docKey];
      add(out,h('div',{class:'at-doc'},h('span',{class:'k'},'DOCUMENTO CONSULTADO · '+dd[0].toUpperCase()),h('p',null,dd.slice(1).map(function(x){return typeof x==='string'?x:h('mark',null,x.m);})),
        h('small',null,'A decisão continua pendente. Escolha aprovar ou solicitar revisão.')));
      addLog('Documento consultado: '+dd[0]+'.'); caption.textContent='Documento aberto para conferência. A decisão segue pendente.';
    }
  }
  function revise(reason){
    var focus={'Conferir datas':['venc','prazo'],'Verificar certidão':['cert'],'Confirmar manifestação do fiscal':['fiscal']}[reason];
    reviewFocus=focus; addLog('Revisão solicitada: '+reason.toLowerCase()+'.'); setStatus('EM REVISÃO','warn');
    hl([],'flag'); clear(pendBox); root.classList.remove('s3'); $('.at-reco p',sheet).textContent='';
    caption.textContent='Revisão em andamento: '+reason.toLowerCase()+'.';
    analysisRun(1);
  }
  function reset(){
    if(running)return; P=JSON.parse(JSON.stringify(P0)); stage=-1; decision=null; reviewFocus=null; log=[]; clear(logEl); clear(pendBox);
    root.classList.remove('s3','approved','read'); root.removeAttribute('data-stage'); decide.hidden=true; setStatus('AGUARDANDO ANÁLISE');
    $$('li',stageList).forEach(function(li){li.className='';}); hl([],'flag'); hl([],'lit'); hl([],'rev'); $$('.af',sheet).forEach(function(e){e.classList.remove('read');});
    caption.textContent='Ajuste os dados, se quiser, e inicie a análise.'; fillSheet();
  }
  fillSheet();
}

/* =====================================================================
   5 · GESTÃO DE PRAZOS
   ===================================================================== */
function mountPrazos(root){
  var C0=[
    {id:'CT-DEMO-101',objeto:'Suporte a equipamentos de rede',inicio:'2026-03-01',termino:'2027-02-28',prorrogavel:true,aditivo:false},
    {id:'CT-DEMO-102',objeto:'Outsourcing de impressão',inicio:'2025-11-24',termino:'2026-11-05',prorrogavel:true,aditivo:true},
    {id:'CT-DEMO-103',objeto:'Manutenção predial',inicio:'2025-10-01',termino:'2026-09-30',prorrogavel:false,aditivo:false},
    {id:'CT-DEMO-104',objeto:'Licenças de software',inicio:'2025-12-15',termino:'2026-12-14',prorrogavel:true,aditivo:false}
  ];
  var C=JSON.parse(JSON.stringify(C0)), sel=0;
  function evalC(c){
    var d=days(REF,c.termino), total=Math.max(1,days(c.inicio,c.termino)), pos=clamp(days(c.inicio,REF)/total,0,1), st, alerts=[];
    if(d<0){st='vencido';alerts.push('Contrato vencido há '+(-d)+' '+plural(d,'dia','dias')+'. Verificar se o serviço continua sendo prestado sem cobertura contratual.');}
    else if(d<=30){st='critico';alerts.push('Vence em '+d+' '+plural(d,'dia','dias')+'.');}
    else if(d<=120&&c.prorrogavel&&!c.aditivo){st='pendencia';alerts.push('Prorrogável e sem termo aditivo em andamento a '+d+' dias do vencimento.');}
    else if(d<=90){st='atencao';alerts.push('Vence em '+d+' dias.');}
    else st='vigente';
    if(d>=0&&d<=30&&c.prorrogavel&&!c.aditivo)alerts.push('Sem termo aditivo em andamento: risco de descontinuidade.');
    if(d>=0&&c.aditivo)alerts.push('Termo aditivo em andamento.');
    if(d>=0&&!c.prorrogavel&&d<=120)alerts.push('Não prorrogável: nova contratação deve estar em curso.');
    if(st==='vigente'&&!alerts.length)alerts.push('Sem alertas na data de referência.');
    return {d:d,st:st,pos:pos,alerts:alerts};
  }
  var LABEL={vigente:'VIGENTE',atencao:'ATENÇÃO',pendencia:'PENDÊNCIA DE PRORROGAÇÃO',critico:'PRÓXIMO DO VENCIMENTO',vencido:'VENCIDO'};
  var counts=h('div',{class:'pz-counts'}), list=h('div',{class:'pz-list',role:'listbox','aria-label':'Contratos de exemplo'}), detail=h('div',{class:'pz-detail','aria-live':'polite'});
  add(root,[h('div',{class:'demo-bar'},h('span',{class:'k'},'DATA DE REFERÊNCIA DA DEMONSTRAÇÃO · '+fmt(REF)),h('button',{type:'button',class:'ghost-btn',on:{click:function(){C=JSON.parse(JSON.stringify(C0));render();}}},'RESTAURAR EXEMPLO')),
    counts,h('div',{class:'pz-body'},list,detail)]);
  function render(){
    clear(counts); clear(list); clear(detail);
    var tally={vigente:0,atencao:0,pendencia:0,critico:0,vencido:0};
    C.forEach(function(c,i){
      var e=evalC(c); tally[e.st]++;
      list.appendChild(h('button',{type:'button',class:'pz-item st-'+e.st,role:'option','aria-selected':String(i===sel),on:{click:function(){sel=i;render();if(matchMedia('(max-width:900px)').matches)detail.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});}}},
        h('span',{class:'pz-id'},c.id),h('span',{class:'pz-obj'},c.objeto),h('span',{class:'pz-chip'},LABEL[e.st]),h('span',{class:'pz-days'},e.d<0?(-e.d)+' d vencido':e.d+' d')));
    });
    ['vigente','atencao','pendencia','critico','vencido'].forEach(function(k){counts.appendChild(h('div',{class:'pz-c st-'+k},h('b',null,String(tally[k])),h('span',null,LABEL[k])));});
    var c=C[sel], e=evalC(c);
    var dIn=h('input',{type:'date',min:'2025-01-01',max:'2030-12-31'}); dIn.value=c.termino;
    dIn.addEventListener('change',function(){if(validDate(dIn.value)&&days(c.inicio,dIn.value)>0){c.termino=dIn.value;render();}else dIn.value=c.termino;});
    function shift(n){c.termino=addDays(c.termino,n);if(days(c.inicio,c.termino)<1)c.termino=addDays(c.inicio,1);render();}
    var adSw=h('button',{type:'button',class:'switch',role:'switch','aria-checked':String(c.aditivo),disabled:!c.prorrogavel,on:{click:function(){c.aditivo=!c.aditivo;render();}}},h('i',{'aria-hidden':'true'}),h('span',null,'Termo aditivo em andamento'));
    add(detail,[
      h('div',{class:'pz-dh'},h('div',null,h('span',{class:'k'},c.id),h('b',null,c.objeto)),h('span',{class:'pz-chip big st-'+e.st},LABEL[e.st])),
      h('div',{class:'pz-tl st-'+e.st,style:'--p:'+e.pos.toFixed(3)},h('span',{class:'pz-bar'},h('i',null)),h('span',{class:'pz-ref'},h('em',null,'REF · '+fmt(REF))),
        h('div',{class:'pz-tl-l'},h('span',null,fmt(c.inicio)),h('span',null,fmt(c.termino)))),
      h('div',{class:'pz-big'},h('b',null,e.d<0?String(-e.d):String(e.d)),h('span',null,e.d<0?plural(e.d,'dia vencido','dias vencido'):plural(e.d,'dia até o término','dias até o término'))),
      h('ul',{class:'pz-alerts'},e.alerts.map(function(a){return h('li',null,a);})),
      h('div',{class:'pz-ctrl'},h('label',{class:'fld'},h('span',null,'Término da vigência'),dIn),
        h('div',{class:'pz-shift'},h('button',{type:'button',class:'ghost-btn',on:{click:function(){shift(-30);}}},'− 30 DIAS'),h('button',{type:'button',class:'ghost-btn',on:{click:function(){shift(30);}}},'+ 30 DIAS')),
        adSw,c.prorrogavel?null:h('small',{class:'note'},'Este contrato de exemplo não admite prorrogação.'))
    ]);
  }
  render();
}

function debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}

var map={compare:mountCompare,lab:mountLab,rkos:mountRkos,atlas:mountAtlas,prazos:mountPrazos};
$$('[data-demo]').forEach(function(el){var f=map[el.getAttribute('data-demo')];if(f){el.classList.add('demo-ready');f(el);}});
})();
