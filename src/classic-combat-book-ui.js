/** Spellbook-like COMBAT tab: presentation only, authoritative equip callbacks. */
import {classicCombatBook} from './classic-combat-book.js';
import {LOADOUTS} from './rules.js';
import {abilityDetails} from './classic-abilities.js';
const add=(parent,tag,cls,text)=>{
 const node=document.createElement(tag);node.className=cls||'';
 if(text!==undefined&&text!==null)node.textContent=String(text);
 parent.append(node);return node;
};
const action=(parent,cls,label,callback)=>{
 const node=add(parent,'button',cls,label);node.type='button';node.addEventListener('click',callback);
 return node;
};
export function renderClassicCombatBook(content,{data,style,state,activeSlot=0,inspectedId=null,onSlot,onInspect,onEquip}){
 const book=classicCombatBook(data,style,state);
 if(!book)return;
 const section=add(content,'section','oakrest-combat-book');
 section.dataset.combatStyle=style;
 const head=add(section,'header','oakrest-combat-book-header');
 add(head,'strong','oakrest-combat-book-title',book.title);
 add(head,'span','oakrest-combat-book-weapon',book.weaponName);
 add(section,'p','oakrest-combat-book-hint',book.hint+' · Choose a slot, then tap an icon.');
 if(!book.skills.length){add(section,'p','classic-muted','Equip a weapon to prepare combat abilities.');return;}
 add(section,'h3','oakrest-combat-book-label','EQUIPPED · FOUR ABILITY SLOTS');
 const slots=add(section,'div','oakrest-combat-book-slots');
 for(const slot of book.slots){
  const active=activeSlot===slot.index;
  const button=action(slots,'oakrest-combat-book-slot'+(active?' selected':''),'',()=>onSlot?.(slot.index,slot.id));
  button.dataset.combatSlot=String(slot.index);button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label','Select ability slot '+(slot.index+1)+': '+slot.name);
  add(button,'span','oakrest-combat-book-slot-number',String(slot.index+1));
  add(button,'strong','oakrest-combat-book-slot-name',slot.name);
  add(button,'small','classic-ability-status',slot.status).dataset.combatSlotStatus=String(slot.index);
 }
 const sub=add(section,'div','oakrest-combat-book-section');
 add(sub,'h3','oakrest-combat-book-label',book.section);
 add(sub,'span','oakrest-combat-book-count',book.skills.filter(a=>a.unlocked).length+'/'+book.skills.length+' unlocked');
 const icons=add(section,'div','oakrest-combat-book-grid');
 icons.setAttribute('role','group');icons.setAttribute('aria-label',book.title+' ability selection');
 for(const skill of book.skills){
  const tile=action(icons,'oakrest-combat-book-spell'+(!skill.unlocked?' locked':'')+(skill.slot>=0?' equipped':'')+(inspectedId===skill.id?' inspecting':''),'',()=>{
   if(skill.unlocked)onEquip?.(activeSlot,skill.id);
   else onInspect?.(skill.id);
  });
  tile.dataset.abilityId=skill.id;tile.dataset.unlocked=String(skill.unlocked);
  tile.setAttribute('aria-pressed',String(inspectedId===skill.id));
  tile.setAttribute('aria-label',(skill.unlocked?'Equip ':'Inspect locked ')+skill.name+(skill.unlocked?' in slot '+(activeSlot+1):' at level '+skill.requiredLevel));
  tile.title=skill.name+(skill.unlocked?' · '+skill.cooldown+'s cooldown':' · Unlock at level '+skill.requiredLevel);
  add(tile,'span','oakrest-combat-book-glyph',skill.icon||'✦').setAttribute('aria-hidden','true');
  if(!skill.unlocked)add(tile,'small','oakrest-combat-book-lock','LV '+skill.requiredLevel);
  else if(skill.slot>=0)add(tile,'small','oakrest-combat-book-assigned',String(skill.slot+1));
 }
 const inspected=book.skills.find(a=>a.id===inspectedId)
  ||book.skills.find(a=>a.id===book.slots[activeSlot]?.id)||book.skills[0];
 const info=add(section,'section','oakrest-combat-book-inspect');
 info.setAttribute('aria-label','Selected combat ability information');
 add(info,'strong','oakrest-combat-book-inspect-title',inspected.name);
 const details=abilityDetails(style,LOADOUTS[style][book.weaponId],inspected,1,true);
 add(info,'p','oakrest-combat-book-description',details.description);
 const facts=add(info,'div','oakrest-combat-book-facts');
 add(facts,'span','','LEVEL '+inspected.requiredLevel);
 add(facts,'span','','COOLDOWN '+inspected.cooldown+'s');
 if(inspected.slot>=0)add(facts,'span','','SLOT '+(inspected.slot+1));
 if(!inspected.unlocked)add(info,'p','oakrest-combat-book-locked','Locked · Reach level '+inspected.requiredLevel+' '+style.toUpperCase()+' to unlock.');
 else add(info,'p','oakrest-combat-book-instruction','Tap an ability icon to equip it to slot '+(activeSlot+1)+'.');
 if(book.slots[activeSlot].id){
  const clear=action(info,'oakrest-combat-book-clear','EMPTY SLOT '+(activeSlot+1),()=>onEquip?.(activeSlot,null));
  clear.setAttribute('aria-label','Unequip ability from slot '+(activeSlot+1));
 }
}
