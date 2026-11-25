// ══ PRODUCTION DU JOUR / DE DEMAIN — à partir de MES recettes ═══════════════
// Chaque recette peut décrire les pièces qu'elle produit (r.formats) :
//   • mode 'piece' : une pièce de w grammes de pâte (ex. baguette 350 g)
//   • mode 'bac'   : un bac de w grammes de pâte divisé en pcs pièces (ex. bac 6 kg → 30 pièces)
// La production d'un jour = quantités par format : en pièces pour 'piece', en bacs pour 'bac'.
// Enregistrée dans v4_prodj { 'AAAA-MM-JJ': { idFormat: quantité } }, synchronisée avec le compte.
var PRODJ=(function(){ try{ return JSON.parse(LS.getItem('v4_prodj')||'null')||{}; }catch(e){ return {}; } })();
var PJ={date:'', fmtEd:[]};
if(window.CL_KEYS){ CL_KEYS.v4_prodj=['cfg']; }
if(window.CL_CFG_KEYS&&CL_CFG_KEYS.indexOf('v4_prodj')<0) CL_CFG_KEYS.push('v4_prodj');
if(window.ACCT_KEYS&&ACCT_KEYS.indexOf('v4_prodj')<0) ACCT_KEYS.push('v4_prodj');

function pjISO(d){ var p=function(n){return n<10?'0'+n:''+n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function pjDay(off){ var d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+(off||0)); return pjISO(d); }
function pjParse(iso){ var a=iso.split('-'); return new Date(+a[0],+a[1]-1,+a[2],12); }
function pjAdd(iso,n){ var d=pjParse(iso); d.setDate(d.getDate()+n); return pjISO(d); }
function pjN(v){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)?n:0; }
function pjKg(kg){ var g=kg*1000; return g>=1000?kg.toLocaleString('fr-FR',{maximumFractionDigits:2})+' kg':(Math.round(g*10)/10).toLocaleString('fr-FR')+' g'; }
function pjSave(){ try{ LS.setItem('v4_prodj',JSON.stringify(PRODJ)); }catch(e){} }
function pjLoad(){ try{ PRODJ=JSON.parse(LS.getItem('v4_prodj')||'null')||{}; }catch(e){ PRODJ={}; } }
function pjLabel(iso){
  var t=pjDay(0), lbl=iso===t?'Aujourd’hui':iso===pjAdd(t,1)?'Demain':iso===pjAdd(t,-1)?'Hier':'';
  var s=pjParse(iso).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  return (lbl?lbl+' · ':'')+s.charAt(0).toUpperCase()+s.slice(1);
}
// poids de pâte d'UNE pièce (kg) et nb de pièces pour une quantité saisie
function fmtPieceKg(f){ return f.mode==='bac'?(pjN(f.pcs)>0?pjN(f.w)/1000/pjN(f.pcs):0):pjN(f.w)/1000; }
function fmtPieces(f,q){ return f.mode==='bac'?q*pjN(f.pcs):q; }
function fmtDoughKg(f,q){ return pjN(f.w)/1000*q; }
function fmtDesc(f){
  if(f.mode==='bac') return 'bac de '+pjKg(pjN(f.w)/1000)+(pjN(f.pcs)>0?' → '+pjN(f.pcs)+' pièces de '+pjKg(fmtPieceKg(f)):'');
  return pjKg(pjN(f.w)/1000)+' de pâte';
}

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
  var day=PRODJ[iso]||{}, out={rec:[],preps:[],dough:0,pcs:0,cost:0}, acc={};
  recipes.forEach(function(r){
    var rows=(r.formats||[]).map(function(f){ return {f:f,q:pjN(day[f.id])}; }).filter(function(x){ return x.q>0&&pjN(x.f.w)>0; });
    if(!rows.length) return;
    var M=recWeight(r.id), C=recCost(r.id), D=rows.reduce(function(a,x){ return a+fmtDoughKg(x.f,x.q); },0), k=M>0?D/M:0;
    pjPreps(r,k,acc);
    var pcs=rows.reduce(function(a,x){ return a+fmtPieces(x.f,x.q); },0), cost=M>0?C*k:0;
    out.rec.push({id:r.id,n:r.name,dough:D,k:k,pcs:pcs,cost:cost,rows:rows,need:pjLines(r,k)});
    out.dough+=D; out.pcs+=pcs; out.cost+=cost;
  });
  out.preps=Object.keys(acc).map(function(id){ var s=recipes.find(function(x){return x.id===id;}); return {n:s.name,kg:acc[id]*recWeight(id),need:pjLines(s,acc[id])}; });
  return out;
}
function pjCount(iso){ var d=PRODJ[iso]||{}; return Object.keys(d).filter(function(k){ return pjN(d[k])>0; }).length; }

