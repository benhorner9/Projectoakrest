import test from 'node:test';
import assert from 'node:assert/strict';
import {damp,dampAngle,smoothMotion} from '../src/motion.js';
import {readFileSync} from 'node:fs';
test('smoothing eases to desired speed and stops naturally',()=>{
 let v={x:0,z:0};v=smoothMotion(v,1,0,5,.016);assert.ok(v.x>0&&v.x<5);
 for(let i=0;i<60;i++)v=smoothMotion(v,1,0,5,.016);assert.ok(v.x>4.9);
 const stop=smoothMotion(v,0,0,5,.016);assert.ok(stop.x>0&&stop.x<5);
});
test('damping is frame independent',()=>{
 let a=0,b=0;for(let i=0;i<60;i++)a=damp(a,5,13,1/60);
 for(let i=0;i<30;i++)b=damp(b,5,13,1/30);
 assert.ok(Math.abs(a-b)<.001);
});
test('rotation wraps through shortest angle',()=>{
 const a=dampAngle(3.12,-3.12,18,.016);assert.ok(a>3.12&&a<3.25);
});
