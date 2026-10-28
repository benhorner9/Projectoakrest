/** Reproducible balance evidence using the actual fixed-step Classic simulation.
 * Isolated real enemies, same starting distance, signature ability on cooldown,
 * no dodging, rations at a 35 HP deficit, tonic at a 55 HP deficit. Travel,
 * gathering, player skill and multi-enemy pressure are NOT modelled. */
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {defaultSave,xpToLevel,STYLE_ORDER} from '../src/rules.js';
import {createClassicCombat,CLASSIC_ENEMY_SPAWNS} from '../src/classic-combat.js';
import {ADVENTURE_SPAWNS,RECIPES} from '../src/adventure-content.js';
import {slideMove} from '../src/classic-presentation.js';
export const xpAtLevel=level=>Array.from({length:level-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
export function sampleFight({style,level=1,upgraded=false,enemy,seed=1,abilities=true}){
 const data=defaultSave(),weapon=upgraded?{melee:'forged_sword',magic:'runic_frost',ranged:'reinforced_bow'}[style]:{melee:'sword',magic:'frost',ranged:'bow'}[style];
 for(const key of [...STYLE_ORDER,'vitality'])data.xp[key]=xpAtLevel(level);
 data.inventory.weapons[style]=[weapon];data.gear[style]=weapon;
 data.inventory.materials={'field-arrows':9999,'frost-scroll':9999,ration:9999,'woodland-tonic':9999};
 const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 // Relocate a single definition to a common clear arena, without dungeon gates.
 const {room,...definition}=enemy;
 const c=createClassicCombat({save:data,adventure:true,random,monsterDefinitions:[{...definition,x:-30,z:85}]});
 let player={x:-30,z:83},state=c.getState(),damage=0,landed=0,misses=0,dead=false,won=false;
 c.styleSwitch(style);c.tick(.2,player);c.chooseTarget(enemy.id,player);
 for(let step=0;step<6000&&!dead&&!won;step++){
  state=c.getState();const target=state.monsters[0];
  if(!state.targetId)c.chooseTarget(enemy.id,player);
  // Follow only enough to keep the equipped weapon in range; no kiting/dodge.
  const dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
  if(d>state.reach-.4)player=slideMove(player,dx/Math.max(d,.01)*.4,dz/Math.max(d,.01)*.4);
  if(state.maxHp-state.hp>=35)c.itemAction({type:'use',id:'material.ration'},player);
  if(state.maxHp-state.hp>=55)c.itemAction({type:'use',id:'material.woodland-tonic'},player);
  if(abilities&&state.abilities[0]?.available&&!state.action&&!state.queuedAbility)c.queueAbility(0,player);
  for(const e of c.tick(.1,player)){
   if(e.type==='hurt')damage+=e.damage;
   if(e.type==='hit')landed++;
   if(e.type==='miss')misses++;
   if(e.type==='dead')dead=true;
   if(e.type==='defeated')won=true;
  }
 }
 const final=c.persistentSave();state=c.getState();
 return {won,dead,seconds:+state.time.toFixed(2),xp:final.xp[style]-data.xp[style],vitalityXp:final.xp.vitality-data.xp.vitality,
  ammunition:9999-final.inventory.materials['field-arrows'],scrolls:9999-final.inventory.materials['frost-scroll'],
  rations:9999-final.inventory.materials.ration,tonics:9999-final.inventory.materials['woodland-tonic'],damage,landed,misses};
}
export function measureProgression(samples=40){
 const rows=[];
 const enemies=[CLASSIC_ENEMY_SPAWNS.find(m=>m.type==='mossling'),CLASSIC_ENEMY_SPAWNS.find(m=>m.type==='boar'),
  CLASSIC_ENEMY_SPAWNS.find(m=>m.type==='bandit'),ADVENTURE_SPAWNS.find(m=>m.id==='hollow-keeper')];
 for(const [level,upgraded] of [[1,false],[6,false],[6,true]])for(const enemy of enemies)for(const style of STYLE_ORDER){
  const fights=Array.from({length:samples},(_,i)=>sampleFight({style,level,upgraded,enemy,seed:167000+i}));
  const wins=fights.filter(x=>x.won),avg=key=>wins.length?+(wins.reduce((s,f)=>s+f[key],0)/wins.length).toFixed(2):null;
  const seconds=avg('seconds'),xp=avg('xp');
  rows.push({level,upgraded,enemy:enemy.id,style,samples,wins:wins.length,deaths:fights.filter(f=>f.dead).length,
   seconds,killOnlyXpPerHour:seconds?Math.round(xp*3600/seconds):null,xp,vitalityXp:avg('vitalityXp'),
   ammunition:avg('ammunition'),scrolls:avg('scrolls'),rations:avg('rations'),tonics:avg('tonics'),damage:avg('damage'),
   accuracy:avg('landed')/(avg('landed')+avg('misses'))});
 }
 return {scope:'Isolated fixed-step combat; signature ability; stationary with range correction; automatic food/tonic. XP/hour excludes travel, respawns, gathering and deaths. Conditional win means; failures separately counted. Not a physical-device or natural-player session.',samples,rows,
  recipes:RECIPES.map(({id,cost,result,xp,level,profession})=>({id,cost,result,xp,level,profession}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const samples=Number(process.env.OAKREST_BALANCE_SAMPLES||40);
 if(!Number.isInteger(samples)||samples<1||samples>200)throw Error('Use 1–200 samples');
 const result=measureProgression(samples);
 if(result.rows.some(r=>r.wins===0))throw Error('A scenario produced no wins; inspect the arena/controller before using balance data.');
 const output=process.argv[2];if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 for(const row of result.rows)console.log(JSON.stringify(row));
}
