import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STYLE_ORDER,ARMOUR,LOADOUTS,starterInventory,awardTrainingGear,ownsWeapon,ownsArmour,defaultSave,validSave,xpToLevel,skillMilestones} from '../src/rules.js';
const toXp=level=>Array.from({length:level-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
test('new character inventory contains only starter items, not all gear',()=>{
 const d=defaultSave();assert.deepEqual(d.inventory,starterInventory());
 assert.deepEqual(d.inventory.weapons.melee,['sword']);assert.deepEqual(d.inventory.armour,['traveller']);assert.equal(ownsWeapon(d,'magic','ember'),false);
});
test('XP milestones award equipment and migrate existing saves idempotently',()=>{
 const d=validSave({xp:{melee:toXp(9),vitality:toXp(6)},gear:{melee:'honed_daggers'},armour:{melee:'plate'}});
 assert.ok(ownsWeapon(d,'melee','honed_daggers'));assert.ok(ownsArmour(d,'plate'));
 assert.equal(d.gear.melee,'honed_daggers');assert.equal(d.armour.melee,'plate');
 const before=JSON.stringify(d.inventory);awardTrainingGear(d);assert.equal(JSON.stringify(d.inventory),before);
});
test('inventory inputs are sanitized and cannot add unknown items',()=>{
 const d=validSave({inventory:{weapons:{melee:['fakeItem','sword']},armour:['exploit','traveller']}});
 assert.equal(ownsWeapon(d,'melee','fakeItem'),false);assert.equal(ownsArmour(d,'exploit'),false);
});
test('milestone roadmap reflects level requirements for all skills',()=>{
 for(const style of STYLE_ORDER){
  const road=skillMilestones(style);assert.ok(road.some(x=>x.type==='Learn'));assert.ok(road.some(x=>x.type==='Wield'));
  assert.ok(road.every((x,i)=>i===0||road[i-1].level<=x.level));
  assert.ok(road.find(x=>x.name===LOADOUTS[style][Object.keys(LOADOUTS[style])[0]].title));
 }
 const vitality=skillMilestones('vitality');
 for(const armour of Object.values(ARMOUR))assert.ok(vitality.some(a=>a.name===armour.title&&a.level===armour.requiredVitality));
});
test('one character menu contains non-combat features and combat controls stay accessible',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const footer=html.slice(html.indexOf('<footer class="combatbar">'),html.indexOf('</footer>'));
 assert.ok(!footer.includes('id="progression-panel"'),'menu is no longer nested inside the combat bar');
 assert.ok(html.includes('id="menu-backdrop"'));
 assert.ok(html.includes('id="loadout-button"'));
 for(const label of ['EQUIPMENT','INVENTORY','SKILLS','ABILITIES','QUESTS','WORLD MAP','SETTINGS'])
  assert.ok(html.includes('>'+label+'</button>'),label);
 assert.ok(html.includes('id="skill-detail"'));
 for(const id of ['touch-attack','touch-swap','touch-dodge','skills','styles'])assert.ok(html.includes('id="'+id+'"'));
 const css=readFileSync(new URL('../src/minimal-hud.css',import.meta.url),'utf8');
 assert.ok(css.includes('.oak-menu-open'));
 assert.ok(css.includes('.oak-menu-backdrop'));
});
