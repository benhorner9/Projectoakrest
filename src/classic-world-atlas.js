/** Oakrest Classic named-zone atlas.
 * Read-only indexing over the EXACT coordinates used by gameplay. This does
 * not move any spawn, alter collision, add a quest, or mutate character saves.
 * Zone IDs never encode a name or coordinate and must survive later renames.
 */
import {CLASSIC_LIMITS,CLASSIC_NPCS} from './classic-presentation.js';
import {CLASSIC_PERIMETER,CLASSIC_DISTRICTS} from './classic-town-plan.js';
import {OAKREST_BUILDINGS,OAKREST_WELL} from './town-layout.js';
import {CLASSIC_INTERACTABLES} from './classic-interactions.js';
import {CLASSIC_OVERWORLD_SPAWNS} from './classic-world-spawns.js';
import {ADVENTURE_SPAWNS,DUNGEON_ROOMS,ADVENTURE_PATHS} from './adventure-content.js';

export const WORLD_ATLAS_SCHEMA=1;
const lock=o=>Object.freeze(o);
const area=(id,name,description,minZ,maxZ,{minX=CLASSIC_LIMITS.minX,maxX=CLASSIC_LIMITS.maxX,biome='woodland',safe=false,links=[]}={})=>
 lock({id,name,description,region:'Oakrest Valley',biome,safe,
  bounds:lock({minX,maxX,minZ,maxZ}),links:lock([...links])});

/** Existing geography only. The new Bracken Boar Farm is intentionally NOT
 * registered until its physical content/collision/spawns are implemented.
 * A zone boundary is cartographic; it never silently adds a solid wall.
 */
export const CLASSIC_WORLD_ZONES=lock([
 area('OAK-VL-001','Oakrest Village','Walled starting settlement, market, services and southern outskirts.',
  CLASSIC_LIMITS.minZ,CLASSIC_PERIMETER.north,{biome:'settlement',safe:true,links:['OAK-WD-001']}),
 area('OAK-WD-001','Gate meadows','The real woodland-gate approach, quarry seams and nearby enemies.',
  CLASSIC_PERIMETER.north,105,{biome:'meadow',links:['OAK-VL-001','OAK-WD-002']}),
 area('OAK-WD-002','Alderwood','Creek, softwood grove and broken supply-cart trail.',
  105,130,{links:['OAK-WD-001','OAK-WD-003']}),
 area('OAK-WD-003','Whispering wood','Black roots and the guardian of the singing stump.',
  130,150,{links:['OAK-WD-002','OAK-WD-004']}),
 area('OAK-WD-004','The Last Watch','Abandoned watch, scout camp, memorial and ruined journal.',
  150,174,{links:['OAK-WD-003','OAK-WD-005']}),
 area('OAK-WD-005','Hollow approach','The existing trail to the sealed entrance of Warden’s Hollow.',
  174,DUNGEON_ROOMS[0].minZ,{links:['OAK-WD-004','OAK-DG-001']}),
 ...DUNGEON_ROOMS.map((room,i)=>area('OAK-DG-00'+(i+1),room.name,
  'Chamber '+(i+1)+' of the existing Warden’s Hollow expedition.',room.minZ,room.maxZ,{
   minX:-17,maxX:17,biome:'dungeon',
   links:[i===0?'OAK-WD-005':'OAK-DG-00'+i,...(i<3?['OAK-DG-00'+(i+2)]:[])]
  }))
]);
const byId=new Map(CLASSIC_WORLD_ZONES.map(zone=>[zone.id,zone]));
export function findWorldZone(id){return byId.get(id)||null;}
export function worldZoneAt(point){
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return null;
 return CLASSIC_WORLD_ZONES.find(zone=>
  point.x>=zone.bounds.minX&&point.x<=zone.bounds.maxX&&
  point.z>=zone.bounds.minZ&&(point.z<zone.bounds.maxZ||
   zone.id==='OAK-DG-004'&&point.z===zone.bounds.maxZ))||null;
}
const asEntity=(id,name,type,at,extra={})=>lock({
 id,name,type,x:at.x,z:at.z,...extra
});
/** Expose the actual registered service, NPC, interactable, gate, town
 * building, dungeon and ordinary monster IDs; no invented locations.
 * Procedural decoration trees are deliberately not called landmarks.
 */
