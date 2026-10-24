import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_CAMERA,CLASSIC_NPCS,solidAt,occupantBuilding,slideMove,
 findClassicPath,spriteDirection,presentationSnapshot,inBounds} from '../src/classic-presentation.js';
import {defaultSave,STYLE_ORDER,LOADOUTS,validSave} from '../src/rules.js';

test('2.5D camera and sprite direction are deterministic and bounded',()=>{
 assert.ok(CLASSIC_CAMERA.elevation>0);
 assert.ok(CLASSIC_CAMERA.offsetZ<0,'camera is south of the +Z-north world axis');
 const len=Math.hypot(CLASSIC_CAMERA.offsetX,CLASSIC_CAMERA.offsetZ);
 const gameUpWorld={x:-CLASSIC_CAMERA.offsetX/len,z:-CLASSIC_CAMERA.offsetZ/len};
 assert.ok(gameUpWorld.z>.85,'up on screen moves substantially north on map');
 assert.ok(CLASSIC_CAMERA.minZoom<1 && CLASSIC_CAMERA.maxZoom>1);
 assert.equal(spriteDirection(1,1),spriteDirection(2,2));
 const dirs=new Set();
 for(let a=0;a<360;a+=15)dirs.add(spriteDirection(Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)));
 assert.equal(dirs.size,8,'all eight sprite directions accessible');
});

test('canonical buildings keep solid walls but real walkable door openings',()=>{
 assert.equal(occupantBuilding(-30,14)?.id,'bank');
 assert.equal(solidAt(-23,14),false,'bank doorway facing east');
 assert.equal(solidAt(-24,17),true,'bank facade away from doorway');
 assert.equal(solidAt(-36,14),true,'bank back wall');
 assert.equal(solidAt(-30,14),false,'interior floor is traversable');
 assert.equal(inBounds(-500,14),false);
});

test('direct movement slides along facade and enters through matching doorway',()=>{
 const start={x:-20,z:17};
 const blocked=slideMove(start,-5,0);
 assert.ok(blocked.x>-23.5,'cannot phase through closed wall');
 const opening=slideMove({x:-20,z:14},-5,0);
 assert.ok(opening.x<-24,'front doorway admits the player');
});

test('tap route reaches bank interior without crossing solid walls',()=>{
 const start={x:0,z:30},target={x:-30,z:14};
 const path=findClassicPath(start,target);
 assert.ok(path.length>0,'pathfinding finds a route around the bank');
 let pos=start;
 for(const node of path){
  const dist=Math.hypot(node.x-pos.x,node.z-pos.z);
  const steps=Math.ceil(dist/.2);
  for(let i=1;i<=steps;i++){
   const p={x:pos.x+(node.x-pos.x)*i/steps,z:pos.z+(node.z-pos.z)*i/steps};
   assert.equal(solidAt(p.x,p.z),false,'route segments cannot cross any wall');
  }
  pos=node;
 }
 assert.ok(Math.hypot(pos.x-target.x,pos.z-target.z)<2.5);
});

test('NPC landmarks use consistent world coordinates',()=>{
 assert.ok(CLASSIC_NPCS.some(n=>n.id==='banker'&&occupantBuilding(n.x,n.z)?.id==='bank'));
 assert.ok(CLASSIC_NPCS.some(n=>n.id==='shopkeeper'&&occupantBuilding(n.x,n.z)?.id==='store'));
 assert.equal(new Set(CLASSIC_NPCS.map(n=>n.id)).size,CLASSIC_NPCS.length);
});

test('presentation snapshot is read-only and preserves three saved equipment presets',()=>{
 const original=defaultSave();
 original.equipment.melee.helm='recruit-helm';
 original.equipment.magic.ring='apprentice-ring';
 original.equipment.ranged.arrows='bronze-arrows';
 const string=JSON.stringify(original);
 for(const style of STYLE_ORDER){
  const view=presentationSnapshot(original,style,{x:-30,z:14});
  assert.equal(view.style,style);
  assert.equal(view.weaponName,LOADOUTS[style][original.gear[style]].title);
  assert.equal(view.worn.weapon,original.gear[style]);
  assert.equal(view.indoors,'bank');
 }
 assert.equal(presentationSnapshot(original,'melee',{x:0,z:39}).worn.helm,'recruit-helm');
 assert.equal(presentationSnapshot(original,'magic',{x:0,z:39}).worn.ring,'apprentice-ring');
 assert.equal(presentationSnapshot(original,'ranged',{x:0,z:39}).worn.arrows,'bronze-arrows');
 assert.equal(JSON.stringify(original),string,'snapshot may not mutate a persistent save');
 assert.deepEqual(validSave(JSON.parse(string)),validSave(original));
});