// ── page Production ──
function prodGo(off){ PJ.date=pjDay(off||0); if(CUR!=='prod') goPage('prod'); else renderProdJ(); }
function pjShift(n){ PJ.date=pjAdd(PJ.date||pjDay(0),n); renderProdJ(); }
function renderProdJ(){
  var box=document.getElementById('pj-wrap'); if(!box) return;
  pjLoad(); if(!PJ.date) PJ.date=pjDay(0);
  var iso=PJ.date, day=PRODJ[iso]||{}, t=pjDay(0);
  var withF=recipes.filter(function(r){ return (r.formats||[]).some(function(f){ return pjN(f.w)>0; }); })
    .sort(function(a,b){ return (a.cat||'').localeCompare(b.cat||'','fr')||a.name.localeCompare(b.name,'fr'); });
  var h='<div class="pj-date"><button class="icbtn" onclick="pjShift(-1)" aria-label="Jour précédent">'+ic('chev-left')+'</button>'+
    '<div class="pj-dl"><b>'+esc(pjLabel(iso))+'</b>'+
    '<div class="pj-q"><button class="chip'+(iso===t?' on':'')+'" onclick="prodGo(0)">Aujourd’hui</button><button class="chip'+(iso===pjAdd(t,1)?' on':'')+'" onclick="prodGo(1)">Demain</button>'+
    '<input type="date" class="fi sm" value="'+iso+'" onchange="if(this.value){PJ.date=this.value;renderProdJ();}" aria-label="Choisir une date"></div></div>'+
    '<button class="icbtn" onclick="pjShift(1)" aria-label="Jour suivant">'+ic('chev-right')+'</button></div>';
  if(!withF.length){
    h+='<div class="empty"><span class="empty-i">🥖</span><div class="empty-t">Aucune pièce définie</div>'+
      '<div class="empty-s">Ouvre une recette et ajoute ses pièces produites (baguette 350 g, bac de 6 kg en 30 pièces…) dans la partie « Pièces produites ».</div>'+
      '<button class="btn btn-gold btn-sm" onclick="goPage(\'recettes\')">Aller aux recettes</button></div>';
    box.innerHTML=h; pjNavOn(); return;
  }
  h+='<div class="cw"><div class="cw-t">Pièces à produire<span class="sp"></span>'+
     '<button class="btn btn-ghost btn-xs" onclick="pjCopyPrev()" title="Reprendre les quantités du jour précédent">↺ Comme la veille</button>'+
     '<button class="btn btn-ghost btn-xs" onclick="pjClear()">Vider</button></div>';
  var cat=null;
  withF.forEach(function(r){
    if((r.cat||'')!==cat){ cat=r.cat||''; h+='<div class="pj-cat">'+esc(cat||'Sans catégorie')+'</div>'; }
    h+='<div class="pj-rec"><div class="pj-rn" onclick="openEditRec(\''+r.id+'\')" title="Ouvrir la recette">'+esc(r.name)+'</div>'+
      r.formats.filter(function(f){ return pjN(f.w)>0; }).map(function(f){
        var q=pjN(day[f.id]);
        return '<label class="pj-row"><span class="pj-fn">'+esc(f.n||(f.mode==='bac'?'Bac':'Pièce'))+' <small>'+esc(fmtDesc(f))+'</small></span>'+
          '<span class="pj-in"><input class="fi sm" type="number" inputmode="decimal" min="0" step="'+(f.mode==='bac'?'0.5':'1')+'" value="'+(q||'')+'" placeholder="0" oninput="pjSet(\''+f.id+'\',this.value)">'+
          '<small>'+(f.mode==='bac'?'bac(s)':'pièce(s)')+'</small></span></label>';
      }).join('')+'</div>';
  });
  h+='</div><div id="pj-sum"></div>';
  box.innerHTML=h; renderPjSum(); pjNavOn();
}
function pjNavOn(){ var t0=pjDay(0); var e0=document.getElementById('nav-pj0'), e1=document.getElementById('nav-pj1'); if(e0) e0.classList.toggle('on',CUR==='prod'&&PJ.date===t0); if(e1) e1.classList.toggle('on',CUR==='prod'&&PJ.date===pjAdd(t0,1)); }
function pjSet(fid,v){ pjLoad(); var iso=PJ.date; var d=PRODJ[iso]||(PRODJ[iso]={}); var q=pjN(v); if(q>0) d[fid]=q; else delete d[fid]; if(!Object.keys(d).length) delete PRODJ[iso]; pjSave(); renderPjSum(); pjBadge(); }
function pjClear(){ if(!pjCount(PJ.date)) return; if(!confirm('Vider les quantités de cette journée ?')) return; pjLoad(); delete PRODJ[PJ.date]; pjSave(); renderProdJ(); pjBadge(); }
function pjCopyPrev(){
  pjLoad(); var prev=null, d=PJ.date;
  for(var i=1;i<=14;i++){ var p=pjAdd(d,-i); if(pjCount(p)){ prev=p; break; } }
  if(!prev){ toast('Aucune journée récente à reprendre','err'); return; }
  if(pjCount(d)&&!confirm('Remplacer les quantités par celles du '+pjParse(prev).toLocaleDateString('fr-FR')+' ?')) return;
  PRODJ[d]=Object.assign({},PRODJ[prev]); pjSave(); renderProdJ(); pjBadge(); toast('Quantités reprises du '+pjParse(prev).toLocaleDateString('fr-FR'),'ok');
}
function pjNeedTable(l){ return '<table class="ptb"><tr><th>À peser</th><th>Quantité</th></tr>'+l.map(function(x){ return '<tr><td>'+(x.sub?'⊛ ':'')+esc(x.n)+'</td><td><b>'+pjKg(x.kg)+'</b></td></tr>'; }).join('')+'</table>'; }
function renderPjSum(){
  var el=document.getElementById('pj-sum'); if(!el) return;
  var o=pjCalc(PJ.date);
  if(!o.rec.length){ el.innerHTML='<div class="pm" style="margin:4px 2px 14px">Saisis des quantités : la pâte et les pesées s’affichent ici.</div>'; return; }
  el.innerHTML='<div class="pj-tots"><div><b>'+pjKg(o.dough)+'</b><small>de pâte</small></div><div><b>'+o.pcs.toLocaleString('fr-FR')+'</b><small>pièces</small></div><div><b>'+fEur(o.cost)+'</b><small>coût matière</small></div></div>'+
    '<button class="btn btn-gold btn-full" style="margin-bottom:14px" onclick="pjPDF()">📄 Feuille de production (PDF)</button>'+
    (o.preps.length?'<div class="cw"><div class="cw-t">⊛ À préparer avant</div>'+o.preps.map(function(p){ return '<div class="pj-pn">'+esc(p.n)+' — '+pjKg(p.kg)+'</div>'+pjNeedTable(p.need); }).join('')+'</div>':'')+
    o.rec.map(function(r){
      return '<div class="cw"><div class="cw-t">'+esc(r.n)+'<span class="sp"></span><span class="pm">'+pjKg(r.dough)+' de pâte · '+r.pcs.toLocaleString('fr-FR')+' pièce(s)</span></div>'+
        pjNeedTable(r.need)+
        '<table class="ptb"><tr><th>Division</th><th>Quantité</th></tr>'+r.rows.map(function(x){ var f=x.f;
          return '<tr><td>'+esc(f.n||(f.mode==='bac'?'Bac':'Pièce'))+' <span class="pm">'+(f.mode==='bac'?pjKg(fmtPieceKg(f))+'/pièce':pjKg(fmtPieceKg(f)))+'</span></td><td><b>'+
            (f.mode==='bac'?x.q.toLocaleString('fr-FR')+' bac(s) = '+fmtPieces(f,x.q).toLocaleString('fr-FR')+' pièces':x.q.toLocaleString('fr-FR')+' pièce(s)')+'</b></td></tr>';
        }).join('')+'</table></div>';
    }).join('');
}
function pjBadge(){
  var n=pjCount(pjDay(0)), m=pjCount(pjDay(1));
  [['nd-pj0',n],['nd-pj1',m]].forEach(function(a){ var e=document.getElementById(a[0]); if(e){ e.textContent=a[1]; e.style.display=a[1]?'':'none'; } });
}

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
    var W=210,M=16,cw=W-M*2,y=M,c2=cw*0.62;
    var T=function(t){ return String(t).replace(/[⊛]/g,'*').replace(/[’]/g,"'"); };
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,20,20);doc.text('Feuille de production',M,y+6);
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(110,110,110);
    doc.text(T(pjLabel(PJ.date))+'  ·  '+pjKg(o.dough)+' de pâte  ·  '+o.pcs+' pièces',M,y+12);
    y+=18;
    function band(l){ if(y>262){doc.addPage();y=M;} doc.setFillColor(30,30,30);doc.rect(M,y,cw,7,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text(T(l),M+2,y+5);y+=7; }
    function rows(list){ list.forEach(function(r,i){ if(y>278){doc.addPage();y=M;} doc.setFillColor(i%2?255:245,i%2?255:245,i%2?255:245);doc.rect(M,y,cw,6.5,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(20,20,20);doc.text(T(r[0]),M+2,y+4.6,{maxWidth:c2-4});doc.setFont('helvetica','bold');doc.text(T(r[1]),M+c2+2,y+4.6);y+=6.5; }); y+=3; }
    o.preps.forEach(function(p){ band('A préparer avant : '+p.n+' — '+pjKg(p.kg)); rows(p.need.map(function(x){ return [(x.sub?'* ':'')+x.n,pjKg(x.kg)]; })); });
    o.rec.forEach(function(r){
      band(r.n+' — '+pjKg(r.dough)+' de pâte · '+r.pcs+' pièces');
      rows(r.need.map(function(x){ return [(x.sub?'* ':'')+x.n,pjKg(x.kg)]; }));
      rows(r.rows.map(function(x){ var f=x.f; return [(f.n||(f.mode==='bac'?'Bac':'Pièce'))+' ('+(f.mode==='bac'?pjKg(fmtPieceKg(f))+'/pièce':pjKg(fmtPieceKg(f)))+')', f.mode==='bac'?x.q+' bac(s) = '+fmtPieces(f,x.q)+' pièces':x.q+' pièce(s)']; }));
    });
    doc.save('production-'+PJ.date+'.pdf'); toast('📄 PDF téléchargé','ok');
  }catch(e){ console.error(e); toast('Erreur PDF','err'); }
}

