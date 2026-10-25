import {sanitizeAdventure} from './adventure-content.js';
/** Character roster writes for Classic. Never overwrite an existing character save. */
import {createCharacter,readCharacters} from './characters.js';
import {freshCharacterSave,validSave} from './rules.js';
import {storageKey} from './storage-key.js';

export function classicRoster(storage,pathname){
 return readCharacters(storage,storageKey('oakrest-characters-v1',pathname));
}
export function createClassicProfile(storage,pathname,input,id){
 const key=name=>storageKey(name,pathname),rosterKey=key('oakrest-characters-v1'),
  activeKey=key('oakrest-active-character'),characters=classicRoster(storage,pathname);
 const profile=createCharacter(input,characters,id);
 const characterKey=key('oakrest-character-save-'+profile.id);
 if(storage.getItem(characterKey)!==null)throw new Error('That character slot already has saved progress.');
 const fresh=freshCharacterSave();
 fresh.adventure=sanitizeAdventure({autoSave:true});
 // Classic begins directly in Oakrest Village; the old 3D portal/tutorial
 // does not exist in this route. Empty ownership/XP are retained exactly.
 fresh.gear={melee:'none',magic:'none',ranged:'none'};
 fresh.onboarding={...fresh.onboarding,area:'world',activatedPortals:['oakrest']};
 const previousRoster=storage.getItem(rosterKey),previousActive=storage.getItem(activeKey);
 let wroteCharacter=false;
 try{
  storage.setItem(characterKey,JSON.stringify(validSave(fresh)));wroteCharacter=true;
  storage.setItem(rosterKey,JSON.stringify([...characters,profile]));
  storage.setItem(activeKey,profile.id);
  if(storage.getItem(activeKey)!==profile.id)throw new Error('Could not verify the new character.');
  return profile;
 }catch{
  // Restore the roster pointer and active selection if one of the writes
  // failed. Never touch previously existing saves.
  try{
   if(wroteCharacter)storage.removeItem(characterKey);
   if(previousRoster===null)storage.removeItem(rosterKey);else storage.setItem(rosterKey,previousRoster);
   if(previousActive===null)storage.removeItem(activeKey);else storage.setItem(activeKey,previousActive);
  }catch{}
  throw new Error('Could not create character in browser storage. Existing saves were not replaced.');
 }
}
export function chooseClassicProfile(storage,pathname,id){
 const key=name=>storageKey(name,pathname),activeKey=key('oakrest-active-character');
 if(id===null){
  if(!storage.getItem(key('oakrest-v1')))throw new Error('Original character save is unavailable.');
  storage.removeItem(activeKey);return null;
 }
 const profile=classicRoster(storage,pathname).find(c=>c.id===id);
 if(!profile)throw new Error('This character was not found.');
 const raw=storage.getItem(key('oakrest-character-save-'+id));
 if(!raw)throw new Error('Character progress is missing. No save was changed.');
 try{
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!parsed.xp)throw Error('Invalid save');
  validSave(parsed);
 }catch{throw new Error('Character save is unreadable. No save was changed.');}
 storage.setItem(activeKey,id);
 if(storage.getItem(activeKey)!==id)throw new Error('Could not select character in browser storage.');
 return profile;
}
