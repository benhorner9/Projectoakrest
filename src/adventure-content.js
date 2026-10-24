/** First Adventure content. Coordinates are shared by collision, map and renderer. */
export const ADVENTURE_MATERIALS = Object.freeze({
 'copper-ore':['Copper ore','Smelt with tin at the forge.','token'],
 'tin-ore':['Tin ore','Smelt with copper at the forge.','token'],
 'bronze-bar':['Bronze bar','A useful metal for shields and armour.','token'],
 'reed':['River reed','Pulp for Inscription, or bind into a field ration.','fibre'],
 'frost-scroll':['Frost scroll','One is consumed by every Frostwood spell, including abilities.','scroll'],
 'ember-scroll':['Ember scroll','One is consumed by every Ember spell, including abilities.','scroll'],
 'field-arrows':['Field ammunition','One per ranged attack; Rapid Shot uses three.','arrows'],
 'ration':['Field ration','Restore 35 Health. Eight-second eating recovery.','hide'],
 'ward-seal':['Restoration seal','Repair the old ward at the Hollow entrance.','amulet'],
 'hollow-shard':['Hollow shard','Dropped by the Hollow guardians. Used in improved equipment.','token'],
 'warden-heart':['Warden heart','One per Hollow clear. Forge a lasting equipment improvement.','orb']
});
export const ADVENTURE_MATERIAL_IDS=Object.freeze(Object.keys(ADVENTURE_MATERIALS));
export const QUESTS=Object.freeze([
 {id:'welcome',title:'A Place Behind the Walls',npc:'citizen:guard',intro:'I am Elowen, keeper of the north gate. Three nights ago the old warning bell rang beneath the forest. Before I send you out, learn who will help you return. Visit Mara at the bank, Darrin at the shop, and Alden in the Forester’s Lodge.',objectives:[['visit:service:bank','Meet Mara inside the bank'],['visit:service:store','Meet Darrin inside the shop'],['visit:service:forester','Meet Alden in the lodge']],end:'Now you know the people behind these walls. The bell belonged to our vanished outpost. Rowan can teach you to survive the road there.',coins:20},
 {id:'training',title:'Three Ways to Survive',npc:'adventure:rowan',intro:'The forest does not fight one way. I will issue a sword, bow and staff. Switch styles and land a hit with each on this dummy. Frost spells need frost scrolls; the bow needs field ammunition. Your gear belongs to you once you accept.',objectives:[['hit:melee','Land a Melee hit on the dummy'],['hit:magic','Land a Magic hit on the dummy'],['hit:ranged','Land a Ranged hit on the dummy']],end:'Heavy roots yield to magic. Fragile casters fear arrows. Rushing creatures leave openings for steel. Watch the ground before their attacks.',coins:15},
 {id:'provisions',title:'Made by Your Own Hands',npc:'adventure:smith',intro:'A borrowed blade will not mend itself. Mine copper and tin at the west quarry, cut a softwood log, and make something useful here. A shield, ammunition or spell scrolls will do. Alden provides a forestry axe.',objectives:[['gather:copper-ore','Mine copper at the west quarry'],['gather:tin-ore','Mine tin at the west quarry'],['gather:softwood-logs','Cut a softwood log'],['craft:useful','Craft a shield, ammunition or scrolls']],end:'Those supplies are yours. Keep making them; Darrin pays for excess timber. The broken cart on the north road never reached our forge.',coins:25},
 {id:'road',title:'The Cart That Never Came',npc:'citizen:guard',intro:'A supply cart vanished just beyond the north gate. Examine the broken axle and the tracks by the creek. Read what happened before you decide what to fight.',objectives:[['inspect:cart','Examine the cart in the near woodland'],['inspect:tracks','Follow the tracks beside the creek']],end:'No robbery, then. The driver fled something growing through the earth. Alden once patrolled that forest. Show him what you found.',coins:30},
 {id:'roots',title:'Roots That Listen',npc:'service:forester',intro:'The bell held a ward against something below us. Examine the singing stump in the deep wood. Its guardian is bound to the roots: defeat it, or craft a restoration seal and calm it. Both will expose the same wound.',objectives:[['inspect:stump','Read the signs at the singing stump'],['resolve:guardian','Defeat the Rootbound Guardian or calm it with a seal']],end:'That black sap is not a sickness. It is the old ward leaking. Follow the eastern trail to the abandoned watch. I left a friend there many years ago.',coins:35},
 {id:'outpost',title:'The Last Watch',npc:'adventure:scout',intro:'I am Nessa. I followed the bell here, too. The watch’s journal is torn, but the memorial and its map survived. Read both, then tell me what the keepers were protecting.',objectives:[['inspect:journal','Read the watchkeeper’s journal'],['inspect:memorial','Examine the outpost memorial'],['solve:watch','Tell Nessa why the ward was built']],end:'They were protecting the forest from a wounded guardian, not burying treasure. We must repair its heart. Take that truth back to Elowen.',coins:40},
 {id:'seal',title:'What We Carry Below',npc:'citizen:guard',intro:'We will not send another watch to die. Make a restoration seal, pack three rations and at least twenty arrows or frost scrolls. Inspect the Hollow doorway. These are minimum supplies for a short scouting trip. A full first run can use hundreds of shots or scrolls and many rations: cleared chambers let you return to town and resupply. The seal repairs its outer ward; it will not tame the keeper inside.',objectives:[['prepare:supplies','Bring a seal, 3 rations, and 20 arrows or frost scrolls'],['inspect:entrance','Find the Warden’s Hollow entrance']],end:'Break the roots around each ward, then light it. The keeper reveals a different weakness as its heart cracks. Return when the bell is silent.',coins:20},
 {id:'hollow',title:'The Bell Beneath the Roots',npc:'citizen:guard',intro:'Enter the Hollow, restore its three chamber wards and confront the keeper. Leave by any refuge bell if supplies run low. Fallen adventurers recover here with their belongings; cleared chambers remain cleared until a new expedition.',objectives:[['dungeon:clear','Defeat the Hollow Keeper and restore the heart']],end:'For the first time in years, the woods are quiet. The ward will need tending. Return to the Hollow for shards and hearts, improve your gear, or supply the village with timber.',coins:80}
]);
const target=(id,name,x,z,kind,extra={})=>({id:'adventure:'+id,name,x,z,kind,reach:3.1,clickRadius:2.2,...extra});
export const ADVENTURE_TARGETS=Object.freeze([
 target('rowan','Rowan · combat instructor',4,70,'adventure-npc'),
 target('smith','Brann · village smith',28,58,'adventure-npc'),
 target('scribe','Iona · inscription desk',-19,40,'adventure-npc'),
 target('scout','Nessa · outpost scout',23,150,'adventure-npc'),
 target('forge','Village forge',31,59,'station',{station:'forge'}),
 target('fletch','Fletching bench',-24,49,'station',{station:'fletch'}),
 target('inscribe','Inscription desk',-19,43,'station',{station:'inscribe'}),
 target('cook','Camp kitchen',12,39,'station',{station:'cook'}),
 target('copper','Copper seam',-24,91,'resource',{material:'copper-ore',profession:'mining',seconds:4}),
 target('tin','Tin seam',-31,95,'resource',{material:'tin-ore',profession:'mining',seconds:4}),
 target('reed','Creek reeds',26,106,'resource',{material:'reed',seconds:3}),
 target('reed-north','Upper creek reeds',-12,142,'resource',{material:'reed',seconds:3}),
 target('softwood','Woodland softwood',-20,103,'resource',{material:'softwood-logs',profession:'woodcutting',seconds:1.18}),
 target('cart','Broken supply cart',-8,108,'discovery',{flag:'cart',text:'The axle is split from below. Copper spills over roots that have grown through the road. No sword marks. The driver’s bootprints lead east, away from a wet black trail.'}),
 target('tracks','Creekside tracks',19,117,'discovery',{flag:'tracks',text:'Hoofprints stop at the water. A thin root has curled around each print, as if listening. The black sap points upstream to the deep wood.'}),
 target('stump','Singing stump',-28,135,'discovery',{flag:'stump',text:'A bronze nail still bears the watch’s crest. Every pulse of the roots answers a bell beneath the hill. The Rootbound Guardian waits to the west. A restoration seal may soothe it.'}),
 target('journal','Watchkeeper’s journal',28,159,'discovery',{flag:'journal',text:'Last watch: “We mistook its pain for anger. Bind the roots, keep the water flowing, and leave the heart a way to breathe. Three wards, then the keeper.”'}),
 target('memorial','Outpost memorial',16,163,'discovery',{flag:'memorial',text:'“For those who kept the forest living.” Beneath the names, a map marks the Hollow north of the watch. This was a refuge, never a treasury.'}),
 target('spring','Hidden spring',-39,115,'discovery',{flag:'spring',optional:true,text:'Cool water rises around a carved hand. An old refuge for tired watchkeepers. Rest here outside combat to recover Health.'}),
 target('bells','Lost bellstones',39,143,'discovery',{flag:'bells',optional:true,text:'Three stones hum in different notes. Steel, frost, flight: the watch trained in every discipline. A pouch of usable supplies lies beside them.'}),
 target('entrance','Warden’s Hollow',0,181,'entrance',{flag:'entrance',text:'A cleft beneath a giant dead oak. Three lamps descend into the dark. The outer ward is broken; a restoration seal can reconnect it.'}),
 ...[218,246,274,305].map((z,i)=>target('exit-'+i,'Refuge bell · return to forest',-12,z,'exit')),
 ...[240,268,296].map((z,i)=>target('ward-'+i,['Root ward','Water ward','Echo ward'][i],0,z,'ward',{room:i})),
 target('heart','Keeper’s heartstone',0,321,'heart')
]);
export const ADVENTURE_PATHS=[[[0,78],[0,100],[-8,108],[19,117],[23,150],[0,181]],[[0,86],[-24,91],[-31,95],[-20,103]],[[-8,108],[-28,135],[-12,142],[23,150]],[[23,150],[28,159],[16,163],[0,181]],[[19,117],[26,106]],[[0,212],[0,324]]];
export const ADVENTURE_REGIONS=[{name:'Gate meadows',x:0,z:87},{name:'Alderwood',x:0,z:110},{name:'Whispering wood',x:-22,z:137},{name:'The Last Watch',x:24,z:157},{name:'Warden’s Hollow',x:0,z:181}];
export const DUNGEON_ROOMS=[{name:'The Root Vestibule',minZ:210,maxZ:241},{name:'The Drowned Archive',minZ:241,maxZ:269},{name:'The Broken Watch',minZ:269,maxZ:297},{name:'The Heart Chamber',minZ:297,maxZ:329}];
export const ADVENTURE_WALLS=[{x:0,z:200,w:106,d:2},
 {x:-17,z:269,w:1,d:120},{x:17,z:269,w:1,d:120},{x:0,z:210,w:34,d:1},{x:0,z:329,w:34,d:1},
 ...[241,269,297].flatMap(z=>[{x:-10,z,w:14,d:1},{x:10,z,w:14,d:1}]),
 {x:26,z:166,w:15,d:.9},{x:34,z:159,w:.9,d:14}];
