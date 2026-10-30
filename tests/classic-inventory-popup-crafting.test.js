import test from 'node:test';
import assert from 'node:assert/strict';
import {craftQuantityLimit} from '../src/classic-item-popups.js';
import {RECIPES} from '../src/adventure-content.js';
import {defaultSave} from '../src/rules.js';

test('craft popup calculates count from actual materials and result stack space',()=>{
 const data=defaultSave(),arrows=RECIPES.find(r=>r.id==='arrows');
 data.inventory.materials['softwood-logs']=8;
 assert.equal(craftQuantityLimit(data,arrows),8);
 data.inventory.materials['field-arrows']=9999-60;
 assert.equal(craftQuantityLimit(data,arrows),2);
 data.inventory.materials['field-arrows']=9999;
 assert.equal(craftQuantityLimit(data,arrows),0);
});
test('equipment recipes can only be selected for one unit',()=>{
 const data=defaultSave(),bow=RECIPES.find(r=>r.id==='bow');
 data.inventory.materials['softwood-logs']=99;data.inventory.materials.reed=99;
 assert.equal(craftQuantityLimit(data,bow),1);
 data.inventory.materials.reed=0;
 assert.equal(craftQuantityLimit(data,bow),0);
});
