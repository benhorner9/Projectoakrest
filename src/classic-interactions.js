import {ADVENTURE_TARGETS} from './adventure-content.js';
/**
 * Block 3: canonical, renderer-free village interaction targets.
 * Read-only adapters over authoritative town-services, equipment and skills.
 * No transactions, XP awards, storage writes or second economy.
 */
import {OAKREST_SERVICES,OAKREST_GROVES,OAKREST_NOTICES,SHOP_STOCK,townInteraction} from './town-services.js';
import {woodcuttingLevel} from './woodcutting.js';
import {solidAt} from './classic-presentation.js';

export const CLASSIC_INTERACTABLES=Object.freeze([
 ...ADVENTURE_TARGETS,
 ...OAKREST_SERVICES.map(s=>Object.freeze({
  id:'service:'+s.id,sourceId:s.id,kind:'service',service:s.kind,
  x:s.npcX??s.x,z:s.npcZ??s.z,name:s.attendant,place:s.label,reach:s.reach,clickRadius:2.6
 })),
 ...OAKREST_GROVES.map(s=>Object.freeze({
  id:'grove:'+s.id,sourceId:s.id,kind:'grove',
  x:s.x,z:s.z,name:'Softwood tree',reach:s.reach,clickRadius:2.4
 })),
 ...OAKREST_NOTICES.map(s=>Object.freeze({
  id:'notice:'+s.id,sourceId:s.id,kind:'notice',
  x:s.x,z:s.z,name:s.label,reach:s.reach,clickRadius:2.2,line:s.line
 })),
 Object.freeze({id:'citizen:guard',kind:'citizen',x:5,z:48,name:'Village Guard',
  reach:2.8,clickRadius:2.2,line:'The safe town ends at the greenbelt. Prepare for the wilderness before setting out.'}),
 Object.freeze({id:'citizen:villager',kind:'citizen',x:9,z:30,name:'Townsfolk',
  reach:2.8,clickRadius:2.2,line:'The square is the heart of Oakrest. You can visit the bank and shops along the lanes.'})
]);

export function findClassicInteractable(id){
 return CLASSIC_INTERACTABLES.find(t=>t.id===id)||null;
}
export function closestClickedInteractable(point,extra=0){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
 let best=null,score=Infinity;
 for(const target of CLASSIC_INTERACTABLES){
  const dist=Math.hypot(target.x-point.x,target.z-point.z);
  if(dist>target.clickRadius+Math.max(0,extra)||dist>=score)continue;
  best=target;score=dist;
 }
 return best;
}
/** Keep the last 1.25m free of collision samples, because a resource or NPC
 * may itself have a solid visual footprint. Walls between player and target
 * still block selection and completion.
 */
export function interactionSight(a,target){
 if(!a||!target)return false;
 const d=Math.hypot(target.x-a.x,target.z-a.z);
 if(!Number.isFinite(d))return false;
 const count=Math.ceil(Math.max(0,d-1.25)/.30);
 for(let i=1;i<=count;i++){
  const distance=Math.min(d-1.25,i*.30);
  if(distance<=0)continue;
  const t=distance/d;
  if(solidAt(a.x+(target.x-a.x)*t,a.z+(target.z-a.z)*t,.15))return false;
 }
 return true;
}
export function canCompleteInteraction(player,target){
 return !!target&&Number.isFinite(player?.x)&&Number.isFinite(player?.z)&&
  Math.hypot(target.x-player.x,target.z-player.z)<=target.reach&&interactionSight(player,target);
}
/** Retain authoritative interaction rules for nearby keyboard/menu input.
 * Where another canonical entity is present, keep its established reach.
 * Note: townInteraction returns new plain objects; it does not mutate a save.
 */
export function nearbyClassicInteraction(player){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z))return null;
 const fromTown=townInteraction(player.x,player.z);
 const canonical=fromTown&&(fromTown.type==='service'
  ?findClassicInteractable('service:'+fromTown.id)
  :fromTown.type==='grove'?findClassicInteractable('grove:'+fromTown.id)
  :findClassicInteractable('notice:'+fromTown.id));
 if(canonical&&canCompleteInteraction(player,canonical))return canonical;
 return CLASSIC_INTERACTABLES
  .filter(t=>canCompleteInteraction(player,t))
  .sort((a,b)=>Math.hypot(player.x-a.x,player.z-a.z)-Math.hypot(player.x-b.x,player.z-b.z))[0]||null;
}
const num=value=>Math.max(0,Math.floor(Number(value)||0)).toLocaleString('en-GB');
export function classicInteractionCopy(target,save){
 if(!target)return {title:'',body:''};
 if(target.kind==='notice'||target.kind==='citizen')
  return {title:target.name,body:target.line||''};
 if(target.kind==='grove'){
  const learned=save?.professions?.woodcuttingLearned===true;
  const lv=woodcuttingLevel(save?.professions?.woodcuttingXp||0).level;
  return {title:target.name,body:'Training softwood grove · Woodcutting level '+lv+
   '. '+(learned?'You have learnt Woodcutting.':'Speak to the Forester to learn Woodcutting.')+
   '\nCarry an axe and select this grove to chop timber.'};
 }
 if(target.service==='bank'){
  const bank=save?.bank||{};
  const materials=Object.values(bank.materials||{}).reduce((sum,count)=>sum+(Number.isFinite(count)?Math.max(0,count):0),0);
  return {title:target.name+' · Oakrest Bank',
   body:'Coins in bank: '+num(bank.coins)+'\nStored materials: '+num(materials)+
   '\nYour existing vault is unchanged. Speak to Mara to deposit or withdraw items from your existing vault.'};
 }
 if(target.service==='store'){
  const samples=SHOP_STOCK.filter(item=>item.kind==='bundle').map(item=>item.label+' · '+num(item.price)+' coins');
  return {title:target.name+' · General Store',
   body:'Your coins: '+num(save?.coins)+'\n'+samples.join('\n')+
   '\nAll prices come from the existing store. Speak to Darrin to buy registered equipment with your coins.'};
 }
 if(target.service==='skill'){
  const lvl=woodcuttingLevel(save?.professions?.woodcuttingXp||0).level;
  return {title:target.name+' · Forester',body:'Woodcutting level: '+lvl+
   '\n'+(save?.professions?.woodcuttingLearned?'Training already learnt.':'Training available from the existing Forester.')+
   '\nSpeak to Alden to learn Woodcutting and collect a training axe.'};
 }
 return {title:target.name+' · Trade House',
  body:'The existing Oakrest trading hall awaits future player trading. No trade is started in this preview.'};
}
