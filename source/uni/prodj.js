// ══ PRODUCTION — Mon Fournil · Maison Viennet ══════════════════════════════
// • Produits : chaque recette décrit ce qu'elle produit (r.formats) :
//     mode 'piece' : une pièce de w grammes de pâte (ex. baguette 350 g)
//     mode 'bac'   : un bac de w grammes divisé en pcs pièces (ex. bac de 6 kg → 30 pièces)
// • Production du jour : semaine, on coche les recettes du jour puis on saisit les quantités.
// • Production semaine : la même saisie vue sur 7 jours, rangée par catégorie de recette.
// Données : v4_prodj { 'AAAA-MM-JJ': { q:{idProduit:quantité}, on:{idRecette:1} } }, suit le compte.
var PRODJ={}, PJ={date:'', week:'', fmtEd:[], recTab:'rec'};
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
var PJ_DAYS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
function pjLoad(){
  var raw; try{ raw=JSON.parse(LS.getItem('v4_prodj')||'null')||{}; }catch(e){ raw={}; }
  Object.keys(raw).forEach(function(d){ var v=raw[d]; if(v&&!v.q&&!v.on){ raw[d]={q:v,on:{}}; } });
  PRODJ=raw;
}
function pjSave(){ try{ LS.setItem('v4_prodj',JSON.stringify(PRODJ)); }catch(e){} }
function pjDayObj(iso,make){ var d=PRODJ[iso]; if(!d&&make) d=PRODJ[iso]={q:{},on:{}}; if(d){ d.q=d.q||{}; d.on=d.on||{}; } return d; }
function pjTidy(iso){ var d=PRODJ[iso]; if(d&&!Object.keys(d.q||{}).length&&!Object.keys(d.on||{}).length) delete PRODJ[iso]; }
function pjLabel(iso){
  var t=pjDay(0), lbl=iso===t?'Aujourd’hui':iso===pjAdd(t,1)?'Demain':iso===pjAdd(t,-1)?'Hier':'';
  var s=pjParse(iso).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  return (lbl?lbl+' · ':'')+s.charAt(0).toUpperCase()+s.slice(1);
}
function pjFormats(r){ return (r.formats||[]).filter(function(f){ return pjN(f.w)>0; }); }
function pjProdRecipes(){ return recipes.filter(function(r){ return pjFormats(r).length; }).sort(function(a,b){ return (a.cat||'').localeCompare(b.cat||'','fr')||a.name.localeCompare(b.name,'fr'); }); }
function fmtName(f){ return f.n||(f.mode==='bac'?'Bac':'Pièce'); }
function fmtPieceKg(f){ return f.mode==='bac'?(pjN(f.pcs)>0?pjN(f.w)/1000/pjN(f.pcs):0):pjN(f.w)/1000; }
function fmtPieces(f,q){ return f.mode==='bac'?q*pjN(f.pcs):q; }
function fmtDoughKg(f,q){ return pjN(f.w)/1000*q; }
function fmtDesc(f){
  if(f.mode==='bac') return 'bac de '+pjKg(pjN(f.w)/1000)+(pjN(f.pcs)>0?' → '+pjN(f.pcs)+' pièces de '+pjKg(fmtPieceKg(f)):'');
  return pjKg(pjN(f.w)/1000)+' de pâte';
}
function fmtUnit(f,q){ return f.mode==='bac'?(q>1?'bacs':'bac'):(q>1?'pièces':'pièce'); }
function pjRecOn(iso,r){ var d=pjDayObj(iso); if(!d) return false; if(d.on[r.id]) return true; return pjFormats(r).some(function(f){ return pjN(d.q[f.id])>0; }); }

