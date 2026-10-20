/** Development-only per-enemy loot editor: local browser overrides, never a public/admin service. */
import {LOOT_ENEMIES,cloneDropTables,readDropTables,sanitizeDropTables,MAX_DROP_ROWS,allDroppableItems} from './drop-tables.js';
import {ITEM_CATALOG,itemIconUrl,getItem} from './items.js';
export function isDropEditorAllowed(pathname='/',hostname=''){
 return /^\/oakrest-dev(?:\/|$)/.test(pathname)||['localhost','127.0.0.1'].includes(hostname);
}
export function setupDropEditor({storage,key,button,modal,onApply}){
 if(!button||!modal)return null;
 let tables=readDropTables(storage,key),selected='mossling',catalogue=false;
 const $=id=>document.getElementById(id),rows=$('drop-editor-rows'),error=$('drop-editor-error');
 const icon=(id)=>{
  const img=document.createElement('img');img.className='item-icon';img.alt='';
  img.width=36;img.height=36;img.src=itemIconUrl(id);return img;
 };
 const elt=(tag,parent,value,className)=>{
  const el=document.createElement(tag);if(value!==null&&value!==undefined)el.textContent=value;
  if(className)el.className=className;
  parent?.append(el);return el;
 };
 function render(){
  $('drop-editor-monster').value=selected;
  $('drop-editor-title').textContent=catalogue?'All registered items':'Drops from '+selected;
  $('drop-editor-catalogue').textContent=catalogue?'EDIT DROP TABLE':'VIEW ITEM CATALOGUE';
  $('drop-editor-add').hidden=catalogue;$('drop-editor-reset').hidden=catalogue;
  rows.replaceChildren();error.textContent='';
  if(catalogue){
   const grid=elt('div',rows,null,'item-catalogue');
   for(const item of ITEM_CATALOG){
    const tile=elt('div',grid,null,'item-catalogue-tile');
    tile.append(icon(item.id));
    const details=elt('div',tile);
    elt('strong',details,item.title);
    elt('small',details,item.id);
    elt('small',details,item.dropAllowed?'Droppable · '+item.kind:'Progression item · '+item.kind);
   }
   return;
  }
  elt('p',rows,'Each row rolls separately when a monster dies. 1% is never guaranteed after 100 kills. An empty table drops nothing.','drop-editor-hint');
  for(const [index,row] of tables[selected].entries()){
   const line=elt('div',rows,null,'drop-editor-line');
   line.append(icon(row.itemId));
   const select=elt('select',line);select.setAttribute('aria-label','Drop item '+(index+1));
   for(const item of allDroppableItems()){
    const option=elt('option',select,item.title+' · '+item.id);option.value=item.id;
   }
   select.value=row.itemId;
   select.addEventListener('change',()=>{
    if(tables[selected].some((r,i)=>i!==index&&r.itemId===select.value)){
     error.textContent='That item is already in this monster table.';select.value=row.itemId;return;
    }
    tables[selected][index]={...row,itemId:select.value};render();
   });
   const label=elt('label',line,null,'drop-editor-percentage');
   elt('span',label,'Chance %');
   const percentage=elt('input',label);percentage.type='number';percentage.min='0';percentage.max='100';percentage.step='.01';
   percentage.value=String(row.chancePercent);percentage.setAttribute('aria-label','Drop chance for '+getItem(row.itemId)?.title);
   percentage.addEventListener('change',()=>{
    const n=Number(percentage.value);
    if(percentage.value.trim()===''||!Number.isFinite(n)||n<0||n>100||Math.round(n*100)!==n*100){
     error.textContent='Enter 0–100, with at most two decimal places.';percentage.value=String(row.chancePercent);return;
    }
    tables[selected][index]={...row,chancePercent:n};error.textContent='';
   });
   const remove=elt('button',line,'Remove','drop-editor-remove');remove.type='button';
   remove.addEventListener('click',()=>{tables[selected].splice(index,1);render();});
  }
  $('drop-editor-add').disabled=tables[selected].length>=MAX_DROP_ROWS||tables[selected].length>=allDroppableItems().length;
 }
 $('drop-editor-monster').replaceChildren();
 for(const type of LOOT_ENEMIES){const o=elt('option',$('drop-editor-monster'),type);o.value=type;}
 $('drop-editor-monster').addEventListener('change',event=>{selected=event.target.value;catalogue=false;render();});
 $('drop-editor-add').addEventListener('click',()=>{
  const item=allDroppableItems().find(it=>!tables[selected].some(row=>row.itemId===it.id));
  if(!item)return;tables[selected].push({itemId:item.id,chancePercent:1});render();
 });
 $('drop-editor-reset').addEventListener('click',()=>{tables[selected]=cloneDropTables()[selected];render();});
 $('drop-editor-catalogue').addEventListener('click',()=>{catalogue=!catalogue;render();});
 $('drop-editor-save').addEventListener('click',()=>{
  try{
   const sanitized=sanitizeDropTables(tables);
   // A local editor is not an online GM server: saved overrides are confined
   // to this browser and environment until a trusted backend exists.
   storage.setItem(key,JSON.stringify(sanitized));tables=sanitized;
   onApply(sanitized);error.textContent='Saved to this development browser. New kills use these odds.';
  }catch(e){error.textContent=e.message||'Unable to save drop configuration.';}
 });
 $('drop-editor-close').addEventListener('click',()=>{modal.hidden=true;});
 button.hidden=false;
 button.addEventListener('click',()=>{tables=readDropTables(storage,key);catalogue=false;modal.hidden=false;render();});
 return {read:()=>tables,show:()=>button.click()};
}
