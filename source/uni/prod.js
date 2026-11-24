// ══ PRODUCTION DU JOUR · RÉSULTATS · PRIX & MARGES · FABRICATION ══
// Repris de « economat-production » et branché sur les recettes d'Économat Pro.
// Chaque recette peut porter des « produits » (r.formats : nom, poids de pâte en g,
// prix TTC fixé). La production du jour (quantités cochées) et les réglages de prix
// restent sur l'appareil (v4_prod, v4_prix).
var PROD=(function(){ try{ return JSON.parse(LS.getItem('v4_prod')||'null')||{}; }catch(e){ return {}; } })();
var PRIX=Object.assign({loss:5,extra:0.3,marge:60,tva:5.5},(function(){ try{ return JSON.parse(LS.getItem('v4_prix')||'null')||{}; }catch(e){ return {}; } })());
if(window.ACCT_KEYS){ ['v4_prod','v4_prix'].forEach(function(k){ if(ACCT_KEYS.indexOf(k)<0) ACCT_KEYS.push(k); }); }
function saveProdData(){ try{ LS.setItem('v4_prod',JSON.stringify(PROD)); LS.setItem('v4_prix',JSON.stringify(PRIX)); }catch(e){} }
function nP(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function pKg(kg){var g=kg*1000;return g>=1000?kg.toLocaleString('fr-FR',{maximumFractionDigits:2})+' kg':(Math.round(g*10)/10).toLocaleString('fr-FR')+' g';}
function fEur3(n){return (n||0).toLocaleString('fr-FR',{minimumFractionDigits:3,maximumFractionDigits:3})+' €';}
function pst(fid){return PROD[fid]||{q:0,on:false};}
function prodCount(){var n=0;recipes.forEach(function(r){(r.formats||[]).forEach(function(f){var s=pst(f.id);if(s.on&&nP(s.q)>0)n++;});});return n;}
function pieceCost(Mkg,C,wkg){var loss=1+nP(PRIX.loss)/100;return (Mkg>0?C/Mkg*wkg*loss:0)+nP(PRIX.extra)*wkg;}
function suggTTC(c){var m=nP(PRIX.marge),t=1+nP(PRIX.tva)/100;return m<100?c/(1-m/100)*t:0;}

// ── calcul de la journée ──
function itemLines(r,k){
  return (r.items||[]).map(function(it){
    if(it.type==='ingredient'){var g=ingredients.find(function(x){return x.id===it.refId;});if(!g)return null;var kg=toKg(it.qty,it.unit,g)*k;return {n:g.name,kg:kg,c:kg*(g.price||0),sub:false};}
    var s=recipes.find(function(x){return x.id===it.refId;});if(!s)return null;var m=nP(it.qty)*k;return {n:s.name,kg:m*recWeight(s.id),c:m*recCost(s.id),sub:true};
  }).filter(Boolean);
}
function collectPreps(r,k,acc,vis){
  vis=vis||{};if(vis[r.id])return;var v=Object.assign({},vis);v[r.id]=1;
  (r.items||[]).forEach(function(it){if(it.type!=='recipe')return;var s=recipes.find(function(x){return x.id===it.refId;});if(!s)return;var m=nP(it.qty)*k;acc[s.id]=(acc[s.id]||0)+m;collectPreps(s,m,acc,v);});
}
function calcProd(){
  var tva=1+nP(PRIX.tva)/100,mg=nP(PRIX.marge),loss=1+nP(PRIX.loss)/100;
  var out={petrins:[],preps:[],dough:0,mat:0,cost:0,ca:0,pcs:0},acc={};
  recipes.forEach(function(r){
    var act=(r.formats||[]).filter(function(f){var s=pst(f.id);return s.on&&nP(s.q)>0&&nP(f.w)>0;});if(!act.length)return;
    var M=recWeight(r.id),C=recCost(r.id),D=act.reduce(function(a,f){return a+nP(f.w)/1000*nP(pst(f.id).q);},0),sc=M>0?D/M:0;
    collectPreps(r,sc,acc);
    var pt={id:r.id,n:r.name,dough:D,sc:sc,pcs:0,cost:0,ca:0,frows:[],need:itemLines(r,sc)};
    act.forEach(function(f){var w=nP(f.w)/1000,q=nP(pst(f.id).q),matU=M>0?C/M*w*loss:0,c=matU+nP(PRIX.extra)*w,fixed=String(f.fix||'').trim()!=='',ht=fixed?nP(f.fix)/tva:(mg<100?c/(1-mg/100):0);
      pt.frows.push({n:f.n||'Pièce',w:w,q:q,c:c,ttc:ht*tva,fixed:fixed});
      pt.pcs+=q;pt.cost+=c*q;pt.ca+=ht*q;out.dough+=w*q;out.mat+=matU*q;out.cost+=c*q;out.ca+=ht*q;out.pcs+=q;});
    out.petrins.push(pt);
  });
  out.preps=Object.keys(acc).map(function(id){var s=recipes.find(function(x){return x.id===id;});return {n:s.name,kg:acc[id]*recWeight(id),need:itemLines(s,acc[id])};});
  return out;
}

// ── page Production ──
var prodEditRec='';
function renderProd(){
  var box=document.getElementById('prod-wrap'); if(!box) return;
  var d=new Date();
  var withF=recipes.filter(function(r){return (r.formats||[]).length;});
  var without=recipes.filter(function(r){return !(r.formats||[]).length;}).sort(function(a,b){return a.name.localeCompare(b.name,'fr');});
  box.innerHTML=
    '<div class="pd-bar"><button class="btn btn-ghost btn-sm" onclick="goPage(\'res\')">📊 Résultats</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="goPage(\'prix\')">⚙️ Prix &amp; marges</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="goPage(\'fab\')">🌾 Fabrication &amp; Bio</button></div>'+
    '<div class="cw"><div class="cw-t">Produits à faire aujourd\'hui <span style="font-size:11px;color:var(--i4);font-weight:400">'+esc(d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))+'</span></div>'+
    (withF.length?withF.map(function(r){
      var editing=prodEditRec===r.id;
      return '<div class="pgrp" id="pg-'+r.id+'"><div class="pgrp-t">'+esc(r.name)+
        ' <button class="btn btn-ghost btn-xs" style="float:right" onclick="prodEdit(\''+r.id+'\')">'+(editing?'Terminé':'✎ Produits')+'</button></div>'+
        (editing?prodFmtEditor(r):r.formats.map(function(f){var s=pst(f.id);
          return '<label class="prow"><input type="checkbox" '+(s.on?'checked ':'')+'onchange="prodSet(\''+f.id+'\',\'on\',this.checked)"><span>'+esc(f.n||'Pièce')+' <span class="pm">'+pKg(nP(f.w)/1000)+'</span></span><input class="iq" inputmode="decimal" placeholder="Qté" value="'+(nP(s.q)||'')+'" oninput="prodSet(\''+f.id+'\',\'q\',this.value,this)"></label>';}).join(''))+
        '</div>';
    }).join(''):'<div class="empty-s" style="padding:8px 0">Aucun produit pour l\'instant. Choisis une recette ci-dessous et ajoute les produits faits avec sa pâte (baguette, boule…).</div>')+
    (without.length?'<div class="pd-add"><select class="fi sm" id="prod-addrec"><option value="">＋ Ajouter des produits à une recette…</option>'+
      without.map(function(r){return '<option value="'+r.id+'">'+esc(r.name)+'</option>';}).join('')+
      '</select><button class="btn btn-gold btn-sm" onclick="prodAddRec()">Ajouter</button></div>':'')+
    '<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="prodClear()">Vider la journée</button></div></div>'+
    '<div id="prod-sum"></div>'+
    '<button class="btn btn-gold btn-full" onclick="printProd()">📄 Feuille de production (PDF)</button>'+
    '<div style="font-size:11px;color:var(--i4);margin-top:8px;line-height:1.5">Coche les produits et indique les quantités : l\'appli calcule la pâte, les ingrédients à peser, le coût de revient et le bénéfice.</div>';
  renderProdSum();
}
function prodFmtEditor(r){
  return '<div class="pd-fmts">'+(r.formats||[]).map(function(f,i){
    return '<div class="fmt-g"><div class="field" style="margin-bottom:0"><div class="fl">Produit</div><input class="fi sm" value="'+esc(f.n||'')+'" placeholder="Baguette, boule…" onchange="fmtSet(\''+r.id+'\','+i+',\'n\',this.value)"></div>'+
      '<div class="field" style="margin-bottom:0"><div class="fl">Pâte (g)</div><input class="fi sm" inputmode="decimal" value="'+(f.w||'')+'" onchange="fmtSet(\''+r.id+'\','+i+',\'w\',this.value)"></div>'+
      '<div class="field" style="margin-bottom:0"><div class="fl">Prix TTC fixé</div><input class="fi sm" inputmode="decimal" value="'+esc(f.fix||'')+'" placeholder="auto" onchange="fmtSet(\''+r.id+'\','+i+',\'fix\',this.value)"></div>'+
      '<button class="idel" onclick="fmtDel(\''+r.id+'\','+i+')">✕</button></div>';
  }).join('')+'<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="fmtAdd(\''+r.id+'\')">＋ Produit</button>'+prodPxTable(r)+'</div>';
}
function prodPxTable(r){
  var M=recWeight(r.id),C=recCost(r.id),rows=(r.formats||[]).filter(function(f){return nP(f.w)>0;});
  if(!rows.length||!(M>0)) return '';
  return '<table class="ptb"><tr><th>Par pièce</th><th>Revient</th><th>Conseillé</th><th>Fixé</th></tr>'+rows.map(function(f){var w=nP(f.w)/1000,c=pieceCost(M,C,w),fx=String(f.fix||'').trim()!=='';
    return '<tr><td>'+esc(f.n||'Pièce')+' <span class="pm">'+pKg(w)+'</span></td><td>'+fEur3(c)+'</td><td><b>'+fEur(suggTTC(c))+'</b></td><td>'+(fx?fEur(nP(f.fix)):'—')+'</td></tr>';}).join('')+'</table>';
}
function prodRec(id){ return recipes.find(function(r){return r.id===id;}); }
function prodEdit(id){ prodEditRec=(prodEditRec===id)?'':id; if(!prodEditRec) cleanFmts(id); renderProd(); }
function prodAddRec(){ var s=document.getElementById('prod-addrec'); var r=s&&prodRec(s.value); if(!r){ toast('Choisis une recette','err'); return; } r.formats=[{id:uid(),n:'',w:'',fix:''}]; prodEditRec=r.id; persist(); renderProd(); }
function fmtAdd(rid){ var r=prodRec(rid); if(!r) return; r.formats=r.formats||[]; r.formats.push({id:uid(),n:'',w:'',fix:''}); persist(); renderProd(); }
function fmtDel(rid,i){ var r=prodRec(rid); if(!r||!r.formats) return; var f=r.formats.splice(i,1)[0]; if(f) delete PROD[f.id]; saveProdData(); persist(); updBadges(); renderProd(); }
function fmtSet(rid,i,k,v){ var r=prodRec(rid); if(!r||!r.formats||!r.formats[i]) return; r.formats[i][k]=(k==='w')?nP(v):String(v).trim(); persist(); renderProd(); }
function cleanFmts(rid){ var r=prodRec(rid); if(!r||!r.formats) return; r.formats=r.formats.filter(function(f){return String(f.n||'').trim()||nP(f.w)>0;}); persist(); }
function prodSet(fid,k,v,el){
  var s=PROD[fid]||(PROD[fid]={q:0,on:false});
  if(k==='on')s.on=!!v;else{s.q=nP(v);if(s.q>0&&!s.on){s.on=true;var cb=el&&el.parentNode.querySelector('input[type=checkbox]');if(cb)cb.checked=true;}}
  saveProdData();updBadges();renderProdSum();
}
function prodClear(){PROD={};saveProdData();updBadges();renderProd();toast('Production vidée','ok');}
function renderProdSum(){
  var o=calcProd(),el=document.getElementById('prod-sum');if(!el)return;
  el.innerHTML=o.petrins.length?'<div class="tots"><div class="ti"><span class="tv">'+pKg(o.dough)+'</span><div class="tl">Pâte</div></div><div class="ti"><span class="tv">'+o.pcs.toLocaleString('fr-FR')+'</span><div class="tl">Pièces</div></div><div class="ti big"><span class="tv">'+fEur(o.ca-o.cost)+'</span><div class="tl">Bénéfice</div></div></div>':'';
}