// ── calcul d'une journée ──
function pjLines(r,k){
  return (r.items||[]).map(function(it){
    if(it.type==='ingredient'){ var g=ingredients.find(function(x){return x.id===it.refId;}); if(!g) return null; var kg=toKg(it.qty,it.unit,g)*k; return {n:g.name,kg:kg,c:kg*(g.price||0),sub:false}; }
    var s=recipes.find(function(x){return x.id===it.refId;}); if(!s) return null; var m=pjN(it.qty)*k; return {n:s.name,kg:m*recWeight(s.id),c:m*recCost(s.id),sub:true};
  }).filter(Boolean);
}
function pjPreps(r,k,acc,vis){
  vis=vis||{}; if(vis[r.id]) return; var v=Object.assign({},vis); v[r.id]=1;
  (r.items||[]).forEach(function(it){ if(it.type!=='recipe') return; var s=recipes.find(function(x){return x.id===it.refId;}); if(!s) return; var m=pjN(it.qty)*k; acc[s.id]=(acc[s.id]||0)+m; pjPreps(s,m,acc,v); });
}
function pjCalc(iso){
  var d=pjDayObj(iso)||{q:{},on:{}}, out={rec:[],preps:[],dough:0,pcs:0,cost:0}, acc={};
  pjProdRecipes().forEach(function(r){
    var rows=pjFormats(r).map(function(f){ return {f:f,q:pjN(d.q[f.id])}; }).filter(function(x){ return x.q>0; });
    if(!rows.length) return;
    var M=recWeight(r.id), C=recCost(r.id), D=rows.reduce(function(a,x){ return a+fmtDoughKg(x.f,x.q); },0), k=M>0?D/M:0;
    pjPreps(r,k,acc);
    var pcs=rows.reduce(function(a,x){ return a+fmtPieces(x.f,x.q); },0), cost=M>0?C*k:0;
    out.rec.push({id:r.id,n:r.name,cat:r.cat||'',dough:D,k:k,pcs:pcs,cost:cost,rows:rows,need:pjLines(r,k)});
    out.dough+=D; out.pcs+=pcs; out.cost+=cost;
  });
  out.preps=Object.keys(acc).map(function(id){ var s=recipes.find(function(x){return x.id===id;}); return {n:s.name,kg:acc[id]*recWeight(id),need:pjLines(s,acc[id])}; });
  return out;
}
function pjCount(iso){ var d=pjDayObj(iso); if(!d) return 0; return pjProdRecipes().filter(function(r){ return pjFormats(r).some(function(f){ return pjN(d.q[f.id])>0; }); }).length; }

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
    '<div class="pj-sub">Choisis le jour, coche les recettes du jour puis indique les quantités. Tout est enregistré automatiquement.</div>'+
    '<div class="pj-lbl">Semaine</div><div class="pj-week"><button class="pj-wn" onclick="pjWeekShift(-1)" aria-label="Semaine précédente">‹</button>';
  for(var i=0;i<7;i++){
    var di=pjAdd(mon,i), dd=pjParse(di), n=pjCount(di);
    h+='<button class="pj-day'+(di===iso?' on':'')+(di===today?' today':'')+'" onclick="pjSetDate(\''+di+'\')"><b>'+PJ_DAYS[i]+'</b><span>'+dd.getDate()+'/'+(dd.getMonth()+1)+'</span><i>'+(n?n:'—')+'</i></button>';
  }
  h+='<button class="pj-wn" onclick="pjWeekShift(1)" aria-label="Semaine suivante">›</button></div>'+
    '<div class="pj-date">📅 '+esc(pjLabel(iso))+'</div>';
  if(!recs.length){
    h+='<div class="pj-empty">Aucun produit défini. Ouvre <b>Recettes → Produits</b> ou une recette pour ajouter ce qu’elle produit (baguette 350 g, bac de 6 kg en 30 pièces…).'+
       '<div style="margin-top:10px"><button class="btn btn-gold btn-sm" onclick="pjOpenProducts()">Ajouter des produits</button></div></div></div>';
    box.innerHTML=h; pjNavOn(); return;
  }
  h+='<div class="pj-lbl">Coche les recettes du jour</div><div class="pj-recs">';
  var cat=null, day=pjDayObj(iso)||{q:{},on:{}};
  recs.forEach(function(r){
    if((r.cat||'')!==cat){ cat=r.cat||''; h+='<div class="pj-cat">'+esc(cat||'Sans catégorie')+'</div>'; }
    var on=pjRecOn(iso,r);
    h+='<div class="pj-rec'+(on?' on':'')+'"><label class="pj-chk"><input type="checkbox" '+(on?'checked ':'')+'onchange="pjToggle(\''+r.id+'\',this.checked)"><span class="pj-box"></span><span class="pj-rn">'+esc(r.name)+'</span></label>'+
      (on?'<div class="pj-rows">'+pjFormats(r).map(function(f){ var q=pjN(day.q[f.id]);
        return '<div class="pj-row"><span class="pj-fn">'+esc(fmtName(f))+'<small>'+esc(fmtDesc(f))+'</small></span>'+
          '<span class="pj-in"><input class="fi sm" type="number" inputmode="decimal" min="0" step="'+(f.mode==='bac'?'0.5':'1')+'" value="'+(q||'')+'" placeholder="0" oninput="pjSet(\''+f.id+'\',this.value)" aria-label="Quantité '+esc(fmtName(f))+'">'+
          '<small>'+(f.mode==='bac'?'bac(s)':'pièce(s)')+'</small></span></div>'; }).join('')+'</div>':'')+
      '</div>';
  });
  h+='</div><div class="pj-acts"><button class="btn btn-ghost btn-sm" onclick="pjCopyPrev()">↺ Comme la veille</button><button class="btn btn-ghost btn-sm" onclick="pjClear()">Vider la journée</button><button class="btn btn-ghost btn-sm" onclick="PJ.week=pjMonday(PJ.date);goPage(\'plan\')">🗓️ Production semaine</button></div></div>'+
    '<div id="pj-sum"></div>';
  box.innerHTML=h; renderPjSum(); pjNavOn();
}
function pjToggle(rid,on){
  pjLoad(); var iso=PJ.date, d=pjDayObj(iso,true), r=recipes.find(function(x){ return x.id===rid; });
  if(on) d.on[rid]=1; else { delete d.on[rid]; if(r) pjFormats(r).forEach(function(f){ delete d.q[f.id]; }); }
  pjTidy(iso); pjSave(); renderProdJ(); pjBadge();
}
function pjSet(fid,v){
  pjLoad(); var iso=PJ.date, d=pjDayObj(iso,true), q=pjN(v);
  if(q>0) d.q[fid]=q; else delete d.q[fid];
  pjTidy(iso); pjSave(); renderPjSum(); pjBadge(); pjWeekCounts();
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
function pjNeedTable(l){ return '<table class="ptb"><tr><th>À peser</th><th>Quantité</th></tr>'+l.map(function(x){ return '<tr><td>'+(x.sub?'⊛ ':'')+esc(x.n)+'</td><td><b>'+pjKg(x.kg)+'</b></td></tr>'; }).join('')+'</table>'; }
function renderPjSum(){
  var el=document.getElementById('pj-sum'); if(!el) return;
  var o=pjCalc(PJ.date);
  if(!o.rec.length){ el.innerHTML=''; return; }
  el.innerHTML='<div class="pj-tots"><div><b>'+pjKg(o.dough)+'</b><small>de pâte</small></div><div><b>'+o.pcs.toLocaleString('fr-FR')+'</b><small>pièces</small></div><div><b>'+fEur(o.cost)+'</b><small>coût matière</small></div></div>'+
    '<button class="btn btn-gold btn-full" style="margin-bottom:14px" onclick="pjPDF()">📄 Tout imprimer (feuille de production)</button>'+
    (o.preps.length?'<div class="cw"><div class="cw-t">⊛ À préparer avant</div>'+o.preps.map(function(p){ return '<div class="pj-pn">'+esc(p.n)+' — '+pjKg(p.kg)+'</div>'+pjNeedTable(p.need); }).join('')+'</div>':'')+
    o.rec.map(function(r){
      return '<div class="cw"><div class="cw-t">'+esc(r.n)+'<span class="sp"></span><span class="pm">'+pjKg(r.dough)+' de pâte · '+r.pcs.toLocaleString('fr-FR')+' pièce(s)</span></div>'+
        pjNeedTable(r.need)+
        '<table class="ptb"><tr><th>Division</th><th>Quantité</th></tr>'+r.rows.map(function(x){ var f=x.f;
          return '<tr><td>'+esc(fmtName(f))+' <span class="pm">'+pjKg(fmtPieceKg(f))+(f.mode==='bac'?'/pièce':'')+'</span></td><td><b>'+
            (f.mode==='bac'?x.q.toLocaleString('fr-FR')+' '+fmtUnit(f,x.q)+' = '+fmtPieces(f,x.q).toLocaleString('fr-FR')+' pièces':x.q.toLocaleString('fr-FR')+' '+fmtUnit(f,x.q))+'</b></td></tr>';
        }).join('')+'</table></div>';
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

// ══ PRODUCTION SEMAINE ══
function planShift(n){ PJ.week=pjAdd(PJ.week||pjMonday(pjDay(0)),n*7); renderPlan(); }
function renderPlan(){
  var box=document.getElementById('plan-wrap'); if(!box) return;
  pjLoad(); if(!PJ.week) PJ.week=pjMonday(PJ.date||pjDay(0));
  var mon=PJ.week, days=[0,1,2,3,4,5,6].map(function(i){ return pjAdd(mon,i); }), today=pjDay(0);
  var recs=pjProdRecipes();
  var h='<div class="pl-top"><button class="pj-wn" onclick="planShift(-1)" aria-label="Semaine précédente">‹</button><div class="pl-t"><b>Production de la semaine</b><span>du '+pjParse(days[0]).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' au '+pjParse(days[6]).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+'</span></div>'+
    '<button class="pj-wn" onclick="planShift(1)" aria-label="Semaine suivante">›</button></div>';
  if(!recs.length){ box.innerHTML=h+'<div class="pj-empty">Aucun produit défini. Ajoute des produits dans <b>Recettes → Produits</b>.</div>'; pjNavOn(); return; }
  var order=[], cats={};
  try{ if(typeof loadCats==='function') order=(loadCats('rec')||[]).map(function(c){ return typeof c==='string'?c:(c&&c.name)||''; }); }catch(e){}
  recs.forEach(function(r){ var c=r.cat||'Sans catégorie'; (cats[c]=cats[c]||[]).push(r); if(order.indexOf(c)<0) order.push(c); });
  h+='<div class="pl-scroll"><table class="pl-tbl"><thead><tr><th class="pl-p">Produit</th>'+days.map(function(di,i){ var dd=pjParse(di);
      return '<th class="'+(di===today?'today':'')+'"><button onclick="PJ.date=\''+di+'\';goPage(\'prod\')" title="Ouvrir la production de ce jour">'+PJ_DAYS[i]+'<small>'+dd.getDate()+'/'+(dd.getMonth()+1)+'</small></button></th>'; }).join('')+'<th>Total</th></tr></thead><tbody>';
  order.forEach(function(c){
    if(!cats[c]) return;
    var tot=days.map(function(){ return 0; }), rows='';
    cats[c].forEach(function(r){
      pjFormats(r).forEach(function(f){
        var sum=0;
        rows+='<tr><td class="pl-p"><b>'+esc(fmtName(f))+'</b><small>'+esc(r.name)+' · '+(f.mode==='bac'?'en bacs':'en pièces')+'</small></td>'+days.map(function(di,i){
          var d=pjDayObj(di), q=d?pjN(d.q[f.id]):0; sum+=q; tot[i]+=fmtPieces(f,q);
          return '<td class="'+(q?'has':'')+(di===today?' today':'')+'"><input type="number" inputmode="decimal" min="0" value="'+(q||'')+'" onchange="planSet(\''+di+'\',\''+r.id+'\',\''+f.id+'\',this.value)" aria-label="'+esc(fmtName(f))+' '+PJ_DAYS[i]+'"></td>';
        }).join('')+'<td class="pl-sum">'+(sum?sum.toLocaleString('fr-FR'):'')+'</td></tr>';
      });
    });
    var all=tot.reduce(function(a,b){return a+b;},0);
    h+='<tr class="pl-cat"><td colspan="9">'+esc(c)+'</td></tr>'+rows+
      '<tr class="pl-ct"><td class="pl-p">Pièces · '+esc(c)+'</td>'+tot.map(function(t){ return '<td>'+(t?t.toLocaleString('fr-FR'):'')+'</td>'; }).join('')+'<td>'+(all?all.toLocaleString('fr-FR'):'')+'</td></tr>';
  });
  h+='</tbody><tfoot><tr><td class="pl-p">Pâte totale</td>'+days.map(function(di){ var o=pjCalc(di); return '<td>'+(o.dough?pjKg(o.dough):'')+'</td>'; }).join('')+'<td></td></tr></tfoot></table></div>'+
    '<div class="pm" style="margin-top:8px">Ce que tu saisis dans la production du jour apparaît ici, et inversement. Touche un jour pour ouvrir sa production et ses pesées.</div>';
  box.innerHTML=h; pjNavOn();
}
function planSet(iso,rid,fid,v){
  pjLoad(); var d=pjDayObj(iso,true), q=pjN(v);
  if(q>0){ d.q[fid]=q; d.on[rid]=1; } else delete d.q[fid];
  pjTidy(iso); pjSave(); pjBadge(); renderPlan();
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
  bar.innerHTML='<button class="'+(PJ.recTab==='rec'?'on':'')+'" onclick="pjSetRecTab(\'rec\')">'+ic('book')+' Recettes</button><button class="'+(PJ.recTab==='prod'?'on':'')+'" onclick="pjSetRecTab(\'prod\')">🥖 Produits'+(nP?' <span class="pj-n">'+nP+'</span>':'')+'</button>';
  var mine=document.getElementById('rec-mine');
  if(mine) mine.style.display=PJ.recTab==='prod'?'none':'';
  pw.style.display=PJ.recTab==='prod'?'':'none';
  if(PJ.recTab==='prod') renderProducts();
}
function renderProducts(){
  var el=document.getElementById('pj-prods'); if(!el) return;
  var recs=pjProdRecipes(), all=recipes.slice().sort(function(a,b){ return a.name.localeCompare(b.name,'fr'); });
  var h='<div class="cw"><div class="cw-t">Ajouter un produit</div><div class="pj-addp">'+
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
        '<div class="pp-r" onclick="openEditRec(\''+r.id+'\')" title="Ouvrir la recette">'+esc(r.name)+'</div>'+
        '<div class="pj-fe-g"><label><small>'+(bac?'Poids du bac (g)':'Poids de pâte (g)')+'</small><input class="fi sm" type="number" inputmode="decimal" min="0" value="'+(f.w||'')+'" onchange="ppSet(\''+r.id+'\',\''+f.id+'\',\'w\',this.value)"></label>'+
        (bac?'<label><small>Divisé en (pièces)</small><input class="fi sm" type="number" inputmode="numeric" min="0" value="'+(f.pcs||'')+'" onchange="ppSet(\''+r.id+'\',\''+f.id+'\',\'pcs\',this.value)"></label>':'')+
        '<div class="pj-fe-i">'+(bac&&pjN(f.pcs)>0?'→ '+pjKg(fmtPieceKg(f))+' par pièce':'')+'</div></div></div>';
    });
  });
  h+='</div>';
  el.innerHTML=h;
}
function ppRec(rid){ return recipes.find(function(r){ return r.id===rid; }); }
function ppAdd(mode){
  var s=document.getElementById('pp-rec'), r=s&&ppRec(s.value); if(!r){ toast('Choisis la recette','err'); return; }
  r.formats=(r.formats||[]).filter(function(f){ return pjN(f.w)>0; });
  r.formats.push(mode==='bac'?{id:uid(),mode:'bac',n:'Bac '+r.name,w:6000,pcs:30}:{id:uid(),mode:'piece',n:r.name,w:350});
  r.updatedAt=new Date().toISOString(); persist(); pjRecTabs(); toast('Produit ajouté : ajuste son nom et son poids','ok');
}
function ppSet(rid,fid,k,v){ var r=ppRec(rid); if(!r) return; var f=(r.formats||[]).find(function(x){ return x.id===fid; }); if(!f) return;
  if(k==='w'&&pjN(v)<=0){ toast('Poids requis','err'); renderProducts(); return; }
  f[k]=k==='n'?String(v).trim():pjN(v);
  r.updatedAt=new Date().toISOString(); persist(); renderProducts(); }
