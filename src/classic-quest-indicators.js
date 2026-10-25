/** Single quest-giver contract shared by the world sprites and the maps.
 * Do not infer quests from proximity or NPC names: use persisted quest state.
 */
import {QUESTS} from './adventure-content.js';

export const QUEST_GIVER_IDS=Object.freeze([...new Set(QUESTS.map(quest=>quest.npc))]);

/** Available = start a quest; ready = return to hand one in. */
export function questGiverStatus(adventure,targetId){
 if(!adventure||!QUEST_GIVER_IDS.includes(targetId))return null;
 if(Array.isArray(adventure.catalogue)){
  const entries=adventure.catalogue.filter(q=>q.npc===targetId);
  if(entries.some(q=>q.status==='ready'))return 'ready';
  if(entries.some(q=>q.status==='available'))return 'available';
  return null;
 }
 if(!adventure.quest||adventure.quest.npc!==targetId)return null;
 return adventure.accepted?(adventure.ready?'ready':null):'available';
}
export function availableQuestGivers(adventure,resolveTarget){
 return QUEST_GIVER_IDS.map(id=>{
  const status=questGiverStatus(adventure,id),target=status?resolveTarget(id):null;
  return target?{id:target.id,x:target.x,z:target.z,status}:null;
 }).filter(Boolean);
}
export function activeQuestGiver(adventure,resolveTarget){
 return availableQuestGivers(adventure,resolveTarget)[0]||null;
}