// ── page Résultats ──
function needTable(l,withCost){return '<table class="ptb"><tr><th>À préparer</th><th>Quantité</th>'+(withCost?'<th>Coût</th>':'')+'</tr>'+l.map(function(x){return '<tr><td>'+(x.sub?'⊛ ':'')+esc(x.n)+'</td><td>'+pKg(x.kg)+'</td>'+(withCost?'<td>'+fEur(x.c)+'</td>':'')+'</tr>';}).join('')+'</table>';}
function renderRes(){
  var o=calcProd(),el=document.getElementById('res-wrap'),ben=o.ca-o.cost,pct=o.ca>0?ben/o.ca*100:0; if(!el) return;
  if(!o.petrins.length){el.innerHTML='<div class="empty"><span class="empty-i">📊</span><div class="empty-t">Rien à calculer</div><div class="empty-s">Coche des produits dans la Production du jour</div></div>';return;}
  el.innerHTML='<div class="hstats">'+
    '<div class="hstat"><span class="hstat-v">'+pKg(o.dough)+'</span><div class="hstat-l">Pâte totale</div></div>'+
    '<div class="hstat"><span class="hstat-v">'+o.pcs.toLocaleString('fr-FR')+'</span><div class="hstat-l">Pièces</div></div>'+
    '<div class="hstat"><span class="hstat-v">'+fEur(o.mat)+'</span><div class="hstat-l">Matières (pertes incl.)</div></div>'+
    '<div class="hstat"><span class="hstat-v">'+fEur(o.cost)+'</span><div class="hstat-l">Coût de revient</div></div>'+
    '<div class="hstat"><span class="hstat-v">'+fEur(o.ca)+'</span><div class="hstat-l">CA HT</div></div>'+
    '<div class="hstat"><span class="hstat-v" style="color:var(--gr2)">'+fEur(ben)+' ('+pct.toFixed(0)+' %)</span><div class="hstat-l">Bénéfice brut</div></div></div>'+
    o.petrins.map(function(pt){return '<div class="cw"><div class="cw-t">'+esc(pt.n)+'<span style="font-size:11px;color:var(--i4);font-weight:400">'+pKg(pt.dough)+' de pâte · '+pt.pcs.toLocaleString('fr-FR')+' pièce(s)</span></div>'+
      '<table class="ptb"><tr><th>Prix par pièce</th><th>Qté</th><th>Revient</th><th>Prix TTC</th></tr>'+pt.frows.map(function(x){return '<tr><td>'+esc(x.n)+' <span class="pm">'+pKg(x.w)+'</span></td><td>'+x.q+'</td><td>'+fEur3(x.c)+'</td><td><b>'+fEur(x.ttc)+'</b>'+(x.fixed?'':' <span class="pm">*</span>')+'</td></tr>';}).join('')+'</table>'+
      needTable(pt.need,true)+'<div class="pm" style="margin-top:6px">Coût de revient : '+fEur(pt.cost)+' — CA HT : '+fEur(pt.ca)+'</div></div>';}).join('')+
    (o.preps.length?'<div class="cw"><div class="cw-t">⊛ Préparations à faire avant</div>'+o.preps.map(function(p){return '<div style="font-weight:600;margin:6px 0 2px">'+esc(p.n)+' — '+pKg(p.kg)+'</div>'+needTable(p.need,false);}).join('')+'</div>':'')+
    '<div class="pm">* prix conseillé selon ta marge cible (Prix &amp; marges).</div>';
}

