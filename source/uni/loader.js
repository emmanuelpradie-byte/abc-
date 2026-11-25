/* Stockage des données : IndexedDB (pas de limite de 5 Mo, photos comprises),
   avec une copie de secours dans localStorage. Les données existantes de
   localStorage sont reprises automatiquement au premier lancement. */
(function(){
  var mem={}, db=null, pending={}, timer=null, started=false, NAME='mon-fournil', STORE='kv';
  function has(k){ return Object.prototype.hasOwnProperty.call(mem,k); }
  function queue(k){ pending[k]=1; if(!timer) timer=setTimeout(flush,40); }
  function flush(){
    timer=null; if(!db){ pending={}; return; }
    var ks=Object.keys(pending); pending={}; if(!ks.length) return;
    try{
      var st=db.transaction(STORE,'readwrite').objectStore(STORE);
      ks.forEach(function(k){ if(has(k)) st.put(mem[k],k); else st.delete(k); });
    }catch(e){ console.warn('IndexedDB :',e); }
  }
  var LS={
    backend:'local',
    getItem:function(k){ return has(k)?mem[k]:null; },
    setItem:function(k,v){
      v=String(v); mem[k]=v; queue(k);
      try{ localStorage.setItem(k,v); }catch(e){ try{ localStorage.removeItem(k); }catch(e2){} }
    },
    removeItem:function(k){ delete mem[k]; queue(k); try{ localStorage.removeItem(k); }catch(e){} },
    keys:function(){ return Object.keys(mem); },
    flush:function(){ flush(); }
  };
  window.LS=LS;
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') flush(); });
  window.addEventListener('pagehide',flush);
  function fromLocal(){
    var out=[];
    try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(!has(k)){ mem[k]=localStorage.getItem(k); out.push(k); } } }catch(e){}
    return out;
  }
  function start(){
    if(started) return; started=true;
    // le code de l'appli est plus bas dans la page : attendre qu'elle soit entièrement lue
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',run); return; }
    run();
  }
  function run(){
    var src=document.getElementById('app-src'), s=document.createElement('script');
    s.textContent=src.textContent; document.body.appendChild(s);
  }
  function keepOld(k){
    var b=String(k).replace(/^acct:[^:]+:/,'');
    if(b.indexOf('v4_')!==0) return false;
    if(b.indexOf('v4_cloud')===0||b==='v4_shared_cache'||b==='v4_theme_lock'||b==='v4_epure_pal'||b==='v4_theme_epure1'||b==='v4_theme') return false;
    return true;
  }
  function migrateOld(done){
    var raw=window.__LS0, n=0;
    try{ for(var i=0;raw&&i<raw.length;i++){ var k=raw.key(i); if(k&&k.indexOf('mf:')!==0&&keepOld(k)&&!has(k)){ mem[k]=raw.getItem(k); queue(k); n++; } } }catch(e){}
    var fin=false, t=setTimeout(function(){ if(!fin){ fin=true; done(); } },2500);
    try{
      var rq=indexedDB.open('economat-pro');
      rq.onupgradeneeded=function(){ try{ rq.transaction.abort(); }catch(e){} };
      rq.onerror=function(){ if(!fin){ fin=true; clearTimeout(t); done(); } };
      rq.onsuccess=function(){
        var b=rq.result;
        try{
          var cur=b.transaction(STORE,'readonly').objectStore(STORE).openCursor();
          cur.onsuccess=function(){ var c=cur.result;
            if(c){ if(keepOld(c.key)){ mem[c.key]=c.value; queue(c.key); } c.continue(); return; }
            b.close(); if(!fin){ fin=true; clearTimeout(t); done(); } };
          cur.onerror=function(){ b.close(); if(!fin){ fin=true; clearTimeout(t); done(); } };
        }catch(e){ try{ b.close(); }catch(e2){} if(!fin){ fin=true; clearTimeout(t); done(); } }
      };
    }catch(e){ if(!fin){ fin=true; clearTimeout(t); done(); } }
  }
  function fallback(){ if(started) return; fromLocal(); LS.backend='local'; start(); }
  var guard=setTimeout(fallback,3000);
  try{
    var rq=indexedDB.open(NAME,1);
    rq.onupgradeneeded=function(){ rq.result.createObjectStore(STORE); };
    rq.onerror=function(){ clearTimeout(guard); fallback(); };
    rq.onsuccess=function(){
      var base=rq.result;
      base.onversionchange=function(){ flush(); base.close(); db=null; };
      if(started){
        // L'appli a démarré sur la copie de secours : on remet IndexedDB à jour.
        db=base; LS.backend='idb'; Object.keys(mem).forEach(queue); return;
      }
      var got={}, cur=base.transaction(STORE,'readonly').objectStore(STORE).openCursor();
      cur.onsuccess=function(){
        var c=cur.result;
        if(c){ got[c.key]=c.value; c.continue(); return; }
        clearTimeout(guard); if(started) return;
        Object.keys(got).forEach(function(k){ mem[k]=got[k]; });
        db=base; LS.backend='idb';
        fromLocal().forEach(queue);          // reprise des anciennes données
        if(!Object.keys(mem).length&&!(window.__LS0&&window.__LS0.getItem('mf:__migre'))){
          // Premier lancement de Mon Fournil : on reprend une fois les recettes et le catalogue
          // de l'ancienne appli Économat Pro ouverte sur ce même site (sans ses réglages de connexion).
          migrateOld(function(){ try{ window.__LS0.setItem('mf:__migre','1'); }catch(e){} start(); });
          return;
        }
        start();
      };
      cur.onerror=function(){ clearTimeout(guard); fallback(); };
    };
  }catch(e){ clearTimeout(guard); fallback(); }
})();