export const CLASSIC_WORLD_ENTITIES=lock([
 ...OAKREST_BUILDINGS.map(b=>asEntity('building:'+b.id,
  CLASSIC_INTERACTABLES.find(x=>x.id==='service:'+b.id)?.place||
  b.id.replaceAll('-',' '),'building',b,{sourceId:b.id})),
 asEntity('landmark:well','Heartwood well','landmark',OAKREST_WELL),
 ...CLASSIC_DISTRICTS.map(d=>asEntity('district:'+d.id,d.name,'district',d)),
 ...CLASSIC_PERIMETER.gates.map(g=>asEntity('gate:'+g.id,g.name,'gate',g)),
 ...CLASSIC_INTERACTABLES.map(t=>asEntity(t.id,t.name,'interaction',t,{sourceId:t.id,kind:t.kind})),
 ...CLASSIC_NPCS.map(n=>asEntity('npc:'+n.id,n.name,'npc',n,{
  sourceId:n.targetId||n.id,role:n.role})),
 ...CLASSIC_OVERWORLD_SPAWNS.map(m=>asEntity('spawn:'+m.id,m.id,'enemy',m,{sourceId:m.id,creature:m.type})),
 ...ADVENTURE_SPAWNS.map(m=>asEntity('spawn:'+m.id,m.name,'enemy',m,{sourceId:m.id,creature:m.type}))
]);
export function worldZoneEntities(id){
 const zone=findWorldZone(id);
 if(!zone)return [];
 return CLASSIC_WORLD_ENTITIES.filter(entity=>worldZoneAt(entity)?.id===zone.id);
}
export function worldAtlasSnapshot(){
 return {schemaVersion:WORLD_ATLAS_SCHEMA,mode:'read-only',
  worldBounds:{...CLASSIC_LIMITS},zones:CLASSIC_WORLD_ZONES,
  sourcePaths:ADVENTURE_PATHS.length};
}
export function worldZoneReference(id){
 const zone=findWorldZone(id);
 return zone?zone.name+' ['+zone.id+']':'Unknown Oakrest zone';
}
export function worldZoneBlueprint(id){
 const zone=findWorldZone(id);
 if(!zone)return null;
 return {
  schemaVersion:WORLD_ATLAS_SCHEMA,mode:'reference-only',editable:false,
  world:'Oakrest Classic',zone:{
   id:zone.id,name:zone.name,region:zone.region,description:zone.description,
   biome:zone.biome,safe:zone.safe,bounds:{...zone.bounds},
   connectedZoneIds:[...zone.links]
  },
  entities:worldZoneEntities(id).map(({id,name,type,x,z,sourceId,kind,role,creature})=>({
   id,name,type,x,z,...(sourceId?{sourceId}:{}),
   ...(kind?{kind}:{}),...(role?{role}:{}),...(creature?{creature}:{})
  }))
 };
}
export function worldZoneBrief(id){
 const plan=worldZoneBlueprint(id);
 if(!plan)return 'No named zone selected.';
 const {zone,entities}=plan,b=zone.bounds;
 const byType=type=>entities.filter(e=>e.type===type);
 const line=(type,label)=>label+': '+(byType(type).map(e=>e.name+' ['+e.id+'] ('+e.x+', '+e.z+')').join('; ')||'none');
 return [
  'OAKREST CLASSIC — AREA REFERENCE (READ-ONLY)',
  'Zone: '+zone.name+' ['+zone.id+']',
  'Region: '+zone.region+' | '+zone.biome+' | '+(zone.safe?'safe town':'adventure area'),
  zone.description,
  'Bounds (x,z): '+b.minX+'..'+b.maxX+', '+b.minZ+'..'+b.maxZ,
  'Connected zones: '+(zone.connectedZoneIds.map(worldZoneReference).join('; ')||'none'),
  line('gate','Gates'),line('building','Buildings'),line('interaction','Interactables'),
  line('npc','NPCs'),line('enemy','Enemy spawns'),
  'Instructions: describe desired changes using the zone/entity IDs. This reference does not change the live game.',
  'Publishing requires reviewed source changes, tests and a separate dev-only deployment.'
 ].join('\n');
}
/** Throwing validator for CI and future owner draft imports; no silent fallback
 * to invalid/overlapping zones, duplicate IDs or fictional entity positions.
 */
export function validateWorldAtlas(zones=CLASSIC_WORLD_ZONES,entities=CLASSIC_WORLD_ENTITIES){
 const seen=new Set();
 for(const z of zones){
  if(!/^OAK-(VL|WD|DG)-\d{3}$/.test(z.id)||seen.has(z.id))throw Error('Invalid/duplicate zone ID: '+z.id);
  seen.add(z.id);
  const b=z.bounds;
  if(![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||
   b.minX>=b.maxX||b.minZ>=b.maxZ||b.minX<CLASSIC_LIMITS.minX||
   b.maxX>CLASSIC_LIMITS.maxX||b.minZ<CLASSIC_LIMITS.minZ||b.maxZ>CLASSIC_LIMITS.maxZ)
   throw Error('Invalid world bounds: '+z.id);
  for(const link of z.links){
   const next=zones.find(x=>x.id===link);
   if(!next||link===z.id||!next.links.includes(z.id))throw Error('Invalid zone link: '+z.id+' → '+link);
  }
 }
 for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
  const a=zones[i].bounds,b=zones[j].bounds;
  if(Math.min(a.maxX,b.maxX)>Math.max(a.minX,b.minX)&&
     Math.min(a.maxZ,b.maxZ)>Math.max(a.minZ,b.minZ))
   throw Error('Overlapping zones: '+zones[i].id+', '+zones[j].id);
 }
 const ids=new Set();
 for(const e of entities){
  if(!e.id||ids.has(e.id))throw Error('Duplicate entity ID: '+e.id);
  ids.add(e.id);
  if(!Number.isFinite(e.x)||!Number.isFinite(e.z)||!zones.some(z=>
    e.x>=z.bounds.minX&&e.x<=z.bounds.maxX&&
    e.z>=z.bounds.minZ&&e.z<=z.bounds.maxZ))
   throw Error('Entity outside the atlas: '+e.id);
 }
 return {zones:zones.length,entities:entities.length};
}
