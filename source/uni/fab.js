// ══ FABRICATION & BIO — intégrée à Économat Pro ══════════════
// Les écrans de Fabrication (fabrication.html, base Supabase « Manu ») s'affichent
// dans la page « Fabrication » de l'appli. Le menu de l'appli pilote les écrans,
// et fabrication.html reprend automatiquement les couleurs et la police de l'appli
// (mode intégré, voir le bloc « MODE INTÉGRÉ » en bas de fabrication.html).
var FAB_SCREENS=[
  ['plan','Planning','📅']
];
var FAB={screen:'plan', frame:null};
function fabWin(){ try{ return FAB.frame&&FAB.frame.contentWindow; }catch(e){ return null; } }
function fabShow(id){
  FAB.screen=id||FAB.screen;
  if(CUR!=='fab') goPage('fab'); else fabSync();
}
function fabSync(){
  var w=fabWin();
  if(w&&typeof w.show==='function'){
    try{
      var scr=FAB.screen==='demain'?'fab':FAB.screen;
      w.show(scr);
      if(scr==='fab'&&typeof w.fabGoDay==='function'&&FAB.day!==FAB.screen){ FAB.day=FAB.screen; w.fabGoDay(FAB.screen==='demain'?1:0); }
    }catch(e){}
  }
  var lbl=(FAB_SCREENS.find(function(s){return s[0]===FAB.screen;})||[])[1]||'Fabrication';
  var bc=document.getElementById('tb-bc'); if(bc&&CUR==='fab'){ bc.style.display='block'; bc.textContent='Fabrication · '+lbl; }
  document.querySelectorAll('[data-fab]').forEach(function(e){ e.classList.toggle('on',CUR==='fab'&&e.getAttribute('data-fab')===FAB.screen); });
}
function fabMount(){
  var pg=document.getElementById('p-fab'); if(!pg) return;
  if(!pg.querySelector('iframe')){
    pg.innerHTML='<div class="chips fab-chips">'+FAB_SCREENS.map(function(s){
        return '<div class="chip" data-fab="'+s[0]+'" onclick="fabShow(\''+s[0]+'\')">'+s[2]+' '+esc(s[1])+'</div>';
      }).join('')+'<div class="chip" onclick="fabHelp()">❓ Aide</div></div>'+
      '<iframe id="fab-frame" src="fabrication.html?embed=1" title="Fabrication & Bio"></iframe>';
    FAB.frame=document.getElementById('fab-frame');
    FAB.frame.addEventListener('load',function(){ FAB.day=''; setTimeout(fabSync,50); setTimeout(fabSync,1500); });
  }
  fabSync();
}
function fabHelp(){ var w=fabWin(); if(w&&typeof w.openAide==='function') w.openAide(); }
// Thème : à chaque changement de couleur ou de mode sombre, l'écran Fabrication suit.
function fabTheme(){ var w=fabWin(); if(w&&typeof w.fabApplyTheme==='function'){ try{ w.fabApplyTheme(); }catch(e){} } }
(function(){
  var st=document.createElement('style');
  st.textContent=[
    '#p-fab{padding:16px 20px 0!important}',
    '#p-fab .fab-chips{margin-bottom:10px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}',
    '#p-fab .fab-chips::-webkit-scrollbar{display:none}',
    '#p-fab .chip.on{background:var(--i);color:var(--on-i);border-color:var(--i)}',
    '#fab-frame{display:block;width:100%;border:0;background:transparent;height:calc(100dvh - 56px - 60px)}',
    'html.lay-mob #p-fab{padding:10px 12px 0!important}',
    'html.lay-mob #fab-frame{height:calc(100dvh - 54px - var(--nav-h,62px) - 56px - env(safe-area-inset-bottom,0px))}',
    '@media (max-width:820px){#p-fab{padding:10px 12px 0!important}#fab-frame{height:calc(100dvh - 54px - var(--nav-h,62px) - 56px - env(safe-area-inset-bottom,0px))}}',
    '.sbi[data-fab] .sb-ic{font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:1.15em}'
  ].join('\n');
  document.head.appendChild(st);

  // L'appli se concentre sur les recettes, la production et le catalogue :
  // bons d'économat et livre de recettes ne sont plus proposés.
  var st2=document.createElement('style');
  st2.textContent='#nav-bons,#bn-bons,#nav-livre,#bn-livre,#nav-partage,#bn-partage,#nav-fournisseurs,#bn-fournisseurs,#r-share-card,#bk-m-btn,#h-cur,#h-week,#h-recents,#h-recents-hd{display:none!important}';
  document.head.appendChild(st2);
  var sc=document.getElementById('scroll');
  if(sc&&!document.getElementById('p-fab')){
    var d=document.createElement('div'); d.id='p-fab'; d.className='pg'; d.style.display='none'; sc.appendChild(d);
  }
  if(window.ALLP&&ALLP.indexOf('fab')<0) ALLP.push('fab');

  // Menu latéral : un groupe « Fabrication & Bio » sous l'espace de travail
  var cat=document.getElementById('nav-catalogue');
  if(cat&&cat.parentNode&&!document.getElementById('nav-fab')){
    var frag=document.createDocumentFragment();
    var h=document.createElement('div'); h.className='sb-grp'; h.id='nav-fab'; h.setAttribute('role','presentation'); h.textContent='Fabrication & Bio';
    frag.appendChild(h);
    FAB_SCREENS.forEach(function(s){
      var e=document.createElement('div'); e.className='sbi'; e.setAttribute('data-fab',s[0]); e.title=s[1];
      e.setAttribute('onclick',"fabShow('"+s[0]+"')");
      e.innerHTML='<span class="sb-ic">'+s[2]+'</span><span class="sb-lb">'+esc(s[1])+'</span>';
      frag.appendChild(e);
    });
    // après « Livre » s'il existe, sinon après « Catalogue »
    var after=document.getElementById('nav-livre')||cat;
    after.parentNode.insertBefore(frag,after.nextSibling);
  }
  // Barre du bas (téléphone) : un bouton « Fabrication »
  var bcat=document.getElementById('bn-catalogue');
  if(bcat&&bcat.parentNode&&!document.getElementById('bn-fab')){
    var bb=document.createElement('div'); bb.className='bni'; bb.id='bn-fab'; bb.setAttribute('onclick',"prodGo(0)");
    bb.innerHTML='<div class="bni-ic" style="font-size:18px;line-height:1">🌾</div><div class="bni-lb">Fabrication</div>';
    bcat.parentNode.insertBefore(bb,bcat.nextSibling);
  }

  // Navigation (posée après toutes les autres extensions de goPage)
  setTimeout(function(){
    var _g=goPage;
    goPage=function(p){
      if(p==='bons'||p==='edit'||p==='livre'||p==='partage'||p==='fournisseurs') p='recettes';
      var r=_g.call(this,p);
      var pg=document.getElementById('p-fab'); if(pg) pg.style.display=(p==='fab')?'block':'none';
      var bn=document.getElementById('bn-fab'); if(bn) bn.classList.toggle('on',p==='fab');
      if(p==='fab'){
        var act=document.getElementById('tb-act'); if(act) act.innerHTML='';
        var back=document.getElementById('tb-back'); if(back) back.className='';
        var ti=document.getElementById('tb-title'); if(ti) ti.style.display='none';
        fabMount();
      } else fabSync();
      return r;
    };
  },0);

  // Changement de thème dans l'appli → l'écran Fabrication suit
  try{
    new MutationObserver(function(){ fabTheme(); }).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
  }catch(e){}
})();
