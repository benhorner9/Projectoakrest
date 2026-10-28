import test from 'node:test';
import assert from 'node:assert/strict';
import {findClassicPath,solidAt} from '../src/classic-presentation.js';
import {createClassicNavigation} from '../src/classic-navigation.js';

// Legacy route sample points that landed inside a rear shelf are now intentionally blocked.
// These equivalent reachable samples remain outside the newly solid furniture.
const routes=[
 {start:{x:33.51467255316675,z:80.66817809361964},end:{x:19.108386799693108,z:10.675558201037347}},
 {start:{x:23.61833834834397,z:28.653555908240378},end:{x:-13.645832676440477,z:-9.769098055548966}},
 {start:{x:-23.5,z:-2},end:{x:-25.04135201498866,z:86.86542942654341}},
 {start:{x:7.205559415742755,z:37.16214158106595},end:{x:31.350497715175152,z:.760787664912641}},
 {start:{x:-21.80835640244186,z:17.843970456160605},end:{x:-23,z:74.4918931601569}},
 {start:{x:0,z:39},end:{x:-30,z:14}},
 {start:{x:0,z:39},end:{x:0,z:195}}
];
for(const [i,{start,end}] of routes.entries())test(`route ${i} connects the actual start and destination without clipping scenery`,()=>{
 const path=findClassicPath(start,end);
 assert.ok(path.length,'reachable destination must have a route');
 let previous=start;
 for(const node of path){
  const samples=Math.ceil(Math.hypot(node.x-previous.x,node.z-previous.z)/.025);
  for(let n=1;n<=samples;n++)assert.equal(solidAt(previous.x+(node.x-previous.x)*n/samples,
   previous.z+(node.z-previous.z)*n/samples),false,`collision on segment ${JSON.stringify({previous,node})}`);
  previous=node;
 }
 assert.deepEqual(path.at(-1),end,'path must finish at the exact requested position');
 const nav=createClassicNavigation();assert.equal(nav.moveTo(start,end).ok,true);
 let position=start;
 for(let n=0;n<1800&&nav.state().waypoints.length;n++){
  const result=nav.step(position,{},.1);position=result.position;
  assert.equal(result.failed,null,'valid route must not stall');
  assert.equal(solidAt(position.x,position.z),false,'walking must stay outside scenery');
 }
 assert.ok(Math.hypot(position.x-end.x,position.z-end.z)<.02,'walker reaches destination precisely');
 assert.equal(nav.state().status,'arrived');
});

test('a dungeon separated by a solid boundary does not produce a partial success',()=>{
 const nav=createClassicNavigation();
 assert.equal(nav.moveTo({x:0,z:195},{x:0,z:218}).ok,false);
 assert.equal(nav.state().status,'unreachable');
 assert.deepEqual(nav.state().waypoints,[]);
});

test('new destination replaces an interaction and manual input cancels the replacement',()=>{
 const nav=createClassicNavigation(),start={x:0,z:39};
 assert.equal(nav.interactWith(start,{id:'bank',name:'Bank',x:-30,z:14,reach:3}).ok,true);
 assert.equal(nav.moveTo(start,{x:0,z:43}).ok,true);
 assert.equal(nav.state().pending,null);
 const moved=nav.step(start,{x:0,z:-1},.1);
 assert.ok(moved.position.z<start.z);assert.equal(moved.interaction,null);
 assert.deepEqual(nav.state().waypoints,[]);
});
