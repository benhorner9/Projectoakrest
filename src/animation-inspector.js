/**
 * Optional DEVELOPMENT-ONLY 3D character animation inspector.
 * Opens only at localhost / oakrest-dev/?qa=1&animation=1.
 * Uses the actual actor rig, weapon meshes and pose driver in an isolated
 * renderer. It NEVER initiates gameplay, hit detection or damage.
 */
import * as THREE from 'three';
import {createActor,equipActor,animateActor} from './actors.js';
import {LOADOUTS} from './rules.js';
import {MELEE_PROFILES} from './combat-physics.js';
import {listAnimationSpecs} from './ability-animation.js';

const ALLOWED=()=>['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname);
const SPEEDS=[.25,.5,1,1.5];
function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.add(o);}
export function mountAnimationInspector(){
 const query=new URLSearchParams(location.search);
 if(!ALLOWED()||!query.has('qa')||!query.has('animation'))return null;
 if(document.getElementById('oakrest-animation-inspector'))return null;
 const specs=listAnimationSpecs().filter(Boolean);
 const panel=document.createElement('section');
 panel.id='oakrest-animation-inspector';panel.setAttribute('aria-label','Oakrest developer animation inspector');
 Object.assign(panel.style,{position:'fixed',top:'8px',right:'8px',zIndex:'99999',width:'min(320px, 90vw)',maxHeight:'calc(100dvh - 16px)',overflowY:'auto',boxSizing:'border-box',padding:'12px',background:'rgba(17,28,27,.95)',color:'#eee9d5',border:'1px solid #928267',borderRadius:'9px',boxShadow:'0 4px 22px #0008',font:'12px system-ui, sans-serif',touchAction:'pan-y'});
 // Static innerHTML only; no user-generated names or untrusted content are interpolated.
 panel.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <strong>Oakrest · Animation QA</strong><button type="button" data-name="close" aria-label="Close inspector">×</button></div>
  <div style="font-size:11px;color:#c5bea8;margin-bottom:6px">Isolated real-rig preview · does not hit enemies</div>
  <canvas data-name="canvas" width="294" height="208" style="display:block;width:100%;aspect-ratio:294/208;background:#263b3a;border:1px solid #53625c;border-radius:5px"></canvas>
  <label style="display:block;margin-top:7px">Style <select data-name="style" style="width:100%"></select></label>
  <label style="display:block;margin-top:6px">Weapon family <select data-name="family" style="width:100%"></select></label>
  <label style="display:block;margin-top:6px">Ability <select data-name="skill" style="width:100%"></select></label>
  <div style="display:flex;gap:9px;align-items:center;margin:7px 0">
  <label>Playback <select data-name="speed"></select></label>
  <label><input type="checkbox" data-name="freeze"> Freeze</label>
  <label><input type="checkbox" data-name="moving"> Move</label></div>
  <label>Timeline <input data-name="scrub" type="range" min="0" max="1000" step="1" value="0" style="width:100%"></label>
  <div data-name="time" style="margin-bottom:5px">0.00 s</div>
  <label><input type="checkbox" data-name="hitbox"> Show estimated melee reach</label>
  <label><input type="checkbox" data-name="muzzle" checked> Show weapon release origin</label>
  <div><label><input type="checkbox" data-name="opponent" checked> PvP-distance opponent</label>
  <label><input type="checkbox" data-name="effects" checked> Preview effect</label></div>
  <div data-name="readout" aria-live="polite" style="white-space:pre-wrap;margin:9px 0 0;color:#ddd4bd;line-height:1.45"></div>
  <small style="display:block;margin-top:5px;color:#c5bea8">Hit wedge is a diagnostic approximation; real hit tests remain in combat-physics.js. VFX and SFX are not simulated here. Physical iPad QA still required.</small>`;
 document.body.append(panel);
 const q=n=>panel.querySelector(`[data-name="${n}"]`);
 const styleInput=q('style'),familyInput=q('family'),skillInput=q('skill'),speedInput=q('speed'),freeze=q('freeze'),moving=q('moving'),scrub=q('scrub'),hitbox=q('hitbox'),muzzle=q('muzzle'),readout=q('readout'),timeText=q('time');
 const canvas=q('canvas'),showOpponent=q('opponent'),showEffects=q('effects');
 for(const s of ['melee','ranged','magic'])option(styleInput,s,s[0].toUpperCase()+s.slice(1));
 for(const speed of SPEEDS)option(speedInput,String(speed),Math.round(speed*100)+'%');
 speedInput.value='1';
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
 renderer.setSize(294,208,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#2b403c');
 scene.add(new THREE.AmbientLight('#ddedef',1.6));
 const light=new THREE.DirectionalLight('#fff4db',2.1);light.position.set(-3,8,-4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(36,294/208,.1,45);
 camera.position.set(3,2.45,-6.3);camera.lookAt(0,1.22,0);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(2.6,32),new THREE.MeshBasicMaterial({color:'#60756b',side:THREE.DoubleSide}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.015;scene.add(ground);
 const actor=createActor();scene.add(actor);
 // The second body shares the game rig and is sized/positioned for the
 // landscape iPad combat camera readability test. It is never a real enemy.
 const opponent=createActor(true);
 opponent.position.set(1.65,0,.55);opponent.rotation.y=Math.PI;
 opponent.scale.setScalar(.85);scene.add(opponent);
 equipActor(opponent,'melee','sword','leather');
 const effectMesh=new THREE.Mesh(
  new THREE.RingGeometry(.26,.44,24),
  new THREE.MeshBasicMaterial({color:'#d4e8c9',side:THREE.DoubleSide,transparent:true,opacity:.55,depthWrite:false})
 );
 effectMesh.rotation.x=-Math.PI/2;
 effectMesh.position.set(0,.025,-1.1);effectMesh.visible=false;scene.add(effectMesh);
 const originMarker=new THREE.Mesh(new THREE.SphereGeometry(.085,8,6),new THREE.MeshBasicMaterial({color:'#fff19d'}));
 originMarker.visible=false;scene.add(originMarker);
 const originPoint=new THREE.Vector3();
 let reachMesh=null,current=null,start=performance.now(),pausedAt=0,raf=0,last=performance.now(),disposed=false;
 function families(){
  familyInput.replaceChildren();
  for(const id of [...new Set(specs.filter(s=>s.style===styleInput.value).map(s=>s.weaponFamily))])option(familyInput,id,id);
  familyInput.value=familyInput.options[0]?.value||'';
  skills();
 }
 function skills(){
  skillInput.replaceChildren();
  for(const spec of specs.filter(s=>s.style===styleInput.value&&s.weaponFamily===familyInput.value))
   option(skillInput,spec.id,spec.abilityName);
  skillInput.value=skillInput.options[0]?.value||'';
  select();
 }
 function select(){
  current=specs.find(s=>s.style===styleInput.value&&s.weaponFamily===familyInput.value&&s.id===skillInput.value);
  if(!current)return;
  equipActor(actor,current.style,current.weaponFamily,'none');
 // Opponent always contrasts the active style for silhouette checks.
 const foeStyle=current.style==='melee'?'magic':'melee';
 equipActor(opponent,foeStyle,foeStyle==='magic'?'frost':'sword','leather');
  if(reachMesh){scene.remove(reachMesh);reachMesh.geometry.dispose();reachMesh.material.dispose();reachMesh=null;}
  if(current.style==='melee'){
   const weapon=LOADOUTS.melee[current.weaponFamily],profile=MELEE_PROFILES[current.weaponFamily]||MELEE_PROFILES.sword;
   const shape=new THREE.Shape();shape.moveTo(0,0);
   const half=profile.halfAngle||.6,r=weapon.reach;
   for(let i=0;i<=24;i++){const angle=-half+2*half*i/24;shape.lineTo(Math.sin(angle)*r,Math.cos(angle)*r);}
   shape.closePath();
   reachMesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#cfb36b',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
   reachMesh.rotation.x=-Math.PI/2;reachMesh.position.y=.035;scene.add(reachMesh);
  }
  start=performance.now();pausedAt=0;scrub.value='0';
 }
 styleInput.addEventListener('change',families);
 familyInput.addEventListener('change',skills);
 skillInput.addEventListener('change',select);
 function duration(){return Math.max(.4,current?.recovery.seconds||1);}
 function elapsedAt(when){return (((when-start)/1000)*Number(speedInput.value))%duration();}
 freeze.addEventListener('change',()=>{if(freeze.checked){pausedAt=elapsedAt(performance.now());scrub.value=String(Math.round(pausedAt/duration()*1000));}else{start=performance.now()-pausedAt/Number(speedInput.value)*1000;}});
 scrub.addEventListener('input',()=>{pausedAt=Number(scrub.value)/1000*duration();freeze.checked=true;});
 speedInput.addEventListener('change',()=>{start=performance.now();pausedAt=0;scrub.value='0';});
 function foeStyleCue(style){return style==='melee'?'bind':'parry';}
 function frame(when){
  if(disposed)return;
  raf=requestAnimationFrame(frame);
  if(!current)return;
  const dt=Math.min(.04,(when-last)/1000||0);last=when;
  const t=freeze.checked?pausedAt:elapsedAt(when),wind=current.anticipation.seconds;
  if(!freeze.checked)scrub.value=String(Math.round(t/duration()*1000));
  const preview={start:0,impactAt:wind,interval:duration(),abilityKind:current.motionCue};
  animateActor(actor,{dt,t,stride:moving.checked?t*10:0,speed:moving.checked?3.1:0,attack:preview,side:moving.checked ? 0.35 : 0});
  actor.updateMatrixWorld(true);
  opponent.visible=showOpponent.checked;
  if(opponent.visible){
   animateActor(opponent,{dt,t,stride:0,speed:0,attack:{start:0,impactAt:Math.max(.08,current.anticipation.seconds),interval:duration(),abilityKind:foeStyleCue(current.style)}});
  }
  effectMesh.visible=showEffects.checked&&t>=wind&&t<Math.min(duration(),wind+.24);
  effectMesh.scale.setScalar(1+Math.max(0,t-wind)*1.5);
  actor.userData.weapon.getWorldPosition(originPoint);
  originMarker.position.copy(originPoint).z-=.35;
  originMarker.visible=muzzle.checked&&t>=Math.max(0,wind-.08)&&t<=wind+.22;
  if(reachMesh)reachMesh.visible=hitbox.checked&&t>=wind&&t<wind+.24;
  timeText.textContent=t.toFixed(2)+' s / '+duration().toFixed(2)+' s · '+(t<wind?'anticipation':t<wind+.22?'release/contact':'recovery');
  readout.textContent=current.id+' · '+current.motionCue+
   '\nTell: '+current.tell+
   '\nRelease: '+current.release+
   '\nGameplay timing: '+current.eventAt+
   '\nOrigin: '+current.hitOrigin+
   (current.instant?'\nINSTANT effect — no pre-effect telegraph':'')+
   '\nPreview events: attack_start 0.00 · '+current.event+' '+wind.toFixed(2)+
   ' · recovery_end '+duration().toFixed(2);
  renderer.render(scene,camera);
 }
 function cleanup(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);
  panel.remove();if(reachMesh){reachMesh.geometry.dispose();reachMesh.material.dispose();}
  originMarker.geometry.dispose();originMarker.material.dispose();
  ground.geometry.dispose();ground.material.dispose();
  effectMesh.geometry.dispose();effectMesh.material.dispose();
  // Equipment variants use per-actor disposable meshes. Remove renderer and
  // all actor objects; avoid leaving duplicate WebGL contexts in QA sessions.
  scene.remove(actor,opponent);
  renderer.dispose();renderer.forceContextLoss();
  removeEventListener('pagehide',cleanup);
 }
 q('close').addEventListener('click',cleanup);
 addEventListener('pagehide',cleanup,{once:true});
 families();raf=requestAnimationFrame(frame);
 return {close:cleanup};
}
