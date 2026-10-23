import * as THREE from 'three';
import {createSkinnedOakrestHero} from './skeletal-character.js';
import {skeletalAbilityCatalogue} from './skeletal-ability-library.js';
const siteAllowed=['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname);
if(!siteAllowed){
 document.getElementById('lab').textContent='This independent skeletal character test is restricted to local and Oakrest development builds.';
 throw new Error('Development-only rig lab');
}
const canvas=document.getElementById('rig-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#34493f');scene.fog=new THREE.Fog('#34493f',14,25);
const camera=new THREE.PerspectiveCamera(44,1,.1,60);
const light=new THREE.HemisphereLight('#e2eddf','#3c524b',2.15);scene.add(light);
const key=new THREE.DirectionalLight('#ffe6b9',2.6);key.position.set(-3,6,4);scene.add(key);
const rim=new THREE.DirectionalLight('#b5cfd7',1.4);rim.position.set(3,3,-4);scene.add(rim);
const ground=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.6,.18,64),new THREE.MeshStandardMaterial({color:'#566855',roughness:1}));
ground.position.y=-.16;scene.add(ground);
const ring=new THREE.Mesh(new THREE.TorusGeometry(2.85,.022,6,64),new THREE.MeshBasicMaterial({color:'#b8c1a2'}));ring.rotation.x=-Math.PI/2;ring.position.y=-.065;scene.add(ring);
for(let i=0;i<10;i++){
 const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.22+(i%3)*.085,0),
 new THREE.MeshStandardMaterial({color:i%2?'#71796b':'#4c5b50',flatShading:true}));
 const theta=i*Math.PI*2/10;stone.position.set(Math.cos(theta)*3.15,-.02,Math.sin(theta)*3.15);
 stone.rotation.y=theta;scene.add(stone);
}
const hero=createSkinnedOakrestHero();scene.add(hero.root);
const helper=new THREE.SkeletonHelper(hero.root);helper.visible=false;scene.add(helper);
const $=id=>document.getElementById(id);
const clip=$('clip');for(const animation of hero.clips.filter(c=>!c.name.startsWith('Ability/'))){
 const option=document.createElement('option');option.value=animation.name;option.textContent=animation.name.replace(/([a-z])([A-Z])/g,'$1 $2');
 clip.append(option);
}
const defaults={SwordSlash:'sword',GreatswordStrike:'greatsword',DaggerCombo:'dagger',BowDraw:'bow',CrossbowFire:'crossbow',StaffCast:'staff',WandCast:'wand',Woodcut:'axe',Guard:'sword'};
const catalogue=skeletalAbilityCatalogue(),ability=$('ability');
for(const entry of catalogue){
 const option=document.createElement('option');
 option.value=entry.id;option.textContent=entry.family.toUpperCase()+' · '+entry.abilityId+' · '+entry.name;
 ability.append(option);
}
clip.value='Walk';
let current=hero.play('Walk',0),playing=true,yaw=.56,pitch=.1,distance=5.2,previous=performance.now();
function choose(name,reset=false){
 current=hero.play(name,reset?0:.18);
 const weapon=defaults[name];if(weapon&&$('weapon').value!==weapon){$('weapon').value=weapon;hero.equip(weapon);}
}
const familyWeapon={sword:'sword',daggers:'dagger',greatsword:'greatsword',bow:'bow',
 shortbow:'bow',crossbow:'crossbow',frost:'staff',ember:'wand'};
