/** Block 6: guarded persistence for Classic testing on existing Oakrest saves.
 * Same schema and dev/public path namespace as 3D. No writes until explicitly
 * enabled. Never overwrites a changed character or a corrupted save.
 */
import {readCharacters} from './characters.js';
import {validSave} from './rules.js';
import {storageKey} from './storage-key.js';

const isSavedCharacter=p=>typeof p?.id==='string'&&/^[0-9a-f-]{36}$/i.test(p.id);
const enc=x=>JSON.stringify(x);
export function createClassicSaveManager({storage,pathname='/oakrest-dev/classic.html',
  profile,baselineRaw,onStatus=()=>{}}={}){
 const key=x=>storageKey(x,pathname);
 const activeKey=key('oakrest-active-character');
 const rosterKey=key('oakrest-characters-v1');
 const saveKey=isSavedCharacter(profile)?key('oakrest-character-save-'+profile.id):null;
 const backupKey=isSavedCharacter(profile)?key('oakrest-classic-before-block6-'+profile.id):null;
 // One verified pre-write recovery point in addition to the untouched
 // original Classic backup, isolated per character and dev/production path.
 const checkpointKey=isSavedCharacter(profile)?key('oakrest-classic-checkpoint-'+profile.id):null;
 let enabled=false,blocked=null,expectedRaw=baselineRaw??null,writes=0;
 function status(){
  let canRestore=false;
  try{const checkpoint=checkpointKey?storage.getItem(checkpointKey):null;
   canRestore=!!checkpoint&&checkpoint!==expectedRaw&&
    storage.getItem(saveKey)===expectedRaw&&identityStillSelected();}catch{}
  return {enabled,blocked,canEnable:!!saveKey&&!blocked,
   saveKey,backupKey,checkpointKey,canRestore,writes};
 }
 function report(value){onStatus(value,status());return value;}
 function identityStillSelected(){
  if(!saveKey||!profile)return false;
  const list=readCharacters(storage,rosterKey);
  return list.some(p=>p.id===profile.id)&&storage.getItem(activeKey)===profile.id;
 }
 function compare(){
  if(!saveKey)return {ok:false,reason:'Select an existing saved character first.'};
  if(!identityStillSelected())return {ok:false,reason:'Selected character has changed. Reload before saving.'};
  const current=storage.getItem(saveKey);
  if(current===null)return {ok:false,reason:'Original character save is missing; nothing was overwritten.'};
  if(current!==expectedRaw)return {ok:false,reason:'Character was changed by another tab or the original game. Reload and review it.'};
  return {ok:true};
 }
 function enable(){
  if(enabled)return {ok:true,reason:'Persistent Classic saving is already enabled.'};
  if(blocked)return {ok:false,reason:blocked};
  if(!saveKey)return {ok:false,reason:'Create or select a saved character in the original game first.'};
  try{
   const validation=compare();
   if(!validation.ok)return report(validation);
   const data=validSave(JSON.parse(expectedRaw));
   // The classic prototype does not implement the original tutorial/portal
   // transitions; never persist a character mid-onboarding.
   if(data.onboarding&&data.onboarding.area!=='world')
    return report({ok:false,reason:'Finish the original character tutorial before enabling Classic saving.'});
   // Never replace a prior rollback save from an earlier Classic session.
   if(storage.getItem(backupKey)===null){
    storage.setItem(backupKey,expectedRaw);
    if(storage.getItem(backupKey)!==expectedRaw)throw Error('Could not verify backup bytes.');
   }
   enabled=true;
   return report({ok:true,reason:'Persistent Classic saving enabled. An untouched backup was stored first.'});
  }catch{
   return report({ok:false,reason:'Storage is unavailable or the character save is unreadable. Nothing was overwritten.'});
  }
 }
 function save(snapshot){
  if(!enabled||blocked)return {ok:false,reason:blocked||'Saving is not enabled.'};
  try{
   const comparison=compare();
   if(!comparison.ok){
    blocked=comparison.reason;enabled=false;
    return report({ok:false,reason:blocked});
   }
   // Write only the original game's accepted save schema; visual, combat-time
   // and practice-weapon state are not persisted.
   const normalized=validSave(snapshot);
   const next=enc(normalized);
   // Keep the last complete, verified save before replacing it. When storage
   // is exhausted, fail closed instead of risking the only usable copy.
   storage.setItem(checkpointKey,expectedRaw);
   if(storage.getItem(checkpointKey)!==expectedRaw)throw Error('Could not verify checkpoint.');
   storage.setItem(saveKey,next);
   if(storage.getItem(saveKey)!==next)throw Error('Saved bytes could not be verified.');
   expectedRaw=next;writes++;
   return report({ok:true,reason:'Character saved successfully.'});
  }catch{
   blocked='Save failed. Persistent mode has stopped to protect the original character.';
   enabled=false;
   return report({ok:false,reason:blocked});
  }
 }
 function restorePrevious(){
  try{
   if(!saveKey||!identityStillSelected())return report({ok:false,reason:'Select the same saved character before restoring.'});
   const current=storage.getItem(saveKey);
   if(current!==expectedRaw)return report({ok:false,reason:'Save changed in another tab; reload before restoring anything.'});
   const prior=storage.getItem(checkpointKey);
   if(!prior||prior===current)return report({ok:false,reason:'There is no earlier checkpoint to restore.'});
   // Reject unreadable snapshots and never overwrite a save which has
   // changed since this session's last verified write.
   validSave(JSON.parse(prior));validSave(JSON.parse(current));
   storage.setItem(saveKey,prior);
   if(storage.getItem(saveKey)!==prior)throw Error('Restore read-back failed.');
   expectedRaw=prior;enabled=false;blocked=null;
   return report({ok:true,reason:'Previous verified save restored. Reload Classic before continuing.'});
  }catch{
   enabled=false;blocked='Restore was not completed. No further automatic saving is permitted.';
   return report({ok:false,reason:blocked});
  }
 }
 function disable(){enabled=false;return report({ok:true,reason:'Persistent mode turned off. Session changes will not be saved.'});}
 return {status,enable,save,restorePrevious,disable};
}
