import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {IMPACT_LIMIT,IMPACT_LIFETIME,combatImpactKind,combatImpactScale,
 combatImpactPosition,hitRecoilStrength,createClassicCombatImpacts} from '../src/classic-combat-impacts.js';

test('combat effects listen only to actual combat outcomes, without changing simulation state',()=>{
 const state={monsters:[{id:'moss',x:4,z:9,hp:10}]},player={x:1,z:2};
 assert.equal(combatImpactKind({type:'hit'}),'hit');
 assert.equal(combatImpactKind({type:'hurt'}),'hurt');
 assert.equal(combatImpactKind({type:'windup'}),null);
 assert.equal(combatImpactPosition({type:'hit',id:'moss'},state,player),state.monsters[0]);
 assert.equal(combatImpactPosition({type:'hurt'},state,player),player);
 assert.equal(combatImpactPosition({type:'hit',id:'gone'},state,player),null);
 assert.equal(combatImpactScale(-1),.75);
 assert.equal(hitRecoilStrength(1,1),0);
 assert.ok(hitRecoilStrength(1,.91)>.99);
 assert.equal(hitRecoilStrength(1,.5),0);
 assert.ok(combatImpactScale(250)<=1.35);
});

test('impact mesh budget is bounded, expires, and reduces motion on request',()=>{
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();
 const state={monsters:[{id:'moss',x:4,z:9}]},player={x:1,z:2};
 const effect=createClassicCombatImpacts(scene);
 assert.equal(scene.children.length,2);
 assert.ok(scene.children.every(child=>child.isInstancedMesh&&child.count===0));
 for(let i=0;i<IMPACT_LIMIT+6;i++)
  assert.equal(effect.onEvent({type:'hit',time:i*.01,id:'moss',damage:7,style:'melee'},state,player),true);
 effect.update(.17,camera);
 assert.equal(effect.active(),IMPACT_LIMIT);
 assert.deepEqual(scene.children.map(mesh=>mesh.count),[IMPACT_LIMIT,IMPACT_LIMIT*4]);
 effect.update(.17+IMPACT_LIFETIME+.01,camera);
 assert.equal(effect.active(),0);
 assert.deepEqual(scene.children.map(mesh=>mesh.count),[0,0]);
 effect.dispose();assert.equal(scene.children.length,0);
 const quiet=createClassicCombatImpacts(scene,{reducedMotion:true});
 assert.equal(quiet.onEvent({type:'hurt',time:0,damage:9},state,player),false);
 quiet.update(.1,camera);assert.equal(quiet.active(),0);
 quiet.dispose();assert.equal(scene.children.length,0);
});
