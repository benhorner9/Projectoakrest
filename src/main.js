import * as THREE from 'three';
import { STYLE_ORDER,STYLE_COLOURS,LOADOUTS,XP_BY_MOB,nextStyle,levelFromXp,maxHealth,damageAfterArmour,meleeTarget,clamp,defaultSave,validSave,xpProgress,ARMOUR,skillCatalogue,equippedSkills,equipSkill,canEquipWeapon,canEquipArmour,slotFamily,outgoingMultiplier,defenceFor } from './rules.js';
import { stickFromOffset, cameraKeyDirection, cameraSensitivity, attackDragDelta } from './controls.js';
import { installGameZoomGuard } from './touch-gestures.js';

const $=id=>document.getElementById(id);
const isTouch=matchMedia('(hover:none), (pointer:coarse)').matches || navigator.maxTouchPoints > 0;
document.documentElement.classList.toggle('touch-enabled',isTouch);
// Suppress Safari page zoom while keeping gameplay multitouch working.
installGameZoomGuard(document);
// Reuse the existing weapon ability buttons inside a right-thumb arc on touch devices.
if(isTouch) $('touch-skill-dock').appendChild($('skills'));
const now=()=>performance.now()/1000;
const rand=(seed)=>{let s=seed;return ()=>{s=(s*16807)%2147483647;return (s-1)/2147483646;};};
const random=rand(27184);
const scene=new THREE.Scene();scene.background=new THREE.Color('#92b4a5');scene.fog=new THREE.Fog('#92b4a5',38,105);
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.45:1.85));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;$('game').appendChild(renderer.domElement); }
catch(err){$('error').hidden=false;throw err;}
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
const sun=new THREE.DirectionalLight('#ffe0ab',2.25);sun.position.set(-26,45,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-36;sun.shadow.camera.right=36;sun.shadow.camera.top=36;sun.shadow.camera.bottom=-36;sun.shadow.normalBias=.045;scene.add(sun);
scene.add(new THREE.AmbientLight('#c5d8f0',1.1));
const hemi=new THREE.HemisphereLight('#d3f3ee','#6c6a41',.75);scene.add(hemi);
const MAT={ground:new THREE.MeshLambertMaterial({color:'#73966b'}),road:new THREE.MeshLambertMaterial({color:'#bcb09a'}),wood:new THREE.MeshLambertMaterial({color:'#79543a'}),woodLight:new THREE.MeshLambertMaterial({color:'#ac7951'}),stone:new THREE.MeshLambertMaterial({color:'#a1a399'}),roof:new THREE.MeshLambertMaterial({color:'#775c56'}),roof2:new THREE.MeshLambertMaterial({color:'#57685a'}),grass:new THREE.MeshLambertMaterial({color:'#547a53'}),leaves:new THREE.MeshLambertMaterial({color:'#436949'}),leaves2:new THREE.MeshLambertMaterial({color:'#648456'}),gold:new THREE.MeshLambertMaterial({color:'#e4bd72'}),black:new THREE.MeshLambertMaterial({color:'#171f1f'}),eye:new THREE.MeshBasicMaterial({color:'#edead6'}),water:new THREE.MeshLambertMaterial({color:'#759e9b'})};
const playerColours={melee:'#ae6954',magic:'#597ba0',ranged:'#627e51'};
const boxGeom=new THREE.BoxGeometry(1,1,1), ballGeom=new THREE.SphereGeometry(1,9,7);
function mat(color){return new THREE.MeshLambertMaterial({color});}
function put(parent,geo,material,x,y,z,sx=1,sy=1,sz=1,shadow=true){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m;}
function block(parent,x,y,z,sx,sy,sz,m){return put(parent,boxGeom,m,x,y,z,sx,sy,sz);}
function ball(parent,x,y,z,sx,sy,sz,m){return put(parent,ballGeom,m,x,y,z,sx,sy,sz);}
function cylinder(parent,x,y,z,r,h,m){return put(parent,new THREE.CylinderGeometry(r,r,h,8),m,x,y,z);}
const ground=put(scene,new THREE.PlaneGeometry(160,160),MAT.ground,0,-.065,0,1,1,1,false);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
const road=put(scene,new THREE.PlaneGeometry(8,125),MAT.road,0,-.044,-9,1,1,1,false);road.rotation.x=-Math.PI/2;
function patch(x,z,w,d,color){const p=put(scene,new THREE.PlaneGeometry(w,d),mat(color),x,-.035,z,1,1,1,false);p.rotation.x=-Math.PI/2;return p;}
for(let i=0;i<65;i++){const x=(random()-.5)*130,z=(random()-.5)*130;if(Math.abs(x)<6 && z>-60 && z<50)continue;patch(x,z,1+random()*4,.5+random()*3,random()>.5?'#789e6f':'#6b9167');}
function tree(x,z,height=1){const g=new THREE.Group();g.position.set(x,0,z);cylinder(g,0,1.25*height,0,.23*height,2.5*height,MAT.wood);const leaf=random()>.5?MAT.leaves:MAT.leaves2;for(let t=0;t<3;t++)put(g,new THREE.ConeGeometry((1.8-t*.34)*height,2.5*height,7),leaf,0,(2.7+t*.85)*height,0);scene.add(g);}
for(let i=0;i<90;i++){let x=(random()-.5)*112,z=(random()-.5)*112;if(Math.abs(x)<11&&z>-38&&z<35)continue;if(Math.hypot(x,z)<12)continue;tree(x,z,.68+random()*.52);}
function cottage(x,z,roofmat=MAT.roof){const g=new THREE.Group();g.position.set(x,0,z);block(g,0,2.2,0,8,4.4,6,MAT.stone);const r=put(g,new THREE.ConeGeometry(5.8,3,4),roofmat,0,5.4,0);r.rotation.y=Math.PI/4;block(g,-.8,1.4,3.02,1.35,2.8,.1,MAT.wood);block(g,2.2,2.55,3.05,1.3,1.1,.14,MAT.water);block(g,2.2,2.55,3.15,.15,1.2,.14,MAT.wood);block(g,2.2,2.55,3.15,1.35,.13,.14,MAT.wood);scene.add(g);}
cottage(-14,12);cottage(14,8,MAT.roof2);cottage(-14,28,MAT.roof2);cottage(14,27);
function fence(x,z,len){for(let i=0;i<len;i++){block(scene,x+i*2,.7,z,.2,1.4,.2,MAT.wood);if(i<len-1){block(scene,x+i*2+1,1.04,z,2,.16,.15,MAT.woodLight);block(scene,x+i*2+1,.54,z,2,.15,.15,MAT.woodLight);}}}
fence(-8,37,9);fence(7,37,7);fence(-8,-8,3);fence(5,-8,4);
// Village well and a training dummy establish scale and orientation.
cylinder(scene,6,.7,19,2.1,1.3,MAT.stone);cylinder(scene,6,1.38,19,1.5,.18,MAT.woodLight);
for(let x of [4,8])block(scene,x,2.6,19,.3,3.8,.3,MAT.wood);
block(scene,6,4.6,19,4.9,.3,4,MAT.wood);const wellRoof=put(scene,new THREE.ConeGeometry(3.6,2,4),MAT.roof,6,5.25,19);wellRoof.rotation.y=Math.PI/4;
for(let i=0;i<13;i++){const x=(random()-.5)*85,z=(random()-.5)*90;if(Math.abs(x)<5&&z<40&&z>-60)continue;const m=cylinder(scene,x,.13,z,.25,.26,MAT.stone);m.scale.y=.6;}
// A landmark to help new players know which way to leave the village.
for(const x of [-4,4])block(scene,x,2.35,-9,.7,4.7,.7,MAT.wood);block(scene,0,4.7,-9,8.6,.6,.8,MAT.woodLight);
const banner=block(scene,0,3.9,-9,3.1,.75,.15,mat('#8f7346'));
function sign(x,z){block(scene,x,1.75,z,.18,3.5,.18,MAT.wood);block(scene,x+.8,2.65,z,1.75,.7,.16,MAT.woodLight);}sign(5,12);

function createHero(){const g=new THREE.Group();const base=mat(playerColours.melee);const skin=mat('#dfad81');block(g,0,1.25,0,.86,1.18,.48,base);block(g,0,1.36,-.27,.65,.75,.08,MAT.woodLight);ball(g,0,2.13,0,.39,.43,.37,skin);const hair=ball(g,0,2.4,.01,.4,.21,.38,mat('#3b2f2a'));
const leftLeg=new THREE.Group(),rightLeg=new THREE.Group(),leftArm=new THREE.Group(),rightArm=new THREE.Group();leftLeg.position.set(-.23,.77,0);rightLeg.position.set(.23,.77,0);leftArm.position.set(-.59,1.76,0);rightArm.position.set(.59,1.76,0);for(const leg of [leftLeg,rightLeg]){block(leg,0,-.32,0,.31,.72,.36,MAT.wood);block(leg,0,-.69,-.1,.33,.24,.58,MAT.black);g.add(leg);}for(const arm of [leftArm,rightArm]){block(arm,0,-.35,0,.24,.75,.28,base);g.add(arm);}const hand=ball(rightArm,0,-.76,0,.17,.16,.17,skin);const weapon=new THREE.Group();weapon.position.set(.05,-.78,-.16);rightArm.add(weapon);g.userData={body:base,leftLeg,rightLeg,leftArm,rightArm,weapon};return g;}
const hero=createHero();hero.position.set(0,0,11);scene.add(hero);
function equipVisual(style,weaponId){const group=hero.userData.weapon;group.clear();hero.userData.body.color.set(playerColours[style]);const family=slotFamily(style,weaponId);let handle,blade;if(style==='melee'){
  if(family==='daggers'){for(const x of [-.12,.15]){block(group,x,-.15,-.38,.08,.11,.62,MAT.wood);block(group,x,-.15,-.94,.12,.09,.7,MAT.stone);} }
  else{block(group,0,-.12,-.55,.1,.13,1.2,MAT.wood);block(group,0,-.12,-1.36,.17,.1,.97,MAT.stone);block(group,0,-.12,-.84,.53,.13,.1,MAT.gold);}
}else if(style==='magic'){
  block(group,0,.1,-.56,.12,.13,1.7,MAT.wood);ball(group,0,.1,-1.5,.24,.25,.25,mat(family==='frost'?'#8ecfe7':'#fd9858'));
}else{block(group,0,-.1,-.67,.09,.1,1.52,MAT.wood);if(family==='bow'){const bow=put(group,new THREE.TorusGeometry(.68,.065,4,12,Math.PI),MAT.woodLight,0,-.09,-.64);bow.rotation.y=Math.PI/2;block(group,.15,-.09,-.65,.03,.03,1.15,MAT.stone);}else{block(group,0,-.1,-1,.38,.17,.55,MAT.woodLight);block(group,0,-.07,-1.3,.05,.04,.42,MAT.stone);}}
}
let data=defaultSave();try{data=validSave(JSON.parse(localStorage.getItem('oakrest-v1')));}catch{}
let style='melee',hp=maxHealth(levelFromXp(data.xp.vitality).level), shieldUntil=0,switchUntil=0,attackUntil=0,dodgeUntil=0,dodgeMovingUntil=0;
let yaw=0,pitch=.12,elapsed=0,started=false,questCompleted=false;
let savedLookSpeed=1;try{savedLookSpeed=localStorage.getItem('oakrest-look-speed') ?? 1;}catch{}
let lookSensitivity=cameraSensitivity(savedLookSpeed);
let holdingAttack=false;
const keys=new Set(),joystick={x:0,y:0},enemies=[],projectiles=[],rings=[],floaters=[],cooldowns=new Map();
const forward=()=>new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
const directions={ArrowUp:'w',ArrowDown:'s'};
let bookStyle='melee',bookTab='skills',bookSlot=0;
const progressPanel=$('progression-panel');
function bookOpen(tab='skills'){bookStyle=style;bookTab=tab;bookSlot=0;progressPanel.hidden=false;$('equipment-picker').hidden=true;renderBook();}
function bookClose(){progressPanel.hidden=true;}
$('close-progression').addEventListener('click',bookClose);
$('progression-skills').addEventListener('click',()=>{bookTab='skills';renderBook();});
$('progression-equipment').addEventListener('click',()=>{bookTab='equipment';renderBook();});
$('progression-levels-tab').addEventListener('click',()=>{bookTab='levels';renderBook();});
$('loadout-button').addEventListener('click',()=>bookOpen('skills'));
function renderBook(){
  if(progressPanel.hidden)return;
  const combatLevel=levelFromXp(data.xp[bookStyle]).level,vitalLevel=levelFromXp(data.xp.vitality).level;
  $('progression-levels').textContent=`${bookStyle.toUpperCase()} ${combatLevel} · VITALITY ${vitalLevel} · Armoured in ${defenceFor(data.armour[bookStyle]).title}`;
  for(const tab of ['skills','equipment','levels'])$(tab==='levels'?'progression-levels-tab':'progression-'+tab).classList.toggle('selected',tab===bookTab);
  const tabs=$('progression-styles');tabs.hidden=bookTab==='levels';tabs.replaceChildren();
  for(const s of STYLE_ORDER){
    const b=document.createElement('button');b.type='button';b.textContent=s.toUpperCase()+' '+levelFromXp(data.xp[s]).level;
    b.classList.toggle('selected',s===bookStyle);b.addEventListener('click',()=>{bookStyle=s;bookSlot=0;renderBook();});tabs.append(b);
  }
  const content=$('progression-content');content.replaceChildren();
  const heading=(tag,text,host=content)=>{const x=document.createElement(tag);x.textContent=text;host.append(x);return x;};
  const button=(parent,label,disabled,onClick)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.addEventListener('click',onClick);parent.append(b);return b;};
  const weaponId=data.gear[bookStyle];
  if(bookTab==='levels'){
    heading('h3','All skills and experience');
    heading('p','Your four trainable skills. Each shows current level, XP earned toward the next level and how much XP is still needed.');
    const grid=document.createElement('div');grid.className='level-overview';content.append(grid);
    const format=n=>Math.floor(n).toLocaleString('en-GB');
    for(const [key,title,icon,desc] of [
      ['melee','Melee','⚔','Swords, daggers and melee skills'],
      ['ranged','Ranged','➶','Bows, crossbows and ranged skills'],
      ['magic','Magic','✦','Staffs, wands and magic skills'],
      ['vitality','Vitality','✚','Health and armour access']
    ]){
      const info=xpProgress(data.xp[key]);
      const card=document.createElement('article');card.className='level-card level-'+key;grid.append(card);
      const row=document.createElement('div');row.className='level-card-title';card.append(row);
      heading('strong',icon+' '+title,row);heading('span','Level '+info.level,row);
      const bar=document.createElement('div');bar.className='level-xp-track';bar.setAttribute('role','progressbar');
      bar.setAttribute('aria-label',title+' experience');bar.setAttribute('aria-valuenow',String(Math.round(100*info.progress)));
      bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');card.append(bar);
      const fill=document.createElement('div');fill.className='level-xp-fill';fill.style.width=(info.progress*100).toFixed(1)+'%';bar.append(fill);
      const progress=document.createElement('div');progress.className='level-xp-numbers';card.append(progress);
      heading('span',info.maxed?'MAX LEVEL':format(info.current)+' / '+format(info.required)+' XP this level',progress);
      heading('strong',info.maxed?'COMPLETE':format(info.needed)+' XP to Level '+(info.level+1),progress);
      heading('small',desc+' · Total XP: '+format(info.totalXp),card);
    }
  }else if(bookTab==='skills'){
    heading('h3','Assign your 4 active abilities');
    heading('p','Tap a slot, then an unlocked ability below. Each weapon family keeps its own setup.');
    const slots=document.createElement('div');slots.className='book-slots';content.append(slots);
    const current=equippedSkills(data,bookStyle,weaponId);
    for(let i=0;i<4;i++){
      const b=button(slots,'',false,()=>{bookSlot=i;renderBook();});b.classList.toggle('selected',bookSlot===i);
      const icon=document.createElement('span');icon.textContent=current[i]?.icon||'+';b.append(icon);
      const label=document.createElement('div');label.textContent=current[i]?.name||`Slot ${i+1} · Empty`;b.append(label);
    }
    heading('h3','Your ability library');
    const list=document.createElement('div');list.className='catalogue-list';content.append(list);
    for(const a of skillCatalogue(bookStyle,weaponId)){
      const ready=combatLevel>=a.requiredLevel;
      const b=button(list,'',!ready,()=>{
        if(equipSkill(data,bookStyle,weaponId,bookSlot,a.id)){save();renderBook();if(bookStyle===style)refreshSkills();}
      });
      b.classList.toggle('selected',current[bookSlot]?.id===a.id);
      const icon=document.createElement('span');icon.textContent=a.icon;b.append(icon);
      const detail=document.createElement('div');b.append(detail);
      heading('strong',a.name,detail);heading('small',a.note,detail);
      heading('em',ready?`UNLOCKED · LEVEL ${a.requiredLevel}`:`LOCKED · LEVEL ${a.requiredLevel} ${bookStyle.toUpperCase()}`,detail);
    }
    const clear=button(content,'CLEAR SELECTED SLOT',!current[bookSlot],()=>{
      if(equipSkill(data,bookStyle,weaponId,bookSlot,null)){save();renderBook();if(bookStyle===style)refreshSkills();}
    });clear.className='book-clear';
  }else{
    heading('p','Weapons require their own combat level. Armour requires Vitality, and protects you differently depending on its weight.');
    const weapons=document.createElement('div');weapons.className='inventory-group';content.append(weapons);
    heading('h3','Weapons',weapons);
    const weaponList=document.createElement('div');weaponList.className='catalogue-list';weapons.append(weaponList);
    for(const [id,w] of Object.entries(LOADOUTS[bookStyle])){
      const ready=canEquipWeapon(bookStyle,id,data.xp);
      const b=button(weaponList,'',!ready,()=>{
        data.gear[bookStyle]=id;save();renderBook();
        if(bookStyle===style){equipVisual(style,id);refreshSkills();}
      });
      b.classList.toggle('selected',id===data.gear[bookStyle]);
      const ico=document.createElement('span');ico.textContent=w.icon;b.append(ico);
      const txt=document.createElement('div');b.append(txt);
      heading('strong',w.title,txt);heading('small',`Basic power ${w.basic} · ${w.family} skills`,txt);
      heading('em',ready?`LEVEL ${w.requiredLevel} · ${id===data.gear[bookStyle]?'EQUIPPED':'AVAILABLE'}`:`LOCKED · ${bookStyle.toUpperCase()} LEVEL ${w.requiredLevel}`,txt);
    }
    const armourSection=document.createElement('div');armourSection.className='inventory-group';content.append(armourSection);
    heading('h3','Armour sets',armourSection);
    const armourList=document.createElement('div');armourList.className='catalogue-list';armourSection.append(armourList);
    for(const [id,a] of Object.entries(ARMOUR)){
      const ready=canEquipArmour(id,data.xp);
      const b=button(armourList,'',!ready,()=>{data.armour[bookStyle]=id;save();renderBook();if(bookStyle===style)refreshSkills();});
      b.classList.toggle('selected',id===data.armour[bookStyle]);
      const ico=document.createElement('span');ico.textContent=id==='plate'?'⬡':id==='leather'?'◈':'✧';b.append(ico);
      const txt=document.createElement('div');b.append(txt);
      heading('strong',a.title,txt);heading('small',a.description,txt);
      heading('em',ready?`VITALITY ${a.requiredVitality} · ${id===data.armour[bookStyle]?'EQUIPPED':'AVAILABLE'}`:`LOCKED · VITALITY ${a.requiredVitality}`,txt);
    }
  }
}
function getWeapon(){return LOADOUTS[style][data.gear[style]];}
function save(){try{localStorage.setItem('oakrest-v1',JSON.stringify(data));}catch{}}
function toast(message){const el=document.createElement('div');el.className='toast';el.innerHTML=message;$('notifications').prepend(el);setTimeout(()=>el.remove(),3100);}
function floating(text,color,pos){const el=document.createElement('div');el.className='damage-pop';el.textContent=text;el.style.color=color;$('floating').append(el);floaters.push({el,pos:pos.clone(),age:0});}
function makeEnemy(type,x,z){const g=new THREE.Group();g.position.set(x,0,z);const d={type,x,z,startX:x,startZ:z,group:g,hp:1,max:1,dead:false,respawn:0,lastAttack:0,attackWindup:0,bleedUntil:0,nextBleed:0,slowUntil:0,rootUntil:0,stunUntil:0,swapLockedUntil:0,rot:random()*Math.PI*2};
  if(type==='dummy'){d.max=1200;d.hp=1200;cylinder(g,0,1.2,0,.32,2.4,MAT.wood);block(g,0,1.73,0,1.5,.28,.3,MAT.woodLight);ball(g,0,2.58,0,.38,.42,.38,MAT.woodLight);block(g,0,1.9,-.34,.5,.5,.06,MAT.gold);}
  if(type==='mossling'){d.max=57;d.hp=57;ball(g,0,.55,0,.79,.54,.75,mat('#609b59'));for(const xx of [-.29,.29]){ball(g,xx,.72,-.65,.13,.13,.13,MAT.black);}}
  if(type==='boar'){d.max=90;d.hp=90;ball(g,0,.72,0,.95,.68,1.25,mat('#865f44'));ball(g,0,.65,-1.04,.53,.4,.43,mat('#bd8f78'));for(const xx of [-.33,.33]){ball(g,xx,.94,-.99,.095,.11,.08,MAT.black);block(g,xx,.23,.55,.27,.44,.3,MAT.wood);}}
  if(type==='bandit'){d.max=125;d.hp=125;block(g,0,1.08,0,.8,1.3,.51,mat('#714c48'));ball(g,0,2.02,0,.37,.4,.37,mat('#c89770'));for(const xx of [-.28,.28])block(g,xx,.35,0,.26,.7,.34,MAT.wood);block(g,.6,1.23,-.25,.17,1,.2,MAT.stone);}
  const plate=new THREE.Group();plate.position.y=type==='dummy'?3.15:type==='mossling'?1.5:2.55;g.add(plate);const bg=block(plate,0,0,0,1.4,.13,.05,MAT.black);const bar=block(plate,0,.01,.05,1.36,.095,.04,mat('#d97266'));d.bar=bar;d.plate=plate;scene.add(g);enemies.push(d);return d;
}
makeEnemy('dummy',-6,-3);
makeEnemy('mossling',-4,-21);makeEnemy('mossling',5,-24);makeEnemy('mossling',-8,-30);
makeEnemy('boar',4,-33);makeEnemy('boar',10,-39);
makeEnemy('bandit',-5,-49);
function updateHpUI(){const vital=levelFromXp(data.xp.vitality);const max=maxHealth(vital.level);$('health-label').textContent=`${Math.ceil(hp)} / ${max} HP`;$('hp-fill').style.width=`${100*hp/max}%`;$('xp-fill').style.width=`${100*levelFromXp(data.xp[style]).progress}%`;$('level-label').textContent=`VITALITY ${vital.level}`;$('style-level').textContent=`${style.toUpperCase()} LEVEL ${levelFromXp(data.xp[style]).level}`;$('coins').textContent=`${data.coins} COINS`;$('quest-progress').textContent=data.defeated<3?`${data.defeated} / 3 defeated`:'✓ 3 / 3 completed';}
function refreshStyles(){const host=$('styles');host.innerHTML='';for(const st of STYLE_ORDER){const b=document.createElement('button');b.className=`style ${st===style?'active':''}`;b.style.borderColor=st===style?STYLE_COLOURS[st]:'';b.innerHTML=`<span class="symbol">${{melee:'⚔',magic:'✦',ranged:'➶'}[st]}</span>${st.toUpperCase()} <small>${levelFromXp(data.xp[st]).level}</small>`;b.addEventListener('click',()=>setStyle(st));host.append(b);}}
function refreshSkills(){
 const host=$('skills');host.innerHTML='';
 equippedSkills(data,style,data.gear[style]).forEach((a,i)=>{
  const b=document.createElement('button');b.className='skill';b.type='button';b.title=a?`${a.note} Cooldown: ${a.cooldown}s`:'Open SKILLS to equip an ability';
  b.classList.toggle('empty',!a);
  b.innerHTML=`<span class="key">${'QERF'[i]}</span><span class="skill-icon">${a?.icon||'+'}</span><span class="name">${a?.name||'EMPTY'}</span><span class="cooldown"></span>`;
  b.addEventListener('click',()=>a?useAbility(i):bookOpen('skills'));host.append(b);
 });
 $('weapon-name').textContent=getWeapon().title;refreshStyles();updateHpUI();
 const swap=$('touch-swap'),upcoming=nextStyle(style);
 swap.querySelector('small').textContent=upcoming.toUpperCase();swap.setAttribute('aria-label',`Switch to ${upcoming}`);
}
function setStyle(which,instant=false){if(!STYLE_ORDER.includes(which)||which===style)return;if(!instant && now()<switchUntil)return;style=which;switchUntil=now()+.53;equipVisual(style,data.gear[style]);refreshSkills();addRing(hero.position.clone(),'#e7ca81',1.8,.38);toast(`${{melee:'⚔',magic:'✦',ranged:'➶'}[style]} ${style.toUpperCase()} · ${getWeapon().title}`);}
function gearMenu(){bookOpen('equipment');}
$('gear-button').addEventListener('click',gearMenu);
function addRing(pos,color,radius=1.4,duration=.5){const geom=new THREE.RingGeometry(.89,1,24);const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=.045;scene.add(mesh);rings.push({mesh,radius,duration,time:0});}
function sparks(pos,color,count=10){for(let i=0;i<count;i++){const sphere=ball(scene,pos.x,pos.y,pos.z,.07,.07,.07,new THREE.MeshBasicMaterial({color}));const a=random()*Math.PI*2;projectiles.push({mesh:sphere,particle:true,velocity:new THREE.Vector3(Math.cos(a)*(2+random()*3),1+random()*4,Math.sin(a)*(2+random()*3)),life:.35+random()*.35,age:0});}}
function gainXp(type){const val=XP_BY_MOB[type]??0;if(!val)return;const old=levelFromXp(data.xp[style]).level;const oldVital=levelFromXp(data.xp.vitality).level;data.xp[style]+=val;data.xp.vitality+=Math.floor(val*.55);const newLevel=levelFromXp(data.xp[style]).level,newVital=levelFromXp(data.xp.vitality).level;if(newLevel>old){const unlocked=skillCatalogue(style,data.gear[style]).filter(a=>a.requiredLevel>old&&a.requiredLevel<=newLevel).map(a=>a.name);toast(`<b>${style.toUpperCase()} LEVEL ${newLevel}!</b> ${unlocked.length?'New skills: '+unlocked.join(', '):'Check your skill book and equipment.'}`);}if(newVital>oldVital){hp+=8*(newVital-oldVital);toast(`<b>VITALITY LEVEL ${newVital}!</b> Maximum HP and armour choices increased.`);}data.coins+=type==='bandit'?13:type==='boar'?7:4;data.defeated++;if(data.defeated===3&&!questCompleted){questCompleted=true;toast('<b>FIRST CHALLENGE COMPLETE!</b> Explore, train and try different weapons.');$('quest-text').textContent='Well done! Master all three styles and defeat the bandit on the forest road.';}save();refreshStyles();updateHpUI();if(!progressPanel.hidden)renderBook();}
function hitEnemy(e,damage,ability){if(!e||e.dead||e.hp<=0)return;const amount=Math.round(damage*(1+Math.min(24,levelFromXp(data.xp[style]).level-1)*.025)*outgoingMultiplier(data.armour[style],style));e.hp-=amount;floating(`-${amount}`,'#fff0a0',e.group.position.clone().add(new THREE.Vector3(0,e.type==='mossling'?1.7:2.8,0)));if(ability?.bleed){e.bleedUntil=now()+ability.bleed;e.nextBleed=now()+1;}if(ability?.stun)e.stunUntil=now()+ability.stun;if(ability?.slow)e.slowUntil=now()+ability.slow;if(ability?.root)e.rootUntil=now()+ability.root;if(ability?.swapLock)e.swapLockedUntil=now()+ability.swapLock;if(e.hp<=0){if(e.type==='dummy'){e.hp=e.max;toast('Training dummy · practice any style here');return;}e.hp=0;e.dead=true;e.respawn=now()+12;e.group.visible=false;addRing(e.group.position,'#e9bb76',2,.55);sparks(e.group.position.clone().add(new THREE.Vector3(0,.7,0)),'#ecd39b',9);gainXp(e.type);}}
function enemiesNear(reach,cone=.2){const pos=hero.position,front=forward();return enemies.filter(e=>!e.dead&&e.hp>0).filter(e=>{const dx=e.x-pos.x,dz=e.z-pos.z,dist=Math.hypot(dx,dz);return dist<=reach&&(dx*front.x+dz*front.z)/(dist||1)>=cone;});}
function nearTarget(reach){return meleeTarget({x:hero.position.x,z:hero.position.z},{x:Math.sin(yaw),z:-Math.cos(yaw)},enemies,reach,.25);}
function shoot(damage,speed=24,colour='#f4c377',opts={},spread=0){const dir=forward().applyAxisAngle(new THREE.Vector3(0,1,0),spread),mesh=ball(scene,hero.position.x+dir.x*.9,1.3,hero.position.z+dir.z*.9,.16,.16,.33,new THREE.MeshBasicMaterial({color:colour}));projectiles.push({mesh,dir,speed,damage,opts,life:1.4,age:0,origin:hero.position.clone(),style,particle:false});}
function slashEffect(reach=3){const p=hero.position.clone().add(forward().multiplyScalar(Math.min(2,reach*.68)));p.y=1.25;sparks(p,STYLE_COLOURS[style],7);}
function doBasic(){if(!started||hp<=0||now()<attackUntil||now()<switchUntil)return;const w=getWeapon();attackUntil=now()+w.interval;hero.userData.rightArm.rotation.x=-1.2;slashEffect(style==='melee'?w.reach:1.3);if(style==='melee'){const target=nearTarget(w.reach);if(target)hitEnemy(target,w.basic,data.gear.melee==='daggers'?{bleed:1.5}:{});}else shoot(w.basic,style==='magic'?20:29,style==='magic'?'#b6d9ef':'#e4c292');}
function shiftHero(dist){let f=forward();const steps=8;for(let i=0;i<steps;i++){const nx=hero.position.x+f.x*dist/steps,nz=hero.position.z+f.z*dist/steps;if(!collides(nx,nz)){hero.position.x=nx;hero.position.z=nz;}else break;}addRing(hero.position.clone(),'#cce2b1',1.8,.4);}
function useAbility(index){if(!started||hp<=0||now()<switchUntil)return;const a=equippedSkills(data,style,data.gear[style])[index];if(!a)return;const id=`${style}.${slotFamily(style,data.gear[style])}.${a.id}`;if(now()<(cooldowns.get(id)||0))return;cooldowns.set(id,now()+a.cooldown);
  if(a.kind==='hit'||a.kind==='execute'){const t=nearTarget(a.reach);if(t)hitEnemy(t,a.damage+(a.kind==='execute'&&t.bleedUntil>now()?20:0),a);slashEffect(a.reach);}
  else if(a.kind==='sweep'){for(const e of enemiesNear(a.reach,-.1))hitEnemy(e,a.damage,a);addRing(hero.position.clone(),STYLE_COLOURS[style],a.reach,.46);}
  else if(a.kind==='nova'){for(const e of enemies){if(!e.dead&&e.group.position.distanceTo(hero.position)<a.reach)hitEnemy(e,a.damage,a);}addRing(hero.position.clone(),'#92d8ec',a.reach,.65);}
  else if(a.kind==='bolt')shoot(a.damage,a.speed,style==='magic'?'#a3d6f7':'#edd28f',a);
  else if(a.kind==='burst')[-.09,0,.09].forEach(v=>shoot(a.damage,a.speed,'#eac993',a,v));
  else if(a.kind==='shield'){shieldUntil=now()+a.duration;addRing(hero.position.clone(),'#83c4ee',2.6,.65);toast(`${a.name} activated`);}
  else if(a.kind==='heal'){const max=maxHealth(levelFromXp(data.xp.vitality).level);hp=Math.min(max,hp+a.heal);floating(`+${a.heal}`,'#80f0a2',hero.position.clone().add(new THREE.Vector3(0,2.4,0)));addRing(hero.position.clone(),'#80f0a2',2,.4);updateHpUI();}
  else if(a.kind==='dash')shiftHero(a.distance);
  else if(a.kind==='dashback')shiftHero(-a.distance);
  else if(a.kind==='retreat'){shoot(a.damage,26,'#f2d79a');shiftHero(-4);}
  sparks(hero.position.clone().add(new THREE.Vector3(0,1.15,0)),STYLE_COLOURS[style],5);
}
function dodge(){if(!started||hp<=0||now()<dodgeUntil)return;dodgeUntil=now()+2;dodgeMovingUntil=now()+.22;const move=new THREE.Vector3((Number(keys.has('d'))-Number(keys.has('a')))+joystick.x,0,(Number(keys.has('s'))-Number(keys.has('w')))-joystick.y);const axis=forward(),right=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));const dir=axis.multiplyScalar(-move.z).add(right.multiplyScalar(move.x));if(dir.length()<.15)dir.copy(forward());dir.normalize();for(let i=0;i<8;i++){const nx=hero.position.x+dir.x*.5,nz=hero.position.z+dir.z*.5;if(collides(nx,nz))break;hero.position.set(nx,0,nz);}addRing(hero.position.clone(),'#fff1b8',2,.4);}
function collides(x,z){if(Math.abs(x)>70||Math.abs(z)>70)return true;for(const c of [[-14,12],[14,8],[-14,28],[14,27]])if(Math.abs(x-c[0])<4.8&&Math.abs(z-c[1])<3.8)return true;if(Math.hypot(x-6,z-19)<2.6)return true;return false;}
function updateEnemy(e,dt,t){if(e.dead){if(t>=e.respawn){e.dead=false;e.hp=e.max;e.bleedUntil=0;e.rootUntil=0;e.stunUntil=0;e.group.visible=true;e.group.position.set(e.startX,0,e.startZ);e.x=e.startX;e.z=e.startZ;}return;}if(e.bleedUntil>t&&t>=e.nextBleed){e.nextBleed=t+1;hitEnemy(e,3,null);}e.bar.scale.x=clamp(e.hp/e.max,.001,1);e.bar.position.x=-.68*(1-e.hp/e.max);e.plate.lookAt(camera.position);if(e.type==='dummy')return;const dx=hero.position.x-e.x,dz=hero.position.z-e.z,dist=Math.hypot(dx,dz);const active=dist<14&&hp>0;if(active&&dist>1.8&&e.stunUntil<t&&e.rootUntil<t){const speed=(e.type==='bandit'?2.4:e.type==='boar'?2.25:1.6)*(e.slowUntil>t?.42:1);const step=Math.min(speed*dt,dist-1.8);const nx=e.x+dx/dist*step,nz=e.z+dz/dist*step;if(!collides(nx,nz)){e.x=nx;e.z=nz;e.group.position.set(nx,0,nz);}e.group.rotation.y=Math.atan2(-dx,-dz);}else if(!active&&Math.hypot(e.x-e.startX,e.z-e.startZ)>1.3){const x=e.startX-e.x,z=e.startZ-e.z,l=Math.hypot(x,z);e.x+=x/l*.5*dt;e.z+=z/l*.5*dt;e.group.position.set(e.x,0,e.z);}if(active&&dist<2.35&&e.stunUntil<t){if(t>e.lastAttack+(e.type==='bandit'?1.65:2.05)){e.lastAttack=t;e.attackWindup=t+.55;addRing(e.group.position.clone(),'#e8a46b',2,.62);}}if(e.attackWindup&&t>e.attackWindup){e.attackWindup=0;if(Math.hypot(hero.position.x-e.x,hero.position.z-e.z)<2.6&&t>dodgeMovingUntil){const harm=damageAfterArmour(e.type==='bandit'?16:e.type==='boar'?12:7,shieldUntil>t,data.armour[style]);hp=Math.max(0,hp-harm);floating(`-${harm}`,'#ff948d',hero.position.clone().add(new THREE.Vector3(0,2.8,0)));updateHpUI();if(hp<=0){toast('<b>YOU WERE DEFEATED</b> · Respawning in Oakrest');setTimeout(()=>{hero.position.set(0,0,11);hp=maxHealth(levelFromXp(data.xp.vitality).level);updateHpUI();},2100);}}}}
function animate(dt,t){elapsed+=dt;if(holdingAttack || keys.has('j') || keys.has('enter'))doBasic();const turn=cameraKeyDirection(keys.has('arrowleft'),keys.has('arrowright'));if(turn)yaw+=turn*dt*2.35*lookSensitivity;const movement=new THREE.Vector3(),front=forward(),side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));const v=(Number(keys.has('w'))-Number(keys.has('s')))-joystick.y;const h=Number(keys.has('d'))-Number(keys.has('a'))+joystick.x;movement.addScaledVector(front,v).addScaledVector(side,h);let moving=movement.length()>.04;if(moving&&hp>0){movement.normalize().multiplyScalar(dt*(keys.has('shift')?6.3:5)*defenceFor(data.armour[style]).mobility);const nx=hero.position.x+movement.x,nz=hero.position.z+movement.z;if(!collides(nx,hero.position.z))hero.position.x=nx;if(!collides(hero.position.x,nz))hero.position.z=nz;}hero.rotation.y=-yaw;const swing=moving?Math.sin(elapsed*10)*.45:0;hero.userData.leftLeg.rotation.x=swing;hero.userData.rightLeg.rotation.x=-swing;hero.userData.leftArm.rotation.x=-swing*.6;hero.userData.rightArm.rotation.x=THREE.MathUtils.lerp(hero.userData.rightArm.rotation.x,swing*.3,dt*9);hero.position.y=moving?Math.sin(elapsed*20)*.045:0;
const back=front.clone().multiplyScalar(-6.5);const look=hero.position.clone().add(new THREE.Vector3(0,1.65,0));const ideal=look.clone().add(back).add(new THREE.Vector3(0,2.15+Math.sin(pitch)*3,0));camera.position.lerp(ideal,1-Math.pow(.005,dt));camera.lookAt(look.clone().addScaledVector(front,2.8).add(new THREE.Vector3(0,-pitch*5,0)));
for(const e of enemies)updateEnemy(e,dt,t);
for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.age+=dt;if(p.particle){p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=7*dt;p.mesh.scale.multiplyScalar(.965);}else{p.mesh.position.addScaledVector(p.dir,dt*p.speed);p.mesh.rotation.y+=dt*7;for(const e of enemies){if(e.dead||e.hp<=0)continue;const y=e.type==='mossling'?.7:1.2;const ex=e.x-p.mesh.position.x,ez=e.z-p.mesh.position.z,dy=y-p.mesh.position.y;if(Math.hypot(ex,ez,dy)<(e.type==='dummy'?1.1:1.15)){hitEnemy(e,p.damage,p.opts);sparks(p.mesh.position.clone(),STYLE_COLOURS[p.style],7);p.life=0;break;}}}if(p.age>p.life){scene.remove(p.mesh);p.mesh.material.dispose();projectiles.splice(i,1);}}
for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.time+=dt;r.mesh.scale.setScalar(r.radius*(.3+r.time/r.duration*.8));r.mesh.material.opacity=Math.max(0,.85*(1-r.time/r.duration));if(r.time>=r.duration){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1);}}
for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.age+=dt;const v=f.pos.clone().project(camera);f.el.style.left=`${(v.x+1)*innerWidth*.5}px`;f.el.style.top=`${(-v.y+1)*innerHeight*.5-f.age*37}px`;f.el.style.opacity=`${Math.max(0,1-f.age/1.1)}`;if(f.age>1.1){f.el.remove();floaters.splice(i,1);}}
let aim=null,aimScore=-Infinity;for(const e of enemies){if(e.dead||e.type==='dummy'&&hero.position.distanceTo(e.group.position)>15)continue;const dx=e.x-hero.position.x,dz=e.z-hero.position.z,dist=Math.hypot(dx,dz);if(dist>30)continue;const dot=(dx*front.x+dz*front.z)/Math.max(.01,dist);const score=dot-0.01*dist;if(dot>.86&&score>aimScore){aim=e;aimScore=score;}}
$('targetbox').hidden=!aim;if(aim){$('target-name').textContent={dummy:'Training Dummy',mossling:'Mossling',boar:'Field Boar',bandit:'Forest Bandit'}[aim.type];$('target-hp').style.width=`${100*aim.hp/aim.max}%`;}
const z=hero.position.z;$('area').textContent=z< -42?'Forest Road':z< -12?'Oakrest Outskirts':'Oakrest Village';
for(const [i,b] of [...$('skills').children].entries()){const ability=equippedSkills(data,style,data.gear[style])[i];const until=ability?cooldowns.get(`${style}.${slotFamily(style,data.gear[style])}.${ability.id}`)||0:0;const remaining=Math.max(0,until-t);b.classList.toggle('cooling',remaining>0);b.querySelector('.cooldown').textContent=remaining>0?remaining.toFixed(1):'';}
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);
const canvas=renderer.domElement;
function cameraMove(dx,dy,touch=false){const speed=lookSensitivity*(touch?.82:1);yaw+=dx*.0044*speed;pitch=clamp(pitch+dy*.0026*speed,-.35,.75);}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)cameraMove(e.movementX,e.movementY);});
canvas.addEventListener('mousedown',e=>{if(!started)return;if(!isTouch&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});if(e.button===0)doBasic();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let touchLook=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;if(e.clientX<innerWidth*.37)return;touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!touchLook||touchLook.id!==e.pointerId)return;cameraMove(e.clientX-touchLook.x,e.clientY-touchLook.y);touchLook.x=e.clientX;touchLook.y=e.clientY;});const endTouch=e=>{if(touchLook?.id===e.pointerId)touchLook=null;};canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
const joy=$('joystick'),stick=$('stick');let joyId=null;joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateStick(e);});function updateStick(e){const r=joy.getBoundingClientRect(),m=stickFromOffset(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.34);joystick.x=m.x;joystick.y=m.y;stick.style.transform=`translate(${m.knobX}px,${m.knobY}px)`;}function releaseStick(e){if(e.pointerId!==joyId)return;joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';}joy.addEventListener('pointerup',releaseStick);joy.addEventListener('pointercancel',releaseStick);joy.addEventListener('lostpointercapture',releaseStick);
$('touch-attack').addEventListener('pointerdown',e=>{e.preventDefault();doBasic();});$('touch-dodge').addEventListener('pointerdown',e=>{e.preventDefault();dodge();});
// The camera zone works without pointer lock and can be used simultaneously with the left stick.
const lookZone=$('touch-look-zone');let lookPointer=null;
lookZone.addEventListener('pointerdown',e=>{
  if(!started || lookPointer || (e.pointerType==='mouse' && e.button!==0))return;
  e.preventDefault();lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
  lookZone.setPointerCapture?.(e.pointerId);
});
lookZone.addEventListener('pointermove',e=>{
  if(!lookPointer || e.pointerId!==lookPointer.id)return;
  const dx=e.clientX-lookPointer.x,dy=e.clientY-lookPointer.y;
  if(dx||dy){cameraMove(dx,dy,e.pointerType!=='mouse');$('touch-look-tip').classList.add('faded');}
  lookPointer.x=e.clientX;lookPointer.y=e.clientY;
});
function releaseLook(e){if(lookPointer?.id===e.pointerId)lookPointer=null;}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])lookZone.addEventListener(ev,releaseLook);

