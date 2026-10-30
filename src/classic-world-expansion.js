/**
 * Oakrest regional expansion — canonical coordinates shared by map, physical
 * roads, collision, world atlas and (supported) combat/skilling content.
 * Illustrative map is a guide, not a screenshot, asset or separate game mode.
 * Existing Oakrest village and the Warden's Hollow expedition stay in place.
 */
import {smoothOutdoorTrail} from './classic-outdoor-trails.js';
const freezeList=list=>Object.freeze(list.map(x=>Object.freeze(x)));
export const REGIONAL_BOUNDS=Object.freeze({minX:-385,maxX:385,minZ:-280,maxZ:505});
export const REGIONAL_HUBS=freezeList([
 {id:'oakrest',name:'Oakrest City',kind:'city',x:0,z:39,biome:'heartland',existing:true,description:'The original walled capital and starting settlement.'},
 {id:'ironhold',name:'Ironhold',kind:'city',x:-290,z:235,biome:'highlands',description:'A fortified mining city beneath the grey peaks.'},
 {id:'seabreach',name:'Seabreach',kind:'city',x:-285,z:-210,biome:'coast',description:'The western harbour and timber trading port.'},
 {id:'sunmere',name:'Sunmere',kind:'city',x:285,z:-210,biome:'coast',description:'A sunlit trading city on the southern coast.'},
 {id:'frostgate',name:'Frostgate',kind:'city',x:280,z:445,biome:'snow',description:'The northern mountain bastion.'},
 {id:'brambleford',name:'Brambleford',kind:'town',x:-175,z:10,biome:'forest',description:'A woodland town on the old merchant trail.'},
 {id:'willowfen',name:'Willowfen',kind:'town',x:175,z:10,biome:'marsh',description:'A town overlooking the reed marshes.'},
 {id:'redbrook',name:'Redbrook',kind:'town',x:195,z:250,biome:'river',description:'A crossing town along the northern trade route.'},
 {id:'fenstead',name:'Fenstead Farm',kind:'farm',x:-150,z:-145,biome:'farmland',description:'The western grain and livestock fields.'},
 {id:'goldenfield',name:'Goldenfield Farm',kind:'farm',x:90,z:-145,biome:'farmland',description:'Broad crops and orchards above the southern plains.'}
]);
const byId=new Map(REGIONAL_HUBS.map(h=>[h.id,h]));
/* Roads terminate at canonical town centres and pass through REAL capital gates.
 * The named edge and its sampled geometry are one source for 2D and Three.js.
 */