// ── page Prix & marges ──
function renderPrix(){
  var el=document.getElementById('prix-wrap'); if(!el) return;
  var f=function(k,l){ return '<div class="field"><div class="fl">'+l+'</div><input class="fi" inputmode="decimal" value="'+esc(String(PRIX[k]))+'" oninput="pxSet(\''+k+'\',this.value)"></div>'; };
  el.innerHTML='<div class="cw"><div class="cw-t">Paramètres de prix</div><div class="frow">'+
    f('loss','Pertes (%)')+f('extra','Frais annexes (€/kg de pâte)')+f('marge','Marge cible sur HT (%)')+f('tva','TVA vente (%)')+
    '</div><div style="font-size:11px;color:var(--i4);line-height:1.5">Frais annexes : énergie, emballage, main-d\'œuvre… par kg de pâte. Pour imposer un prix de vente, renseigne « Prix TTC fixé » sur le produit, sinon le prix conseillé est utilisé.</div></div>';
}
function pxSet(k,v){PRIX[k]=v;saveProdData();}

// ── feuille de production PDF ──
function printProd(){
  var o=calcProd();if(!o.petrins.length){toast('Coche au moins un produit','err');goPage('prod');return;}
  toast('⏳ Génération PDF…','info');
  if(window.jspdf){doProdPDF(o);return;}
  var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=function(){doProdPDF(o);};s.onerror=function(){toast('Erreur PDF (connexion ?)','err');};document.head.appendChild(s);
}
function doProdPDF(o){
  try{
    var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var W=210,M=18,cw=W-M*2,y=M,cols=[0,cw*0.62];
    var T=function(t){return String(t).replace(/[⊛]/g,'*');};
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(28,20,9);doc.text('Feuille de production',M,y+7);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,110,95);
    doc.text(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'  ·  '+pKg(o.dough)+' de pâte  ·  '+o.pcs+' pièces',M,y+13);
    y+=20;doc.setDrawColor(184,132,30);doc.setLineWidth(0.4);doc.line(M,y,W-M,y);y+=6;
    function head(a,b){doc.setFillColor(28,20,9);doc.rect(M,y,cw,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(232,184,75);doc.text(a,M+2,y+5.5);doc.text(b,M+cols[1]+2,y+5.5);y+=8;}
    function band(label){if(y>255){doc.addPage();y=M;}doc.setFillColor(237,230,214);doc.rect(M,y,cw,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(107,82,51);doc.text(T(label),M+2,y+5);y+=7;}
    function rows(list){list.forEach(function(r,i){if(y>272){doc.addPage();y=M;}doc.setFillColor(i%2===0?244:255,i%2===0?239:255,i%2===0?228:255);doc.rect(M,y,cw,7,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(28,20,9);doc.text(T(r[0]),M+2,y+5,{maxWidth:cols[1]-4});doc.setFont('helvetica','bold');doc.text(T(r[1]),M+cols[1]+2,y+5);y+=7;});y+=4;}
    if(o.preps.length){band('Préparations à faire avant');o.preps.forEach(function(p){head(T(p.n).toUpperCase()+' — '+pKg(p.kg),'QUANTITÉ');rows(p.need.map(function(x){return [(x.sub?'* ':'')+x.n,pKg(x.kg)];}));});}
    o.petrins.forEach(function(pt){band(pt.n+' — '+pKg(pt.dough)+' de pâte');head('INGRÉDIENT','QUANTITÉ');rows(pt.need.map(function(x){return [(x.sub?'* ':'')+x.n,pKg(x.kg)];}));
      head('PIÈCE','QUANTITÉ');rows(pt.frows.map(function(x){return [x.n+' ('+pKg(x.w)+')',String(x.q)];}));});
    if(y>275){doc.addPage();y=M;}doc.setFontSize(6);doc.setTextColor(180,180,180);doc.text('Généré par Économat Pro · '+new Date().toLocaleString('fr-FR'),W/2,y+4,{align:'center'});
    var dd=new Date(),p2=function(n){return n<10?'0'+n:''+n;};
    doc.save('production-'+dd.getFullYear()+p2(dd.getMonth()+1)+p2(dd.getDate())+'.pdf');toast('📄 PDF téléchargé !','ok');
  }catch(e){console.error(e);toast('Erreur PDF','err');}
}

// ── pages, menu et navigation ──
(function(){
  var st=document.createElement('style');
  st.textContent=['.ptb{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
    '.ptb th{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--i4);text-align:right;padding:5px 4px;border-bottom:1px solid var(--bd);font-weight:600}',
    '.ptb td{padding:6px 4px;border-bottom:1px solid var(--bd);text-align:right;color:var(--i);vertical-align:top}',
    '.ptb th:first-child,.ptb td:first-child{text-align:left}',
    '.pm{font-size:11px;color:var(--i4)}.pgrp{margin-bottom:12px}.pgrp-t{font-size:14px;font-weight:700;color:var(--i);margin-bottom:4px;overflow:hidden}',
    '.prow{display:grid;grid-template-columns:24px 1fr 80px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:14px;color:var(--i);cursor:pointer}',
    '.prow input[type=checkbox]{width:20px;height:20px;accent-color:var(--g)}',
    '.fmt-g{display:grid;grid-template-columns:2fr 1fr 1fr 30px;gap:6px;align-items:end;margin-bottom:6px}',
    '.hstats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:12px}',
    '.hstat{background:var(--card);border:1px solid var(--bd);border-left:3px solid var(--g);border-radius:12px;padding:11px}',
    '.hstat-v{font-size:18px;font-weight:700;color:var(--i);display:block}.hstat-l{font-size:11px;color:var(--i4);margin-top:2px}',
    '.pd-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.pd-add{display:flex;gap:6px;margin-top:10px}.pd-add select{flex:1}',
    '#p-fab{padding:0!important}#p-fab iframe{width:100%;height:calc(100dvh - 60px);border:0;display:block;background:#fff}',
    'html.lay-mob #p-fab iframe{height:calc(100dvh - 120px)}'].join('\n');
  document.head.appendChild(st);
  var sc=document.getElementById('scroll');
  [['prod','prod-wrap'],['res','res-wrap'],['prix','prix-wrap'],['fab','']].forEach(function(p){
    if(document.getElementById('p-'+p[0])) return;
    var d=document.createElement('div'); d.id='p-'+p[0]; d.className='pg'; d.style.display='none';
    d.innerHTML=p[1]?'<div class="narrow wide" id="'+p[1]+'"></div>':'';
    if(sc) sc.appendChild(d);
    if(window.ALLP&&ALLP.indexOf(p[0])<0) ALLP.push(p[0]);
  });
  // menu latéral : après « Catalogue »
  var cat=document.getElementById('nav-catalogue');
  function sbi(id,label,icon,page){
    var e=document.createElement('div'); e.className='sbi'; e.id='nav-'+id; e.title=label;
    e.setAttribute('onclick',"goPage('"+page+"')");
    e.innerHTML='<span class="sb-ic" style="font-size:16px;line-height:1;display:inline-flex;align-items:center;justify-content:center">'+icon+'</span><span class="sb-lb">'+label+'</span>'+(id==='prod'?'<span class="sb-bd" id="nd-prod">0</span>':'');
    return e;
  }
  if(cat&&cat.parentNode&&!document.getElementById('nav-prod')){
    var a=sbi('prod','Production du jour','🥖','prod'), b=sbi('fab','Fabrication & Bio','🌾','fab');
    cat.parentNode.insertBefore(b,cat.nextSibling); cat.parentNode.insertBefore(a,cat.nextSibling);
  }
  // barre du bas (téléphone) : Production
  var bcat=document.getElementById('bn-catalogue');
  if(bcat&&bcat.parentNode&&!document.getElementById('bn-prod')){
    var bb=document.createElement('div'); bb.className='bni'; bb.id='bn-prod'; bb.setAttribute('onclick',"goPage('prod')");
    bb.innerHTML='<div class="bni-ic" style="font-size:18px;line-height:1">🥖</div><div class="bni-lb">Production</div><div class="bni-bd" id="bnd-prod">0</div>';
    bcat.parentNode.insertBefore(bb,bcat.nextSibling);
  }
  var LBL={prod:'Production du jour',res:'Résultats',prix:'Prix & marges',fab:'Fabrication & Bio'};
  setTimeout(function(){
  var _g=goPage;
  goPage=function(p){
    var r=_g.apply(this,arguments);
    ['prod','res','prix','fab'].forEach(function(id){ var e=document.getElementById('p-'+id); if(e) e.style.display=(id===p)?'block':'none'; });
    ['prod','fab'].forEach(function(id){ ['nav-','bn-'].forEach(function(pf){ var e=document.getElementById(pf+id); if(e) e.classList.toggle('on',p===id||(id==='prod'&&(p==='res'||p==='prix'))); }); });
    if(LBL[p]){
      var bc=document.getElementById('tb-bc'); if(bc){ bc.style.display='block'; bc.textContent=LBL[p]; }
      var act=document.getElementById('tb-act'); if(act) act.innerHTML=(p==='prod'||p==='res')?'<button class="tbtn gold" onclick="printProd()">📄 Feuille</button>':'';
      if(p==='prod') renderProd();
      if(p==='res') renderRes();
      if(p==='prix') renderPrix();
      if(p==='fab'){ var pg=document.getElementById('p-fab'); if(pg&&!pg.querySelector('iframe')) pg.innerHTML='<iframe src="fabrication.html" title="Fabrication & Bio"></iframe>'; }
    }
    return r;
  };
  },0);
  var _ub=window.updBadges;
  if(typeof _ub==='function') updBadges=function(){ var r=_ub.apply(this,arguments); var n=prodCount(); ['nd-prod','bnd-prod'].forEach(function(id){ var e=document.getElementById(id); if(e){ e.textContent=n; e.classList.toggle('on',n>0); e.style.display=n>0?'':'none'; } }); return r; };
  try{ updBadges(); }catch(e){}
})();
