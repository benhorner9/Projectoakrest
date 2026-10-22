import test from 'node:test';
import assert from 'node:assert/strict';
import {citizenModel,chooseDetailedCitizens,CITIZEN_ART_LIMIT,CITIZEN_ART_LOAD_RADIUS,CITIZEN_ART_RETAIN_RADIUS} from '../src/town-citizen-art-rules.js';

test('role-based KayKit town cosmetics never alter NPC identity or service',()=>{
 for(const role of ['Banker','Shopkeeper','Village courier','Local farmer','Market trader','Forester','Craftswoman'])
  assert.equal(citizenModel(role),'rogue',role);
 for(const role of ['Southgate watch','Gate sentry','Village watch','Warden courier'])
  assert.equal(citizenModel(role),'knight',role);
 for(const role of ['Apprentice','Hall steward','Archivist'])
  assert.equal(citizenModel(role),'mage',role);
 assert.deepEqual([0,1,2,3].map(i=>citizenModel('resident',i)),['rogue','knight','mage','rogue']);
});
test('nearby skinned NPC limit is deterministic and uses retention hysteresis',()=>{
 const citizens=Array.from({length:20},(_,i)=>({x:i*2,z:0,name:'Citizen '+i}));
 const pool=chooseDetailedCitizens(citizens,{x:0,z:0});
 assert.equal(pool.length,CITIZEN_ART_LIMIT);
 assert.equal(pool[0],citizens[0]);
 assert.equal(pool[7],citizens[7]);
 const distant={x:CITIZEN_ART_LOAD_RADIUS+2,z:0,name:'Existing'};
 assert.ok(!chooseDetailedCitizens([distant],{x:0,z:0}).length);
 assert.equal(chooseDetailedCitizens([distant],{x:0,z:0},new Set([distant]))[0],distant);
 distant.x=CITIZEN_ART_RETAIN_RADIUS+1;
 assert.deepEqual(chooseDetailedCitizens([distant],{x:0,z:0},new Set([distant])),[]);
 assert.deepEqual(chooseDetailedCitizens(citizens,null),[]);
 assert.equal(chooseDetailedCitizens(citizens,{x:0,z:0},new Set(),3).length,3);
});
