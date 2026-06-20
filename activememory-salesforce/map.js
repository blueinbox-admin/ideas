(function(){
  var THRESHOLD=3, MAXN=6, GREEN='92,44,6', SOFT='196,176,150';
  var CLUSTERS=[
    { id:'basics',  title:'The basics',  x:0,    y:0,   z:0,   revealAt:0 },
    { id:'site',    title:'Send rules',  x:86,   y:-52, z:-14, revealAt:0 },
    { id:'books',   title:'Data model',  x:104,  y:44,  z:30,  revealAt:0 },
    { id:'voice',   title:'Queries',     x:-96,  y:-26, z:18,  revealAt:0 },
    { id:'clients', title:'Audiences',   x:-34,  y:64,  z:-22, revealAt:0 },
    { id:'process', title:'Process',     x:-104, y:40,  z:26,  revealAt:0 },
    { id:'sched',   title:'Schedules',   x:-44,  y:-74, z:-30, revealAt:0, frontier:true },
    { id:'refer',   title:'Journeys',    x:40,   y:86,  z:14,  revealAt:1, frontier:true }
  ];
  var CBY={}; CLUSTERS.forEach(function(c){ CBY[c.id]=c; });
  var LINKS={ l1:{a:'site',b:'books'}, l2:{a:'clients',b:'books'}, l3:{a:'voice',b:'site'}, l4:{a:'process',b:'clients'}, l5:{a:'clients',b:'site'}, l6:{a:'voice',b:'process'} };
  // each answer lights more cross-links, so the map gains corners as it grows
  var ALL=['l1','l2','l3','l4','l5','l6'];
  var BEATS=[
    { c:{basics:5,site:3,books:3,voice:2,clients:2,process:2}, links:['l1','l3','l4'],          toast:null },
    { c:{basics:5,site:3,books:3,voice:3,clients:2,process:2}, links:['l1','l3','l4','l6'],     toast:null },
    { c:{basics:5,site:4,books:3,voice:3,clients:3,process:2}, links:['l1','l2','l3','l4','l6'],toast:null },
    { c:{basics:5,site:4,books:4,voice:3,clients:3,process:3}, links:ALL,                       toast:null },
    { c:{basics:6,site:4,books:4,voice:4,clients:3,process:3}, links:ALL,                       toast:null },
    { c:{basics:6,site:5,books:4,voice:4,clients:4,process:3}, links:ALL,                       toast:null },
    { c:{basics:6,site:5,books:5,voice:4,clients:4,process:4}, links:ALL,                       toast:null },
    { c:{basics:6,site:6,books:5,voice:4,clients:5,process:4}, links:ALL,                       toast:null },
    { c:{basics:6,site:6,books:6,voice:5,clients:5,process:5}, links:ALL,                       toast:null }
  ];
  function rng(s){ return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
  CLUSTERS.forEach(function(c,ci){
    var r=rng(97+ci*131), n=c.frontier?3:MAXN, R=15; c.nodes=[]; c._rev=0;
    for (var i=0;i<n;i++){ var u=r()*2-1,t=r()*Math.PI*2,sp=Math.sqrt(1-u*u),rad=R*(0.45+0.55*r());
      c.nodes.push({ ox:rad*sp*Math.cos(t), oy:rad*sp*Math.sin(t), oz:rad*u, alpha:0 }); }
  });
  var card=document.getElementById('mmCard'), cv=document.getElementById('mmCanvas');
  if(!card||!cv) return;
  var ctx=cv.getContext('2d');
  var W=322,H=196,dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  var step=0, ang=0.5, shimmer=0, transit=0, rings=[], hovered=false, rafId=null;
  var FOCAL=340, TILT=-0.34, ZOOM=1.14;
  function rot(p){ var c0=Math.cos(TILT),s0=Math.sin(TILT);
    var y1=p.y*c0-p.z*s0, z1=p.y*s0+p.z*c0, x1=p.x; var ca=Math.cos(ang),sa=Math.sin(ang);
    return { x:x1*ca - z1*sa, y:y1, z:x1*sa + z1*ca }; }
  function project(p){ var r=rot(p), sc=FOCAL/(FOCAL+r.z); return { sx:W/2+r.x*sc*ZOOM, sy:H/2+r.y*sc*ZOOM, scale:sc, z:r.z }; }
  function fog(sc){ var f=(sc-0.76)/0.72; return Math.max(0,Math.min(1,f))*0.62+0.38; }
  function lerp(a,b,t){ return Math.round(a+(b-a)*t); }
  function clusterColor(c){ var n=c._active;
    if(c.frontier||n===0) return SOFT;
    if(n<THRESHOLD){ var t=n/THRESHOLD; return lerp(196,150,t)+","+lerp(176,110,t)+","+lerp(150,72,t); }
    var t2=Math.min(1,(n-THRESHOLD)/3); return lerp(150,92,t2)+","+lerp(110,44,t2)+","+lerp(72,6,t2); }
  function updateWarmth(){ var beat=BEATS[step], total=CLUSTERS.reduce(function(a,n){ return a+(beat.c[n.id]||0); },0);
    card.classList.toggle('warm1', total>=12 && total<18);
    card.classList.toggle('warm2', total>=18 && total<22);
    card.classList.toggle('warm3', total>=22); }
  function line(a,b,st,w){ ctx.strokeStyle=st; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke(); }
  function transitDot(ca,cb,t){ var x=ca.x+(cb.x-ca.x)*t, y=ca.y+(cb.y-ca.y)*t, z=ca.z+(cb.z-ca.z)*t;
    var p=project({x:x,y:y,z:z}), f=fog(p.scale), r=2.6*p.scale, gr=r*3.2;
    var g=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,gr);
    g.addColorStop(0,'rgba('+GREEN+','+(0.55*f)+')'); g.addColorStop(0.4,'rgba('+GREEN+','+(0.22*f)+')'); g.addColorStop(1,'rgba('+GREEN+',0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.sx,p.sy,gr,0,7); ctx.fill();
    ctx.fillStyle='rgba('+GREEN+','+Math.min(1,0.9*f)+')'; ctx.beginPath(); ctx.arc(p.sx,p.sy,r*0.85,0,7); ctx.fill(); }
  function draw(){
    ctx.clearRect(0,0,W,H); var beat=BEATS[step];
    CLUSTERS.forEach(function(c){ var active=(beat.c[c.id]||0), lit=!c.frontier && active>=THRESHOLD;
      c._shown=step>=c.revealAt; c._rev += ((c._shown?1:0)-c._rev)*0.13;
      c._p=project(c); c._lit=lit; c._active=active; c._col=clusterColor(c); });
    CLUSTERS.forEach(function(c){ if(!c._shown||c.frontier||c._active===0) return;
      var p=c._p,f=fog(p.scale),rad=(26+c._active*9)*p.scale,a=Math.min(0.085,(0.010+0.012*c._active)*f)*c._rev;
      var g=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,rad);
      g.addColorStop(0,'rgba(92,44,6,'+a+')'); g.addColorStop(1,'rgba(92,44,6,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.sx,p.sy,rad,0,7); ctx.fill(); });
    CLUSTERS.forEach(function(c){ if(!c._shown||c.frontier||c._active===0) return;
      var p=c._p,f=fog(p.scale),rad=(11+c._active*4.6)*p.scale,a=Math.min(0.16,(0.045+0.019*c._active)*f)*c._rev;
      var g=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,rad);
      g.addColorStop(0,'rgba('+c._col+','+a+')'); g.addColorStop(1,'rgba('+c._col+',0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.sx,p.sy,rad,0,7); ctx.fill(); });
    ctx.lineCap='round'; var hub=CBY.basics._p;
    var present=CLUSTERS.filter(function(c){ return c._shown && !c.frontier && c._active>0; });
    present.forEach(function(c){ if(c.id==='basics') return;
      var f=Math.min(hub.scale,c._p.scale), seeded=!c._lit;
      line(hub,c._p,'rgba('+GREEN+','+((seeded?0.20:0.30)*fog(f))+')',1.7*f); });
    var web=present.filter(function(c){ return c.id!=='basics'; });
    web.forEach(function(c){
      var near=web.filter(function(o){ return o!==c; })
        .map(function(o){ return { o:o, d:Math.hypot(c.x-o.x,c.y-o.y) }; })
        .sort(function(a,b){ return a.d-b.d; }).slice(0,2);
      near.forEach(function(it){ var f=Math.min(c._p.scale,it.o._p.scale); line(c._p,it.o._p,'rgba('+GREEN+','+(0.18*fog(f))+')',1.25*f); }); });
    CLUSTERS.forEach(function(c){ if(!c._shown||c.frontier||c._active<2) return; var ns=c.nodes,m=c._active,lit=c._lit;
      for (var i=0;i<m;i++){ var j=(i+1)%m; if(j===i) continue;
        var a=project({x:c.x+ns[i].ox,y:c.y+ns[i].oy,z:c.z+ns[i].oz});
        var b=project({x:c.x+ns[j].ox,y:c.y+ns[j].oy,z:c.z+ns[j].oz});
        line(a,b,'rgba('+GREEN+','+((lit?0.30:0.22)*fog(Math.min(a.scale,b.scale)))+')',1.15*Math.min(a.scale,b.scale)); } });
    beat.links.forEach(function(k){ var L=LINKS[k]; if(!CBY[L.a]._shown||!CBY[L.b]._shown) return;
      var a=CBY[L.a]._p,b=CBY[L.b]._p,f=Math.min(a.scale,b.scale); line(a,b,'rgba('+GREEN+','+(0.6*fog(f))+')',2.6*f); });
    beat.links.forEach(function(k){ var L=LINKS[k]; if(!CBY[L.a]._shown||!CBY[L.b]._shown) return;
      [0.30,0.63].forEach(function(t0){ transitDot(CBY[L.a],CBY[L.b],(t0+transit)%1); }); });
    present.forEach(function(c){ if(c.id==='basics'||!c._lit) return; transitDot(CBY.basics,c,(0.46+transit)%1); });
    var draws=[];
    CLUSTERS.forEach(function(c){ c.nodes.forEach(function(nd,i){
      var vis=c._shown && (c.frontier?true:i<c._active); var target=vis?1:0;
      nd.alpha += (target-nd.alpha)*0.16; if(nd.alpha<0.02) return;
      var p=project({x:c.x+nd.ox,y:c.y+nd.oy,z:c.z+nd.oz}); draws.push({c:c,nd:nd,p:p}); }); });
    draws.sort(function(a,b){ return b.p.z-a.p.z; });
    draws.forEach(function(d){ var p=d.p,f=fog(p.scale),col=d.c._col;
      var a=(d.c.frontier?0.28:(d.c._lit?1:0.55))*d.nd.alpha*f; var r=(d.c._lit?3.9:3.3)*p.scale, gr=r*3.4;
      var g=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,gr);
      g.addColorStop(0,'rgba('+col+','+(0.30*a)+')'); g.addColorStop(0.45,'rgba('+col+','+(0.12*a)+')'); g.addColorStop(1,'rgba('+col+',0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.sx,p.sy,gr,0,7); ctx.fill();
      ctx.fillStyle='rgba('+col+','+Math.min(1,a)+')'; ctx.beginPath(); ctx.arc(p.sx,p.sy,r*0.82,0,7); ctx.fill(); });
    for (var ri=0;ri<rings.length;ri++){ var rg=rings[ri], pc=project(CBY[rg.id]), rr=5+42*rg.t;
      ctx.strokeStyle='rgba('+GREEN+','+(0.6*(1-rg.t))+')'; ctx.lineWidth=1.5*(1-rg.t)+0.2;
      ctx.beginPath(); ctx.arc(pc.sx,pc.sy,rr,0,7); ctx.stroke(); }
    // labels track their cluster (so they rotate with the map) but float off the corner.
    // no "?": phrases just start faint and darken as that area gets answered.
    // labels are drawn in the canvas's internal coords, so CSS shrinking the canvas shrinks them too.
    // bump the font as the canvas displays smaller, so phrases keep roughly their full-size reading size.
    var dispW = cv.clientWidth || W;
    var labelPx = Math.max(12, Math.min(16, 12 * 218 / dispW));
    ctx.textAlign='center'; ctx.font='600 ' + labelPx.toFixed(1) + 'px -apple-system, system-ui, sans-serif';
    var ccx=W/2, ccy=H/2;
    CLUSTERS.forEach(function(c){ var p=c._p; if(!c._shown || p.z<-150) return; var rev=c._rev;
      var dx=p.sx-ccx, dy=p.sy-ccy, dd=Math.hypot(dx,dy), ox, oy;
      if(dd<14){ ox=0; oy=-30; } else { ox=(dx/dd)*30; oy=(dy/dd)*30; }
      var lx=Math.max(30,Math.min(W-30,p.sx+ox)), ly=Math.max(13,Math.min(H-7,p.sy+oy+4));
      if(c._lit){ ctx.fillStyle='rgba('+c._col+','+(0.97*rev)+')'; }
      else { var t=Math.min(1,c._active/THRESHOLD), g=Math.round(150-66*t), al=(0.42+0.42*t)*rev; ctx.fillStyle='rgba('+g+','+(g+5)+','+(g+1)+','+al+')'; }
      ctx.fillText(c.title,lx,ly); });
  }
  function settled(){ var beat=BEATS[step], ok=true;
    CLUSTERS.forEach(function(c){ var shown=step>=c.revealAt;
      if(Math.abs((shown?1:0)-(c._rev||0))>0.01) ok=false;
      c.nodes.forEach(function(nd,i){ var vis=shown && (c.frontier?true:i<(beat.c[c.id]||0));
        if(Math.abs((vis?1:0)-nd.alpha)>0.01) ok=false; }); });
    return ok && rings.length===0; }
  function loop(){ if(hovered){ ang+=0.0045; shimmer=(shimmer+0.0075)%1; transit=(transit+0.0042)%1; }
    for (var i=rings.length-1;i>=0;i--){ rings[i].t+=0.018; if(rings[i].t>=1) rings.splice(i,1); }
    draw(); if(hovered || !settled()) rafId=requestAnimationFrame(loop); else rafId=null; }
  function kick(){ if(rafId==null) rafId=requestAnimationFrame(loop); }
  card.addEventListener('mouseenter', function(){ hovered=true; kick(); });
  card.addEventListener('mouseleave', function(){ hovered=false; kick(); });
  var toastT;
  function toast(m){ var t=document.getElementById('mmToast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(hideToast,2900); }
  function hideToast(){ document.getElementById('mmToast').classList.remove('show'); }
  function applyBeat(prevStep){ var beat=BEATS[step], prev=prevStep==null?null:BEATS[prevStep];
    if(prev) CLUSTERS.forEach(function(c){ if(!c.frontier && (prev.c[c.id]||0)<THRESHOLD && (beat.c[c.id]||0)>=THRESHOLD) rings.push({id:c.id,t:0}); });
    updateWarmth(); if(beat.toast) toast(beat.toast); else hideToast(); kick(); }
  function advance(){ if(step>=BEATS.length-1) return; var p=step; step++; applyBeat(p); }
  window.mmAdvance = advance;
  // each answered question grows the map by one beat
  document.addEventListener('click', function(e){ var t=e.target; if(t&&t.closest&&t.closest('.btn-save[data-q]')) setTimeout(advance,0); }, true);
  (function init(){ var beat=BEATS[0];
    CLUSTERS.forEach(function(c){ var shown=0>=c.revealAt; c._rev=shown?1:0;
      c.nodes.forEach(function(nd,i){ nd.alpha=(shown && (c.frontier?true:i<(beat.c[c.id]||0)))?1:0; }); });
    updateWarmth(); draw(); })();
})();
