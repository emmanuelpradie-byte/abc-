// ══ PRODUCTION — Mon Fournil · Maison Viennet ══════════════════════════════
// • Une recette apparaît dans la production si on l'a choisi (r.inProd) — par défaut,
//   celles qui ont des produits.
// • Produits (r.formats) : pièce de w g de pâte, ou bac de w g divisé en pcs pièces.
// • Le tableau de la semaine (comme le planning LBDD) s'écrit en KG DE FARINE par recette :
//   « 75+75 » = deux pétrissées de 75 kg. Une quantité saisie en pièces dans la production
//   du jour s'y affiche convertie en kg de farine (en italique) tant qu'on n'a rien tapé.
// Données : v4_prodj { 'AAAA-MM-JJ': { f:{idRecette:'75+75'}, q:{idProduit:qté}, on:{idRecette:1} } }
var PRODJ={}, PJ={date:'', week:'', fmtEd:[], recTab:'rec', inProdEd:false, inProdTouched:false};
if(window.CL_KEYS){ CL_KEYS.v4_prodj=['cfg']; }
if(window.CL_CFG_KEYS&&CL_CFG_KEYS.indexOf('v4_prodj')<0) CL_CFG_KEYS.push('v4_prodj');
if(window.ACCT_KEYS&&ACCT_KEYS.indexOf('v4_prodj')<0) ACCT_KEYS.push('v4_prodj');

function pjISO(d){ var p=function(n){return n<10?'0'+n:''+n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function pjDay(off){ var d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+(off||0)); return pjISO(d); }
function pjParse(iso){ var a=iso.split('-'); return new Date(+a[0],+a[1]-1,+a[2],12); }
function pjAdd(iso,n){ var d=pjParse(iso); d.setDate(d.getDate()+n); return pjISO(d); }
function pjMonday(iso){ var d=pjParse(iso), w=(d.getDay()+6)%7; d.setDate(d.getDate()-w); return pjISO(d); }
function pjN(v){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)?n:0; }
function pjKg(kg){ var g=kg*1000; return g>=1000?kg.toLocaleString('fr-FR',{maximumFractionDigits:2})+' kg':(Math.round(g*10)/10).toLocaleString('fr-FR')+' g'; }
function pjNum(x){ return (Math.round(x*10)/10).toLocaleString('fr-FR'); }
// « 75+75 », « 50 + 37,5 » → 150 / 87,5 ; texte libre sans chiffre → 0
function pjSum(t){ var s=0; String(t||'').replace(/,/g,'.').split('+').forEach(function(p){ var n=parseFloat(p); if(isFinite(n)) s+=n; }); return s; }
var PJ_DAYS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
var PJ_SEC_COL=['#381515','#7A4A1E','#3E5A3F','#2F4A5E','#6B3A5A','#5E5248','#8A5A2B'];
function pjLoad(){
  var raw; try{ raw=JSON.parse(LS.getItem('v4_prodj')||'null')||{}; }catch(e){ raw={}; }
  Object.keys(raw).forEach(function(d){ var v=raw[d]; if(v&&!v.q&&!v.on&&!v.f){ raw[d]={q:v,on:{},f:{}}; } });
  PRODJ=raw;
}
function pjSave(){ try{ LS.setItem('v4_prodj',JSON.stringify(PRODJ)); }catch(e){} }
function pjDayObj(iso,make){ var d=PRODJ[iso]; if(!d&&make) d=PRODJ[iso]={q:{},on:{},f:{}}; if(d){ d.q=d.q||{}; d.on=d.on||{}; d.f=d.f||{}; } return d; }
function pjTidy(iso){ var d=PRODJ[iso]; if(d&&!Object.keys(d.q||{}).length&&!Object.keys(d.on||{}).length&&!Object.keys(d.f||{}).length) delete PRODJ[iso]; }
function pjLabel(iso){
  var t=pjDay(0), lbl=iso===t?'Aujourd’hui':iso===pjAdd(t,1)?'Demain':iso===pjAdd(t,-1)?'Hier':'';
  var s=pjParse(iso).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  return (lbl?lbl+' · ':'')+s.charAt(0).toUpperCase()+s.slice(1);
}
// recettes / produits
function pjFormats(r){ return (r.formats||[]).filter(function(f){ return pjN(f.w)>0; }); }
function pjShown(r){ return r.inProd===true||(r.inProd==null&&pjFormats(r).length>0); }
function pjSortRec(a,b){ return (a.cat||'').localeCompare(b.cat||'','fr')||a.name.localeCompare(b.name,'fr'); }
function pjProdRecipes(){ return recipes.filter(pjShown).sort(pjSortRec); }
function pjFmtRecipes(){ return recipes.filter(function(r){ return pjFormats(r).length; }).sort(pjSortRec); }
function fmtName(f){ return f.n||(f.mode==='bac'?'Bac':'Pièce'); }
function fmtPieceKg(f){ return f.mode==='bac'?(pjN(f.pcs)>0?pjN(f.w)/1000/pjN(f.pcs):0):pjN(f.w)/1000; }
function fmtPieces(f,q){ return f.mode==='bac'?q*pjN(f.pcs):q; }
function fmtDoughKg(f,q){ return pjN(f.w)/1000*q; }
function fmtDesc(f){
  if(f.mode==='bac') return 'bac de '+pjKg(pjN(f.w)/1000)+(pjN(f.pcs)>0?' → '+pjN(f.pcs)+' pièces de '+pjKg(fmtPieceKg(f)):'');
  return pjKg(pjN(f.w)/1000)+' de pâte';
}
function fmtUnit(f,q){ return f.mode==='bac'?(q>1?'bacs':'bac'):(q>1?'pièces':'pièce'); }
// farine d'une recette (ingrédients de la catégorie Farines ou nommés « Farine… »)
function pjIsFlour(g){ return /farine/i.test(g.cat||'')||/^farines?\b/i.test(g.name||''); }
function pjFlourKg(r){
  return (r.items||[]).reduce(function(a,it){ if(it.type!=='ingredient') return a; var g=ingredients.find(function(x){return x.id===it.refId;}); return g&&pjIsFlour(g)?a+toKg(it.qty,it.unit,g):a; },0);
}
function pjBase(r){ var fl=pjFlourKg(r); return fl>0?{kg:fl,lbl:'kg farine',flour:true}:{kg:recWeight(r.id),lbl:'kg pâte',flour:false}; }
// kg (farine) déduits des pièces saisies
function pjFromPieces(r,d){
  var M=recWeight(r.id), b=pjBase(r); if(!(M>0)) return 0;
  var D=pjFormats(r).reduce(function(a,f){ return a+fmtDoughKg(f,pjN(d.q[f.id])); },0);
  return D*b.kg/M;
}
function pjRecOn(iso,r){ var d=pjDayObj(iso); if(!d) return false; return !!(d.on[r.id]||String(d.f[r.id]||'').trim()||pjFormats(r).some(function(f){ return pjN(d.q[f.id])>0; })); }
function pjEff(r,d){ var t=String(d.f[r.id]||'').trim(); return t?pjSum(t):pjFromPieces(r,d); }

