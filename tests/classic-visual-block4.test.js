import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CLASSIC_CREATURE_TYPES,CLASSIC_CREATURE_POSES,CREATURE_PALETTE,
 classicCreaturePose} from '../src/classic-enemy-art.js';
import {classicProjectileArtKind,CLASSIC_PROJECTILE_VIEW_LIMIT,createClassicProjectileView}
 from '../src/classic-projectile-view.js';

test('every supported species has an independent silhouette palette and a finite reusable pose vocabulary',()=>{
 assert.deepEqual(CLASSIC_CREATURE_TYPES,['mossling','boar','keeper','guardian']);
 assert.equal(new Set(Object.values(CREATURE_PALETTE).map(p=>p.base)).size,4);
 assert.equal(CLASSIC_CREATURE_POSES.length,6);
 for(const species of CLASSIC_CREATURE_TYPES){
  assert.match(CREATURE_PALETTE[species].edge,/^#[0-9a-f]{6}$/i);
  assert.match(CREATURE_PALETTE[species].eye,/^#[0-9a-f]{6}$/i);
 }
});

test('creature visual poses are selected only from authoritative motion, hit, warning, release and death flags',()=>{
 assert.equal(classicCreaturePose(),'idle');
 assert.equal(classicCreaturePose({moving:true,time:.1}),'idle');
 assert.equal(classicCreaturePose({moving:true,time:.2}),'stride');
 assert.equal(classicCreaturePose({moving:true,reducedMotion:true,time:12}),'stride');
 assert.equal(classicCreaturePose({warning:true}),'brace');
 assert.equal(classicCreaturePose({releasing:true,warning:true}),'lunge');
 assert.equal(classicCreaturePose({hit:true,warning:true,releasing:true}),'hurt');
 assert.equal(classicCreaturePose({dying:true,hit:true,releasing:true}),'fall');
 for(let t=0;t<20;t+=.14)
  assert.ok(CLASSIC_CREATURE_POSES.includes(classicCreaturePose({moving:true,time:t})));
});

test('projectile art uses the real spell identity and a strict shared geometry pool',()=>{
 assert.equal(classicProjectileArtKind({style:'ranged'}),'arrow');
 assert.equal(classicProjectileArtKind({style:'ranged',effect:'piercing-arrow'}),'piercing');
 assert.equal(classicProjectileArtKind({style:'magic',effect:'ice-shard',family:'ember'}),'ice-shard');
 assert.equal(classicProjectileArtKind({style:'magic',family:'ember'}),'ember');
 assert.equal(classicProjectileArtKind({style:'magic',name:'Arcane Bolt'}),'arcane');
 assert.equal(classicProjectileArtKind({style:'magic',family:'frost'}),'frost');
 const scene=new THREE.Scene(),view=createClassicProjectileView(scene);
 const shot=(style,family,effect,name)=>({style,family,effect,name,x:2,z:3,direction:{x:1,z:0}});
 const shots=[shot('ranged','','piercing-arrow','Focus Shot'),shot('magic','ember','','Firebolt'),
  shot('magic','frost','','Arcane Bolt'),shot('magic','frost','ice-shard','Ice Shard')];
 view.update(shots,.5);
 assert.equal(view.stats().allocated,shots.length);
 assert.deepEqual(view.stats().visualKinds,['piercing','ember','arcane','ice-shard']);
 assert.equal(scene.children.length,shots.length);
 assert.equal(scene.children[0].children.find(x=>x.geometry?.type==='RingGeometry').visible,false);
 assert.equal(scene.children[1].children.find(x=>x.geometry?.type==='RingGeometry').visible,true);
 view.update(Array.from({length:CLASSIC_PROJECTILE_VIEW_LIMIT+11},()=>shots[1]),1);
 assert.equal(view.stats().allocated,CLASSIC_PROJECTILE_VIEW_LIMIT);
 assert.equal(view.stats().visible,CLASSIC_PROJECTILE_VIEW_LIMIT);
 view.update([],5);
 assert.equal(view.stats().visible,0);
 view.dispose();assert.equal(scene.children.length,0);
});

test('reduced motion remains readable without animated projectile rotation or glow pulse',()=>{
 const scene=new THREE.Scene(),view=createClassicProjectileView(scene,{reducedMotion:true});
 view.update([{style:'magic',family:'ember',name:'Firebolt',x:0,z:0,direction:{x:1,z:0}}],3);
 const group=scene.children[0],shard=group.children.find(x=>x.geometry?.type==='OctahedronGeometry');
 assert.equal(shard.rotation.y,0);
 assert.equal(group.children.find(x=>x.geometry?.type==='RingGeometry').scale.x,1);
 view.dispose();assert.equal(scene.children.length,0);
});
