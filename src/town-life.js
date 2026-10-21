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
  {name:'Nell',role:'Craftswoman',colour:'#647c67',line:'Not all the best equipment is found in a shop.',path:[[5,53],[18,53],[22,54],[22,42],[5,42]]},
  {name:'Orin',role:'Warden courier',colour:'#678d83',line:"The Warden's Hall keeps the peace from the Southgate to the forest.",path:[[-22,75],[-12,75],[-12,69],[-6,69],[-6,76]]},
  {name:'Edda',role:'Garden keeper',colour:'#9d9567',line:'The great oak was here long before the city walls. Its roots shaped the first paths.',path:[[34.5,64],[38,65],[38,69],[37,73],[36,78]]},
  {name:'Crispin',role:'Market porter',colour:'#af8062',line:"Darrin's deliveries usually come through the Southgate.",path:[[19,17],[19,22],[19,31],[23,33]]},
  {name:'Vera',role:'City watch',colour:'#5e8291',line:'The south road is safe until the woodland thins out. Past that, keep watch.',path:[[-37,-7],[-37,3],[-37,19],[-37,34]]},
  {name:'Hettie',role:'Local resident',colour:'#a77d92',line:'Meet your friends at the Heartwood. No one in Oakrest ever gets lost for long.',path:[[4.7,51],[4.7,43],[4.7,34],[4.7,25]]},
  {name:'Joss',role:'Old traveller',colour:'#998068',line:'I still remember when these walls were timber. The square was just a clearing.',path:[[-5.0,75],[-5,63],[-5,52],[-5,47]]}
];
const AMBIENT_STAFF=[
 {name:'Captain Halden',role:'Southgate watch',colour:'#647c8d',x:-13,z:-7,line:'Welcome to Oakrest. There is an open road through the gate, but trouble starts well beyond the greenbelt.'},
 {name:'Seren',role:'Gate sentry',colour:'#687f87',x:13,z:-7,line:'The city gates are always open to peaceful travellers.'},
 {name:'Archivist Fenn',role:'Hall steward',colour:'#917f66',x:-29,z:76,line:"The Heartwood's age is marked in the hall's oldest records."},
 {name:'Gilda',role:'Garden volunteer',colour:'#788f67',x:36,z:72,line:'Please mind the flowerbeds by the Trade House. The Forester trains beginners across town.'}
];
const STAFF={
  bank:{name:'Mara',role:'Banker',colour:'#577b90'},
  store:{name:'Darrin',role:'Shopkeeper',colour:'#a57952'},
  forester:{name:'Alden',role:'Forester',colour:'#61815f'},
  'trade-house':{name:'Tessa',role:'Trade Steward',colour:'#8f6c91'}
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
  const standing=AMBIENT_STAFF.map((c,i)=>{
    const npc=person(scene,c.name,c.role,c.colour,c.x,c.z,true);
    return {...npc,line:c.line,seed:i};
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
      // Full movement stops when the player is far away, but idle gestures
      // still indicate occupation without requiring daily NPC teleportation.
      if(v.wait>0){
        v.wait-=dt;
        v.arms[0].rotation.x=Math.sin(time*.83+i)*.13;
        v.arms[1].rotation.x=-v.arms[0].rotation.x;
        continue;
      }
      let [tx,tz]=v.route.path[v.index];
      const dx=tx-v.x,dz=tz-v.z,length=Math.hypot(dx,dz);
      if(length<.32){
        if(v.index===v.route.path.length-1)v.forward=false;
        else if(v.index===0)v.forward=true;
        v.index+=v.forward?1:-1;v.wait=.8+(i%3)*.55;v.stuck=0;continue;
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
    for(let i=0;i<standing.length;i++){
      const npc=standing[i];npc.arms[0].rotation.x=Math.sin(time*.7+i*2)*.11;
      npc.arms[1].rotation.x=-npc.arms[0].rotation.x;
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
    for(const citizen of standing){
      const d=Math.hypot(x-citizen.x,z-citizen.z);
      if(d<dist){return {type:'citizen',id:citizen.name,label:citizen.name,role:citizen.role,line:citizen.line,distance:d};}
    }
    return nearest?{type:'citizen',id:nearest.name,label:nearest.name,role:nearest.role,line:nearest.route.line,distance:dist}:null;
  }
  return {update:step,nearby,count:villagers.length,staff:attendants.length,ambientStaff:standing.length,
    snapshot:()=>villagers.map(v=>({name:v.name,x:v.x,z:v.z}))};
}
