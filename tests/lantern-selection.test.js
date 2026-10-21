import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPracticalLightIndices} from '../src/visual-fidelity.js';

test('nearby lanterns are returned in stable nearest-first order',()=>{
 const locations=[[0,0],[4,0],[-4,0],[9,9],[6,0]];
 const buffer=new Int32Array(2);
 assert.equal(selectPracticalLightIndices(locations,4.5,0,buffer),buffer);
 assert.deepEqual(Array.from(buffer),[1,4]);
 selectPracticalLightIndices(locations,0,0,buffer);
 assert.deepEqual(Array.from(buffer),[0,1],'equal-distance ties preserve array ordering');
});

test('selection respects fixed 14m radius and clears stale entries on travel',()=>{
 const locations=[[0,0],[50,50],[100,100]];
 const indices=new Int32Array(2);
 selectPracticalLightIndices(locations,0,0,indices);
 assert.deepEqual(Array.from(indices),[0,-1]);
 selectPracticalLightIndices(locations,14,0,indices);
 assert.deepEqual(Array.from(indices),[-1,-1],'exact cutoff excludes boundary lantern');
 selectPracticalLightIndices(locations,49,49,indices);
 assert.deepEqual(Array.from(indices),[1,-1]);
});

test('many candidates reuse the exact same output buffer with closest two',()=>{
 const locations=Array.from({length:500},(_,i)=>[i,0]);
 const buffer=new Int32Array(2);
 for(let i=0;i<200;i++){
  assert.equal(selectPracticalLightIndices(locations,48.3,0,buffer),buffer);
  assert.deepEqual(Array.from(buffer),[48,49]);
 }
 assert.throws(()=>selectPracticalLightIndices(locations,0,0,[]),RangeError);
});