function ppDel(rid,fid){ var r=ppRec(rid); if(!r) return; if(!confirm('Supprimer ce produit ?')) return;
  r.formats=(r.formats||[]).filter(function(x){ return x.id!==fid; }); if(!r.formats.length) delete r.formats;
  r.updatedAt=new Date().toISOString(); persist(); pjRecTabs(); }

// ── feuille PDF ──
function pjPDF(){
  var o=pjCalc(PJ.date); if(!o.rec.length){ toast('Saisis au moins une quantité','err'); return; }
  toast('⏳ Génération PDF…','info');
  if(window.jspdf){ pjDoPDF(o); return; }
  var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=function(){ pjDoPDF(o); }; s.onerror=function(){ toast('Erreur PDF (connexion ?)','err'); }; document.head.appendChild(s);
}
function pjDoPDF(o){
  try{
    var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var W=210,M=16,cw=W-M*2,y=M,c2=cw*0.62, BR=[56,21,21];
    var T=function(t){ return String(t).replace(/[⊛]/g,'*').replace(/[’]/g,"'").replace(/ | /g,' '); };
    if(window.LOGO_V){ try{ doc.addImage(window.LOGO_V,'PNG',M,y-2,6,13); }catch(e){} }
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(BR[0],BR[1],BR[2]);doc.text('Feuille de production',M+9,y+5);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(110,90,85);
    doc.text(T('Maison Viennet  ·  '+pjLabel(PJ.date)+'  ·  '+pjKg(o.dough)+' de pâte  ·  '+o.pcs+' pièces'),M+9,y+11);
    y+=18;
    function band(l){ if(y>262){doc.addPage();y=M;} doc.setFillColor(BR[0],BR[1],BR[2]);doc.rect(M,y,cw,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text(T(l),M+2,y+5);y+=7; }
    function rows(list){ list.forEach(function(r,i){ if(y>278){doc.addPage();y=M;} doc.setFillColor(i%2?255:247,i%2?255:241,i%2?255:234);doc.rect(M,y,cw,6.5,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(40,20,20);doc.text(T(r[0]),M+2,y+4.6,{maxWidth:c2-4});doc.setFont('helvetica','bold');doc.text(T(r[1]),M+c2+2,y+4.6);y+=6.5; }); y+=3; }
    o.preps.forEach(function(p){ band('A préparer avant : '+p.n+' — '+pjKg(p.kg)); rows(p.need.map(function(x){ return [(x.sub?'* ':'')+x.n,pjKg(x.kg)]; })); });
    o.rec.forEach(function(r){
      band(r.n+' — '+pjKg(r.dough)+' de pâte · '+r.pcs+' pièces');
      rows(r.need.map(function(x){ return [(x.sub?'* ':'')+x.n,pjKg(x.kg)]; }));
      rows(r.rows.map(function(x){ var f=x.f; return [fmtName(f)+' ('+pjKg(fmtPieceKg(f))+(f.mode==='bac'?'/pièce':'')+')', f.mode==='bac'?x.q+' '+fmtUnit(f,x.q)+' = '+fmtPieces(f,x.q)+' pièces':x.q+' '+fmtUnit(f,x.q)]; }));
    });
    doc.save('production-'+PJ.date+'.pdf'); toast('📄 PDF téléchargé','ok');
  }catch(e){ console.error(e); toast('Erreur PDF','err'); }
}

// ══ ÉDITEUR DE RECETTE : « Pièces produites » ══
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
  }).join(''):'<div class="pm">Aucun produit. Ajoute ce que cette recette produit pour l’utiliser dans la production du jour.</div>';
}
function pjFmtInfo(f){ return f.mode==='bac'&&pjN(f.w)>0&&pjN(f.pcs)>0?'→ '+pjKg(fmtPieceKg(f))+' par pièce':''; }
function pjFmtAdd(mode){ PJ.fmtEd.push(mode==='bac'?{id:uid(),mode:'bac',n:'',w:'',pcs:''}:{id:uid(),mode:'piece',n:'',w:''}); pjFmtRender(); }
function pjFmtDel(i){ PJ.fmtEd.splice(i,1); pjFmtRender(); }
function pjFmtSet(i,k,v){ var f=PJ.fmtEd[i]; if(!f) return; f[k]=(k==='n')?v:pjN(v); var e=document.getElementById('pj-fe-i-'+i); if(e) e.innerHTML=pjFmtInfo(f); }
function pjFmtLoad(r){ PJ.fmtEd=((r&&r.formats)||[]).map(function(f){ return Object.assign({mode:'piece'},f); }); pjFmtRender(); }

