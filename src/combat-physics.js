/** Spatial queries use normalized segment time [0,1]; no renderer dependency. */
export function segmentSphere(a,b,c,r) {
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const ox=a.x-c.x,oy=a.y-c.y,oz=a.z-c.z;
 const q=ox*ox+oy*oy+oz*oz-r*r;
 if(q<=0)return 0;
 const n=dx*dx+dy*dy+dz*dz;
 if(n<1e-12)return null;
 const h=ox*dx+oy*dy+oz*dz,disc=h*h-n*q;
 if(disc<0)return null;
 const t=(-h-Math.sqrt(disc))/n;
 return t>=0&&t<=1?t:null;
}
export function movingSphereHit(a,b,previous,current,r) {
 return segmentSphere({x:a.x-previous.x,y:a.y-previous.y,z:a.z-previous.z},
  {x:b.x-current.x,y:b.y-current.y,z:b.z-current.z},{x:0,y:0,z:0},r);
}
export function segmentBox(a,b,min,max) {
 let enter=0,exit=1;
 for(const axis of ['x','y','z']){
  const delta=b[axis]-a[axis];
  if(Math.abs(delta)<1e-10){if(a[axis]<min[axis]||a[axis]>max[axis])return null;continue;}
  let lo=(min[axis]-a[axis])/delta,hi=(max[axis]-a[axis])/delta;
  if(lo>hi)[lo,hi]=[hi,lo];
  enter=Math.max(enter,lo);exit=Math.min(exit,hi);
  if(enter>exit)return null;
 }
 return enter;
}
export function segmentCylinder(a,b,c,r,bottom,top){
 const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-c.x,oz=a.z-c.z;
 const n=dx*dx+dz*dz,q=ox*ox+oz*oz-r*r;
 let lo=0,hi=1;
 if(n<1e-12){if(q>0)return null;}
 else {const h=ox*dx+oz*dz,d=h*h-n*q;if(d<0)return null;lo=Math.max(lo,(-h-Math.sqrt(d))/n);hi=Math.min(hi,(-h+Math.sqrt(d))/n);}
 const dy=b.y-a.y;
 if(Math.abs(dy)<1e-10){if(a.y<bottom||a.y>top)return null;}
 else {let v=(bottom-a.y)/dy,w=(top-a.y)/dy;if(v>w)[v,w]=[w,v];lo=Math.max(lo,v);hi=Math.min(hi,w);}
 return lo<=hi?lo:null;
}
export const MELEE_PROFILES={
 sword:{halfAngle:.78,duration:.14,width:.16,multi:true},
 daggers:{halfAngle:.30,duration:.09,width:.12,multi:false},
 greatsword:{halfAngle:1.15,duration:.24,width:.24,multi:true},
 unarmed:{halfAngle:.28,duration:.10,width:.16,multi:false}
};
/** Sweep a radial weapon capsule over its contact window. Targets own hit volumes. */
export function sweptStrikeHit(strike,from,to,previous,current,radius,worldHit=()=>null){
 const p=strike.profile,span=Math.max(0,to-from);
 const steps=Math.max(1,Math.ceil(span*p.halfAngle*2*strike.reach/.08));
 for(let i=0;i<=steps;i++){
  const previousOrigin=strike.previousOrigin||strike.origin,blend=i/steps,origin={x:previousOrigin.x+(strike.origin.x-previousOrigin.x)*blend,y:previousOrigin.y+(strike.origin.y-previousOrigin.y)*blend,z:previousOrigin.z+(strike.origin.z-previousOrigin.z)*blend};
  const f=from+span*i/steps,angle=strike.yaw+(-p.halfAngle+2*p.halfAngle*f)*(strike.reverse?-1:1);
  const tip={x:origin.x+Math.sin(angle)*strike.reach,y:origin.y,z:origin.z-Math.cos(angle)*strike.reach};
  const centre={x:previous.x+(current.x-previous.x)*blend,y:previous.y+(current.y-previous.y)*blend,z:previous.z+(current.z-previous.z)*blend};
  // A forward strike never wraps its capsule behind the wielder.
  if((centre.x-origin.x)*Math.sin(strike.yaw)-(centre.z-origin.z)*Math.cos(strike.yaw)<0)continue;
  const hit=segmentSphere(origin,tip,centre,radius+p.width);
  if(hit===null)continue;
  const wall=worldHit(origin,tip,p.width);
  if(wall===null||hit<wall)return hit;
 }
 return null;
}
export function abilityCooldownKey(style,family,ability){
 return style+'.'+(ability.id.startsWith('s')?'shared':family)+'.'+ability.id;
}
export const DODGE={startup:.035,active:.16,recovery:.125,duration:.32,cooldown:2,distance:4};
export function dodgeInvulnerable(t,start){return Number.isFinite(start)&&t>=start+DODGE.startup&&t<start+DODGE.startup+DODGE.active;}
/** Bounded A*: paths are collision checked, including diagonal corner clearance. */
export function groundPath(start,goal,canTravel,{cell=1,maxNodes=700,within=()=>true}={}){
 if(canTravel(start,goal))return [goal];
 const key=(x,z)=>x+','+z,point=(x,z)=>({x:start.x+x*cell,z:start.z+z*cell});
 const first={x:0,z:0,g:0,f:Math.hypot(goal.x-start.x,goal.z-start.z),parent:null};
 const open=[first],best=new Map([[key(0,0),0]]);
 for(let visited=0;open.length&&visited<maxNodes;visited++){
  let k=0;for(let i=1;i<open.length;i++)if(open[i].f<open[k].f)k=i;
  const node=open.splice(k,1)[0],p=point(node.x,node.z);
  if(node.g>best.get(key(node.x,node.z)))continue;
  if(Math.hypot(p.x-goal.x,p.z-goal.z)<cell*1.5&&canTravel(p,goal)){
   const result=[goal];for(let n=node;n.parent;n=n.parent)result.push(point(n.x,n.z));return result.reverse();
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,z=node.z+dz,q=point(x,z),g=node.g+Math.hypot(dx,dz)*cell,id=key(x,z);
   if(!within(q)||g>=(best.get(id)??Infinity)||!canTravel(p,q))continue;
   if(dx&&dz&&(!canTravel(p,point(x,node.z))||!canTravel(p,point(node.x,z))))continue;
   best.set(id,g);open.push({x,z,g,f:g+Math.hypot(q.x-goal.x,q.z-goal.z),parent:node});
  }
 }
 return [];
}