// Holding ATTACK repeats at each weapon's existing rate; releasing/canceling stops instantly.
const attackButton=$('touch-attack');let attackId=null,attackX=0;
attackButton.addEventListener('pointerdown',e=>{
  if(!started || attackId!==null)return;e.preventDefault();
  attackId=e.pointerId;attackX=e.clientX;holdingAttack=true;doBasic();
  attackButton.classList.add('held');attackButton.setPointerCapture?.(e.pointerId);
});
// Pointer capture retains this right-thumb gesture even after sliding beyond ATTACK.
// Auto-attacks continue while horizontal drag turns the camera; vertical drag does not tilt.
attackButton.addEventListener('pointermove',e=>{
  if(e.pointerId!==attackId || !holdingAttack || (e.pointerType!=='touch'&&e.pointerType!=='pen'))return;
  e.preventDefault();
  const dx=attackDragDelta(e.clientX-attackX);attackX=e.clientX;
  if(dx)cameraMove(dx,0,true);
});
function releaseAttack(e){if(e.pointerId!==attackId)return;attackId=null;holdingAttack=false;attackButton.classList.remove('held');}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(ev,releaseAttack);
// Pointerdown applies the swap immediately while another finger holds the joystick.
const swapButton=$('touch-swap');let swapPointerAt=-10;
swapButton.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();swapPointerAt=now();setStyle(nextStyle(style));}});
swapButton.addEventListener('click',()=>{if(now()-swapPointerAt>.35)setStyle(nextStyle(style));});