// ── éditeur de recette : « Pièces produites » ──
function pjFmtRender(){
  var el=document.getElementById('r-fmts'); if(!el) return;
  el.innerHTML=PJ.fmtEd.length?PJ.fmtEd.map(function(f,i){
    var bac=f.mode==='bac';
    return '<div class="pj-fe"><div class="pj-fe-h"><span class="pj-tag">'+(bac?'Bac':'Pièce')+'</span>'+
      '<input class="fi sm" placeholder="'+(bac?'Nom (ex. Bac pain de mie)':'Nom (ex. Baguette)')+'" value="'+esc(f.n||'')+'" oninput="pjFmtSet('+i+',\'n\',this.value)">'+
      '<button class="re-ib" onclick="pjFmtDel('+i+')" title="Supprimer" aria-label="Supprimer">'+ic('trash')+'</button></div>'+
      '<div class="pj-fe-g"><label><small>'+(bac?'Poids du bac (g)':'Poids de pâte (g)')+'</small><input class="fi sm" type="number" inputmode="decimal" min="0" value="'+(f.w||'')+'" oninput="pjFmtSet('+i+',\'w\',this.value)"></label>'+
      (bac?'<label><small>Divisé en (pièces)</small><input class="fi sm" type="number" inputmode="numeric" min="0" value="'+(f.pcs||'')+'" oninput="pjFmtSet('+i+',\'pcs\',this.value)"></label>':'')+
      '<div class="pj-fe-i" id="pj-fe-i-'+i+'">'+pjFmtInfo(f)+'</div></div></div>';
  }).join(''):'<div class="pm">Aucune pièce. Ajoute ce que cette recette produit pour l’utiliser dans la production du jour.</div>';
}
function pjFmtInfo(f){
  if(f.mode==='bac') return pjN(f.w)>0&&pjN(f.pcs)>0?'→ '+pjKg(fmtPieceKg(f))+' par pièce':'';
  return '';
}
function pjFmtAdd(mode){ PJ.fmtEd.push({id:uid(),mode:mode,n:'',w:'',pcs:mode==='bac'?'':undefined}); pjFmtRender(); }
function pjFmtDel(i){ PJ.fmtEd.splice(i,1); pjFmtRender(); }
function pjFmtSet(i,k,v){ var f=PJ.fmtEd[i]; if(!f) return; f[k]=(k==='n')?v:pjN(v); var e=document.getElementById('pj-fe-i-'+i); if(e) e.innerHTML=pjFmtInfo(f); }
function pjFmtLoad(r){ PJ.fmtEd=((r&&r.formats)||[]).map(function(f){ return Object.assign({mode:'piece'},f); }); pjFmtRender(); }