const edge=(a,b,via=[])=>{
 const first=byId.get(a),last=byId.get(b);
 if(!first||!last)throw Error('Unknown world road endpoint');
 const knots=[[first.x,first.z],...via,[last.x,last.z]];
 const points=Object.freeze(smoothOutdoorTrail(knots).map(p=>Object.freeze(p)));
 const start=first.existing?Math.max(0,points.findIndex(p=>Math.hypot(p[0]-first.x,p[1]-first.z)>=46)):0;
 return Object.freeze({id:a+'--'+b,from:a,to:b,
  knots:Object.freeze(knots.map(p=>Object.freeze(p))),points,
  displayPoints:Object.freeze(points.slice(start))});
};
export const REGIONAL_ROADS=Object.freeze([
 edge('oakrest','brambleford',[[-46,39],[-95,38],[-130,20]]),
 edge('oakrest','willowfen',[[46,39],[98,42],[135,24]]),
 edge('oakrest','fenstead',[[0,-16],[-32,-65],[-88,-110]]),
 edge('oakrest','goldenfield',[[0,-16],[15,-65],[57,-115]]),
 edge('brambleford','ironhold',[[-205,82],[-236,153],[-264,207]]),
 edge('brambleford','seabreach',[[-207,-50],[-254,-136]]),
 edge('brambleford','fenstead',[[-177,-54],[-167,-103]]),
 edge('fenstead','seabreach',[[-213,-158],[-252,-186]]),
 edge('fenstead','goldenfield',[[-76,-171],[-12,-182],[38,-159]]),
 edge('goldenfield','sunmere',[[160,-155],[218,-181]]),
 edge('willowfen','sunmere',[[219,-55],[257,-126]]),
 edge('willowfen','redbrook',[[184,95],[204,169]]),
 edge('redbrook','frostgate',[[218,326],[251,389]]),
 edge('ironhold','frostgate',[[-235,328],[-140,377],[-64,395],[55,405],[180,429]]),
 edge('redbrook','sunmere',[[292,183],[316,73],[327,-85],[310,-167]])
]);
export const REGIONAL_CAMPS=freezeList([
 {id:'goblin-encampment',name:'Goblin Encampment',x:-152,z:183,biome:'forest',species:'goblin',live:false,description:'Future goblin opponents; scenery only for now.'},
 {id:'wolf-den',name:'Wolf Den',x:-59,z:380,biome:'highlands',species:'wolf',live:false,description:'Future wolf opponents; scenery only for now.'},
 {id:'bandit-camp',name:'Bandit Camp',x:-73,z:-229,biome:'coast',species:'bandit',live:true,description:'Working bandit encounters near the southern road.'},
 {id:'spider-nest',name:'Spider Nest',x:335,z:64,biome:'marsh',species:'spider',live:false,description:'Future spiders; scenery only for now.'},
 {id:'skeleton-ruins',name:'Skeleton Ruins',x:125,z:361,biome:'highlands',species:'skeleton',live:false,description:'Future skeletal enemies; scenery only for now.'},
 {id:'blackmarsh',name:'Blackmarsh Creatures',x:318,z:174,biome:'marsh',species:'swamp',live:false,description:'Future swamp creatures; scenery only for now.'},
 {id:'boar-grounds',name:'Boar Grounds',x:222,z:-132,biome:'grassland',species:'boar',live:true,description:'Working wild boar encounters in their own territory.'},
 {id:'mossling-grove',name:'Mossling Grove',x:-304,z:55,biome:'forest',species:'mossling',live:true,description:'Working mossling encounters in the western woods.'}
]);
/** Visual destination names also distinguish live gathering from planned skills.
 * Only the targets supplied in REGIONAL_RESOURCE_TARGETS are harvestable.
 */
export const REGIONAL_GATHERING=freezeList([
 {id:'ironhold-mine',name:'Ironhold Mountain Mine',x:-330,z:283,skill:'mining',live:true,biome:'highlands'},
 {id:'elderwood',name:'Eldertree Forest',x:-306,z:-48,skill:'woodcutting',live:true,biome:'forest'},
 {id:'silverlake',name:'Silverlake Fishing',x:62,z:345,skill:'fishing',live:false,biome:'lake'},
 {id:'blackmarsh-reeds',name:'Blackmarsh Foraging',x:310,z:106,skill:'foraging',live:true,biome:'marsh'},
 {id:'eastwind-hunting',name:'Eastwind Hunting Grounds',x:78,z:-239,skill:'hunting',live:false,biome:'grassland'},
 {id:'willowfen-herbs',name:'Willowfen Herb Beds',x:274,z:42,skill:'herbalism',live:false,biome:'marsh'},
 {id:'fenstead-fields',name:'Fenstead Fields',x:-150,z:-145,skill:'farming',live:false,biome:'farmland'},
 {id:'goldenfield-fields',name:'Goldenfield Fields',x:90,z:-145,skill:'farming',live:false,biome:'farmland'}
]);
const resource=(id,name,x,z,material,profession,seconds)=>Object.freeze({
 id:'adventure:'+id,name,x,z,kind:'resource',reach:3.1,clickRadius:2.2,material,profession,seconds
});
export const REGIONAL_RESOURCE_TARGETS=Object.freeze([
 resource('ironhold-copper','Ironhold copper seam',-334,285,'copper-ore','mining',4),
 resource('ironhold-tin','Ironhold tin seam',-326,281,'tin-ore','mining',4),
 resource('elderwood-softwood','Eldertree softwood',-309,-46,'softwood-logs','woodcutting',1.18),
 resource('blackmarsh-reeds','Blackmarsh river reeds',310,105,'reed','foraging',3)
]);
export const REGIONAL_ENCOUNTERS=Object.freeze(REGIONAL_CAMPS.filter(c=>c.live).flatMap(c=>
 [-1,1].map((side,i)=>Object.freeze({id:'region-'+c.id+'-'+i,
  type:c.species,name:c.species==='mossling'?'Grove Mossling':c.species==='boar'?'Eastwind Boar':'Coastal Bandit',
  x:c.x+side*4,z:c.z+(i?2:-2),maxHp:c.species==='mossling'?65:c.species==='boar'?115:160,
  habitat:'region-'+c.id}))));
