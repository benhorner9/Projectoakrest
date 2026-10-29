import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_LIMITS} from '../src/classic-presentation.js';
import {CLASSIC_PERIMETER} from '../src/classic-town-plan.js';
import {ADVENTURE_TARGETS,ADVENTURE_SPAWNS,DUNGEON_ROOMS} from '../src/adventure-content.js';
import {CLASSIC_OVERWORLD_SPAWNS} from '../src/classic-world-spawns.js';
import {CLASSIC_MAP_FEATURES,fullMapWorld,fullMapTransform} from '../src/classic-minimap.js';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {CLASSIC_WORLD_ZONES,CLASSIC_WORLD_ENTITIES,worldAtlasSnapshot,
 worldZoneAt,findWorldZone,worldZoneEntities,worldZoneReference,
 worldZoneBlueprint,worldZoneBrief,validateWorldAtlas} from '../src/classic-world-atlas.js';

test('existing world is indexed by stable immutable, contiguous, nonoverlapping zone IDs',()=>{
 assert.deepEqual(validateWorldAtlas(),{zones:10,entities:CLASSIC_WORLD_ENTITIES.length});
 assert.equal(worldAtlasSnapshot().schemaVersion,1);
 assert.equal(worldAtlasSnapshot().mode,'read-only');
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.minX,CLASSIC_LIMITS.minX);
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.maxX,CLASSIC_LIMITS.maxX);
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.minZ,CLASSIC_LIMITS.minZ);
 assert.equal(CLASSIC_WORLD_ZONES[0].bounds.maxZ,CLASSIC_PERIMETER.north);
 assert.equal(CLASSIC_MAP_FEATURES.zones,CLASSIC_WORLD_ZONES,
  'world map must use same exact named zone registry');
 for(const zone of CLASSIC_WORLD_ZONES)for(const peer of zone.links){
  assert.ok(findWorldZone(peer)?.links.includes(zone.id),'links are bidirectional');
 }
 assert.equal(Object.isFrozen(CLASSIC_WORLD_ZONES),true);
 assert.equal(CLASSIC_WORLD_ZONES.some(z=>/boar farm/i.test(z.name)),false,
  'do not show a farm whose world/collision/content has not been implemented');
});

test('area selection resolves real village, wilderness and all four dungeon rooms',()=>{
 assert.equal(worldZoneAt({x:0,z:39})?.id,'OAK-VL-001');
 assert.equal(worldZoneAt({x:0,z:91})?.id,'OAK-WD-001');
 assert.equal(worldZoneAt({x:-20,z:108})?.id,'OAK-WD-002');
 assert.equal(worldZoneAt({x:-28,z:137})?.id,'OAK-WD-003');
 assert.equal(worldZoneAt({x:23,z:159})?.id,'OAK-WD-004');
 assert.equal(worldZoneAt({x:0,z:181})?.id,'OAK-WD-005');
 for(let i=0;i<DUNGEON_ROOMS.length;i++){
  const r=DUNGEON_ROOMS[i];
  assert.equal(worldZoneAt({x:0,z:(r.minZ+r.maxZ)/2})?.id,'OAK-DG-00'+(i+1));
 }
 assert.equal(worldZoneAt({x:-20,z:300}),null,'unwalkable space beyond dungeon walls has no fictional room');
 for(const point of [null,{x:NaN,z:3},{x:1,z:Infinity},{x:100,z:10}])assert.equal(worldZoneAt(point),null);
});

