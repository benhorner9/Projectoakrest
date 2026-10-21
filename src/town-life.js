import * as THREE from 'three';
import {blocked,moveOnGround,terrainHeight} from './terrain.js';
import {OAKREST_SERVICES} from './town-services.js';

/**
 * Deterministic ambient villagers: no networking, no random spawning and no
 * per-frame geometry creation. Patrol the actual streets, wait at landmarks,
 * turn toward their next destination, greet passing players.
 */
const ROUTES=[
  {name:'Elian',role:'Village courier',colour:'#67889b',line:'The forest road is peaceful near our gates, but mind the bandits farther out.',path:[[-4.4,2],[-4.4,18],[-4.4,28],[-4.4,50],[-4.4,58]]},
  {name:'Pippa',role:'Market gardener',colour:'#b87d50',line:'The market gets busy when the foresters return with their wood.',path:[[4.4,57],[4.4,49],[4.4,31],[4.4,22],[4.4,7]]},
  {name:'Rowan',role:'Apprentice',colour:'#849465',line:'The Forester teaches Woodcutting, but the other trades have teachers elsewhere.',path:[[-22,46],[-9,46],[-4.4,46],[-4.4,57],[-13,57]]},
  {name:'Merrin',role:'Market trader',colour:'#a56d6b',line:'Have you visited the general store? The keeper has supplies for every fighting style.',path:[[9,19],[18,19],[23,17],[18,17],[9,17]]},
  {name:'Tobin',role:'Local farmer',colour:'#a2a070',line:'It is good to see adventurers walking through Oakrest again.',path:[[-22,20],[-5,20],[-5,6],[-22,0]]},
  {name:'Sela',role:'Village watch',colour:'#657983',line:'Keep your weapons ready on the forest road. You are safe inside the palisade.',path:[[4.4,-7],[4.4,4],[4.4,17],[4.4,27]]},
  {name:'Bren',role:'Wandering resident',colour:'#9f7e89',line:'The bank keeps a secure vault for your coins and equipment.',path:[[-4.5,51],[-4.5,34],[-4.5,20],[-23,20],[-23,14]]},
  {name:'Nell',role:'Craftswoman',colour:'#647c67',line:'Not all the best equipment is found in a shop.',path:[[5,53],[18,53],[22,54],[22,42],[5,42]]}
];
const STAFF={
  bank:{name:'Mara',role:'Banker',colour:'#577b90'},
  store:{name:'Darrin',role:'Shopkeeper',colour:'#a57952'},
  forester:{name:'Alden',role:'Forester',colour:'#61815f'}
};
const cloth=new Map();
function material(colour){if(!cloth.has(colour))cloth.set(colour,new THREE.MeshLambertMaterial({color:colour,flatShading:true}));return cloth.get(colour);}
const skin=material('#d4ae87'),hair=material('#5a453a'),boots=material('#514638'),eyes=material('#353c39');
const cylinder=new THREE.CylinderGeometry(1,1,1,7),head=new THREE.IcosahedronGeometry(1,1),cube=new THREE.BoxGeometry(1,1,1);
function mesh(g,geometry,colour,x,y,z,sx,sy,sz){
  const part=new THREE.Mesh(geometry,typeof colour==='string'?material(colour):colour);
  part.position.set(x,y,z);part.scale.set(sx,sy,sz);
  part.castShadow=true;g.add(part);return part;
}
function person(scene,name,role,colour,x,z,staff=false){
  const root=new THREE.Group();
  root.position.set(x,terrainHeight(x,z),z);
  root.userData.animated=true;
  const torso=mesh(root,cylinder,material(colour),0,1.36,0,.38,.88,.28);
  mesh(root,head,skin,0,2.12,0,.30,.34,.28);
  mesh(root,head,hair,0,2.34,-.04,.31,.14,.3);
  for(const s of [-1,1])mesh(root,head,eyes,s*.125,2.13,-.27,.028,.03,.022);
  const arms=[],legs=[];
  for(const s of [-1,1]){
    const a=new THREE.Group();a.position.set(s*.39,1.69,0);root.add(a);
    mesh(a,cylinder,material(colour),0,-.33,0,.14,.65,.14);
    mesh(a,head,skin,0,-.70,0,.12,.13,.12);
    arms.push(a);
    const l=new THREE.Group();l.position.set(s*.18,.96,0);root.add(l);
    mesh(l,cylinder,boots,0,-.35,0,.14,.71,.17);
    legs.push(l);
  }
  if(staff){
    mesh(root,cube,kindHat(role),0,2.42,0,.77,.12,.72);
    mesh(root,cube,kindHat(role),0,2.31,-.14,.56,.14,.40);
  }
  scene.add(root);
  return {root,name,role,torso,arms,legs,x,z,speed:staff?0:1.12,wait:0,stuck:0,legPhase:0};
}
function kindHat(role){return role==='Banker'?material('#364e65'):role==='Shopkeeper'?material('#76543d'):material('#48694f');}
export function createOakrestTownLife(scene){
  const attendants=OAKREST_SERVICES.map(s=>{
    const c=STAFF[s.id];
    return person(scene,c.name,c.role,c.colour,s.npcX,s.npcZ,true);
  });
  const villagers=ROUTES.map((route,i)=>{
    const start=route.path[0];
    const citizen=person(scene,route.name,route.role,route.colour,start[0],start[1]);
    return {...citizen,route,index:1,forward:true,wait:i*.31,stuck:0};
  });
  function step(dt,time,player,enabled=true){
    // Keep them in world layer; don't animate the village during tutorial/Realm.
    if(!enabled)return;
    for(let i=0;i<villagers.length;i++){
      const v=villagers[i];
      if(v.wait>0){v.wait-=dt;continue;}
      let [tx,tz]=v.route.path[v.index];
      const dx=tx-v.x,dz=tz-v.z,length=Math.hypot(dx,dz);
      if(length<.32){
        if(v.index===v.route.path.length-1)v.forward=false;
        else if(v.index===0)v.forward=true;
        v.index+=v.forward?1:-1;v.wait=.35+(i%3)*.32;v.stuck=0;continue;
      }
      const speed=Math.min(v.speed*dt,length),nx=dx/length*speed,nz=dz/length*speed;
      const pos=moveOnGround(v.root.position,nx,nz,.35);
      const progress=Math.hypot(pos.x-v.x,pos.z-v.z);
      if(progress<speed*.15)v.stuck+=dt;else v.stuck=0;
      if(v.stuck>2.5){
        // Don't stand permanently at blocked corners if scenery changes.
        v.index=(v.index+1)%v.route.path.length;v.stuck=0;v.wait=.5;
      }
      v.x=pos.x;v.z=pos.z;v.root.position.set(v.x,pos.y,v.z);
      v.root.rotation.y=Math.atan2(-dx,-dz);
      v.legPhase+=progress*9;
      for(let j=0;j<2;j++){
        v.legs[j].rotation.x=Math.sin(v.legPhase+j*Math.PI)*.45;
        v.arms[j].rotation.x=-Math.sin(v.legPhase+j*Math.PI)*.32;
      }
      // Give the hero room if they stand directly in a pedestrian's way.
      if(player&&Math.hypot(v.x-player.x,v.z-player.z)<.85){
        v.wait=Math.max(v.wait,.24);
      }
    }
    for(let i=0;i<attendants.length;i++){
      const npc=attendants[i];
      npc.arms[0].rotation.x=Math.sin(time*.9+i)*.065;
      npc.arms[1].rotation.x=-npc.arms[0].rotation.x;
    }
  }
  function nearby(x,z){
    let nearest=null,dist=2.7;
    for(const v of villagers){
      const d=Math.hypot(x-v.x,z-v.z);
      if(d<dist){nearest=v;dist=d;}
    }
    return nearest?{type:'citizen',id:nearest.name,label:nearest.name,role:nearest.role,line:nearest.route.line,distance:dist}:null;
  }
  return {update:step,nearby,count:villagers.length,staff:attendants.length,
    snapshot:()=>villagers.map(v=>({name:v.name,x:v.x,z:v.z}))};
}
