import test from 'node:test';
import assert from 'node:assert/strict';
import {adventureWorkLabel} from '../src/adventure-ui.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {findClassicInteractable} from '../src/classic-interactions.js';
import {freshCharacterSave} from '../src/rules.js';

test('Woodcutting shows a stop action but never predicts the next log time',()=>{
 const work={name:'softwood-logs',skill:'woodcutting',start:10,end:11.5};
 assert.equal(adventureWorkLabel(work,10),'Chopping wood · tap to stop');
 assert.equal(adventureWorkLabel(work,11.49),'Chopping wood · tap to stop');
 assert.equal(adventureWorkLabel(null,10),'');
 assert.equal(adventureWorkLabel({name:'copper-ore',skill:'mining',end:12},10),'copper-ore · 2.0s · tap to cancel');
});

test('Chopping still uses authoritative axe, reward, depletion and repeat rules',()=>{
 const d=freshCharacterSave();
 d.professions.woodcuttingLearned=true;
 if(!d.inventory.weapons.melee.includes('bronze-axe'))d.inventory.weapons.melee.push('bronze-axe');
 const c=createClassicCombat({save:d,adventure:true,random:()=>.15});
 const t=findClassicInteractable('grove:pine-west');
 const player={x:t.x,z:t.z-1.6};
 const start=c.adventureAction('gather',{target:t},player);
 assert.equal(start.ok,true,start.reason);
 const work=c.adventureState().work;
 assert.equal(work.skill,'woodcutting');
 assert.ok(work.end-work.start>.8&&work.end-work.start<2,'first attempt is randomized');
 for(let i=0;i<140;i++)c.tick(.1,player);
 const saved=c.persistentSave();
 assert.ok((saved.inventory.materials['softwood-logs']||0)>=1);
 assert.ok(saved.professions.woodcuttingXp>0);
 assert.equal(c.adventureState().work,null,'continuous chopping stops when the tree falls');
 assert.ok(c.adventureState().trees.some(x=>x.id===t.id&&x.respawnAt>0));
});
