import test from 'node:test';
import assert from 'node:assert/strict';
import {approachHeading,nearestCitizen} from '../src/npc-motion.js';

const angularGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('villager rotation follows the shortest turn across PI wrap',()=>{
 const current=Math.PI-.06,target=-Math.PI+.06;
 const next=approachHeading(current,target,.04,8);
 assert.ok(angularGap(next,target)<angularGap(current,target));
 assert.ok(next>current,'yaw should pass the PI boundary without reversing');
 assert.ok(angularGap(current,next)<.08,'smoothing should not snap or spin');
 assert.equal(approachHeading(current,target,0),current);
 assert.equal(approachHeading(current,target,-1),current);
 assert.ok(angularGap(approachHeading(current,target,20),target)<1e-10,'large dt converges without overshoot');
});

test('nearest NPC wins regardless of wandering or standing category',()=>{
 const wanderers=[{name:'Pippa',role:'Gardener',x:1,z:0,route:{line:'fresh market'}}];
 const standing=[{name:'Captain',role:'Guard',x:2,z:0,line:'watch the gate'}];
 assert.deepEqual(nearestCitizen(wanderers,standing,0,0),{
  type:'citizen',id:'Pippa',label:'Pippa',role:'Gardener',line:'fresh market',distance:1
 });
 standing[0].x=.4;
 assert.equal(nearestCitizen(wanderers,standing,0,0).id,'Captain');
 assert.equal(nearestCitizen(wanderers,standing,4,0),null);
});

test('dialogue selection respects radius and handles absent citizens',()=>{
 assert.equal(nearestCitizen([],[],0,0),null);
 const citizens=[{name:'One',role:'Wanderer',x:2.7,z:0,route:{line:'hello'}}];
 assert.equal(nearestCitizen(citizens,[],0,0),null);
 assert.equal(nearestCitizen(citizens,[],.5,0)?.line,'hello');
 assert.ok(Number.isFinite(approachHeading(7,-8,.016)));
});
