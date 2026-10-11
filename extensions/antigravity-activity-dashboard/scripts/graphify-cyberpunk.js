#!/usr/bin/env node
/**
 * Graphify Cyberpunk / Deep Space Observatory renderer.
 * Reads graphify-out/graph.json and writes an enriched graphify-out/graph.html.
 * Usage: node scripts/graphify-cyberpunk.js [graphify-out dir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] || 'graphify-out');
const graph = JSON.parse(fs.readFileSync(path.join(outDir, 'graph.json'), 'utf8'));
const links = graph.links || graph.edges || [];

const degree = new Map();
for (const l of links) {
    degree.set(l.source, (degree.get(l.source) || 0) + 1);
    degree.set(l.target, (degree.get(l.target) || 0) + 1);
}
const godIds = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
const communities = new Map();
for (const n of graph.nodes) {
    if (!communities.has(n.community)) communities.set(n.community, n.community_name || 'Community ' + n.community);
}

const data = {
    project: path.basename(path.dirname(outDir)),
    nodes: graph.nodes.map(n => ({
        id: n.id, label: n.label, c: n.community, cn: n.community_name || '',
        f: n.source_file || '', loc: n.source_location || '', deg: degree.get(n.id) || 0
    })),
    edges: links.map(l => ({ s: l.source, t: l.target, r: l.relation || '', conf: l.confidence || '' })),
    gods: godIds,
    communities: [...communities.entries()]
};
const json = JSON.stringify(data).replace(/</g, '\\u003c');

const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deep Space Observatory — ${data.project}</title>
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
<style>
:root{--cyan:#00f2fe;--pink:#ec4899;--purple:#a855f7;--amber:#fbbf24;--glass:rgba(10,16,28,.72);--border:rgba(0,242,254,.25)}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif}
body{background:#03060c;color:#e2e8f0;overflow:hidden;height:100vh}
body::before{content:'';position:fixed;inset:0;background:
 radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1px 1px at 70% 80%,#fff6,transparent),
 radial-gradient(1.5px 1.5px at 40% 60%,#00f2fe88,transparent),radial-gradient(1px 1px at 85% 15%,#fff7,transparent),
 linear-gradient(rgba(0,242,254,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,242,254,.04) 1px,transparent 1px);
 background-size:auto,auto,auto,auto,48px 48px,48px 48px;pointer-events:none;z-index:0}
#net{position:fixed;inset:0;z-index:1}
.glass{background:var(--glass);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:14px;box-shadow:0 0 24px rgba(0,242,254,.08)}
#hud{position:fixed;top:14px;left:14px;right:14px;z-index:5;display:flex;align-items:center;gap:14px;padding:10px 16px;flex-wrap:wrap}
#hud h1{font-size:15px;letter-spacing:2px;color:var(--cyan);text-shadow:0 0 10px var(--cyan);margin-right:auto}
.stat{font-family:Consolas,monospace;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:8px}
.stat b{color:var(--cyan);font-size:14px}
button{background:rgba(0,242,254,.08);color:#e2e8f0;border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;transition:.2s}
button:hover,button.on{background:rgba(0,242,254,.22);box-shadow:0 0 12px rgba(0,242,254,.4)}
#search{position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:6;width:420px;padding:8px;display:none}
#search input{width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:15px;padding:6px}
#sugg div{padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px}
#sugg div:hover,#sugg div.sel{background:rgba(0,242,254,.15)}
#panel{position:fixed;top:78px;right:14px;bottom:14px;width:340px;z-index:5;padding:18px;overflow:auto;transform:translateX(380px);transition:.35s}
#panel.open{transform:none}
#panel h2{font-size:17px;color:var(--cyan);margin-bottom:6px;word-break:break-all}
.meta{font-family:Consolas,monospace;font-size:12px;color:#94a3b8;margin-bottom:12px}
.sec{font-size:11px;letter-spacing:1.5px;color:var(--pink);margin:12px 0 6px}
.chip{display:inline-block;margin:3px;padding:3px 8px;border-radius:999px;border:1px solid rgba(168,85,247,.5);font-size:11px;cursor:pointer}
.chip:hover{background:rgba(168,85,247,.25)}
#legend{position:fixed;left:14px;bottom:14px;z-index:5;padding:10px 14px;max-width:300px;font-size:12px}
#legend div{display:flex;align-items:center;gap:8px;margin:3px 0}
#legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
kbd{font-size:10px;border:1px solid var(--border);border-radius:4px;padding:1px 4px}
</style></head><body>
<div id="net"></div>
<header id="hud" class="glass">
 <h1>◉ DEEP SPACE OBSERVATORY // ${data.project.toUpperCase()}</h1>
 <span class="stat">NODES <b id="sN">0</b></span><span class="stat">EDGES <b id="sE">0</b></span>
 <span class="stat">KÜMELER <b id="sC">0</b></span><span class="stat">GOD NODES <b id="sG">0</b></span>
 <button id="bGod">👑 God Nodes</button><button id="bFreeze">🧊 Freeze</button>
 <button id="bReset">🎯 Reset View</button><button id="bAudio">🔊 SFX</button>
 <button id="bSearch">🔍 Ara <kbd>Ctrl+K</kbd></button>
</header>
<div id="search" class="glass"><input id="q" placeholder="Fonksiyon / dosya ara…" autocomplete="off"><div id="sugg"></div></div>
<aside id="panel" class="glass"><button id="bClose" style="float:right">✕</button><div id="pBody"></div></aside>
<div id="legend" class="glass"></div>
<script>
const D=${json};
const PALETTE=['#00f2fe','#ec4899','#a855f7','#00ff9d','#fbbf24','#38bdf8','#f97316','#22d3ee','#e879f9','#84cc16','#f43f5e','#818cf8'];
const col=c=>PALETTE[Math.abs(Number(c)||0)%PALETTE.length];
const godSet=new Set(D.gods);
const byId=new Map(D.nodes.map(n=>[n.id,n]));
const nodes=new vis.DataSet(D.nodes.map(n=>({id:n.id,label:n.label,value:1+n.deg,
 color:{background:col(n.c),border:'#ffffff55',highlight:{background:'#fff',border:col(n.c)}},
 font:{color:'#e2e8f0',size:12,face:'Consolas'},shadow:{enabled:true,color:col(n.c),size:12,x:0,y:0},shape:'dot'})));
const edges=new vis.DataSet(D.edges.map((e,i)=>({id:i,from:e.s,to:e.t,title:e.r,
 color:{color:'rgba(0,242,254,0.18)',highlight:'#00f2fe'},arrows:{to:{enabled:true,scaleFactor:.4}},smooth:{type:'continuous'}})));
const net=new vis.Network(document.getElementById('net'),{nodes,edges},{
 physics:{solver:'forceAtlas2Based',forceAtlas2Based:{gravitationalConstant:-60,springLength:110},stabilization:{iterations:200}},
 nodes:{scaling:{min:6,max:34}},interaction:{hover:true,tooltipDelay:120}});
const $=id=>document.getElementById(id);
$('sN').textContent=D.nodes.length;$('sE').textContent=D.edges.length;$('sC').textContent=D.communities.length;$('sG').textContent=D.gods.length;
$('legend').innerHTML='<div style="color:#00f2fe;letter-spacing:1.5px;font-size:11px">KÜMELER</div>'+D.communities.map(([c,n])=>'<div><i style="background:'+col(c)+';box-shadow:0 0 8px '+col(c)+'"></i>'+esc(n)+'</div>').join('');
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
// Audio
let sfx=true,actx=null;
function beep(f=660,d=.06){if(!sfx)return;actx=actx||new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.06,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+d)}
$('bAudio').onclick=()=>{sfx=!sfx;$('bAudio').textContent=sfx?'🔊 SFX':'🔇 SFX';beep(880)};
// God nodes
let godOn=false;
$('bGod').onclick=()=>{godOn=!godOn;$('bGod').classList.toggle('on',godOn);beep(godOn?990:440);
 nodes.update(D.nodes.map(n=>({id:n.id,opacity:godOn&&!godSet.has(n.id)?.15:1,borderWidth:godOn&&godSet.has(n.id)?4:1,
  color:{background:godOn&&godSet.has(n.id)?'#fbbf24':col(n.c),border:godOn&&godSet.has(n.id)?'#fff':'#ffffff55'}})));
 if(godOn)net.fit({nodes:D.gods,animation:true})};
// Freeze
let frozen=false;$('bFreeze').onclick=()=>{frozen=!frozen;net.setOptions({physics:{enabled:!frozen}});$('bFreeze').classList.toggle('on',frozen);beep(frozen?300:600)};
// Reset
function resetView(){nodes.update(D.nodes.map(n=>({id:n.id,hidden:false,opacity:1})));edges.update(edges.get().map(e=>({id:e.id,hidden:false})));net.fit({animation:true});beep(520)}
$('bReset').onclick=resetView;
// Search
let sel=0,hits=[];
function openSearch(){$('search').style.display='block';$('q').value='';$('q').focus();renderSugg();beep(740)}
function closeSearch(){$('search').style.display='none'}
function renderSugg(){const q=$('q').value.toLowerCase();hits=q?D.nodes.filter(n=>n.label.toLowerCase().includes(q)||n.f.toLowerCase().includes(q)).slice(0,8):[];sel=0;
 $('sugg').innerHTML=hits.map((n,i)=>'<div data-i="'+i+'" class="'+(i===sel?'sel':'')+'">'+esc(n.label)+' <span style="color:#64748b">'+esc(n.f)+'</span></div>').join('')}
function fly(id){closeSearch();net.selectNodes([id]);net.focus(id,{scale:1.6,animation:{duration:900,easingFunction:'easeInOutQuad'}});showPanel(id);beep(1100,.1)}
$('q').oninput=renderSugg;
$('q').onkeydown=e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,hits.length-1);e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);e.preventDefault()}
 else if(e.key==='Enter'&&hits[sel]){fly(hits[sel].id)}else if(e.key==='Escape'){closeSearch()}
 [...$('sugg').children].forEach((d,i)=>d.classList.toggle('sel',i===sel))};
$('sugg').onclick=e=>{const d=e.target.closest('[data-i]');if(d)fly(hits[+d.dataset.i].id)};
$('bSearch').onclick=openSearch;
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
// Detail panel
function showPanel(id){const n=byId.get(id);if(!n)return;
 const callers=D.edges.filter(e=>e.t===id).map(e=>e.s),callees=D.edges.filter(e=>e.s===id).map(e=>e.t);
 const chips=a=>a.length?[...new Set(a)].map(x=>'<span class="chip" data-go="'+esc(x)+'">'+esc((byId.get(x)||{label:x}).label)+'</span>').join(''):'<span class="meta">—</span>';
 $('pBody').innerHTML='<h2>'+esc(n.label)+(godSet.has(id)?' 👑':'')+'</h2><div class="meta">📄 '+esc(n.f)+' '+esc(n.loc)+'<br>◉ '+esc(n.cn)+' · bağlantı: '+n.deg+'</div>'+
  '<div class="sec">ÇAĞIRANLAR ('+callers.length+')</div>'+chips(callers)+'<div class="sec">ÇAĞRILANLAR ('+callees.length+')</div>'+chips(callees)+
  '<div style="margin-top:16px"><button id="bIso">🌐 Isolate Connected Subgraph</button></div>';
 $('panel').classList.add('open');
 $('bIso').onclick=()=>{const keep=new Set([id,...callers,...callees]);nodes.update(D.nodes.map(x=>({id:x.id,hidden:!keep.has(x.id)})));net.fit({nodes:[...keep],animation:true});beep(1300,.12)}}
$('pBody').onclick=e=>{const c=e.target.closest('[data-go]');if(c)fly(c.dataset.go)};
$('bClose').onclick=()=>$('panel').classList.remove('open');
net.on('click',p=>{if(p.nodes.length){showPanel(p.nodes[0]);beep(800)}});
</script></body></html>`;

fs.writeFileSync(path.join(outDir, 'graph.html'), html, 'utf8');
console.log('Cyberpunk graph.html written:', path.join(outDir, 'graph.html'), `(${data.nodes.length} nodes, ${data.edges.length} edges)`);