test('each legacy live service, story target, ordinary mob and dungeon enemy keeps its exact position and ID',()=>{
 for(const target of ADVENTURE_TARGETS){
  const entity=CLASSIC_WORLD_ENTITIES.find(e=>e.id===target.id);
  assert.ok(entity,'missing target '+target.id);
  assert.deepEqual([entity.x,entity.z],[target.x,target.z]);
  assert.equal(worldZoneEntities(worldZoneAt(target).id).includes(entity),true);
 }
 for(const mob of [...CLASSIC_OVERWORLD_SPAWNS,...ADVENTURE_SPAWNS]){
  const e=CLASSIC_WORLD_ENTITIES.find(x=>x.id==='spawn:'+mob.id);
  assert.deepEqual([e?.x,e?.z],[mob.x,mob.z],mob.id);
 }
 const boar=CLASSIC_OVERWORLD_SPAWNS.find(s=>s.id==='boar-a');
 assert.deepEqual([boar.x,boar.z],[1,91],'B2 must not silently move story-adjacent boar into an unbuilt farm');
 assert.equal(worldZoneAt(boar)?.id,'OAK-WD-001');
 const bank=CLASSIC_WORLD_ENTITIES.find(e=>e.id==='service:bank');
 assert.ok(bank);
 assert.equal(worldZoneAt(bank)?.id,'OAK-VL-001');
});

test('copyable brief and JSON blueprint expose grounded names/IDs, with no editable/publish route',()=>{
 const id='OAK-WD-002',json=worldZoneBlueprint(id),brief=worldZoneBrief(id);
 assert.equal(json.schemaVersion,1);
 assert.equal(json.mode,'reference-only');
 assert.equal(json.editable,false);
 assert.deepEqual(json.zone.connectedZoneIds,['OAK-WD-001','OAK-WD-003']);
 assert.ok(json.entities.some(e=>e.id==='adventure:cart'));
 assert.ok(json.entities.some(e=>e.id==='adventure:softwood'));
 assert.match(brief,/OAK-WD-002/);
 assert.match(brief,/adventure:cart/);
 assert.match(brief,/OAK-WD-001/);
 assert.match(worldZoneReference(id),/Alderwood \[OAK-WD-002\]/);
 assert.equal(worldZoneBlueprint('OAK-WD-999'),null);
 assert.equal(worldZoneBrief('OAK-WD-999'),'No named zone selected.');
 assert.deepEqual(JSON.parse(JSON.stringify(json)),json);
});

test('atlas never writes gameplay save keys, character XP or map/navigation bounds',()=>{
 const original=freshCharacterSave(),raw=JSON.stringify(original);
 for(const zone of CLASSIC_WORLD_ZONES){worldZoneBrief(zone.id);worldZoneBlueprint(zone.id);}
 assert.equal(JSON.stringify(original),raw);
 assert.deepEqual(validSave(JSON.parse(raw)).xp,original.xp);
 for(const [w,h] of [[440,510],[320,380]]){
  const t=fullMapTransform(w,h);
  const point={x:0,z:39};
  assert.ok(Math.hypot(fullMapWorld({x:t.x+(point.x-CLASSIC_LIMITS.minX)*t.scale,
   y:t.y+(CLASSIC_LIMITS.maxZ-point.z)*t.scale},w,h).x-point.x)<1e-8);
 }
});

test('malformed future zone drafts are rejected before anybody can publish them',()=>{
 const zone=CLASSIC_WORLD_ZONES[0];
 assert.throws(()=>validateWorldAtlas([...CLASSIC_WORLD_ZONES,zone]),/duplicate zone ID/);
 assert.throws(()=>validateWorldAtlas([...CLASSIC_WORLD_ZONES,{...zone,id:'OAK-VL-999'}]),/Overlapping zones/);
 assert.throws(()=>validateWorldAtlas([...CLASSIC_WORLD_ZONES,{...zone,id:'OAK-VL-999',bounds:{...zone.bounds,maxX:999}}]),/Invalid world bounds/);
 assert.throws(()=>validateWorldAtlas(CLASSIC_WORLD_ZONES,[...CLASSIC_WORLD_ENTITIES,CLASSIC_WORLD_ENTITIES[0]]),/Duplicate entity ID/);
 assert.throws(()=>validateWorldAtlas(CLASSIC_WORLD_ZONES,[...CLASSIC_WORLD_ENTITIES,{id:'fake:spawn',x:900,z:900}]),/outside the atlas/);
});