// ── calcul d'une journée ──
function pjLines(r,k){
  return (r.items||[]).map(function(it){
    if(it.type==='ingredient'){ var g=ingredients.find(function(x){return x.id===it.refId;}); if(!g) return null; var kg=toKg(it.qty,it.unit,g)*k; return {n:g.name,kg:kg,sub:false}; }
    var s=recipes.find(function(x){return x.id===it.refId;}); if(!s) return null; var m=pjN(it.qty)*k; return {n:s.name,kg:m*recWeight(s.id),sub:true};
  }).filter(Boolean);
}
function pjPreps(r,k,acc,vis){
  vis=vis||{}; if(vis[r.id]) return; var v=Object.assign({},vis); v[r.id]=1;
  (r.items||[]).forEach(function(it){ if(it.type!=='recipe') return; var s=recipes.find(function(x){return x.id===it.refId;}); if(!s) return; var m=pjN(it.qty)*k; acc[s.id]=(acc[s.id]||0)+m; pjPreps(s,m,acc,v); });
}
function pjCalc(iso){
  var d=pjDayObj(iso)||{q:{},on:{},f:{}}, out={rec:[],preps:[],flour:0,dough:0,pcs:0,cost:0}, acc={};
  pjProdRecipes().forEach(function(r){
    var eff=pjEff(r,d); if(!(eff>0)) return;
    var b=pjBase(r), M=recWeight(r.id), k=b.kg>0?eff/b.kg:0, D=k*M;
    pjPreps(r,k,acc);
    var rows=pjFormats(r).map(function(f){ return {f:f,q:pjN(d.q[f.id])}; }).filter(function(x){ return x.q>0; });
    var pcs=rows.reduce(function(a,x){ return a+fmtPieces(x.f,x.q); },0), cost=recCost(r.id)*k;
    out.rec.push({id:r.id,n:r.name,cat:r.cat||'',eff:eff,base:b,txt:String(d.f[r.id]||'').trim(),dough:D,k:k,pcs:pcs,cost:cost,rows:rows,need:pjLines(r,k)});
    if(b.flour) out.flour+=eff; out.dough+=D; out.pcs+=pcs; out.cost+=cost;
  });
  out.preps=Object.keys(acc).map(function(id){ var s=recipes.find(function(x){return x.id===id;}); return {n:s.name,kg:acc[id]*recWeight(id),need:pjLines(s,acc[id])}; });
  return out;
}
function pjCount(iso){ var d=pjDayObj(iso); if(!d) return 0; return pjProdRecipes().filter(function(r){ return pjEff(r,d)>0; }).length; }

