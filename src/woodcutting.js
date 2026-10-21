import {BAG_MIN_SLOTS,inventoryKeyList} from './item-slot-layout.js';

/** Data-driven Woodcutting definitions: no arbitrary item rarity. */
export const TREE_SPECIES=Object.freeze([
 {id:'softwood',name:'Softwood',level:1,xp:35,shape:'round',bark:'#967656',leaves:'#77a364',difficulty:0},
 {id:'pine',name:'Pine',level:10,xp:60,shape:'pine',bark:'#534e3c',leaves:'#38634b',difficulty:1},
 {id:'oak',name:'Oak',level:20,xp:100,shape:'oak',bark:'#675039',leaves:'#497b40',difficulty:2},
 {id:'willow',name:'Willow',level:35,xp:150,shape:'willow',bark:'#918871',leaves:'#9ebc79',difficulty:3},
 {id:'ironbark',name:'Ironbark',level:50,xp:220,shape:'ironbark',bark:'#373b3a',leaves:'#3e5850',difficulty:4},
 {id:'moonwood',name:'Moonwood',level:70,xp:320,shape:'moonwood',bark:'#cbd9cf',leaves:'#8bb7b7',difficulty:5},
 {id:'elderwood',name:'Elderwood',level:85,xp:480,shape:'elderwood',bark:'#5c4d53',leaves:'#a089a2',difficulty:6}
].map(item=>Object.freeze({...item,logId:item.id+'-logs'})));
export const TREE_BY_ID=Object.freeze(Object.fromEntries(TREE_SPECIES.map(tree=>[tree.id,tree])));
export const WOODCUTTING_MATERIALS=Object.freeze(TREE_SPECIES.map(tree=>tree.logId));

export const WOODCUTTING_AXES=Object.freeze([
 ['bronze',1,0,'#be8455',12],
 ['iron',10,1,'#a6afb0',70],
 ['steel',20,2,'#ced5d9',150],
 ['verdite',35,3,'#77ad81',300],
 ['safferite',50,4,'#8db9e1',550],
 ['cobalt',70,5,'#6688c6',950],
 ['pryrite',85,6,'#d6b370',1600]
].map(([metal,level,tier,colour,price])=>Object.freeze({id:metal+'-axe',metal,name:metal[0].toUpperCase()+metal.slice(1)+' Axe',level,tier,colour,price})));
export const AXE_BY_ID=Object.freeze(Object.fromEntries(WOODCUTTING_AXES.map(axe=>[axe.id,axe])));
export const WOODCUTTING_SWING_SECONDS=1.18;
export const TREE_MIN_RESPAWN=15;
export const TREE_MAX_RESPAWN=60;
export const LOG_STACK_LIMIT=9999;