// ══ MISE EN PLACE ══
(function(){
  var st=document.createElement('style');
  st.textContent=[
    '#nav-bons,#bn-bons,#nav-livre,#bn-livre,#nav-partage,#bn-partage,#nav-fournisseurs,#bn-fournisseurs,#r-share-card,#bk-m-btn,#h-cur,#h-week,#h-recents,#h-recents-hd,#rec-tabs,#shared-wrap,.sb-crest,.gate-crest,[data-crest]{display:none!important}',
    '.sb-logo .mf-v{display:block;height:58px;width:auto;margin:0 auto 8px}#shell.col .sb-logo .mf-v{height:34px;margin-bottom:0}',
    '[data-theme=dark] .mf-v{filter:brightness(0) invert(.9)}',
    '.pj-card{padding:18px}.pj-h{font-size:18px;font-weight:700;color:var(--i)}.pj-sub{font-size:13px;color:var(--i4);margin:3px 0 12px}',
    '.pj-lbl{font-size:12px;font-weight:700;color:var(--i3);margin:12px 0 6px}',
    '.pj-week{display:flex;gap:6px;align-items:stretch}.pj-wn{border:0;background:var(--p2);color:var(--i);border-radius:10px;min-width:32px;min-height:40px;font-size:18px;cursor:pointer}',
    '.pj-day{flex:1;min-width:0;border:1px solid var(--bd2);background:var(--card);color:var(--i3);border-radius:10px;padding:7px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;font:inherit}',
    '.pj-day b{font-size:13px;color:var(--i)}.pj-day span{font-size:11px}.pj-day i{font-style:normal;font-size:11px;font-weight:700;color:var(--am2)}',
    '.pj-day.today{border-color:var(--i3);border-width:2px}.pj-day.on{background:var(--i);border-color:var(--i);color:var(--on-i)}.pj-day.on b,.pj-day.on i{color:var(--on-i)}',
    '.pj-date{font-weight:700;color:var(--i);margin:12px 0 4px}',
    '.pj-cat{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--i4);margin:14px 0 6px}',
    '.pj-rec{border:1px solid var(--bd);border-radius:12px;margin-bottom:6px;background:var(--card)}.pj-rec.on{border-color:var(--i3)}',
    '.pj-chk{display:flex;align-items:center;gap:10px;padding:11px 12px;cursor:pointer;position:relative}.pj-chk input{position:absolute;opacity:0;pointer-events:none}',
    '.pj-box{width:22px;height:22px;border-radius:7px;border:2px solid var(--bd2);flex:0 0 auto;display:flex;align-items:center;justify-content:center}',
    '.pj-chk input:checked+.pj-box{background:var(--i);border-color:var(--i)}.pj-chk input:checked+.pj-box:after{content:"✓";color:var(--on-i);font-size:14px;font-weight:700}',
    '.pj-chk input:focus-visible+.pj-box{outline:2px solid var(--i);outline-offset:2px}',
    '.pj-rn{font-weight:600;color:var(--i);font-size:15px}',
    '.pj-rows{padding:0 12px 6px 44px}.pj-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--bd)}',
    '.pj-fn{flex:1;min-width:0;color:var(--i);font-size:14px}.pj-fn small{display:block;color:var(--i4);font-size:12px}',
    '.pj-in{display:flex;align-items:center;gap:6px}.pj-in input{width:84px;text-align:right}.pj-in small{color:var(--i4);font-size:11px;width:48px}',
    '.pj-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}',
    '.pj-empty{color:var(--i3);font-size:14px;padding:14px;border:1px dashed var(--bd2);border-radius:12px;margin-top:10px;text-align:center}',
    '.pj-tots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 12px}',
    '.pj-tots>div{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px;text-align:center}',
    '.pj-tots b{display:block;font-size:17px;color:var(--i)}.pj-tots small{color:var(--i4);font-size:11px}',
    '.pj-pn{font-weight:600;margin:8px 0 0;color:var(--i)}',
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
    '.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}',
    '.pp-card{border:1px solid var(--bd);border-radius:14px;padding:12px;background:var(--card)}',
    '.pp-r{font-size:12px;color:var(--i4);margin:6px 0 0;cursor:pointer;text-decoration:underline dotted}',
    '.pl-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}.pl-t{flex:1;text-align:center}.pl-t b{display:block;font-size:17px;color:var(--i)}.pl-t span{font-size:12px;color:var(--i4)}',
    '.pl-scroll{overflow-x:auto;border:1px solid var(--bd);border-radius:14px;background:var(--card)}',
    '.pl-tbl{border-collapse:collapse;width:100%;min-width:720px;font-size:13px}',
    '.pl-tbl th,.pl-tbl td{border-bottom:1px solid var(--bd);padding:4px;text-align:center;color:var(--i)}',
    '.pl-tbl th button{border:0;background:none;font:inherit;font-weight:700;color:var(--i);cursor:pointer;display:flex;flex-direction:column;align-items:center;width:100%;padding:4px}',
    '.pl-tbl th small{font-size:11px;font-weight:400;color:var(--i4)}',
    '.pl-tbl .pl-p{text-align:left;padding:6px 10px;min-width:170px;position:sticky;left:0;background:var(--card);z-index:1}.pl-p small{display:block;color:var(--i4);font-size:11px}',
    '.pl-tbl td input{width:100%;min-width:44px;max-width:64px;border:1px solid transparent;background:transparent;border-radius:8px;padding:6px 4px;text-align:center;font:inherit;color:var(--i)}',
    '.pl-tbl td input:hover,.pl-tbl td input:focus{border-color:var(--bd2);background:var(--p);outline:none}',
    '.pl-tbl td.has input{font-weight:700;background:var(--p2)}.pl-tbl .today{background:rgba(var(--ink-rgb),.035)}',
    '.pl-cat td{text-align:left;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--on-i);background:var(--i);padding:6px 10px}',
    '.pl-tbl .pl-cat td{color:var(--on-i);position:static}',
    '.pl-ct td{font-size:12px;color:var(--i3);font-weight:600;background:var(--p)}.pl-ct .pl-p{background:var(--p)}.pl-sum{font-weight:700}',
    '@media (max-width:700px){.pl-tbl .pl-p{min-width:118px;max-width:130px}.pl-tbl{min-width:560px}}',
    '.pl-tbl tfoot td{font-weight:700;background:var(--p2);font-size:12px}.pl-tbl tfoot .pl-p{background:var(--p2)}'
  ].join('\n');
  document.head.appendChild(st);

  // pages
  var sc=document.getElementById('scroll');
  [['prod','pj-wrap'],['plan','plan-wrap']].forEach(function(p){
    if(sc&&!document.getElementById('p-'+p[0])){ var d=document.createElement('div'); d.id='p-'+p[0]; d.className='pg'; d.style.display='none'; d.innerHTML='<div class="narrow wide" id="'+p[1]+'"></div>'; sc.appendChild(d); }
    if(window.ALLP&&ALLP.indexOf(p[0])<0) ALLP.push(p[0]);
  });

  // menu : groupe « Production » après Catalogue
  var cat=document.getElementById('nav-catalogue');
  if(cat&&cat.parentNode&&!document.getElementById('nav-pj0')){
    var frag=document.createDocumentFragment();
    var h=document.createElement('div'); h.className='sb-grp'; h.setAttribute('role','presentation'); h.textContent='Production'; frag.appendChild(h);
    [['nav-pj0','Production du jour','🍞','prodGo(0)','nd-pj0'],['nav-pj1','Production de demain','🌅','prodGo(1)','nd-pj1'],['nav-pjw','Production semaine','🗓️',"PJ.week='';goPage('plan')",'']].forEach(function(a){
      var e=document.createElement('div'); e.className='sbi'; e.id=a[0]; e.title=a[1]; e.setAttribute('onclick',a[3]);
      e.innerHTML='<span class="sb-ic" style="font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:1.15em">'+a[2]+'</span><span class="sb-lb">'+a[1]+'</span>'+(a[4]?'<span class="sb-bd" id="'+a[4]+'">0</span>':'');
      frag.appendChild(e);
    });
    cat.parentNode.insertBefore(frag,cat.nextSibling);
  }
  var bcat=document.getElementById('bn-catalogue');
  if(bcat&&bcat.parentNode&&!document.getElementById('bn-prod')){
    var bb=document.createElement('div'); bb.className='bni'; bb.id='bn-prod'; bb.setAttribute('onclick','prodGo(0)');
    bb.innerHTML='<div class="bni-ic" style="font-size:18px;line-height:1">🍞</div><div class="bni-lb">Production</div>';
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
      var old=JSON.stringify(rec.formats||[]);
      if(f.length) rec.formats=f; else delete rec.formats;
      if(JSON.stringify(rec.formats||[])!==old) persist();
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
        var act=document.getElementById('tb-act'); if(act) act.innerHTML=p==='prod'?'<button class="tbtn gold" onclick="pjPDF()">📄 Feuille</button>':'';
        if(p==='prod') renderProdJ(); else renderPlan();
      }
      if(p==='recettes') pjRecTabs();
      pjNavOn();
      return r;
    };
  },0);
  try{ pjLoad(); pjBadge(); }catch(e){}
})();
