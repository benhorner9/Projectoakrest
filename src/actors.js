import * as THREE from 'three';
import {damp} from './motion.js';
import {attackPose} from './gameplay-math.js';
import {abilityMotion} from './animation-language.js';
import {restoreKayKitPose,applyKayKitPose} from './kaykit-motion.js';
import {animateFoundation} from './foundation-motion.js';
import {HUMANOID_RIG_VERSION,HUMANOID_JOINTS} from './rig-contract.js';
import {HUMANOID_SHAPES as shapes} from './humanoid-shapes.js';
import {AXE_BY_ID} from './woodcutting.js';
const materials=new Map(),geometries=new Map();
const material=(color,metal=false)=>{const key=color+metal;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metal?.38:.88,metalness:metal?.55:0}));return materials.get(key);};
const sphere=new THREE.SphereGeometry(1,12,8),box=new THREE.BoxGeometry(1,1,1);
function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1,metal=false){const o=new THREE.Mesh(geo,typeof color==='string'?material(color,metal):color);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
const ball=(g,c,x,y,z,sx,sy,sz)=>mesh(g,sphere,c,x,y,z,sx,sy,sz);
const block=(g,c,x,y,z,sx,sy,sz,metal=false)=>mesh(g,box,c,x,y,z,sx,sy,sz,metal);
function tube(g,c,x,y,z,rt,rb,h,metal=false){const key=[rt,rb,h].join();if(!geometries.has(key))geometries.set(key,new THREE.CylinderGeometry(rt,rb,h,10));return mesh(g,geometries.get(key),c,x,y,z,1,1,1,metal);}
function pivot(parent,x,y,z){const p=new THREE.Group();p.position.set(x,y,z);parent.add(p);return p;}
function taperedBlade(g,length,width){const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(-width*.4,-length*.78);shape.lineTo(0,-length);shape.lineTo(width*.4,-length*.78);shape.lineTo(width/2,0);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,steps:1});geo.rotateX(Math.PI/2);mesh(g,geo,'#b4c9cc',0,0,-.2,1,1,1,true);}
export function createActor(bandit=false,{foundation=false}={}){
 const g=new THREE.Group(),rig=pivot(g,0,0,0),skin=material(bandit?'#b88b69':'#d6aa83').clone(),body=material(bandit?'#6a4d4e':'#607b7c').clone(),cloth=material('#34574e').clone();
 const torso=foundation?mesh(rig,shapes.torso,body,0,1.43,0):tube(rig,body,0,1.43,0,.43,.31,.82);if(!foundation)torso.scale.z=.62;
 const trimMat=material('#c9b28a').clone();
 const outfitTrims=[
  block(rig,trimMat,0,1.46,-.275,.085,.56,.028),
  block(rig,trimMat,-.12,1.44,-.28,.045,.52,.03),
  block(rig,trimMat,.12,1.44,-.28,.045,.52,.03)
 ];
 if(foundation)mesh(rig,shapes.hips,body,0,1.12,0);else ball(rig,body,0,1.12,0,.36,.23,.25);
 const neck=tube(rig,skin,0,1.94,0,.14,.16,.22);
 const head=pivot(rig,0,2.15,0);const face=foundation?mesh(head,shapes.face,skin,0,0,0):ball(head,skin,0,0,0,.275,.34,.26);
 const hairMat=material('#40332a').clone();
 const hair=mesh(head,foundation?shapes.hair:sphere,hairMat,0,.17,.055,.285,.23,.27);
 const hairBack=ball(head,hairMat,0,-.15,.19,.24,.38,.13);hairBack.visible=false;
 const hairTail=ball(head,hairMat,.12,-.18,.30,.11,.32,.11);hairTail.visible=false;
 const hairCurls=[[-.20,.24,-.06],[0,.32,-.09],[.20,.24,-.06]].map(([x,y,z])=>{const curl=ball(head,hairMat,x,y,z,.11,.12,.12);curl.visible=false;return curl;});
 for(const s of [-1,1]){ball(head,skin,s*(foundation?.245:.27),-.01,.01,foundation?.045:.065,foundation?.075:.11,foundation?.055:.07);ball(head,'#26332e',s*.105,.015,-.237,foundation?.022:.03,foundation?.028:.037,.02);block(head,'#493a2c',s*.11,.09,-.235,.10,.025,.03);}
 ball(head,skin,0,-.035,foundation?-.245:-.27,foundation?.04:.055,foundation?.065:.075,foundation?.045:.07);
 if(foundation){block(head,'#775848',0,-.17,-.225,.10,.015,.014);}
 if(foundation)mesh(rig,shapes.belt,'#493d30',0,1.02,0);else block(rig,'#493d30',0,1.02,0,.71,.14,.49);block(rig,'#c8ab70',0,1.03,-.27,.15,.15,.05,true);
 const cape=pivot(rig,0,1.78,.25),capeGeo=new THREE.PlaneGeometry(.75,1.05,4,4);const cp=capeGeo.attributes.position;for(let i=0;i<cp.count;i++){const y=cp.getY(i);cp.setXYZ(i,cp.getX(i)*(1.10-y*.30),y,Math.cos(cp.getX(i)*5)*.06);}capeGeo.computeVertexNormals();cloth.side=THREE.DoubleSide;mesh(cape,capeGeo,cloth,0,-.53,.045);cape.rotation.x=.10;
 const chestPlate=foundation?mesh(rig,shapes.chest,material('#839a9b',true),0,1.43,0):ball(rig,material('#839a9b',true),0,1.48,-.22,.36,.38,.12);
 const leather=foundation?mesh(rig,shapes.chest,'#7a6045',0,1.43,0):ball(rig,'#7a6045',0,1.45,-.20,.36,.36,.11);
 const pauldrons=[];
 function leg(s){
  const p=pivot(rig,s*.19,1,0),knee=pivot(p,0,-.46,0),ankle=foundation?pivot(knee,0,-.40,0):null;
  if(foundation){mesh(p,shapes.thigh,'#484b41',0,0,0);mesh(knee,shapes.shin,'#45453b',0,0,0);mesh(ankle,shapes.shoe,'#3b3831',0,.40,0);}
  else {tube(p,'#484b41',0,-.23,0,.145,.12,.46);ball(knee,'#7c7160',0,0,-.02,.14,.15,.14);tube(knee,'#45453b',0,-.19,0,.12,.10,.38);ball(knee,'#3b3831',0,-.38,-.09,.15,.14,.25);}
  return {p,knee,ankle};
 }
 function arm(s){
  const p=pivot(rig,s*.43,1.77,0),elbow=pivot(p,0,-.40,0);
  if(foundation){mesh(p,shapes.upperArm,body,0,0,0);mesh(elbow,shapes.forearm,'#675440',0,0,0);}
  else {ball(p,body,0,-.02,0,.19,.23,.19);tube(p,body,0,-.22,0,.13,.105,.39);ball(elbow,skin,0,0,0,.105,.11,.10);tube(elbow,'#675440',0,-.16,0,.12,.10,.30);ball(elbow,skin,0,-.33,0,.115,.135,.105);}
  const hand=pivot(elbow,0,-.34,foundation?0:-.06);
  if(foundation){block(hand,skin,0,0,0,.15,.16,.14);for(let i=0;i<3;i++)block(hand,skin,-.06+i*.055,-.065,-.015,.042,.07,.12);ball(hand,skin,s*.082,.015,-.035,.038,.065,.05);}
  pauldrons.push(foundation?mesh(p,shapes.pauldron,material('#839a9b',true),0,.025,0):ball(p,material('#839a9b',true),0,.035,0,.23,.18,.24));
  return {p,elbow,hand};
 }
 const ll=leg(-1),rl=leg(1),la=arm(-1),ra=arm(1);
 g.userData={rig,head,body,cloth,cape,chestPlate,leather,pauldrons,skinMaterial:skin,hairMat,hair,hairBack,hairTail,hairCurls,torso,outfitTrims,leftLeg:ll.p,rightLeg:rl.p,leftKnee:ll.knee,rightKnee:rl.knee,leftArm:la.p,rightArm:ra.p,leftElbow:la.elbow,rightElbow:ra.elbow,weapon:ra.hand,offhand:la.hand,leftHand:la.hand,rightHand:ra.hand,foundation,owned:[],family:'sword'};
 if(foundation){
  const u=g.userData;u.rigVersion=HUMANOID_RIG_VERSION;u.head.scale.setScalar(.9);
  u.leftAnkle=ll.ankle;u.rightAnkle=rl.ankle;
  u.upperBody=pivot(rig,0,0,0);
  for(const part of [torso,neck,head,cape,chestPlate,leather,la.p,ra.p,...outfitTrims])u.upperBody.add(part);
  u.bodyGeometry=[capeGeo];
  u.weapon=pivot(u.upperBody,.3,1.3,-.3);u.weapon.name='socket.weapon-control';
  u.offhand=pivot(la.hand,0,0,0);u.offhand.name='socket.offhand';
  for(const name of HUMANOID_JOINTS)u[name].name='humanoid.'+name;
  // Candidate silhouette meshes retain the established joint and equipment anchors.
 }
 if(bandit){ball(head,'#383e40',0,.16,.06,.33,.26,.31);block(head,'#5d5148',0,-.15,-.245,.45,.19,.05);}
 return g;
}
/** Apply a player's personal, non-equipment appearance to the existing rig. */
export function applyCharacterAppearance(g,appearance={}){
 const u=g.userData;if(!u?.skinMaterial)return;
 const styles=new Set(['short','swept','buzz','long','ponytail','curly']);
 const outfits=new Set(['tunic','wanderer','scholar','traveller']);
 const sex=appearance.sex==='female'?'female':'male',hairStyle=styles.has(appearance.hairstyle)?appearance.hairstyle:'short';
 const outfit=outfits.has(appearance.outfit)?appearance.outfit:'tunic';
 const hex=/^#[0-9a-f]{6}$/i;
 const color=(value,defaultHex)=>hex.test(value||'')?value:defaultHex;
 u.skinMaterial.color.set(color(appearance.skinTone,'#d6aa83'));
 u.hairMat.color.set(color(appearance.hairColor,'#39271f'));
 u.body.color.set(color(appearance.outfitColor,'#607b7c'));
 u.cloth.color.set(color(appearance.outfitColor,'#607b7c')).multiplyScalar(.72);
 u.torso.scale.x=sex==='female'?.90:1;
 u.head.scale.setScalar((sex==='female'?.97:1)*(u.foundation?.9:1));
 u.hair.position.set(hairStyle==='swept'?.07:0,hairStyle==='buzz'?.19:.17,.055);
 u.hair.scale.set(hairStyle==='swept'?.32:.285,hairStyle==='buzz'?.10:hairStyle==='ponytail'?.17:.23,.27);
 u.hair.rotation.z=hairStyle==='swept'?.22:0;
 u.hairBack.visible=hairStyle==='long';
 u.hairTail.visible=hairStyle==='ponytail';
 u.hairCurls.forEach(c=>c.visible=hairStyle==='curly');
 u.outfitTrims.forEach((m,i)=>m.visible=outfit==='scholar'?i===0:outfit==='traveller'?i>0:outfit==='wanderer'?i===1:false);
 u.cape.visible=outfit==='wanderer'&&!u.chestPlate.visible;
}
export function equipActor(g,style,family,armour){const u=g.userData;for(const geo of u.owned)geo.dispose();for(const mat of u.ownedMaterials||[])mat.dispose();u.ownedMaterials=[];u.owned=[];u.weapon.clear();u.offhand.clear();u.bowString=null;u.nockedArrow=null;u.foundationPosed=false;u.crossbowSlider=null;u.magicFocus=null;u.family=family;u.chestPlate.visible=armour==='plate';u.leather.visible=armour==='leather';u.pauldrons.forEach(p=>p.visible=armour==='plate');u.cape.visible=armour!=='plate';u.body.color.set(armour==='plate'?'#58686b':armour==='leather'?'#7b674b':style==='magic'?'#697e9b':'#607b7c');u.cloth.color.set(style==='magic'?'#3b5277':style==='ranged'?'#45634c':'#34574e');
 const w=u.weapon;function blade(group,heavy=false,dagger=false){block(group,'#54402f',0,0,.02,.105,.11,.38);block(group,'#c4a466',0,0,-.18,dagger?.26:heavy?.55:.40,.09,.10,true);taperedBlade(group,dagger?.52:heavy?1.45:1.03,dagger?.15:heavy?.30:.20);ball(group,'#c4a466',0,0,.24,.08,.08,.08);}
 if(style==='melee'){
   if(family==='woodaxe'){
    block(w,'#745235',0,0,u.foundation?-.37:-.49,.12,.12,u.foundation?1.38:1.15);
    block(w,'#c0c9c7',-.25,0,-.96,.58,.15,.38,true);
    block(w,'#e2e5dc',-.51,0,-.97,.085,.16,.4,true);
   }else{blade(w,family==='greatsword',family==='daggers');if(family==='daggers')blade(u.offhand,false,true);}
  }
 else if(style==='magic'){const wand=u.foundation&&family==='ember',length=wand?.85:1.75;const shaft=tube(w,'#604d36',0,0,wand?-.3:-.65,.055,.075,length);shaft.rotation.x=Math.PI/2;const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.23),material(family==='frost'?'#8fcde3':'#ecaa69'));crystal.position.z=wand?-.72:-1.58;if(wand)crystal.scale.setScalar(.6);w.add(crystal);u.magicFocus=crystal;for(const s of [-1,1]){const prong=block(w,'#baa775',s*(wand?.08:.15),0,wand?-.65:-1.43,.07,.10,wand?.18:.42,true);prong.rotation.y=s*-.35;}}
 else {const bow=family!=='crossbow',size=family==='shortbow'?.55:.8;
 if(bow){const points=u.foundation?[[0,-size,.18],[0,-size*.7,.02],[0,0,0],[0,size*.7,.02],[0,size,.18]].map(p=>new THREE.Vector3(...p)):null;const curve=new THREE.CatmullRomCurve3(points||[new THREE.Vector3(0,-size,.12),new THREE.Vector3(0,-size*.7,-.22),new THREE.Vector3(0,0,-.38),new THREE.Vector3(0,size*.7,-.22),new THREE.Vector3(0,size,.12)]);mesh(w,new THREE.TubeGeometry(curve,16,.045,5,false),'#946c42',0,0,u.foundation?0:-.28);
  // Three retained points form a genuine V draw-string. The middle point
  // follows the actual pending attack wind-up without creating per-frame meshes.
  const tip=u.foundation?.18:.12,nock=u.foundation?.18:-.16;
  const positions=new Float32Array([0,-size,tip,0,0,nock,0,size,tip]);
  const stringGeometry=new THREE.BufferGeometry();
  stringGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const stringMaterial=new THREE.LineBasicMaterial({color:'#e7dabc'});
  w.add(new THREE.Line(stringGeometry,stringMaterial));
  u.bowString={positions,geometry:stringGeometry};
  u.owned.push(stringGeometry);u.ownedMaterials.push(stringMaterial);}
 else{block(w,'#725235',0,0,-.35,.18,.2,.90);const bowMesh=mesh(w,new THREE.TorusGeometry(.46,.045,5,16,Math.PI),'#adb6b0',0,0,-.68);bowMesh.rotation.x=Math.PI/2;bowMesh.rotation.z=Math.PI;block(w,'#c7b999',0,0,-.69,.92,.016,.016);
  // Mechanical catch slides during the crossbow wind-up then snaps forward.
  u.crossbowSlider=block(w,'#cfbb8b',0,.08,-.57,.14,.10,.14,true);}
 const arrowRoot=pivot(w,0,0,0);block(arrowRoot,'#d3bb84',0,0,-.58,.025,.025,.9);u.nockedArrow=arrowRoot;}
 // Equipment geometry belongs to this loadout; cached primitive geometry remains shared.
 for(const root of [w,u.offhand])root.traverse(o=>{if(o.isMesh&&o.geometry!==box&&o.geometry!==sphere&&![...geometries.values()].includes(o.geometry))u.owned.push(o.geometry);});
}
/**
 * Individual weapons sharing a combat family still have different equipment
 * colours and rune shapes. All materials are per-actor so changing an item
 * cannot recolour other players, enemies or inventory preview models.
 */
