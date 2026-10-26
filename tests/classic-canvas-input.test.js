import test from 'node:test';
import assert from 'node:assert/strict';
import {installClassicCanvasInput} from '../src/classic-canvas-input.js';
function setup(){
 const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
 canvas.getBoundingClientRect=()=>({left:0,top:0,right:900,bottom:700});
 const taps=[],turns=[];let scale=1;
 const control=installClassicCanvasInput(canvas,{tap:(...p)=>taps.push(p),orbit:(...p)=>turns.push(p),
  zoom:n=>{scale=n;},currentZoom:()=>scale});
 const event=(type,id,x,y,extra={})=>canvas.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),
  {pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,...extra}));
 return {event,taps,turns,control,scale:()=>scale};
}
test('single world taps activate once; drags that return to the start do not',()=>{
 const s=setup();s.event('pointerdown',1,100,100);s.event('pointerup',1,100,100);
 assert.deepEqual(s.taps,[[100,100]]);
 s.event('pointerdown',2,100,100);s.event('pointermove',2,180,100);s.event('pointermove',2,100,100);s.event('pointerup',2,100,100);
 assert.equal(s.taps.length,1);assert.equal(s.turns.length,0);
});
test('two canvas fingers rotate, tilt and zoom without issuing a movement tap',()=>{
 const s=setup();s.event('pointerdown',1,100,100);s.event('pointerdown',2,200,100);
 s.event('pointermove',2,240,80);assert.ok(s.turns[0][0]>0);assert.ok(s.turns[0][1]>0);assert.ok(s.scale()>1);
 s.event('pointerup',2,240,80);s.event('pointerup',1,100,100);assert.deepEqual(s.taps,[]);
 s.event('pointerdown',3,120,100);s.event('pointerup',3,120,100);assert.equal(s.taps.length,1);
});
test('pointer cancellation, capture loss and focus reset never complete a tap',()=>{
 for(const type of ['pointercancel','lostpointercapture']){
  const s=setup();s.event('pointerdown',1,100,100);s.event(type,1,100,100);s.event('pointerup',1,100,100);assert.deepEqual(s.taps,[]);
 }
 const s=setup();s.event('pointerdown',1,100,100);s.control.reset();s.event('pointerup',1,100,100);assert.deepEqual(s.taps,[]);
});
test('touches that begin outside the canvas are ignored, as are non-primary mouse buttons',()=>{
 const s=setup();s.event('pointermove',1,100,100);s.event('pointerup',1,100,100);
 s.event('pointerdown',2,100,100,{pointerType:'mouse',button:2});s.event('pointerup',2,100,100,{pointerType:'mouse',button:2});
 assert.deepEqual(s.taps,[]);assert.deepEqual(s.turns,[]);
});