export const REGIONAL_HABITATS=Object.freeze(Object.fromEntries(REGIONAL_CAMPS.filter(c=>c.live).map(c=>[
 'region-'+c.id,Object.freeze({name:c.name,minX:c.x-16,maxX:c.x+16,minZ:c.z-14,maxZ:c.z+14,colour:'#74694d'})
])));
const sqr=n=>n*n;
export const distanceToPolyline=(point,polyline)=>polyline.slice(1).reduce((best,b,i)=>{
 const a=polyline[i],dx=b[0]-a[0],dz=b[1]-a[1];
 const t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/Math.max(.0001,sqr(dx)+sqr(dz))));
 return Math.min(best,Math.hypot(point.x-a[0]-dx*t,point.z-a[1]-dz*t));
},Infinity);
/** Shared physical footprints: new houses are closed shells, not fake shops.
 * Wide central streets remain free and existing capital remains untouched.
 */
export const REGIONAL_BUILDINGS=Object.freeze(REGIONAL_HUBS.filter(h=>!h.existing).flatMap(h=>{
 const count=h.kind==='city'?12:h.kind==='town'?7:3;
 return Array.from({length:count},(_,i)=>{
  const side=i%2===0?-1:1,row=Math.floor(i/2),spacing=h.kind==='farm'?15:14;
  const x=h.x+side*(h.kind==='farm'?14:19),z=h.z+(row-Math.floor((count-1)/4))*spacing;
  const w=h.kind==='farm'?9:10,d=h.kind==='farm'?8:9;
  return Object.freeze({id:h.id+'-house-'+i,hub:h.id,x,z,w,d,roof:i%3});
 }).filter(b=>!REGIONAL_ROADS.some(road=>distanceToPolyline(b,road.points)<Math.max(b.w,b.d)*.5+4.5));
}));
/** Trees are real, finite colliders, with exclusions near town squares, roads,
 * gathering targets and hostile spawns. Deterministic between sessions.
 */
const groves=[
 {x:-295,z:0,rx:92,rz:75,count:50},{x:-175,z:115,rx:62,rz:55,count:22},
 {x:280,z:115,rx:65,rz:63,count:25},{x:230,z:405,rx:68,rz:51,count:18}
];
export const REGIONAL_TREES=Object.freeze(groves.flatMap((g,gi)=>
 Array.from({length:g.count},(_,i)=>{
  const a=(i*2.399963+gi)*1.7,r=Math.sqrt((i+.5)/g.count);
  return {x:g.x+Math.cos(a)*r*g.rx,z:g.z+Math.sin(a)*r*g.rz,r:.77};
 }).filter(p=>p.x>REGIONAL_BOUNDS.minX+3&&p.x<REGIONAL_BOUNDS.maxX-3&&
 p.z>REGIONAL_BOUNDS.minZ+3&&p.z<REGIONAL_BOUNDS.maxZ-3&&
 !REGIONAL_ROADS.some(road=>distanceToPolyline(p,road.points)<7)&&
 !REGIONAL_HUBS.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<42)&&
 !REGIONAL_GATHERING.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<8)&&
 !REGIONAL_CAMPS.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<13))).map(Object.freeze));
export const REGIONAL_CAMP_TENTS=Object.freeze(REGIONAL_CAMPS.flatMap(c=>
 Array.from({length:3},(_,i)=>{
  const angle=i*2.09;
  return Object.freeze({camp:c.id,id:c.id+'-tent-'+i,
   x:c.x+Math.cos(angle)*9,z:c.z+Math.sin(angle)*9,r:2.9});
 }).filter(t=>!REGIONAL_ROADS.some(road=>distanceToPolyline(t,road.points)<6.5))));
