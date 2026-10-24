/** Single quest-giver contract shared by the world sprites and the maps.
 * Do not infer quests from proximity or NPC names: use persisted quest state.
 */
import {QUESTS} from './adventure-content.js';

export const QUEST_GIVER_IDS=Object.freeze([...new Set(QUESTS.map(quest=>quest.npc))]);

/** Available = start a quest; ready = return to hand one in. */
export function questGiverStatus(adventure,targetId){
 if(!adventure?.quest||!QUEST_GIVER_IDS.includes(targetId)||adventure.quest.npc!==targetId)return null;
 if(!adventure.accepted)return 'available';
 return adventure.ready?'ready':null;
}

/** Only the active, interactable giver receives the map marker. */
export function activeQuestGiver(adventure,resolveTarget){
 const id=adventure?.quest?.npc;
 const status=questGiverStatus(adventure,id);
 if(!status)return null;
 const target=resolveTarget(id);
 return target?{id:target.id,x:target.x,z:target.z,status}:null;
}
