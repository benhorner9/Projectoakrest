/** Block 7: one window at a time, with NPC dialogue taking priority. */
export function createClassicWindowController({items,map,settings,dialogue,minimap}){
 let current=null;
 const close=()=>{
  items.hide();map.hidden=true;settings.hidden=true;dialogue.hidden=true;
  minimap.setExpanded(false);current=null;
  for(const b of document.querySelectorAll('.classic-item-buttons button'))
   b.setAttribute('aria-pressed','false');
 };
 const open=(name)=>{
  if(name===current){close();return;}
  close();
  if(['inventory','equipment','abilities','bank','shop'].includes(name)){
   items.open(name);current=name;
  }else if(name==='map'){
   map.hidden=false;minimap.setExpanded(true);current=name;
  }else if(name==='settings'){
   settings.hidden=false;current=name;
  }else if(name==='dialogue'){
   dialogue.hidden=false;current=name;
  }
  const id={inventory:'classic-inventory-toggle',equipment:'classic-equipment-toggle',
   abilities:'classic-abilities-toggle',map:'classic-map-toggle',
   settings:'classic-settings-toggle'}[name];
  if(id)document.getElementById(id)?.setAttribute('aria-pressed','true');
 };
 const hide=()=>close();
 const isOpen=()=>current!==null;
 return {open,hide,isOpen,current:()=>current};
}