const regionCircles=Object.freeze([...REGIONAL_TREES,...REGIONAL_CAMP_TENTS]);
const overlap=(x,z,r,b)=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r;
const insideLegacyCore=(x,z)=>x>=-58&&x<=58&&z>=-30&&z<=335;
export function regionalSolidAt(x,z,r=.38){
 // New region obstacles never occupy the preserved old village/dungeon strip.
 if(insideLegacyCore(x,z))return false;
 if(REGIONAL_BUILDINGS.some(b=>overlap(x,z,r,b)))return true;
 return regionCircles.some(t=>sqr(t.x-x)+sqr(t.z-z)<sqr(t.r+r));
}
/** Exact segment against inflated rectangle and circular tree footprints. */
export function regionalLineClear(a,b,r=.38){
 if(!a||!b)return false;
 if(insideLegacyCore(a.x,a.z)&&insideLegacyCore(b.x,b.z))return true;
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const minX=Math.min(a.x,b.x)-r,maxX=Math.max(a.x,b.x)+r;
 const minZ=Math.min(a.z,b.z)-r,maxZ=Math.max(a.z,b.z)+r;
 for(const t of regionCircles){
  if(t.x+t.r<minX||t.x-t.r>maxX||t.z+t.r<minZ||t.z-t.r>maxZ)continue;
  const u=length?Math.max(0,Math.min(1,((t.x-a.x)*dx+(t.z-a.z)*dz)/length)):0;
  if(sqr(a.x+dx*u-t.x)+sqr(a.z+dz*u-t.z)<=sqr(t.r+r))return false;
 }
 for(const box of REGIONAL_BUILDINGS){
  if(box.x+box.w/2<minX||box.x-box.w/2>maxX||box.z+box.d/2<minZ||box.z-box.d/2>maxZ)continue;
  let enter=0,leave=1;
  for(const [o,d,lo,hi] of [[a.x,dx,box.x-box.w/2-r,box.x+box.w/2+r],
   [a.z,dz,box.z-box.d/2-r,box.z+box.d/2+r]]){
   if(Math.abs(d)<1e-12){if(o<lo||o>hi){enter=2;break;}continue;}
   const near=(lo-o)/d,far=(hi-o)/d;
   enter=Math.max(enter,Math.min(near,far));
   leave=Math.min(leave,Math.max(near,far));
  }
  if(enter<=leave)return false;
 }
 return true;
}
export function regionalSafeAt(x,z){
 return REGIONAL_HUBS.some(h=>!h.existing&&Math.hypot(x-h.x,z-h.z)<(h.kind==='city'?35:h.kind==='town'?28:18));
}
export function validateRegionalWorld(){
 const hubs=new Map(REGIONAL_HUBS.map(h=>[h.id,h]));
 if(hubs.size!==10||REGIONAL_HUBS.filter(h=>h.kind==='city').length!==5||
 REGIONAL_HUBS.filter(h=>h.kind==='town').length!==3||
 REGIONAL_HUBS.filter(h=>h.kind==='farm').length!==2)throw Error('Incorrect regional settlement counts');
 const neighbors=new Map([...hubs.keys()].map(id=>[id,new Set()]));
 for(const road of REGIONAL_ROADS){
  if(!hubs.has(road.from)||!hubs.has(road.to)||road.points.length<2)throw Error('Invalid regional road '+road.id);
  neighbors.get(road.from).add(road.to);neighbors.get(road.to).add(road.from);
  const a=hubs.get(road.from),b=hubs.get(road.to);
  if(Math.hypot(road.points[0][0]-a.x,road.points[0][1]-a.z)>1e-6||
     Math.hypot(road.points.at(-1)[0]-b.x,road.points.at(-1)[1]-b.z)>1e-6)
    throw Error('Disconnected road endpoint '+road.id);
 }
 const seen=new Set(['oakrest']),todo=['oakrest'];
 while(todo.length)for(const next of neighbors.get(todo.shift()))if(!seen.has(next)){seen.add(next);todo.push(next);}
 if(seen.size!==hubs.size)throw Error('Regional road graph disconnected');
 for(const obj of [...REGIONAL_HUBS,...REGIONAL_CAMPS,...REGIONAL_GATHERING,...REGIONAL_RESOURCE_TARGETS,...REGIONAL_ENCOUNTERS]){
  if(obj.x<REGIONAL_BOUNDS.minX||obj.x>REGIONAL_BOUNDS.maxX||obj.z<REGIONAL_BOUNDS.minZ||obj.z>REGIONAL_BOUNDS.maxZ)throw Error('Point outside world: '+obj.id);
 }
 return {cities:5,towns:3,farms:2,roads:REGIONAL_ROADS.length,camps:REGIONAL_CAMPS.length,
  activeCamps:REGIONAL_CAMPS.filter(c=>c.live).length,gathering:REGIONAL_GATHERING.length};
}
