import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_PATTERNS,isThreatened,combatAim,grantMonsterMaterial,MATERIAL_DROPS} from '../src/combat-feel.js';
import {defaultSave,validSave} from '../src/rules.js';
test('each starter monster uses a distinct announced attack pattern',()=>{
 assert.equal(ENEMY_PATTERNS.mossling.kind,'pounce');
 assert.equal(ENEMY_PATTERNS.boar.kind,'charge');
 assert.equal(ENEMY_PATTERNS.bandit.kind,'cleave');
 for(const s of Object.values(ENEMY_PATTERNS))assert.ok(s.windup>=.5&&s.cooldown>2);
});
test('pounce only hits within the frozen ground warning',()=>{
 const w={x:5,z:0,radius:1.75};
 assert.equal(isThreatened('pounce',w,{x:5.7,z:0}),true);
 assert.equal(isThreatened('pounce',w,{x:8,z:0}),false);
});
test('boar charge lane only hits in front within its width',()=>{
 const w={x:0,z:0,direction:{x:0,z:-1},width:1.2,length:6};
 assert.equal(isThreatened('charge',w,{x:.2,z:-3}),true);
 assert.equal(isThreatened('charge',w,{x:2,z:-3}),false);
 assert.equal(isThreatened('charge',w,{x:0,z:1}),false);
});
test('bandit cleave can be sidestepped and has finite reach',()=>{
 const w={x:0,z:0,direction:{x:0,z:-1},radius:3.25,halfAngle:.69};
 assert.equal(isThreatened('cleave',w,{x:0,z:-2}),true);
 assert.equal(isThreatened('cleave',w,{x:2.6,z:-1}),false);
 assert.equal(isThreatened('cleave',w,{x:0,z:3}),false);
});
test('touch aim assist only considers forward cone and live targets',()=>{
 const list=[{x:2,z:-5,hp:10,dead:false},{x:0,z:-6,hp:10,dead:false},{x:0,z:4,hp:10,dead:false}];
 assert.equal(combatAim({x:0,z:0},{x:0,z:-1},list,20,.24),list[1]);
 assert.equal(combatAim({x:0,z:0},{x:0,z:-1},list,2,.24),null);
 list[1].dead=true;assert.equal(combatAim({x:0,z:0},{x:0,z:-1},list,20,.24),null);
});
test('monster material drops persist and malformed material saves are discarded',()=>{
 const d=defaultSave();
 assert.equal(grantMonsterMaterial(d.inventory,'bandit',0),'Bandit Token');
 assert.equal(grantMonsterMaterial(d.inventory,'mossling',.99),null);
 assert.equal(d.inventory.materials['bandit-token'],1);
 const clean=validSave({inventory:{materials:{'bandit-token':2,'evil':999}}});
 assert.equal(clean.inventory.materials['bandit-token'],2);
 assert.equal(clean.inventory.materials.evil,undefined);
 assert.equal(Object.keys(MATERIAL_DROPS).length,3);
});