function chooseAbility(id){
 const data=catalogue.find(item=>item.id===id);
 if(!data)return null;
 current=hero.playAbility(data.family,data.abilityId);
 const weapon=familyWeapon[data.family];
 if($('weapon').value!==weapon){$('weapon').value=weapon;hero.equip(weapon);}
 $('preview-timeline').value='0';$('frame-phase').textContent=data.instant?'Instant effect':'Before contact';
 return data;
}
clip.addEventListener('change',()=>{ability.value='';choose(clip.value);$('frame-phase').textContent='No ability selected';});
ability.addEventListener('change',()=>{if(ability.value)chooseAbility(ability.value);});
$('preview-timeline').addEventListener('input',()=>{
 const data=catalogue.find(item=>item.id===ability.value);if(!data)return;
 // Authoritative-equivalent simulated action clock for VISUAL inspection only.
 const duration=Math.max(.43,data.anticipation+.31,data.recovery);
 const action={start:0,impactAt:data.instant?0:data.anticipation,interval:duration};
 const t=Number($('preview-timeline').value)/1000*(duration-.00001);
 const frame=hero.sampleAbility(data.family,data.abilityId,action,t);
 if(frame){$('frame-phase').textContent=frame.phase+' · contact='+frame.contact;
  playing=false;$('toggle').textContent='Play';current=hero.mixer.clipAction(hero.clips.find(c=>c.name===frame.clip));
 }
});
$('weapon').addEventListener('change',()=>hero.equip($('weapon').value));
$('toggle').addEventListener('click',()=>{playing=!playing;$('toggle').textContent=playing?'Pause':'Play';});
$('restart').addEventListener('click',()=>{current.reset().play();});
$('skeleton').addEventListener('change',()=>helper.visible=$('skeleton').checked);
$('speed').addEventListener('input',()=>{$('speed-value').textContent=Number($('speed').value).toFixed(2)+'×';});
$('camera-view').addEventListener('change',()=>{
 const view=$('camera-view').value;if(view==='front'){yaw=0;pitch=.08;distance=5.2;}
 if(view==='side'){yaw=Math.PI/2;pitch=.08;distance=4.7;}
 if(view==='back'){yaw=Math.PI;pitch=.08;distance=5.2;}
 if(view==='near'){yaw=.4;pitch=-.15;distance=2.8;}
});
let pointer=null;
canvas.addEventListener('pointerdown',event=>{pointer={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{
 if(!pointer||pointer.id!==event.pointerId)return;
 yaw-=(event.clientX-pointer.x)*.007;pitch=Math.max(-.5,Math.min(.9,pitch+(event.clientY-pointer.y)*.005));
 pointer.x=event.clientX;pointer.y=event.clientY;$('camera-view').value='orbit';
});
canvas.addEventListener('pointerup',()=>{pointer=null;});canvas.addEventListener('pointercancel',()=>{pointer=null;});
canvas.addEventListener('wheel',event=>{event.preventDefault();distance=Math.max(2.4,Math.min(9,distance+event.deltaY*.006));},{passive:false});
let frames=0,lastStats=performance.now();
function tick(now){
 requestAnimationFrame(tick);
 const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;
 if(playing)hero.update(dt*Number($('speed').value));
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 }
 const target=THREE.MathUtils.clamp(distance<3?1.51:1.40,1.3,1.55);
 camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,target+Math.sin(pitch)*distance,
   -Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,target,0);
 renderer.render(scene,camera);
 frames++;
 if(now-lastStats>1000){
  const last=current?.getClip(),memory=renderer.info.memory;
  $('readout').textContent='Rig: '+hero.skeleton.bones.length+' real bones\nWeighted vertices: '+
    hero.mesh.geometry.attributes.position.count.toLocaleString()+
    '\nAnimations: '+hero.clips.length+'\nPlaying: '+(last?.name||'none')+
    '\nGPU geometries: '+memory.geometries+'\nDraw calls: '+renderer.info.render.calls+
    '\nFrame rate (preview): '+Math.round(frames*1000/(now-lastStats))+' fps';
  frames=0;lastStats=now;
 }
}
requestAnimationFrame(tick);
window.oakrestRigLabQA={hero,clipNames:hero.clips.map(x=>x.name),
 abilityCatalogue:catalogue,
 play:name=>{ability.value='';clip.value=name;choose(name,true);hero.update(.3);},
 chooseAbility:id=>{ability.value=id;return chooseAbility(id);},
 sampleAbility:(family,id,attack,now)=>hero.sampleAbility(family,id,attack,now)};
