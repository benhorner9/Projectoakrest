import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFrameTimes} from '../src/frame-statistics.js';
test('empty or invalid measurements explicitly report insufficient samples',()=>{
 for(const input of [[],[16,17],[0,-1,NaN,Infinity]]){
  const r=summarizeFrameTimes(input);
  assert.equal(r.status,'insufficient-samples');assert.equal(r.sampleCount,0);
  assert.equal(r.meanFPS,null);assert.equal(r.p95FrameMs,null);
  assert.deepEqual(JSON.parse(JSON.stringify(r)),r,'reports cannot silently serialize NaN as null');
 }
});
test('frame spikes survive measurement while warmup is excluded',()=>{
 const r=summarizeFrameTimes([900,900,900,900,900,...Array(99).fill(10),1000]);
 assert.equal(r.status,'sampled');assert.equal(r.sampleCount,100);
 assert.equal(r.meanFrameMs,19.9);assert.equal(r.p95FrameMs,10);
 assert.equal(r.overBudgetFrames,1);assert.equal(r.durationMs,1990);
 const short=summarizeFrameTimes([1,2,3,4,5,300]);assert.equal(short.status,'insufficient-samples');assert.equal(short.meanFrameMs,300);
});
