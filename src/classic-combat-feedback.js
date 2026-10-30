import * as THREE from 'three';
/** Bounded, event-driven labels. Presentation never changes combat or saves. */
export function createClassicCombatFeedback(root){
 const layer=document.createElement('div');layer.className='classic-damage-layer';
 layer.setAttribute('aria-hidden','true');root.append(layer);
 let sequence=0;
 const labels=[],point=new THREE.Vector3();
 function add(text,position,time,kind){
  if(!position)return;
  if(labels.length>=24)labels.shift().node.remove();
  const node=document.createElement('span');node.className='classic-damage '+kind;
  node.textContent=text;layer.append(node);
  const lane=labels.filter(l=>l.x===position.x&&l.z===position.z&&Math.abs(l.time-time)<.35).length;
  labels.push({node,x:position.x,z:position.z,time,kind,lane,side:kind.startsWith('hurt')||kind==='incoming-miss'?-1:1,sequence:sequence++});
 }
 return {event(event,state,player){
  if(event.type==='release'&&event.name)add(event.name,player,event.time,'ability');
  if(event.type==='action-cancelled'&&event.name)add('CANCELLED',player,event.time,'miss');
  if(event.type==='hit')add(String(event.damage)+(event.control?' · '+event.control:''),state.monsters.find(m=>m.id===event.id),event.time,'hit');
  if(event.type==='miss')add('MISS',state.monsters.find(m=>m.id===event.id),event.time,'miss');
  if(event.type==='enemy-miss'||event.type==='enemy-whiff')add('MISS',player,event.time,'incoming-miss');
  if(event.type==='hurt')add((event.guarded?'GUARD ':'')+'−'+event.damage,player,event.time,event.guarded?'hurt guarded':'hurt');
  if(event.type==='heal')add('+'+event.amount,player,event.time,'heal');
  if(event.type==='evade')add('DODGED',player,event.time,'evade');
  if(event.type==='impact'&&event.blocked)add('BLOCKED',event,event.time,'miss');
 },update(time,camera){
  const {width,height}=root.getBoundingClientRect();
  for(let i=labels.length-1;i>=0;i--){
   const label=labels[i],age=time-label.time;
   if(age>=1.35){label.node.remove();labels.splice(i,1);continue;}
   point.set(label.x,(label.kind==='ability'?4.4:3.2)+age*1.2,label.z).project(camera);
   label.node.hidden=point.z<-1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
   label.node.style.transform=`translate(${(point.x+1)*width/2+label.side*(26+label.lane*18)}px,${(1-point.y)*height/2-label.lane*30}px) translate(-50%,-100%)`;
   label.node.style.opacity=String(Math.min(1,(1.35-age)*3));
  }
 }};
}
