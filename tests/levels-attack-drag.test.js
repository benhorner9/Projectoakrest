import test from 'node:test';
import assert from 'node:assert/strict';
import { xpProgress,xpToLevel,SKILLS_OVERVIEW } from '../src/rules.js';
import {CURRENT_SKILL_CAP} from '../src/skill-cap.js';
import { attackDragDelta } from '../src/controls.js';
import { readFileSync } from 'node:fs';
test('all skill XP overview numbers are accurate',()=>{
 const zero=xpProgress(0);assert.equal(zero.level,1);assert.equal(zero.required,xpToLevel(1));assert.equal(zero.needed,xpToLevel(1));
 const part=xpProgress(47);assert.equal(part.current,47);assert.equal(part.needed,xpToLevel(1)-47);
 const second=xpProgress(xpToLevel(1)+13);assert.equal(second.level,2);assert.equal(second.current,13);assert.equal(second.needed,xpToLevel(2)-13);
});
test('maximum skill level does not show a future level',()=>{
 const maximum=xpProgress(99999999);assert.equal(maximum.level,CURRENT_SKILL_CAP);assert.equal(maximum.maxed,true);assert.equal(maximum.needed,0);assert.equal(maximum.progress,1);
});
test('attack-drag ignores small finger jitter and huge pointer jumps',()=>{
 assert.equal(attackDragDelta(.4),0);assert.equal(attackDragDelta(24),24);assert.equal(attackDragDelta(-25),-25);assert.equal(attackDragDelta(900),48);assert.equal(attackDragDelta(-900),-48);assert.equal(attackDragDelta(NaN),0);
});
