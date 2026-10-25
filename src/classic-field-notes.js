import {levelFromXp} from './rules.js';
/** Session notes are presentation only and never enter the saved character. */
export function setupClassicFieldNotes(doc=document){
 const host=doc.querySelector('.classic-side-idle');if(!host)return {update(){},record(){}};
 host.replaceChildren();
 const add=(tag,text,parent=host)=>{const n=doc.createElement(tag);n.textContent=text;parent.append(n);return n;};
 add('span','OAKREST • FIELD JOURNAL').className='field-eyebrow';
 const heading=add('h2','The Wanderer');
 const progress=add('div','');progress.className='field-progress';
 const rows=['melee','magic','ranged'].map(style=>{
  const row=add('div','',progress);row.className='field-style';
  const name=add('span',style[0].toUpperCase()+style.slice(1),row),value=add('strong','',row);
  return {style,name,value};
 });
 const save=add('p','');save.className='field-save';
 add('h3','Recent discoveries');
 const log=add('ol','');log.className='field-log';log.setAttribute('aria-label','Recent adventure events');
 const empty=add('li','Speak to Elowen at the north gate to begin.',log);
 let previous='',signature='';
 return {
  update({name,xp,saved}){
   const next=JSON.stringify([name,xp,saved]);if(next===signature)return;signature=next;
   heading.textContent=name||'The Wanderer';
   rows.forEach(r=>r.value.textContent='Level '+levelFromXp(xp?.[r.style]||0).level);
   save.textContent=saved?'Progress saves automatically':'Practice session · progress is temporary';
  },
  record(message){
   if(!message||message===previous||/hit ·|damage|Miss|activated|incoming|Attacking|Walking|Destination|Tap to move/.test(message))return;
   previous=message;if(empty.isConnected)empty.remove();
   const entry=doc.createElement('li');entry.textContent=message;log.prepend(entry);
   while(log.children.length>6)log.lastElementChild.remove();
  }
 };
}
