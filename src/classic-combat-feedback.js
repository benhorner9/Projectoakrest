import * as THREE from 'three';
/** Bounded, event-driven labels. Presentation never changes combat or saves. */
export function createClassicCombatFeedback(root){
 const layer=document.createElement('div');layer.className='classic-damage-layer';
 layer.setAttribute('aria-hidden','true');root.append(layer);
 const labels=[],point=new THREE.Vector3();
 function add(text,position,time,kind){
  if(!position)return;
  if(labels.length>=24)labels.shift().node.remove();
  const node=document.createElement('span');node.className='classic-damage '+kind;
  node.textContent=text;layer.append(node);
  labels.push({node,x:position.x,z:position.z,time});
 }
 return {event(event,state,player){
  if(event.type==='hit')add(String(event.damage),state.monsters.find(m=>m.id===event.id),event.time,'hit');
  if(event.type==='hurt')add('−'+event.damage,player,event.time,'hurt');
  if(event.type==='heal')add('+'+event.amount,player,event.time,'heal');
 },update(time,camera){
  const {width,height}=root.getBoundingClientRect();
  for(let i=labels.length-1;i>=0;i--){
   const label=labels[i],age=time-label.time;
   if(age>=.95){label.node.remove();labels.splice(i,1);continue;}
   point.set(label.x,3.2+age*1.2,label.z).project(camera);
   label.node.hidden=point.z<-1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
   label.node.style.transform=`translate(${(point.x+1)*width/2}px,${(1-point.y)*height/2}px) translate(-50%,-100%)`;
   label.node.style.opacity=String(Math.min(1,(.95-age)*3));
  }
 }};
}