export const ADVENTURE_TREES=Array.from({length:68},(_,i)=>({x:-47+(i%9)*11+(Math.floor(i/9)%2)*2,z:103+Math.floor(i/9)*11,r:.65})).filter(t=>
 !ADVENTURE_TARGETS.some(p=>Math.hypot(t.x-p.x,t.z-p.z)<4)&&
 !ADVENTURE_PATHS.some(path=>path.slice(1).some((b,i)=>{const a=path[i],dx=b[0]-a[0],dz=b[1]-a[1],f=Math.max(0,Math.min(1,((t.x-a[0])*dx+(t.z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(t.x-a[0]-f*dx,t.z-a[1]-f*dz)<4;})));
export function adventureSolidAt(x,z,r=.38){
 return ADVENTURE_TARGETS.some(t=>['station','resource','ward','heart','discovery'].includes(t.kind)&&Math.hypot(x-t.x,z-t.z)<(t.kind==='station'?.8:.45)+r)||ADVENTURE_WALLS.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)||ADVENTURE_TREES.some(t=>Math.hypot(t.x-x,t.z-z)<t.r+r);
}
const mob=(id,name,type,x,z,maxHp,level,weak,extra={})=>({id,name,type,x,z,maxHp,level,weak,adventure:true,...extra});
export const ADVENTURE_SPAWNS=[
 mob('sapling-a','Brambleling','mossling',-12,119,90,3,'melee'),
 mob('sapling-b','Brambleling','mossling',9,108,90,3,'melee'),
 mob('tusk','Root-tusk Boar','boar',28,125,145,5,'ranged'),
 mob('guardian','Rootbound Guardian','boar',-39,137,220,6,'magic'),
 mob('poacher','Hollow Poacher','bandit',30,142,170,6,'melee'),
 mob('acolyte','Sap Acolyte','bandit',-7,162,160,6,'ranged',{pattern:{kind:'pounce',engage:12,radius:2,windup:1.2,cooldown:4,damage:13}}),
 ...[[-7,228],[7,233]].map(([x,z],i)=>mob('hollow-root-'+i,'Root Sentry','mossling',x,z,190,5,'melee',{room:0})),
 ...[[-8,254],[8,259]].map(([x,z],i)=>mob('hollow-sap-'+i,'Drowned Scribe','bandit',x,z,210,6,'ranged',{room:1,pattern:{kind:'pounce',engage:12,radius:2.4,windup:1.3,cooldown:4,damage:15}})),
 mob('hollow-elite','The Last Watchman','bandit',0,284,460,8,'magic',{room:2,elite:true,pattern:{kind:'cleave',engage:4,radius:4,halfAngle:.9,windup:1.2,cooldown:3.8,damage:22}}),
 mob('hollow-keeper','The Hollow Keeper','boar',0,314,1050,9,'magic',{room:3,boss:true})
];
const recipe=(id,title,station,profession,level,cost,result,xp=18)=>({id,title,station,profession,level,cost,result,xp,seconds:3});
export const RECIPES=[
 recipe('bar','Smelt bronze bar','forge','blacksmithing',1,{'copper-ore':1,'tin-ore':1},{material:'bronze-bar',amount:1}),
 recipe('shield','Forge recruit shield','forge','blacksmithing',1,{'bronze-bar':2,'softwood-logs':1},{slot:'recruit-shield'}),
 recipe('sword','Forge iron longsword','forge','blacksmithing',1,{'bronze-bar':3},{weapon:'sword',style:'melee'}),
 recipe('mail','Forge recruit mail','forge','blacksmithing',3,{'bronze-bar':5},{armour:'starter-mail'},40),
 recipe('helm','Forge recruit helm','forge','blacksmithing',2,{'bronze-bar':3},{slot:'recruit-helm'},30),
 recipe('arrows','Fletch 30 field ammunition','fletch','fletching',1,{'softwood-logs':1},{material:'field-arrows',amount:30}),
 recipe('bow','Shape oak longbow','fletch','fletching',1,{'softwood-logs':4,'reed':2},{weapon:'bow',style:'ranged'},30),
 recipe('frost','Inscribe 30 frost scrolls','inscribe','inscription',1,{'reed':2,'softwood-logs':1},{material:'frost-scroll',amount:30}),
 recipe('ember','Inscribe 30 ember scrolls','inscribe','inscription',1,{'reed':2,'moss-fibre':1},{material:'ember-scroll',amount:30}),
 recipe('seal','Inscribe restoration seal','inscribe','inscription',1,{'reed':2,'bronze-bar':1},{material:'ward-seal',amount:1},25),
 recipe('rations','Prepare 3 field rations','cook',null,1,{'reed':2},{material:'ration',amount:3},0),
 recipe('forged','Forge strengthened longsword','forge','blacksmithing',4,{'bronze-bar':6,'hollow-shard':4,'warden-heart':1},{weapon:'forged_sword',style:'melee'},60),
 recipe('reinforced','Reinforce longbow','fletch','fletching',4,{'softwood-logs':6,'hollow-shard':4,'warden-heart':1},{weapon:'reinforced_bow',style:'ranged'},60),
 recipe('runic','Bind runic frost staff','inscribe','inscription',4,{'reed':6,'hollow-shard':4,'warden-heart':1},{weapon:'runic_frost',style:'magic'},60)
];
export function sanitizeAdventure(raw){
 const n=v=>Number.isSafeInteger(v)?Math.max(0,Math.min(200000000,v)):0;
 const index=Math.min(8,n(raw?.index));
 const allowed=new Set(QUESTS.flatMap(q=>q.objectives.map(o=>o[0])));
 return {version:1,autoSave:raw?.autoSave===true,index,accepted:raw?.accepted===true&&index<8,
  flags:[...new Set((Array.isArray(raw?.flags)?raw.flags:[]).filter(f=>allowed.has(f)))],
  discoveries:[...new Set((Array.isArray(raw?.discoveries)?raw.discoveries:[]).filter(f=>['spring','bells'].includes(f)))],
  skills:Object.fromEntries(['mining','blacksmithing','fletching','inscription'].map(s=>[s,n(raw?.skills?.[s])])),
  clears:n(raw?.clears),contracts:n(raw?.contracts),deaths:n(raw?.deaths),
  run:raw?.run&&typeof raw.run==='object'?{
   kills:[...new Set((Array.isArray(raw.run.kills)?raw.run.kills:[]).filter(id=>ADVENTURE_SPAWNS.some(m=>m.room!==undefined&&m.id===id)))],
   wards:[...new Set((Array.isArray(raw.run.wards)?raw.run.wards:[]).filter(i=>[0,1,2].includes(i)))],
   complete:raw.run.complete===true,seconds:Number.isFinite(raw.run.seconds)?Math.max(0,Math.min(86400,raw.run.seconds)):0}:null};
}