export function applyEquipmentVariant(g,style,itemId){
 const u=g.userData;if(!u?.weapon||typeof itemId!=='string')return;
 let seed=2166136261;for(const char of style+'.'+itemId)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const hue=((seed%31)-15)/360,light=((seed>>6)%13-6)/100;
 const mats=new Set();
 for(const parent of [u.weapon,u.offhand])parent.traverse(object=>{
  if(!object.isMesh||!object.material)return;
  const previous=object.material;
  if(previous.isMaterial){
   const unique=previous.clone();unique.color?.offsetHSL(hue,0,light);
   object.material=unique;mats.add(unique);
  }
 });
 const gemMaterial=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((seed%360)/360,.42,.62),metalness:.45,roughness:.28});
 const geometry=new THREE.OctahedronGeometry(.085+(seed%4)*.019,0);
 const gemstone=new THREE.Mesh(geometry,gemMaterial);gemstone.position.set(.16,-.06,-.25-(seed%3)*.13);u.weapon.add(gemstone);
 const axe=AXE_BY_ID[itemId];
 if(axe&&style==='melee')for(const [index,part] of u.weapon.children.entries()){
  if(index===1||index===2)part.material.color.set(axe.colour);
 }
 u.owned.push(geometry);u.ownedMaterials.push(...mats,gemMaterial);
}
export function animateActor(g,{dt,t,stride=0,speed=0,attack=null,dodge=0,side=0,backwards=false,dead=false,hit=false,chopping=null,combat=true,groundHeightAt=null}){const u=g.userData;if(u.foundation){animateFoundation(u,{dt,t,stride,speed,attack,dodge,side,backwards,dead,hit,chopping,combat,groundHeightAt});return;}restoreKayKitPose(u);const strength=Math.min(1,speed/4.7),s=Math.sin(stride)*(backwards?-1:1),family=u.family,pose=attackPose(t,attack),wind=pose.phase==='windup'?pose.amount:0,release=pose.phase==='release'?pose.amount:0;
 u.leftLeg.rotation.x=damp(u.leftLeg.rotation.x,s*.58*strength,20,dt);u.rightLeg.rotation.x=damp(u.rightLeg.rotation.x,-s*.58*strength,20,dt);
 u.leftKnee.rotation.x=damp(u.leftKnee.rotation.x,Math.max(0,-s)*.85*strength,20,dt);u.rightKnee.rotation.x=damp(u.rightKnee.rotation.x,Math.max(0,s)*.85*strength,20,dt);
 u.rig.position.y=Math.sin(stride*2)*.035*strength+Math.sin(t*2)*.009*(1-strength)-dodge*.35;
 u.rig.rotation.z=damp(u.rig.rotation.z,dead?-1.5:hit?.13:-side*.06,12,dt);u.rig.rotation.x=damp(u.rig.rotation.x,dodge*1.05,22,dt);
 let right=-.12+s*.25*strength,left=-.1-s*.30*strength,elbow=-.2;
 if(chopping){
  const period=Math.max(.6,chopping.period||1.18),phase=((t-chopping.start)/period%1+1)%1;
  const strike=phase<.48?phase/.48:1-(phase-.48)/.52;
  right=-.9+strike*2.7;left=right*.78-.28;elbow=.35+strike*.42;
  u.rig.rotation.x=damp(u.rig.rotation.x,-strike*.13,18,dt);
 }else if(['bow','shortbow','crossbow'].includes(family)){
  // In villages, lower raised weapons into a believable relaxed carry.
  const alert=combat||!!attack;
  right=(alert?1.1:-.18)+wind*.12-release*.10;
  left=alert?.95:-.20;elbow=(alert?.55:-.08)+wind*.65;
 }
 else if(['frost','ember'].includes(family)){
  const alert=combat||!!attack;
  right=(alert?.38:-.13)+wind*.8+release*.3;
  left=alert?.35:-.12;elbow=alert?.35:-.2;
 }
 else {right+=wind*1.6+release*.32;elbow=.15+wind*.35;left=family==='greatsword'?right*.8:family==='daggers'?.25-wind*.4+release*.55:left;}
 const cue=chopping?abilityMotion(family,null,0,0):abilityMotion(family,attack?.abilityKind,wind,release,attack?.combo);
 right+=cue.right;left+=cue.left;elbow+=cue.elbow;
 // Preserve motion tells at low quality: no particle effects are needed to
 // read shoulder angle, bow draw, crossbow cocking or the staff release.
 if(u.bowString){
  const pull=chopping?0:Math.min(1,Math.max(0,wind+.09*release));
  u.bowString.positions[5]=-.16+.58*pull;
  u.bowString.geometry.attributes.position.needsUpdate=true;
 }
 if(u.crossbowSlider)u.crossbowSlider.position.z=-.57+.26*wind-.04*release;
 if(u.magicFocus)u.magicFocus.scale.setScalar(1+.13*wind+.08*release);
 const rangedBow=family==='bow'||family==='shortbow';
 u.leftArm.rotation.y=damp(u.leftArm.rotation.y,rangedBow&&(combat||!!attack) ? .30+wind*.28 : family==='greatsword'&&combat ? -.28 : 0,18,dt);
 u.leftArm.rotation.z=damp(u.leftArm.rotation.z,rangedBow&&(combat||!!attack) ? -.18-wind*.34 : family==='greatsword'&&combat ? .20 : -.06,18,dt);
 u.rig.rotation.y=damp(u.rig.rotation.y,cue.twist,15,dt);
 u.head.rotation.z=damp(u.head.rotation.z,cue.head,12,dt);
 if(!chopping)u.rig.rotation.x=damp(u.rig.rotation.x,dodge*1.05+cue.lean,16,dt);
 u.rightArm.rotation.x=pose.phase==='release'&&pose.amount>.93?right:damp(u.rightArm.rotation.x,right,35,dt);u.leftArm.rotation.x=damp(u.leftArm.rotation.x,left,25,dt);
 const contact=attack?.contactDuration?Math.max(0,Math.min(1,(t-attack.impactAt)/attack.contactDuration)):0;
 const swing=attack?.halfAngle?(-attack.halfAngle+2*attack.halfAngle*contact)*(attack.reverse?-1:1):0;
 u.rightArm.rotation.y=damp(u.rightArm.rotation.y,chopping?-.33*Math.sin(((t-chopping.start)/(chopping.period||1.18))*Math.PI*2):pose.phase==='release'?swing:0,35,dt);
 u.rightArm.rotation.z=damp(u.rightArm.rotation.z,chopping?-.2:pose.phase==='idle'?-.1:-wind*.7+release*.5,30,dt);
 u.rightElbow.rotation.x=damp(u.rightElbow.rotation.x,elbow,25,dt);u.leftElbow.rotation.x=damp(u.leftElbow.rotation.x,['bow','shortbow','crossbow'].includes(family)?.6:.25,20,dt);
 u.cape.rotation.x=damp(u.cape.rotation.x,.08+strength*.27+Math.sin(t*5)*.025,6,dt);
 applyKayKitPose(u,{t,stride,speed,attack,dodge,hit,dead,chopping,combat});
}
export function createCreature(type){const g=new THREE.Group(),body=pivot(g,0,0,0),legs=[];g.userData={body,legs};
 if(type==='mossling'){ball(body,'#567e44',0,.62,0,.62,.56,.52);ball(body,'#86a65f',0,.61,-.34,.47,.39,.24);for(const s of [-1,1]){ball(body,'#253a2b',s*.19,.75,-.54,.09,.11,.05);ball(body,'#eef1bd',s*.2,.78,-.58,.025,.03,.02);const foot=pivot(body,s*.38,.23,0);ball(foot,'#495f39',0,0,-.15,.23,.18,.3);legs.push(foot);ball(body,'#647f45',s*.65,.52,0,.19,.27,.2);}for(let i=0;i<7;i++){const leaf=ball(body,i%2?'#7fa458':'#426d48',Math.sin(i*2.4)*.27,1.04+Math.cos(i)*.1,Math.cos(i*2.4)*.20,.13,.34,.08);leaf.rotation.z=Math.sin(i)*.75;}for(const s of [-1,1]){tube(body,'#d7c797',s*.35,1.12,.12,.055,.06,.3);ball(body,'#cd9863',s*.35,1.3,.12,.19,.08,.17);}}
 else if(type==='boar'){ball(body,'#725d4d',0,.89,.12,.75,.65,1.05);ball(body,'#8b705b',0,.76,-.80,.49,.48,.58);ball(body,'#ac8975',0,.64,-1.24,.33,.23,.14);for(const s of [-1,1]){ball(body,'#332e2b',s*.12,.68,-1.37,.045,.055,.02);ball(body,'#271f1a',s*.32,.95,-1.06,.07,.08,.045);const ear=ball(body,'#665041',s*.40,1.32,-.50,.16,.30,.11);ear.rotation.z=-s*.4;const tusk=tube(body,'#e0d2aa',s*.38,.60,-1.15,.018,.10,.43);tusk.rotation.x=-.6;for(const z of [-.51,.70]){const leg=pivot(body,s*.48,.53,z);tube(leg,'#51473d',0,-.18,0,.12,.10,.37);ball(leg,'#343731',0,-.38,-.05,.14,.12,.18);legs.push(leg);}}for(let i=0;i<7;i++)ball(body,'#48453a',0,1.4,-.65+i*.23,.12,.23,.14);const tail=tube(body,'#5b4c40',0,1.0,1.19,.045,.07,.44);tail.rotation.x=.8;}
 else{tube(body,'#685438',0,1.3,0,.16,.18,2.6);const sack=ball(body,'#b79c65',0,1.75,0,.48,.62,.3);block(body,'#624b32',0,1.76,0,1.9,.14,.16);ball(body,'#baa778',0,2.62,0,.32,.35,.29);for(const s of [-1,1])block(body,'#493e2e',s*.10,2.64,-.28,.07,.06,.025);const target=mesh(body,new THREE.TorusGeometry(.27,.05,5,20),'#835c47',0,1.78,-.3);ball(body,'#835c47',0,1.78,-.32,.08,.08,.02);}
 return g;
}
export function animateCreature(g,type,t,dt,speed,warning,hit,death){const u=g.userData;if(u.rig){animateActor(g,{t,dt,stride:t*speed*2,speed,attack:warning?{start:warning-.76,impactAt:warning,interval:1.2}:null,hit,dead:death>0});return;}
 const b=u.body;b.position.y=Math.sin(t*(speed?9:2.5))*(speed?.055:.018);b.rotation.x=damp(b.rotation.x,warning?-.22:0,12,dt);b.rotation.z=damp(b.rotation.z,death?1.5:hit?.14:0,18,dt);u.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*9+i*Math.PI)*Math.min(.5,speed*.16));if(type==='mossling'){b.scale.y=1+Math.sin(t*3)*.025-(warning?.12:0);b.scale.x=1+(warning?.08:0);}}
