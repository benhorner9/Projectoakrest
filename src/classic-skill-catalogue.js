/** Classic skill-book model. Read-only; never mutates player progression.
 * Actual unlocks are derived from weapons, recipes and gather methods.
 */
import {xpProgress,skillMilestones} from './rules.js';
import {woodcuttingProgress,woodcuttingMilestones} from './woodcutting.js';
import {RECIPES} from './adventure-content.js';
export const CLASSIC_SKILLS=Object.freeze([
 {id:'melee',name:'Melee',icon:'⚔',group:'Combat',description:'Close-range weapons, armour and fighting techniques.'},
 {id:'ranged',name:'Ranged',icon:'➶',group:'Combat',description:'Arrows, bows and distance fighting.'},
 {id:'magic',name:'Magic',icon:'✦',group:'Combat',description:'Use staves and spells powered by crafted scrolls.'},
 {id:'vitality',name:'Health',icon:'♥',group:'Combat',description:'Survive harder battles and wear stronger armour.'},
 {id:'woodcutting',name:'Woodcutting',icon:'♧',group:'Gathering',description:'Choose axes, harvest different trees and supply makers.'},
 {id:'mining',name:'Mining',icon:'⛏',group:'Gathering',description:'Collect ores from seams to feed the forge.'},
 {id:'blacksmithing',name:'Blacksmithing',icon:'⚒',group:'Making',description:'Smelt and shape metal at a dedicated forge.'},
 {id:'fletching',name:'Fletching',icon:'➳',group:'Making',description:'Combine timber and reeds in your backpack for ammunition and bows.'},
 {id:'inscription',name:'Inscription',icon:'✧',group:'Making',description:'Make scrolls and ward seals directly from backpack materials.'},
 {id:'cooking',name:'Fieldcraft',icon:'❧',group:'Making',description:'Prepare travel provisions by hand, without a workstation.'}
]);
const unlocked=id=>{
 if(id==='mining')return [
  {level:1,type:'Gather',name:'Copper seams',detail:'Mine copper ore from Oakrest’s quarry'},
  {level:1,type:'Gather',name:'Tin seams',detail:'Mine tin ore from Oakrest’s quarry'}
 ];
 if(id==='woodcutting')return woodcuttingMilestones();
 if(['melee','ranged','magic','vitality'].includes(id))return skillMilestones(id);
 return RECIPES.filter(r=>r.profession===id).map(r=>({
  level:r.level,type:r.station==='forge'?'At the forge':'From your backpack',
  name:r.title,detail:Object.entries(r.cost).map(([item,quantity])=>quantity+' × '+item.replaceAll('-',' ')).join(' + ')
 }));
};
export function skillBookSnapshot(save){
 const skills=save?.adventure?.skills||{};
 return CLASSIC_SKILLS.map(def=>{
  const xp=['melee','ranged','magic','vitality'].includes(def.id)?save?.xp?.[def.id]||0:
   def.id==='woodcutting'?save?.professions?.woodcuttingXp||0:skills[def.id]||0;
  const progression=['melee','ranged','magic','vitality'].includes(def.id)?xpProgress(xp):woodcuttingProgress(xp);
  const milestones=unlocked(def.id).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
  return {...def,...progression,milestones,available:milestones.filter(m=>m.level<=progression.level).length,
   next:milestones.find(m=>m.level>progression.level)||null};
 });
}
