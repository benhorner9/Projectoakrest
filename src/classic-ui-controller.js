/** Persistent Oakrest Classic sidebar: switching tabs never leaves a blank book. */
export function createClassicWindowController({items,map,settings,dialogue,minimap,quests,skills,social}){
 const permanent=new Set(['inventory','equipment','abilities','skills','quests','map','social']);
 const itemModes=new Set(['inventory','equipment','abilities','bank','shop']);
 const panels=new Set([...permanent,'bank','shop','settings','dialogue']);
 const buttonIds={
  inventory:'classic-inventory-toggle',equipment:'classic-equipment-toggle',
  abilities:'classic-abilities-toggle',skills:'classic-skills-toggle',
  quests:'classic-quests-toggle',map:'classic-map-toggle',
  social:'classic-social-toggle',settings:'classic-settings-toggle'
 };
 let current=null,lastPermanent='inventory',transitioning=false;
 const listeners=new Set();
 // Panels may own native dialogs that must close synchronously on tab changes.
 const notify=name=>{for(const listener of listeners)listener(name);};
 const body=document.getElementById('classic-sidebar-body');
 // Close controls are intentionally kept in the DOM for existing bindings,
 // but never exposed as a way to dismiss the permanent book.
 for(const id of ['classic-item-close','classic-skills-close','classic-quests-close',
  'classic-map-close','classic-social-close','classic-settings-close']){
  const control=document.getElementById(id);
  if(control){control.hidden=true;control.disabled=true;control.tabIndex=-1;}
 }
 const pressed=name=>{
  for(const button of document.querySelectorAll('.classic-item-buttons button'))
   button.setAttribute('aria-pressed',String(button.id===buttonIds[name]));
 };
 const reset=()=>{
  transitioning=true;
  try{
   items.hide();map.hidden=true;settings.hidden=true;dialogue.hidden=true;
   quests.hidden=true;skills.hidden=true;social.hidden=true;
   minimap.setExpanded(false);
  }finally{transitioning=false;}
  current=null;
 };
 const open=name=>{
  if(!panels.has(name)||name===current)return;
  reset();
  if(itemModes.has(name))items.open(name);
  else if(name==='skills')skills.hidden=false;
  else if(name==='quests')quests.hidden=false;
  else if(name==='map'){map.hidden=false;minimap.setExpanded(true);}
  else if(name==='social')social.hidden=false;
  else if(name==='settings')settings.hidden=false;
  else if(name==='dialogue')dialogue.hidden=false;
  current=name;
  if(permanent.has(name))lastPermanent=name;
  if(body)body.dataset.active=name;
  pressed(name);
  notify(name);
 };
 // Dismiss an NPC/service/settings view to the previous permanent tab.
 // Calling hide() on a permanent tab does not clear the sidebar.
 const hide=()=>{
  if(!permanent.has(current))open(lastPermanent);
 };
 // Internal BAG/GEAR/COMBAT sub-tabs directly invoke the item renderer.
 const adopt=name=>{
  if(transitioning)return;
  if(!name){
   if(itemModes.has(current)||current===null){current=null;open(lastPermanent);}
   return;
  }
  if(!itemModes.has(name))return;
  current=name;
  if(permanent.has(name))lastPermanent=name;
  if(body)body.dataset.active=name;
  pressed(name);
  notify(name);
 };
 return {open,hide,isOpen:()=>current!==null,adopt,current:()=>current,
  subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);}};
}