const speedInput=$('look-speed');speedInput.value=lookSensitivity.toFixed(1);
$('look-speed-value').textContent=`${lookSensitivity.toFixed(1)}×`;
speedInput.addEventListener('input',e=>{
  lookSensitivity=cameraSensitivity(e.target.value);
  $('look-speed-value').textContent=`${lookSensitivity.toFixed(1)}×`;
  try{localStorage.setItem('oakrest-look-speed',String(lookSensitivity));}catch{}
});
function closeControls(){$('controls-panel').hidden=true;$('help-button').setAttribute('aria-expanded','false');}
$('help-button').addEventListener('click',()=>{
  const panel=$('controls-panel');panel.hidden=!panel.hidden;
  $('help-button').setAttribute('aria-expanded',String(!panel.hidden));
  document.exitPointerLock?.();
});
$('close-controls').addEventListener('click',closeControls);
addEventListener('blur',()=>{
  holdingAttack=false;attackId=null;attackButton.classList.remove('held');
  joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';
  lookPointer=null;
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){holdingAttack=false;attackId=null;attackButton.classList.remove('held');joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';lookPointer=null;}
});
document.addEventListener('keydown',e=>{if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add((directions[e.key]||e.key).toLowerCase());if(e.repeat)return;if(e.code==='Tab')setStyle(nextStyle(style));if(e.key==='j'||e.key==='J'||e.code==='Enter')doBasic();if(e.code==='Escape'){closeControls();bookClose();}if(e.key==='1'||e.key==='2'||e.key==='3')setStyle(STYLE_ORDER[Number(e.key)-1]);if('qerf'.includes(e.key.toLowerCase())&&e.key.length===1)useAbility('qerf'.indexOf(e.key.toLowerCase()));if(e.key==='Shift')dodge();if(e.code==='Space')dodge();});document.addEventListener('keyup',e=>keys.delete((directions[e.key]||e.key).toLowerCase()));addEventListener('blur',()=>keys.clear());
$('begin').addEventListener('click',()=>{started=true;$('intro').classList.add('hidden');if(!isTouch)canvas.requestPointerLock?.().catch(()=>{});toast('<b>Welcome to Oakrest!</b> One skill is ready. Level up to unlock more in your SKILLS book.');});
equipVisual(style,data.gear[style]);refreshSkills();if(data.defeated>=3){questCompleted=true;$('quest-text').textContent='Master all three styles and defeat the bandit on the forest road.';}
let last=performance.now();function loop(time){requestAnimationFrame(loop);const dt=Math.min(.05,(time-last)/1000);last=time;const t=now();if(started)animate(dt,t);renderer.render(scene,camera);}requestAnimationFrame(loop);setInterval(save,6000);