(function(){
  // styles
  var st=document.createElement('style');
  st.textContent=[
    '.pj-date{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
    '.pj-dl{flex:1;min-width:0;text-align:center}.pj-dl b{display:block;font-size:17px;color:var(--i);margin-bottom:8px}',
    '.pj-q{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;align-items:center}.pj-q input{max-width:150px}',
    '.chip.on{background:var(--i);color:var(--on-i);border-color:var(--i)}',
    '.pj-cat{font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--i4);margin:14px 0 4px}',
    '.pj-rec{border:1px solid var(--bd);border-radius:12px;padding:10px 12px;margin-bottom:8px}',
    '.pj-rn{font-weight:700;color:var(--i);cursor:pointer;margin-bottom:4px}',
    '.pj-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--bd)}',
    '.pj-fn{flex:1;min-width:0;color:var(--i);font-size:14px}.pj-fn small{display:block;color:var(--i4);font-size:12px}',
    '.pj-in{display:flex;align-items:center;gap:6px}.pj-in input{width:84px;text-align:right}.pj-in small{color:var(--i4);font-size:11px;width:48px}',
    '.pj-tots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 12px}',
    '.pj-tots>div{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px;text-align:center}',
    '.pj-tots b{display:block;font-size:17px;color:var(--i)}.pj-tots small{color:var(--i4);font-size:11px}',
    '.pj-pn{font-weight:600;margin:8px 0 0;color:var(--i)}',
    '.ptb{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
    '.ptb th{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--i4);text-align:right;padding:5px 4px;border-bottom:1px solid var(--bd);font-weight:600}',
    '.ptb td{padding:6px 4px;border-bottom:1px solid var(--bd);text-align:right;color:var(--i)}',
    '.ptb th:first-child,.ptb td:first-child{text-align:left}.pm{font-size:12px;color:var(--i4)}',
    '.pj-fe{border:1px solid var(--bd);border-radius:12px;padding:10px;margin-bottom:8px}',
    '.pj-fe-h{display:flex;gap:8px;align-items:center}.pj-fe-h input{flex:1}',
    '.pj-tag{font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;background:var(--p2);color:var(--i)}',
    '.pj-fe-g{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:8px}.pj-fe-g label{display:flex;flex-direction:column;gap:3px;width:130px}',
    '.pj-fe-g small{color:var(--i4);font-size:11px}.pj-fe-i{color:var(--i3);font-size:13px;font-weight:600;padding-bottom:9px}'
  ].join('\n');
  document.head.appendChild(st);

  // page
  var sc=document.getElementById('scroll');
  if(sc&&!document.getElementById('p-prod')){
    var d=document.createElement('div'); d.id='p-prod'; d.className='pg'; d.style.display='none';
    d.innerHTML='<div class="narrow wide" id="pj-wrap"></div>'; sc.appendChild(d);
  }
  if(window.ALLP&&ALLP.indexOf('prod')<0) ALLP.push('prod');

  // menu : groupe « Production » (Production du jour, de demain, Planning)
  var grp=document.getElementById('nav-fab');
  if(grp){
    grp.textContent='Production';
    var mk=function(id,lbl,icn,off){ var e=document.createElement('div'); e.className='sbi'; e.id=id; e.title=lbl;
      e.setAttribute('onclick','prodGo('+off+')');
      e.innerHTML='<span class="sb-ic" style="font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:1.15em">'+icn+'</span><span class="sb-lb">'+lbl+'</span><span class="sb-bd" id="nd-pj'+off+'" style="display:none">0</span>'; return e; };
    var a=mk('nav-pj0','Production du jour','🍞',0), b=mk('nav-pj1','Production de demain','🌅',1);
    grp.parentNode.insertBefore(b,grp.nextSibling); grp.parentNode.insertBefore(a,grp.nextSibling);
  }
  var bf=document.getElementById('bn-fab');
  if(bf){ bf.setAttribute('onclick','prodGo(0)'); var l=bf.querySelector('.bni-lb'); if(l) l.textContent='Production'; var ii=bf.querySelector('.bni-ic'); if(ii) ii.textContent='🍞'; }

  // éditeur de recette
  var _on=openNewRec; openNewRec=function(){ var r=_on.apply(this,arguments); pjFmtLoad(null); return r; };
  var _oe=openEditRec; openEditRec=function(id){ var r=_oe.apply(this,arguments); pjFmtLoad(recipes.find(function(x){return x.id===id;})); return r; };
  var _sv=saveRecipe; saveRecipe=function(){
    var before={}; recipes.forEach(function(r){ before[r.id]=r.updatedAt; });
    var wasId=editRecId, res=_sv.apply(this,arguments);
    var rec=wasId?recipes.find(function(r){ return r.id===wasId; }):recipes.find(function(r){ return !(r.id in before); });
    if(rec){
      var f=PJ.fmtEd.filter(function(x){ return pjN(x.w)>0; }).map(function(x){ var o={id:x.id,mode:x.mode==='bac'?'bac':'piece',n:String(x.n||'').trim(),w:pjN(x.w)}; if(o.mode==='bac') o.pcs=pjN(x.pcs); return o; });
      var old=JSON.stringify(rec.formats||[]);
      if(f.length) rec.formats=f; else delete rec.formats;
      if(JSON.stringify(rec.formats||[])!==old) persist();
    }
    return res;
  };

  // navigation (après les autres extensions)
  setTimeout(function(){
    var _g=goPage;
    goPage=function(p){
      var r=_g.apply(this,arguments);
      var pg=document.getElementById('p-prod'); if(pg) pg.style.display=(p==='prod')?'block':'none';
      var t0=pjDay(0), t1=pjAdd(t0,1);
      var on0=p==='prod'&&PJ.date===t0, on1=p==='prod'&&PJ.date===t1;
      var e0=document.getElementById('nav-pj0'), e1=document.getElementById('nav-pj1'), bn=document.getElementById('bn-fab');
      if(e0) e0.classList.toggle('on',on0); if(e1) e1.classList.toggle('on',on1);
      if(bn) bn.classList.toggle('on',p==='prod'||p==='fab');
      if(p==='prod'){
        var bc=document.getElementById('tb-bc'); if(bc){ bc.style.display='block'; bc.textContent='Production'; }
        var act=document.getElementById('tb-act'); if(act) act.innerHTML='<button class="tbtn gold" onclick="pjPDF()">📄 Feuille</button>';
        renderProdJ();
        if(e0) e0.classList.toggle('on',PJ.date===t0); if(e1) e1.classList.toggle('on',PJ.date===t1);
      }
      return r;
    };
  },0);
  try{ pjBadge(); }catch(e){}
})();