// ══ PRODUCTION DU JOUR ══
function prodGo(off){ PJ.date=pjDay(off||0); if(CUR!=='prod') goPage('prod'); else renderProdJ(); }
function pjSetDate(iso){ PJ.date=iso; renderProdJ(); }
function pjWeekShift(n){ PJ.date=pjAdd(pjMonday(PJ.date||pjDay(0)),n*7); renderProdJ(); }
function renderProdJ(){
  var box=document.getElementById('pj-wrap'); if(!box) return;
  pjLoad(); if(!PJ.date) PJ.date=pjDay(0);
  var iso=PJ.date, mon=pjMonday(iso), today=pjDay(0);
  var recs=pjProdRecipes();
  var h='<div class="cw pj-card"><div class="pj-h">Production du jour</div>'+
    '<div class="pj-sub">Choisis le jour, coche les recettes du jour puis indique la pétrissée en kg de farine (ex. 75+75) ou les pièces. Tout est enregistré et repris dans le tableau de la semaine.</div>'+
    '<div class="pj-lbl">Semaine</div><div class="pj-week"><button class="pj-wn" onclick="pjWeekShift(-1)" aria-label="Semaine précédente">'+ic('chev-left')+'</button>';
  for(var i=0;i<7;i++){
    var di=pjAdd(mon,i), dd=pjParse(di), n=pjCount(di);
    h+='<button class="pj-day'+(di===iso?' on':'')+(di===today?' today':'')+'" onclick="pjSetDate(\''+di+'\')"><b>'+PJ_DAYS[i]+'</b><span>'+dd.getDate()+'/'+(dd.getMonth()+1)+'</span><i>'+(n?n:'—')+'</i></button>';
  }
  h+='<button class="pj-wn" onclick="pjWeekShift(1)" aria-label="Semaine suivante">'+ic('chev-right')+'</button></div>'+
    '<div class="pj-date">'+ic('calendar')+' '+esc(pjLabel(iso))+'</div>';
  if(!recs.length){
    h+='<div class="pj-empty">Aucune recette dans la production. Ouvre une recette, onglet <b>Produits</b>, et coche « Afficher dans la production du jour ».'+
       '<div style="margin-top:10px"><button class="btn btn-gold btn-sm" onclick="pjOpenProducts()">'+ic('layers')+' Choisir les recettes</button></div></div></div>';
    box.innerHTML=h; pjNavOn(); return;
  }
  h+='<div class="pj-lbl">Coche les recettes du jour</div><div class="pj-recs">';
  var cat=null, day=pjDayObj(iso)||{q:{},on:{},f:{}};
  recs.forEach(function(r){
    if((r.cat||'')!==cat){ cat=r.cat||''; h+='<div class="pj-cat">'+esc(cat||'Sans catégorie')+'</div>'; }
    var on=pjRecOn(iso,r), b=pjBase(r), auto=pjFromPieces(r,day);
    h+='<div class="pj-rec'+(on?' on':'')+'"><label class="pj-chk"><input type="checkbox" '+(on?'checked ':'')+'onchange="pjToggle(\''+r.id+'\',this.checked)"><span class="pj-box"></span><span class="pj-rn">'+esc(r.name)+'</span></label>';
    if(on){
      h+='<div class="pj-rows"><div class="pj-row"><span class="pj-fn">Pétrissée<small>'+(b.flour?'kg de farine':'kg de pâte')+', ex. 75+75</small></span>'+
        '<span class="pj-in"><input class="fi sm pj-kgf" type="text" inputmode="decimal" value="'+esc(day.f[r.id]||'')+'" placeholder="'+(auto>0?pjNum(auto):'ex. 75')+'" oninput="pjSetF(\''+r.id+'\',this.value)" aria-label="Pétrissée '+esc(r.name)+' en '+b.lbl+'"><small>'+b.lbl+'</small></span></div>'+
        pjFormats(r).map(function(f){ var q=pjN(day.q[f.id]);
          return '<div class="pj-row"><span class="pj-fn">'+esc(fmtName(f))+'<small>'+esc(fmtDesc(f))+'</small></span>'+
            '<span class="pj-in"><input class="fi sm" type="number" inputmode="decimal" min="0" step="'+(f.mode==='bac'?'0.5':'1')+'" value="'+(q||'')+'" placeholder="0" oninput="pjSet(\''+r.id+'\',\''+f.id+'\',this.value)" aria-label="Quantité '+esc(fmtName(f))+'">'+
            '<small>'+(f.mode==='bac'?'bac(s)':'pièce(s)')+'</small></span></div>'; }).join('')+'</div>';
    }
    h+='</div>';
  });
  h+='</div><div class="pj-acts"><button class="btn btn-ghost btn-sm" onclick="pjCopyPrev()">'+ic('copy')+' Comme la veille</button><button class="btn btn-ghost btn-sm" onclick="pjClear()">'+ic('trash')+' Vider la journée</button><button class="btn btn-ghost btn-sm" onclick="PJ.week=pjMonday(PJ.date);goPage(\'plan\')">'+ic('calendar')+' Production semaine</button></div></div>'+
    '<div id="pj-sum"></div>';
  box.innerHTML=h; renderPjSum(); pjNavOn();
}
function pjToggle(rid,on){
  pjLoad(); var iso=PJ.date, d=pjDayObj(iso,true), r=recipes.find(function(x){ return x.id===rid; });
  if(on) d.on[rid]=1; else { delete d.on[rid]; delete d.f[rid]; if(r) pjFormats(r).forEach(function(f){ delete d.q[f.id]; }); }
  pjTidy(iso); pjSave(); renderProdJ(); pjBadge();
}
function pjAfterEdit(){ renderPjSum(); pjBadge(); pjWeekCounts(); }
function pjSetF(rid,v){
  pjLoad(); var iso=PJ.date, d=pjDayObj(iso,true), t=String(v||'').trim();
  if(t) d.f[rid]=t; else delete d.f[rid];
  d.on[rid]=1; pjTidy(iso); pjSave(); pjAfterEdit();
}
function pjSet(rid,fid,v){
  pjLoad(); var iso=PJ.date, d=pjDayObj(iso,true), q=pjN(v);
  if(q>0) d.q[fid]=q; else delete d.q[fid];
  d.on[rid]=1; pjTidy(iso); pjSave(); pjAfterEdit();
  // mise à jour du kg de farine calculé affiché
  var r=recipes.find(function(x){ return x.id===rid; }), el=r&&document.querySelector('.pj-kgf[oninput*="'+rid+'"]');
  if(el){ var a=pjFromPieces(r,d); el.placeholder=a>0?pjNum(a):'ex. 75'; }
}
function pjWeekCounts(){ var mon=pjMonday(PJ.date); document.querySelectorAll('.pj-day').forEach(function(b,i){ var n=pjCount(pjAdd(mon,i)); var e=b.querySelector('i'); if(e) e.textContent=n?n:'—'; }); }
function pjClear(){ if(!PRODJ[PJ.date]) return; if(!confirm('Vider la production de cette journée ?')) return; pjLoad(); delete PRODJ[PJ.date]; pjSave(); renderProdJ(); pjBadge(); }
function pjCopyPrev(){
  pjLoad(); var prev=null, d=PJ.date;
  for(var i=1;i<=14;i++){ var p=pjAdd(d,-i); if(pjCount(p)){ prev=p; break; } }
  if(!prev){ toast('Aucune journée récente à reprendre','err'); return; }
  if(pjCount(d)&&!confirm('Remplacer par la production du '+pjParse(prev).toLocaleDateString('fr-FR')+' ?')) return;
  PRODJ[d]=JSON.parse(JSON.stringify(PRODJ[prev])); pjSave(); renderProdJ(); pjBadge(); toast('Production reprise du '+pjParse(prev).toLocaleDateString('fr-FR'),'ok');
}
function pjNeedTable(l){ return '<table class="ptb"><tr><th>À peser</th><th>Quantité</th></tr>'+l.map(function(x){ return '<tr><td>'+(x.sub?'<span class="pj-subi">'+ic('sub')+'</span>':'')+esc(x.n)+'</td><td><b>'+pjKg(x.kg)+'</b></td></tr>'; }).join('')+'</table>'; }
function renderPjSum(){
  var el=document.getElementById('pj-sum'); if(!el) return;
  var o=pjCalc(PJ.date);
  if(!o.rec.length){ el.innerHTML=''; return; }
  el.innerHTML='<div class="pj-tots"><div><b>'+pjNum(o.flour)+' kg</b><small>de farine</small></div><div><b>'+pjKg(o.dough)+'</b><small>de pâte</small></div><div><b>'+(o.pcs?o.pcs.toLocaleString('fr-FR'):'—')+'</b><small>pièces</small></div><div><b>'+fEur(o.cost)+'</b><small>coût matière</small></div></div>'+
    '<button class="btn btn-gold btn-full" style="margin-bottom:14px" onclick="pjPDF()">'+ic('printer')+' Tout imprimer (feuille de production)</button>'+
    (o.preps.length?'<div class="cw"><div class="cw-t">'+ic('sub')+' À préparer avant</div>'+o.preps.map(function(p){ return '<div class="pj-pn">'+esc(p.n)+' — '+pjKg(p.kg)+'</div>'+pjNeedTable(p.need); }).join('')+'</div>':'')+
    o.rec.map(function(r){
      return '<div class="cw"><div class="cw-t">'+esc(r.n)+'<span class="sp"></span><span class="pm">'+(r.txt?esc(r.txt)+' = ':'')+pjNum(r.eff)+' '+r.base.lbl+' · '+pjKg(r.dough)+' de pâte</span></div>'+
        pjNeedTable(r.need)+
        (r.rows.length?'<table class="ptb"><tr><th>Division</th><th>Quantité</th></tr>'+r.rows.map(function(x){ var f=x.f;
          return '<tr><td>'+esc(fmtName(f))+' <span class="pm">'+pjKg(fmtPieceKg(f))+(f.mode==='bac'?'/pièce':'')+'</span></td><td><b>'+
            (f.mode==='bac'?x.q.toLocaleString('fr-FR')+' '+fmtUnit(f,x.q)+' = '+fmtPieces(f,x.q).toLocaleString('fr-FR')+' pièces':x.q.toLocaleString('fr-FR')+' '+fmtUnit(f,x.q))+'</b></td></tr>';
        }).join('')+'</table>':'')+'</div>';
    }).join('');
}
function pjNavOn(){
  var t0=pjDay(0), on=function(id,v){ var e=document.getElementById(id); if(e) e.classList.toggle('on',v); };
  on('nav-pj0',CUR==='prod'&&PJ.date===t0); on('nav-pj1',CUR==='prod'&&PJ.date===pjAdd(t0,1)); on('nav-pjw',CUR==='plan');
  on('bn-prod',CUR==='prod'||CUR==='plan');
}
function pjBadge(){
  pjLoad(); var n=pjCount(pjDay(0)), m=pjCount(pjDay(1));
  [['nd-pj0',n],['nd-pj1',m]].forEach(function(a){ var e=document.getElementById(a[0]); if(e){ e.textContent=a[1]; e.classList.toggle('on',a[1]>0); } });
}

