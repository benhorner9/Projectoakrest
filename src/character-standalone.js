import {readCharacters,createCharacter,CHARACTER_LIMIT,APPEARANCE_OPTIONS} from './characters.js';
import {freshCharacterSave} from './rules.js';
import {storageKey} from './storage-key.js';

const $=id=>document.getElementById(id);
const key=stem=>storageKey(stem,location.pathname);
const rosterKey=key('oakrest-characters-v1');
const activeKey=key('oakrest-active-character');
const legacyKey=key('oakrest-v1');
const saveKey=id=>key('oakrest-character-save-'+id);
const form=$('standalone-form'),error=$('character-error');
const slots=$('saved-character-slots');
let roster=[],storageWorking=true;
try{
 const probe=key('oakrest-character-probe');
 localStorage.setItem(probe,'1');localStorage.removeItem(probe);
 roster=readCharacters(localStorage,rosterKey);
}catch{storageWorking=false;error.textContent='Character saves are blocked by browser storage settings. Enable website storage and reload.';}
function errorMessage(message){error.textContent=message||'';}
function uuid(){
 if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
 if(globalThis.crypto?.getRandomValues){
  const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  return Array.from(b,(v,i)=>v.toString(16).padStart(2,'0')+([3,5,7,9].includes(i)?'-':'')).join('');
 }
 throw Error('Your browser cannot securely create character IDs.');
}
function returnToGame(){location.assign('./?autostart=1');}
function slot(title,caption,action){
 const b=document.createElement('button');b.type='button';b.className='save-slot';
 const strong=document.createElement('strong');strong.textContent=title;
 const small=document.createElement('small');small.textContent=caption;
 b.append(strong,small);b.addEventListener('click',action);slots.append(b);
}
function renderSlots(){
 slots.replaceChildren();
 $('slot-counter').textContent=roster.length+' / '+CHARACTER_LIMIT;
 for(const character of roster)slot(character.name,'Continue this character',()=>{
  try{
   if(!localStorage.getItem(saveKey(character.id)))throw Error('The saved progress for this character could not be found.');
   localStorage.setItem(activeKey,character.id);
   returnToGame();
  }catch(e){errorMessage(e.message);}
 });
 try{
  const legacy=localStorage.getItem(legacyKey);
  if(legacy){JSON.parse(legacy);slot('Original Oakrest Save','Continue the character created before customisation',()=>{
    try{localStorage.removeItem(activeKey);returnToGame();}catch(e){errorMessage(e.message);}
   });}
 }catch{} // Preserve corrupted save bytes, but do not offer them as playable.
 $('create-section').hidden=roster.length>=CHARACTER_LIMIT||!storageWorking;
 if(roster.length>=CHARACTER_LIMIT)slot('All three slots are occupied','Continue an existing character above.',()=>{});
}
function palette(id,name,options){
 const target=$(id);
 for(const [index,color] of options.entries()){
  const label=document.createElement('label');label.className='swatch';
  const radio=document.createElement('input');radio.type='radio';radio.name=name;radio.value=color;radio.checked=index===0;
  radio.setAttribute('aria-label',name+' colour '+(index+1));
  const chip=document.createElement('span');chip.style.setProperty('--tone',color);
  label.append(radio,chip);target.append(label);
 }
}
palette('skin-options','skinTone',APPEARANCE_OPTIONS.skinTone);
palette('hair-options','hairColor',APPEARANCE_OPTIONS.hairColor);
palette('outfit-options','outfitColor',APPEARANCE_OPTIONS.outfitColor);
function updatePreview(){
 const fields=Object.fromEntries(new FormData(form).entries());
 const figure=$('avatar-figure');
 figure.dataset.sex=fields.sex==='female'?'female':'male';
 figure.dataset.hair=APPEARANCE_OPTIONS.hairstyle.includes(fields.hairstyle)?fields.hairstyle:'short';
 figure.dataset.outfit=APPEARANCE_OPTIONS.outfit.includes(fields.outfit)?fields.outfit:'tunic';
 figure.style.setProperty('--skin',fields.skinTone||APPEARANCE_OPTIONS.skinTone[0]);
 figure.style.setProperty('--hair',fields.hairColor||APPEARANCE_OPTIONS.hairColor[0]);
 figure.style.setProperty('--outfit',fields.outfitColor||APPEARANCE_OPTIONS.outfitColor[0]);
}
form.addEventListener('input',updatePreview);form.addEventListener('change',updatePreview);
form.addEventListener('submit',event=>{
 event.preventDefault();errorMessage('');
 if(!storageWorking)return errorMessage('Browser storage is unavailable; no characters have been changed.');
 let id,character;
 try{
  id=uuid();
  character=createCharacter(Object.fromEntries(new FormData(form).entries()),roster,id);
  const next=[...roster,character];
  // Write the actual save first. Never erase prior characters or the legacy save.
  localStorage.setItem(saveKey(id),JSON.stringify(freshCharacterSave()));
  localStorage.setItem(rosterKey,JSON.stringify(next));
  localStorage.setItem(activeKey,id);
  roster=next;returnToGame();
 }catch(e){errorMessage(e.message||'Could not save your new character.');}
});
renderSlots();updatePreview();
