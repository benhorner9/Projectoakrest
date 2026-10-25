import test from 'node:test';
import assert from 'node:assert/strict';
import {classicGrip,mirroredDirection} from '../src/classic-sprite-rig.js';
test('weapon handles remain attached to the same hand through every action pose',()=>{
 for(const style of ['melee','ranged','magic'])for(const pose of ['idle','windup','strike'])for(const step of [0,1,2]){
  const {hand,weapon}=classicGrip(style,pose,step);
  assert.equal(weapon.x,hand.x);
  assert.equal(weapon.y+(style==='magic'?35:style==='ranged'?8:26),hand.y);
  assert.ok(hand.y>=70&&hand.y<=95);
 }
});
test('left directions mirror the complete rig without changing equipped items',()=>{
 for(let i=0;i<8;i++){
  const d=mirroredDirection(i);assert.ok(d.dir>=0&&d.dir<=4);assert.equal(d.mirror,i>4);
  if(i>4)assert.equal(d.dir,8-i);
 }
 assert.equal(classicGrip('ranged','windup').bowDraw,10);
 assert.equal(classicGrip('ranged','strike').bowDraw,0);
 assert.equal(classicGrip('magic','strike').cast,true);
});