// ══ PRODUCTION SEMAINE — tableau façon planning LBDD, en kg de farine ══
var PJ_HIDE=(function(){ try{ return LS.getItem('v4_plan_hide')==='1'; }catch(e){ return false; } })();
function planShift(n){ PJ.week=n?pjAdd(PJ.week||pjMonday(pjDay(0)),n*7):pjMonday(pjDay(0)); renderPlan(); }
function planHide(on){ PJ_HIDE=!!on; try{ LS.setItem('v4_plan_hide',on?'1':''); }catch(e){} renderPlan(); }
function planSecs(){
  var recs=pjProdRecipes(), order=[], cats={};
  try{ if(typeof loadCats==='function') order=(loadCats('rec')||[]).map(function(c){ return typeof c==='string'?c:(c&&c.name)||''; }); }catch(e){}
  recs.forEach(function(r){ var c=r.cat||'Sans catégorie'; (cats[c]=cats[c]||[]).push(r); if(order.indexOf(c)<0) order.push(c); });
  return order.filter(function(c){ return cats[c]; }).map(function(c,i){ return {n:c,col:PJ_SEC_COL[i%PJ_SEC_COL.length],recs:cats[c]}; });
}
function planCell(r,di){ var d=pjDayObj(di)||{q:{},on:{},f:{}}; var t=String(d.f[r.id]||'').trim(), a=t?0:pjFromPieces(r,d); return {t:t,a:a,v:t?pjSum(t):a}; }
function renderPlan(){
  var box=document.getElementById('plan-wrap'); if(!box) return;
  pjLoad(); if(!PJ.week) PJ.week=pjMonday(PJ.date||pjDay(0));
  var mon=PJ.week, days=[0,1,2,3,4,5,6].map(function(i){ return pjAdd(mon,i); }), today=pjDay(0);
  var h='<div class="cw pl-card"><div class="pl-head"><div class="pj-h">Production semaine</div>'+
    '<div class="pl-nav"><button class="pj-wn" onclick="planShift(-1)" aria-label="Semaine précédente">'+ic('chev-left')+'</button><b>Semaine du '+pjParse(days[0]).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' au '+pjParse(days[6]).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+'</b>'+
    '<button class="pj-wn" onclick="planShift(1)" aria-label="Semaine suivante">'+ic('chev-right')+'</button><button class="btn btn-ghost btn-sm" onclick="planShift(0)">Auj.</button></div></div>'+
    '<div class="pl-tools"><button class="btn btn-ghost btn-sm" onclick="planCopyPrevWeek()">'+ic('copy')+' Copier la semaine précédente</button>'+
    '<button class="btn btn-ghost btn-sm" onclick="planPrint()">'+ic('printer')+' Imprimer (A4)</button>'+
    '<label class="pl-sw"><input type="checkbox" '+(PJ_HIDE?'checked ':'')+'onchange="planHide(this.checked)"> Masquer les lignes vides</label></div>';
  var secs=planSecs();
  if(!secs.length){ box.innerHTML=h+'<div class="pj-empty">Aucune recette dans la production. Ouvre une recette, onglet <b>Produits</b>, et coche « Afficher dans la production du jour ».</div></div>'; pjNavOn(); return; }
  var head='<thead><tr><th class="pl-p">Produit</th>'+days.map(function(di,i){ var dd=pjParse(di);
      return '<th class="'+(di===today?'today':'')+'"><button onclick="PJ.date=\''+di+'\';goPage(\'prod\')" title="Ouvrir la production de ce jour">'+PJ_DAYS[i]+'<small>'+dd.getDate()+'/'+(dd.getMonth()+1)+'</small></button></th>'; }).join('')+'</tr></thead>';
  var items=[], tot=days.map(function(){ return 0; });
  secs.forEach(function(s){
    var rows=s.recs.map(function(r){ var cells=days.map(function(di){ return planCell(r,di); }); return {r:r,cells:cells,full:cells.some(function(c){ return c.v>0||c.t; })}; });
    if(PJ_HIDE) rows=rows.filter(function(x){ return x.full; });
    if(!rows.length) return;
    items.push({band:true,html:'<tr class="pl-sec"><td colspan="8" style="background:'+s.col+'">'+esc(s.n)+'</td></tr>',sec:s});
    rows.forEach(function(x){
      var b=pjBase(x.r);
      items.push({sec:s,html:'<tr><td class="pl-p" style="border-left-color:'+s.col+'"><span class="pl-nm">'+esc(x.r.name)+'</span> <span class="pl-u">'+b.lbl+'</span></td>'+x.cells.map(function(c,i){
        if(b.flour) tot[i]+=c.v;
        return '<td class="'+(days[i]===today?'today':'')+'"><input class="pl-in'+(c.t?' has':'')+'" value="'+esc(c.t)+'"'+(c.t.length>6?' title="'+esc(c.t)+'"':'')+' placeholder="'+(c.a>0?pjNum(c.a):'')+'" onchange="planSet(\''+days[i]+'\',\''+x.r.id+'\',this.value)" aria-label="'+esc(x.r.name)+' '+PJ_DAYS[i]+'"></td>';
      }).join('')+'</tr>'});
    });
  });
  var foot='<tr class="pl-tot"><td class="pl-p">Total farine</td>'+tot.map(function(t,i){ return '<td class="'+(days[i]===today?'today':'')+'">'+(t?pjNum(t):'')+'</td>'; }).join('')+'</tr>';
  var table=function(rows,withFoot){ return '<table class="pl-tbl">'+head+'<tbody>'+rows+'</tbody>'+(withFoot?'<tfoot>'+foot+'</tfoot>':'')+'</table>'; };
  // grand écran : deux moitiés côte à côte (comme le planning LBDD), coupure entre deux lignes
  var wide=(document.getElementById('scroll')||document.body).clientWidth>=1180&&items.length>=14, grid;
  if(wide){
    var cut=Math.ceil(items.length/2); if(items[cut-1]&&items[cut-1].band) cut--;
    var L=items.slice(0,cut), R=items.slice(cut), suite=R.length&&!R[0].band?'<tr class="pl-sec"><td colspan="8" style="background:'+R[0].sec.col+'">'+esc(R[0].sec.n)+' (suite)</td></tr>':'';
    grid='<div class="pl-cols"><div class="pl-scroll">'+table(L.map(function(x){ return x.html; }).join(''),false)+'</div><div class="pl-scroll">'+table(suite+R.map(function(x){ return x.html; }).join(''),true)+'</div></div>';
  } else grid='<div class="pl-scroll">'+table(items.map(function(x){ return x.html; }).join(''),true)+'</div>';
  h+=grid+'<div class="pm" style="margin-top:8px">Saisie en kg de farine : « 75+75 » = deux pétrissées de 75 kg. En <i>italique</i> : calculé depuis les pièces saisies dans la production du jour. Touche un jour pour ouvrir ses pesées.</div></div>';
  box.innerHTML=h; pjNavOn();
}
function planSet(iso,rid,v){
  pjLoad(); var d=pjDayObj(iso,true), t=String(v||'').trim();
  if(t){ d.f[rid]=t; d.on[rid]=1; } else delete d.f[rid];
  pjTidy(iso); pjSave(); pjBadge(); renderPlan();
}
function planCopyPrevWeek(){
  pjLoad(); var mon=PJ.week, prev=pjAdd(mon,-7), any=false, has=false;
  for(var i=0;i<7;i++){ if(PRODJ[pjAdd(prev,i)]) any=true; if(PRODJ[pjAdd(mon,i)]) has=true; }
  if(!any){ toast('La semaine précédente est vide','err'); return; }
  if(has&&!confirm('Remplacer cette semaine par la semaine précédente ?')) return;
  for(var j=0;j<7;j++){ var s=PRODJ[pjAdd(prev,j)], t=pjAdd(mon,j); if(s) PRODJ[t]=JSON.parse(JSON.stringify(s)); else delete PRODJ[t]; }
  pjSave(); pjBadge(); renderPlan(); toast('Semaine précédente copiée','ok');
}
function planPrint(){
  toast('Génération PDF…','info');
  var go=function(){ try{
    var doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    var M=10, W=297, cw=W-2*M, c0=70, cd=(cw-c0)/7, y=M, BR=[56,21,21], mon=PJ.week, days=[0,1,2,3,4,5,6].map(function(i){ return pjAdd(mon,i); });
    var T=function(t){ return String(t).replace(/[’]/g,"'").replace(/ | /g,' '); };
    if(window.LOGO_V){ try{ doc.addImage(window.LOGO_V,'PNG',M,y-1,5,11); }catch(e){} }
    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(BR[0],BR[1],BR[2]);doc.text(T('Production semaine — kg de farine'),M+8,y+4);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(110,90,85);doc.text(T('Maison Viennet · semaine du '+pjParse(days[0]).toLocaleDateString('fr-FR')+' au '+pjParse(days[6]).toLocaleDateString('fr-FR')),M+8,y+9);
    y+=14;
    var hdr=function(){ doc.setFillColor(239,229,218);doc.rect(M,y,cw,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(BR[0],BR[1],BR[2]);doc.text('Produit',M+2,y+4.8);
      days.forEach(function(di,i){ var d=pjParse(di); doc.text(PJ_DAYS[i]+' '+d.getDate()+'/'+(d.getMonth()+1),M+c0+cd*i+cd/2,y+4.8,{align:'center'}); }); y+=7; };
    hdr();
    planSecs().forEach(function(s){
      var rows=s.recs.map(function(r){ return {r:r,c:days.map(function(di){ return planCell(r,di); })}; });
      if(PJ_HIDE) rows=rows.filter(function(x){ return x.c.some(function(c){ return c.v>0||c.t; }); });
      if(!rows.length) return;
      if(y>186){ doc.addPage(); y=M; hdr(); }
      var col=s.col.match(/\w\w/g).map(function(x){ return parseInt(x,16); });
      doc.setFillColor(col[0],col[1],col[2]);doc.rect(M,y,cw,6,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(T(s.n.toUpperCase()),M+2,y+4.2);y+=6;
      rows.forEach(function(x,k){
        if(y>192){ doc.addPage(); y=M; hdr(); }
        doc.setFillColor(k%2?255:250,k%2?255:246,k%2?255:241);doc.rect(M,y,cw,6.5,'F');doc.setDrawColor(226,212,197);doc.line(M,y+6.5,M+cw,y+6.5);
        doc.setTextColor(40,20,20);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(T(x.r.name),M+2,y+4.5,{maxWidth:c0-4});
        x.c.forEach(function(c,i){ var t=c.t||(c.a>0?pjNum(c.a):''); if(!t) return; doc.setFont('helvetica',c.t?'bold':'italic');doc.text(T(t),M+c0+cd*i+cd/2,y+4.5,{align:'center'}); });
        y+=6.5;
      });
    });
    doc.save('production-semaine-'+mon+'.pdf'); toast('PDF téléchargé','ok');
  }catch(e){ console.error(e); toast('Erreur PDF','err'); } };
  if(window.jspdf) go(); else { var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload=go; s.onerror=function(){ toast('Erreur PDF (connexion ?)','err'); }; document.head.appendChild(s); }
}

// ══ RECETTES → onglet PRODUITS ══
function pjOpenProducts(){ PJ.recTab='prod'; if(CUR!=='recettes') goPage('recettes'); else pjRecTabs(); }
function pjSetRecTab(t){ PJ.recTab=t; pjRecTabs(); }
function pjRecTabs(){
  var pg=document.getElementById('p-recettes'); if(!pg) return;
  var bar=document.getElementById('pj-rtabs');
  if(!bar){ bar=document.createElement('div'); bar.id='pj-rtabs'; bar.className='seg pj-rtabs'; pg.insertBefore(bar,pg.firstChild); }
  var pw=document.getElementById('pj-prods');
  if(!pw){ pw=document.createElement('div'); pw.id='pj-prods'; pw.className='narrow wide'; pg.appendChild(pw); }
  var nP=recipes.reduce(function(a,r){ return a+pjFormats(r).length; },0);
  bar.innerHTML='<button class="'+(PJ.recTab==='rec'?'on':'')+'" onclick="pjSetRecTab(\'rec\')">'+ic('book')+' Recettes</button><button class="'+(PJ.recTab==='prod'?'on':'')+'" onclick="pjSetRecTab(\'prod\')">'+ic('layers')+' Produits'+(nP?' <span class="pj-n">'+nP+'</span>':'')+'</button>';
  var mine=document.getElementById('rec-mine');
  if(mine) mine.style.display=PJ.recTab==='prod'?'none':'';
  pw.style.display=PJ.recTab==='prod'?'':'none';
  if(PJ.recTab==='prod') renderProducts();
}
function renderProducts(){
  var el=document.getElementById('pj-prods'); if(!el) return;
  var all=recipes.slice().sort(pjSortRec), recs=pjFmtRecipes();
  // recettes affichées dans la production
  var h='<div class="cw"><div class="cw-t">'+ic('wheat')+' Recettes dans la production du jour</div><div class="pm" style="margin:-4px 0 10px">Coche les recettes à afficher dans la production du jour, de demain et dans le tableau de la semaine.</div><div class="pp-in">';
  var c0=null;
  all.forEach(function(r){
    if((r.cat||'')!==c0){ c0=r.cat||''; h+='<div class="pj-cat">'+esc(c0||'Sans catégorie')+'</div>'; }
    var on=pjShown(r);
    h+='<label class="pj-chk pp-chip'+(on?' on':'')+'"><input type="checkbox" '+(on?'checked ':'')+'onchange="ppInProd(\''+r.id+'\',this.checked)"><span class="pj-box"></span><span class="pj-rn">'+esc(r.name)+'</span></label>';
  });
  h+='</div></div>';
  h+='<div class="cw"><div class="cw-t">'+ic('plus')+' Ajouter un produit</div><div class="pj-addp">'+
    '<select class="fi" id="pp-rec" aria-label="Recette"><option value="">Recette…</option>'+all.map(function(r){ return '<option value="'+r.id+'">'+esc(r.name)+'</option>'; }).join('')+'</select>'+
    '<button class="btn btn-gold btn-sm" onclick="ppAdd(\'piece\')">'+ic('plus')+' Pièce</button><button class="btn btn-beige btn-sm" onclick="ppAdd(\'bac\')">'+ic('plus')+' Bac divisé</button></div>'+
    '<div class="pm" style="margin-top:8px">Une pièce = un poids de pâte (baguette 350 g). Un bac divisé = un poids de bac et un nombre de pièces (bac de 6 kg en 30 pièces).</div></div>';
  if(!recs.length){ el.innerHTML=h+'<div class="pj-empty">Aucun produit pour l’instant.</div>'; return; }
  var cat=null;
  recs.forEach(function(r){
    if((r.cat||'')!==cat){ if(cat!==null) h+='</div>'; cat=r.cat||''; h+='<div class="pj-cat">'+esc(cat||'Sans catégorie')+'</div><div class="pp-grid">'; }
    pjFormats(r).forEach(function(f){
      var bac=f.mode==='bac';
      h+='<div class="pp-card"><div class="pp-h"><span class="pj-tag">'+(bac?'Bac divisé':'Pièce')+'</span><input class="fi sm" value="'+esc(f.n||'')+'" placeholder="Nom du produit" aria-label="Nom du produit" onchange="ppSet(\''+r.id+'\',\''+f.id+'\',\'n\',this.value)">'+
        '<button class="re-ib" title="Supprimer" aria-label="Supprimer" onclick="ppDel(\''+r.id+'\',\''+f.id+'\')">'+ic('trash')+'</button></div>'+
        '<div class="pp-r" onclick="openEditRec(\''+r.id+'\');reTab(\'prod\')" title="Ouvrir la recette">'+esc(r.name)+'</div>'+
        '<div class="pj-fe-g"><label><small>'+(bac?'Poids du bac (g)':'Poids de pâte (g)')+'</small><input class="fi sm" type="number" inputmode="decimal" min="0" value="'+(f.w||'')+'" onchange="ppSet(\''+r.id+'\',\''+f.id+'\',\'w\',this.value)"></label>'+
        (bac?'<label><small>Divisé en (pièces)</small><input class="fi sm" type="number" inputmode="numeric" min="0" value="'+(f.pcs||'')+'" onchange="ppSet(\''+r.id+'\',\''+f.id+'\',\'pcs\',this.value)"></label>':'')+
        '<div class="pj-fe-i">'+(bac&&pjN(f.pcs)>0?'→ '+pjKg(fmtPieceKg(f))+' par pièce':'')+'</div></div></div>';
    });
  });
  h+='</div>';
  el.innerHTML=h;
}
function ppRec(rid){ return recipes.find(function(r){ return r.id===rid; }); }
function ppTouch(r){ r.updatedAt=new Date().toISOString(); persist(); }
function ppInProd(rid,on){ var r=ppRec(rid); if(!r) return; r.inProd=!!on; ppTouch(r); renderProducts(); pjBadge(); }
function ppAdd(mode){
  var s=document.getElementById('pp-rec'), r=s&&ppRec(s.value); if(!r){ toast('Choisis la recette','err'); return; }
  r.formats=(r.formats||[]).filter(function(f){ return pjN(f.w)>0; });
  r.formats.push(mode==='bac'?{id:uid(),mode:'bac',n:'Bac '+r.name,w:6000,pcs:30}:{id:uid(),mode:'piece',n:r.name,w:350});
  if(r.inProd==null) r.inProd=true;
  ppTouch(r); pjRecTabs(); toast('Produit ajouté : ajuste son nom et son poids','ok');
}
function ppSet(rid,fid,k,v){ var r=ppRec(rid); if(!r) return; var f=(r.formats||[]).find(function(x){ return x.id===fid; }); if(!f) return;
  if(k==='w'&&pjN(v)<=0){ toast('Poids requis','err'); renderProducts(); return; }
  f[k]=k==='n'?String(v).trim():pjN(v); ppTouch(r); renderProducts(); }
function ppDel(rid,fid){ var r=ppRec(rid); if(!r) return; if(!confirm('Supprimer ce produit ?')) return;
  r.formats=(r.formats||[]).filter(function(x){ return x.id!==fid; }); if(!r.formats.length) delete r.formats;
  ppTouch(r); pjRecTabs(); }

// ── feuille PDF du jour ──
function pjPDF(){
  var o=pjCalc(PJ.date); if(!o.rec.length){ toast('Saisis au moins une quantité','err'); return; }
  toast('Génération PDF…','info');
  if(window.jspdf){ pjDoPDF(o); return; }
  var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=function(){ pjDoPDF(o); }; s.onerror=function(){ toast('Erreur PDF (connexion ?)','err'); }; document.head.appendChild(s);
}
function pjDoPDF(o){
  try{
    var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var W=210,M=16,cw=W-M*2,y=M,c2=cw*0.62, BR=[56,21,21];
    var T=function(t){ return String(t).replace(/[’]/g,"'").replace(/ | /g,' '); };
    if(window.LOGO_V){ try{ doc.addImage(window.LOGO_V,'PNG',M,y-2,6,13); }catch(e){} }
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(BR[0],BR[1],BR[2]);doc.text('Feuille de production',M+9,y+5);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(110,90,85);
    doc.text(T('Maison Viennet  ·  '+pjLabel(PJ.date)+'  ·  '+pjNum(o.flour)+' kg de farine  ·  '+pjKg(o.dough)+' de pâte'),M+9,y+11);
    y+=18;
    function band(l){ if(y>262){doc.addPage();y=M;} doc.setFillColor(BR[0],BR[1],BR[2]);doc.rect(M,y,cw,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text(T(l),M+2,y+5);y+=7; }
    function rows(list){ list.forEach(function(r,i){ if(y>278){doc.addPage();y=M;} doc.setFillColor(i%2?255:247,i%2?255:241,i%2?255:234);doc.rect(M,y,cw,6.5,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(40,20,20);doc.text(T(r[0]),M+2,y+4.6,{maxWidth:c2-4});doc.setFont('helvetica','bold');doc.text(T(r[1]),M+c2+2,y+4.6);y+=6.5; }); y+=3; }
    o.preps.forEach(function(p){ band('A préparer avant : '+p.n+' — '+pjKg(p.kg)); rows(p.need.map(function(x){ return [(x.sub?'> ':'')+x.n,pjKg(x.kg)]; })); });
    o.rec.forEach(function(r){
      band(r.n+' — '+(r.txt?r.txt+' = ':'')+pjNum(r.eff)+' '+r.base.lbl+' · '+pjKg(r.dough)+' de pâte');
      rows(r.need.map(function(x){ return [(x.sub?'> ':'')+x.n,pjKg(x.kg)]; }));
      if(r.rows.length) rows(r.rows.map(function(x){ var f=x.f; return [fmtName(f)+' ('+pjKg(fmtPieceKg(f))+(f.mode==='bac'?'/pièce':'')+')', f.mode==='bac'?x.q+' '+fmtUnit(f,x.q)+' = '+fmtPieces(f,x.q)+' pièces':x.q+' '+fmtUnit(f,x.q)]; }));
    });
    doc.save('production-'+PJ.date+'.pdf'); toast('PDF téléchargé','ok');
  }catch(e){ console.error(e); toast('Erreur PDF','err'); }
}

// ══ ÉDITEUR DE RECETTE : onglet « Produits » ══
function pjFmtRender(){
  var el=document.getElementById('r-fmts'); if(!el) return;
  el.innerHTML=PJ.fmtEd.length?PJ.fmtEd.map(function(f,i){
    var bac=f.mode==='bac';
    return '<div class="pj-fe"><div class="pj-fe-h"><span class="pj-tag">'+(bac?'Bac divisé':'Pièce')+'</span>'+
      '<input class="fi sm" placeholder="'+(bac?'Nom (ex. Bac pain de mie)':'Nom (ex. Baguette)')+'" value="'+esc(f.n||'')+'" oninput="pjFmtSet('+i+',\'n\',this.value)">'+
      '<button class="re-ib" onclick="pjFmtDel('+i+')" title="Supprimer" aria-label="Supprimer">'+ic('trash')+'</button></div>'+
      '<div class="pj-fe-g"><label><small>'+(bac?'Poids du bac (g)':'Poids de pâte (g)')+'</small><input class="fi sm" type="number" inputmode="decimal" min="0" value="'+(f.w||'')+'" oninput="pjFmtSet('+i+',\'w\',this.value)"></label>'+
      (bac?'<label><small>Divisé en (pièces)</small><input class="fi sm" type="number" inputmode="numeric" min="0" value="'+(f.pcs||'')+'" oninput="pjFmtSet('+i+',\'pcs\',this.value)"></label>':'')+
      '<div class="pj-fe-i" id="pj-fe-i-'+i+'">'+pjFmtInfo(f)+'</div></div></div>';
  }).join(''):'<div class="pm">Aucun produit. Ajoute ce que cette recette produit (facultatif : la production peut aussi se saisir en kg de farine).</div>';
}
function pjFmtInfo(f){ return f.mode==='bac'&&pjN(f.w)>0&&pjN(f.pcs)>0?'→ '+pjKg(fmtPieceKg(f))+' par pièce':''; }
function pjInProdSync(){ var c=document.getElementById('r-inprod'); if(c){ c.checked=!!PJ.inProdEd; var l=c.closest('.pj-chk'); if(l) l.classList.toggle('on',!!PJ.inProdEd); } }
function pjInProdEd(on){ PJ.inProdEd=!!on; PJ.inProdTouched=true; pjInProdSync(); }
function pjFmtAdd(mode){ PJ.fmtEd.push(mode==='bac'?{id:uid(),mode:'bac',n:'',w:'',pcs:''}:{id:uid(),mode:'piece',n:'',w:''}); if(!PJ.inProdTouched){ PJ.inProdEd=true; pjInProdSync(); } pjFmtRender(); }
function pjFmtDel(i){ PJ.fmtEd.splice(i,1); pjFmtRender(); }
function pjFmtSet(i,k,v){ var f=PJ.fmtEd[i]; if(!f) return; f[k]=(k==='n')?v:pjN(v); var e=document.getElementById('pj-fe-i-'+i); if(e) e.innerHTML=pjFmtInfo(f); }
function pjFmtLoad(r){
  PJ.fmtEd=((r&&r.formats)||[]).map(function(f){ return Object.assign({mode:'piece'},f); });
  PJ.inProdEd=r?pjShown(r):false; PJ.inProdTouched=!!(r&&r.inProd!=null);
  pjInProdSync(); pjFmtRender();
}

// ══ MISE EN PLACE ══
(function(){
  var st=document.createElement('style');
  st.textContent=[
    '#nav-bons,#bn-bons,#nav-livre,#bn-livre,#nav-partage,#bn-partage,#nav-fournisseurs,#bn-fournisseurs,#r-share-card,#bk-m-btn,#h-cur,#h-week,#h-recents,#h-recents-hd,#rec-tabs,#shared-wrap,.sb-crest,.gate-crest,[data-crest]{display:none!important}',
    '.sb-logo .mf-v{display:block;height:58px;width:auto;margin:0 auto 8px}#shell.col .sb-logo .mf-v{height:34px;margin-bottom:0}',
    '[data-theme=dark] .mf-v{filter:brightness(0) invert(.9)}',
    '.pj-card{padding:18px}.pj-h{font-size:18px;font-weight:700;color:var(--i)}.pj-sub{font-size:13px;color:var(--i4);margin:3px 0 12px}',
    '.pj-lbl{font-size:12px;font-weight:700;color:var(--i3);margin:12px 0 6px}',
    '.pj-week{display:flex;gap:6px;align-items:stretch}.pj-wn{border:0;background:var(--p2);color:var(--i);border-radius:10px;min-width:34px;min-height:38px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}',
    '.pj-wn .ic{width:18px;height:18px}',
    '.pj-day{flex:1;min-width:0;border:1px solid var(--bd2);background:var(--card);color:var(--i3);border-radius:10px;padding:7px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;font:inherit}',
    '.pj-day b{font-size:13px;color:var(--i)}.pj-day span{font-size:11px}.pj-day i{font-style:normal;font-size:11px;font-weight:700;color:var(--am2)}',
    '.pj-day.today{border-color:var(--i3);border-width:2px}.pj-day.on{background:var(--i);border-color:var(--i);color:var(--on-i)}.pj-day.on b,.pj-day.on i{color:var(--on-i)}',
    '.pj-date{font-weight:700;color:var(--i);margin:12px 0 4px;display:flex;align-items:center;gap:6px}.pj-date .ic{width:17px;height:17px}',
    '.pj-cat{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--i4);margin:14px 0 6px}',
    '.pj-rec{border:1px solid var(--bd);border-radius:12px;margin-bottom:6px;background:var(--card)}.pj-rec.on{border-color:var(--i3)}',
    '.pj-chk{display:flex;align-items:center;gap:10px;padding:11px 12px;cursor:pointer;position:relative}.pj-chk input{position:absolute;opacity:0;pointer-events:none}',
    '.pj-box{width:22px;height:22px;border-radius:7px;border:2px solid var(--bd2);flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--card)}',
    '.pj-chk input:checked+.pj-box{background:var(--i);border-color:var(--i)}.pj-chk input:checked+.pj-box:after{content:"";width:6px;height:11px;border:solid var(--on-i);border-width:0 2.5px 2.5px 0;transform:rotate(45deg) translate(-1px,-1px)}',
    '.pj-chk input:focus-visible+.pj-box{outline:2px solid var(--i);outline-offset:2px}',
    '.pj-rn{font-weight:600;color:var(--i);font-size:15px}.pj-rn small{display:block;font-weight:400;color:var(--i4);font-size:12px;margin-top:2px}',
    '.pj-opt{padding:4px 0}',
    '.pj-rows{padding:0 12px 6px 44px}.pj-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--bd)}',
    '.pj-fn{flex:1;min-width:0;color:var(--i);font-size:14px}.pj-fn small{display:block;color:var(--i4);font-size:12px}',
    '.pj-in{display:flex;align-items:center;gap:6px}.pj-in input{width:96px;text-align:right}.pj-in small{color:var(--i4);font-size:11px;width:54px}',
    '.pj-kgf::placeholder{font-style:italic;font-weight:700;color:var(--i3);opacity:.9}',
    '.pj-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.pj-acts .btn,.pl-tools .btn{display:inline-flex;align-items:center;gap:6px}',
    '.pj-empty{color:var(--i3);font-size:14px;padding:14px;border:1px dashed var(--bd2);border-radius:12px;margin-top:10px;text-align:center}',
    '.pj-tots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 12px}@media (max-width:560px){.pj-tots{grid-template-columns:repeat(2,1fr)}}',
    '.pj-tots>div{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px;text-align:center}',
    '.pj-tots b{display:block;font-size:17px;color:var(--i)}.pj-tots small{color:var(--i4);font-size:11px}',
    '.pj-pn{font-weight:600;margin:8px 0 0;color:var(--i)}.pj-subi .ic{width:13px;height:13px;margin-right:4px;vertical-align:-2px;color:var(--i4)}',
    '.ptb{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
    '.ptb th{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--i4);text-align:right;padding:5px 4px;border-bottom:1px solid var(--bd);font-weight:600}',
    '.ptb td{padding:6px 4px;border-bottom:1px solid var(--bd);text-align:right;color:var(--i)}',
    '.ptb th:first-child,.ptb td:first-child{text-align:left}.pm{font-size:12px;color:var(--i4)}',
    '.pj-fe{border:1px solid var(--bd);border-radius:12px;padding:10px;margin-bottom:8px}',
    '.pj-fe-h,.pp-h{display:flex;gap:8px;align-items:center}.pj-fe-h input,.pp-h input{flex:1;min-width:0}',
    '.pj-tag{font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;background:var(--p2);color:var(--i);white-space:nowrap}',
    '.pj-fe-g{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:8px}.pj-fe-g label{display:flex;flex-direction:column;gap:3px;width:130px}',
    '.pj-fe-g small{color:var(--i4);font-size:11px}.pj-fe-i{color:var(--i3);font-size:13px;font-weight:600;padding-bottom:9px}',
    '.pj-rtabs{margin:0 auto 14px;max-width:420px;display:flex}.pj-rtabs button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px}',
    '.pj-n{font-size:11px;background:var(--p2);color:var(--i);border-radius:99px;padding:1px 7px}.pj-rtabs button.on .pj-n{background:rgba(var(--on-rgb),.2);color:inherit}',
    '.pj-addp{display:flex;gap:8px;flex-wrap:wrap}.pj-addp select{flex:1;min-width:180px}',
    '.pp-in{display:flex;flex-wrap:wrap;gap:6px}.pp-in .pj-cat{flex-basis:100%;margin:8px 0 0}',
    '.pp-chip{border:1px solid var(--bd);border-radius:12px;padding:8px 12px;background:var(--card)}.pp-chip.on{border-color:var(--i3)}.pp-chip .pj-rn{font-size:14px}',
    '.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}',
    '.pp-card{border:1px solid var(--bd);border-radius:14px;padding:12px;background:var(--card)}',
    '.pp-r{font-size:12px;color:var(--i4);margin:6px 0 0;cursor:pointer;text-decoration:underline dotted}',
    // tableau de la semaine
    '#p-plan .narrow.wide{max-width:none}',
    '.pl-card{padding:14px}.pl-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
    '.pl-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pl-nav b{font-size:14px;color:var(--i);min-width:190px;text-align:center}',
    '.pl-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
    '.pl-sw{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--i);cursor:pointer;padding:6px 10px;border:1px solid var(--bd2);border-radius:10px;background:var(--card)}',
    '.pl-sw input{margin:0;accent-color:var(--i)}',
    '.pl-cols{display:flex;gap:14px;align-items:flex-start}.pl-cols>.pl-scroll{flex:1 1 0;min-width:0}',
    '.pl-scroll{overflow-x:auto;border:1px solid var(--bd);border-radius:12px;background:var(--card)}',
    '.pl-tbl{border-collapse:collapse;width:100%;font-size:13px}',
    '.pl-tbl th,.pl-tbl td{border:1px solid var(--bd);padding:1px 2px;text-align:center;color:var(--i)}',
    '.pl-tbl thead th{background:var(--beige);font-size:11.5px;line-height:1.2;position:sticky;top:0;z-index:2}',
    '.pl-tbl thead th.today{background:var(--i)}.pl-tbl thead th.today button,.pl-tbl thead th.today small{color:var(--on-i)}',
    '.pl-tbl th button{border:0;background:none;font:inherit;font-weight:700;color:var(--i);cursor:pointer;display:flex;flex-direction:column;align-items:center;width:100%;padding:4px 0}',
    '.pl-tbl th small{font-size:10.5px;font-weight:400;color:var(--i4)}',
    '.pl-tbl th.pl-p{text-align:left;padding:4px 8px}',
    '.pl-tbl td.pl-p{text-align:left;padding:3px 8px;min-width:130px;border-left-width:4px;font-size:12.5px;line-height:1.25}',
    '.pl-nm{font-weight:700}.pl-u{font-size:10px;color:var(--i4);white-space:nowrap}',
    '.pl-tbl thead th+th,.pl-tbl tbody td+td,.pl-tbl tfoot td+td{width:70px}',
    '.pl-in{width:100%;min-width:48px;box-sizing:border-box;border:1px solid var(--bd2);border-radius:6px;background:var(--card);padding:5px 2px;text-align:center;font:inherit;font-size:13px;color:var(--i)}',
    '.pl-in:focus{outline:none;border-color:var(--i);background:var(--p)}.pl-in.has{font-weight:700;background:var(--p2)}',
    '.pl-in::placeholder{color:var(--i3);font-style:italic;font-weight:700;opacity:.95}',
    '.pl-tbl td.today{background:rgba(var(--ink-rgb),.04)}',
    '.pl-tbl tr.pl-sec td{text-align:left;color:#fff;font-weight:700;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;padding:5px 8px;border-color:rgba(0,0,0,.08)}',
    '.pl-tbl tr.pl-tot td{font-weight:700;background:var(--p2);font-size:12px;padding:6px 2px}.pl-tbl tr.pl-tot td.pl-p{padding:6px 8px}',
    '@media (max-width:700px){.pl-tbl{min-width:640px}.pl-tbl td.pl-p{min-width:110px;max-width:130px}}'
  ].join('\n');
  document.head.appendChild(st);

  // pages
  var sc=document.getElementById('scroll');
  [['prod','pj-wrap'],['plan','plan-wrap']].forEach(function(p){
    if(sc&&!document.getElementById('p-'+p[0])){ var d=document.createElement('div'); d.id='p-'+p[0]; d.className='pg'; d.style.display='none'; d.innerHTML='<div class="narrow wide" id="'+p[1]+'"></div>'; sc.appendChild(d); }
    if(window.ALLP&&ALLP.indexOf(p[0])<0) ALLP.push(p[0]);
  });

  // groupe « Autres » vide (messages masqués) : on retire son titre
  Array.prototype.forEach.call(document.querySelectorAll('.sb-grp'),function(g){ if(g.textContent.trim()==='Autres'){ var n=g.nextElementSibling; if(n&&n.id==='nav-chat') g.style.display='none'; } });
  // menu : groupe « Production » après Catalogue
  var cat=document.getElementById('nav-catalogue');
  if(cat&&cat.parentNode&&!document.getElementById('nav-pj0')){
    var frag=document.createDocumentFragment();
    var h=document.createElement('div'); h.className='sb-grp'; h.setAttribute('role','presentation'); h.textContent='Production'; frag.appendChild(h);
    [['nav-pj0','Production du jour','wheat','prodGo(0)','nd-pj0'],['nav-pj1','Production de demain','clock','prodGo(1)','nd-pj1'],['nav-pjw','Production semaine','calendar',"PJ.week='';goPage('plan')",'']].forEach(function(a){
      var e=document.createElement('div'); e.className='sbi'; e.id=a[0]; e.title=a[1]; e.setAttribute('onclick',a[3]);
      e.innerHTML='<span class="sb-ic">'+ic(a[2])+'</span><span class="sb-lb">'+a[1]+'</span>'+(a[4]?'<span class="sb-bd" id="'+a[4]+'">0</span>':'');
      frag.appendChild(e);
    });
    cat.parentNode.insertBefore(frag,cat.nextSibling);
  }
  var bcat=document.getElementById('bn-catalogue');
  if(bcat&&bcat.parentNode&&!document.getElementById('bn-prod')){
    var bb=document.createElement('div'); bb.className='bni'; bb.id='bn-prod'; bb.setAttribute('onclick','prodGo(0)');
    bb.innerHTML='<div class="bni-ic">'+ic('wheat')+'</div><div class="bni-lb">Production</div>';
    bcat.parentNode.insertBefore(bb,bcat.nextSibling);
  }

  // éditeur de recette
  var _on=openNewRec; openNewRec=function(){ var r=_on.apply(this,arguments); pjFmtLoad(null); return r; };
  var _oe=openEditRec; openEditRec=function(id){ var r=_oe.apply(this,arguments); pjFmtLoad(recipes.find(function(x){return x.id===id;})); return r; };
  var _sv=saveRecipe; saveRecipe=function(){
    var before={}; recipes.forEach(function(r){ before[r.id]=1; });
    var wasId=editRecId, res=_sv.apply(this,arguments);
    var rec=wasId?recipes.find(function(r){ return r.id===wasId; }):recipes.find(function(r){ return !before[r.id]; });
    if(rec){
      var f=PJ.fmtEd.filter(function(x){ return pjN(x.w)>0; }).map(function(x){ var o={id:x.id,mode:x.mode==='bac'?'bac':'piece',n:String(x.n||'').trim(),w:pjN(x.w)}; if(o.mode==='bac') o.pcs=pjN(x.pcs); return o; });
      var old=JSON.stringify([rec.formats||[],rec.inProd]);
      if(f.length) rec.formats=f; else delete rec.formats;
      if(PJ.inProdTouched||PJ.inProdEd) rec.inProd=!!PJ.inProdEd;
      if(JSON.stringify([rec.formats||[],rec.inProd])!==old) persist();
    }
    return res;
  };

  // navigation (posée après toutes les autres extensions)
  setTimeout(function(){
    var _g=goPage;
    goPage=function(p){
      if(p==='bons'||p==='edit'||p==='livre'||p==='partage'||p==='fournisseurs') p='recettes';
      if(p==='fab') p='prod';
      var r=_g.call(this,p);
      ['prod','plan'].forEach(function(id){ var e=document.getElementById('p-'+id); if(e) e.style.display=(p===id)?'block':'none'; });
      if(p==='prod'||p==='plan'){
        var bc=document.getElementById('tb-bc'); if(bc){ bc.style.display='block'; bc.textContent=p==='prod'?'Production du jour':'Production semaine'; }
        var act=document.getElementById('tb-act'); if(act) act.innerHTML=p==='prod'?'<button class="tbtn gold" onclick="pjPDF()">'+ic('pdf')+' Feuille</button>':'<button class="tbtn gold" onclick="planPrint()">'+ic('printer')+' Imprimer</button>';
        if(p==='prod') renderProdJ(); else renderPlan();
      }
      if(p==='recettes') pjRecTabs();
      pjNavOn();
      return r;
    };
    var rz=null; window.addEventListener('resize',function(){ if(CUR!=='plan') return; clearTimeout(rz); rz=setTimeout(renderPlan,200); });
  },0);
  try{ pjLoad(); pjBadge(); }catch(e){}
})();