/** RuneScape-style long-tail XP curve, independent of Oakrest's combat progression. */
const levelThresholds=[0,0];let xpTotal=0,points=0;
for(let level=1;level<99;level++){
 points+=Math.floor(level+300*Math.pow(2,level/7));
 xpTotal=Math.floor(points/4);
 levelThresholds[level+1]=xpTotal;
}
export const WOODCUTTING_LEVEL_XP=Object.freeze(levelThresholds);
export const WOODCUTTING_MAX_XP=200000000;
export function woodcuttingLevel(xp){
 const safe=Math.max(0,Math.min(WOODCUTTING_MAX_XP,Number(xp)||0));
 let level=1;
 while(level<99&&safe>=WOODCUTTING_LEVEL_XP[level+1])level++;
 const next=level===99?WOODCUTTING_LEVEL_XP[99]:WOODCUTTING_LEVEL_XP[level+1];
 const previous=WOODCUTTING_LEVEL_XP[level];
 return {level,totalXp:safe,required:next,remaining:Math.max(0,next-safe),
  progress:level===99?1:(safe-previous)/(next-previous),maxed:level===99};
}
export function bestWoodcuttingAxe(data){
 const level=woodcuttingLevel(data?.professions?.woodcuttingXp).level;
 const owned=new Set(data?.inventory?.weapons?.melee||[]);
 const available=WOODCUTTING_AXES.filter(a=>owned.has(a.id)&&a.level<=level);
 return available.sort((a,b)=>b.tier-a.tier||
  Number(data?.gear?.melee===b.id)-Number(data?.gear?.melee===a.id))[0]||null;
}
export function inventoryCanHoldLog(data,logId){
 const materials=data?.inventory?.materials;
 if(!materials)return false;
 const count=materials[logId]||0;
 if(count>=LOG_STACK_LIMIT)return false;
 return count>0||inventoryKeyList(data,'bag').length<BAG_MIN_SLOTS;
}
export function canCutTree(data,species){
 const tree=typeof species==='string'?TREE_BY_ID[species]:species;
 if(!tree)return {ok:false,reason:'Unknown tree'};
 if(!data?.professions?.woodcuttingLearned)return {ok:false,reason:"Learn Woodcutting at the Forester's Lodge"};
 const level=woodcuttingLevel(data.professions.woodcuttingXp).level;
 if(level<tree.level)return {ok:false,reason:tree.name+' requires Woodcutting level '+tree.level};
 const axe=bestWoodcuttingAxe(data);
 if(!axe)return {ok:false,reason:'You need a usable axe in your inventory or equipped'};
 if(!inventoryCanHoldLog(data,tree.logId))return {ok:false,reason:'Your inventory is full. Bank your logs'};
 return {ok:true,tree,axe,level};
}
export function harvestChance(level,axe,tree){
 // Both proficiency and axe power make familiar trees substantially easier.
 const mastery=Math.max(0,level-tree.level);
 return Math.max(.12,Math.min(.985,.24+axe.tier*.085+mastery*.0045-tree.difficulty*.017));
}
export function newTreeState(species,random=Math.random){
 const tree=TREE_BY_ID[species];
 if(!tree)throw new Error('Unknown tree: '+species);
 return {species,logs:1+Math.min(4,Math.floor(Math.max(0,random())*5)),respawnAt:0,fallAt:0};
}
export function chopOnce(data,state,time,random=Math.random){
 const eligible=canCutTree(data,state?.species);
 if(!eligible.ok)return eligible;
 if(state.respawnAt||state.logs<=0)return {ok:false,reason:'This tree is regrowing'};
 const chance=harvestChance(eligible.level,eligible.axe,eligible.tree);
 if(random()>=chance)return {ok:true,success:false,chance,axe:eligible.axe};
 // The reward is an atomic, validated change to the existing inventory and save.
 if(!inventoryCanHoldLog(data,eligible.tree.logId))return {ok:false,reason:'Your inventory is full. Bank your logs'};
 const mats=data.inventory.materials;
 mats[eligible.tree.logId]=(mats[eligible.tree.logId]||0)+1;
 const previous=eligible.level;
 data.professions.woodcuttingXp=Math.min(WOODCUTTING_MAX_XP,(data.professions.woodcuttingXp||0)+eligible.tree.xp);
 state.logs--;
 let respawnSeconds=0;
 if(state.logs===0){
  respawnSeconds=TREE_MIN_RESPAWN+random()*(TREE_MAX_RESPAWN-TREE_MIN_RESPAWN);
  state.fallAt=time;
  state.respawnAt=time+respawnSeconds;
 }
 return {ok:true,success:true,logId:eligible.tree.logId,xp:eligible.tree.xp,
  levelUp:woodcuttingLevel(data.professions.woodcuttingXp).level>previous,
  newLevel:woodcuttingLevel(data.professions.woodcuttingXp).level,
  depleted:state.logs===0,respawnSeconds,remaining:state.logs,chance,axe:eligible.axe};
}
export function respawnTree(state,time,random=Math.random){
 if(!state.respawnAt||time<state.respawnAt)return false;
 state.logs=newTreeState(state.species,random).logs;
 state.respawnAt=0;state.fallAt=0;
 return true;
}
