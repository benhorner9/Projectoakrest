/** Present the *same authoritative map canvas and World Atlas* in a real
 * keyboard/touch-friendly modal when the minimap is tapped. The temporary
 * MAP sidebar tab still works as before, and no duplicate map is created.
 */
export function setupClassicMapPopup({map,body,windowUi,minimap,app}){
 const dialog=document.createElement('dialog');
 dialog.id='oakrest-world-map-popup';dialog.className='oakrest-world-map-popup';
 dialog.setAttribute('aria-label','Oakrest expanded world map');
 const header=document.createElement('header');header.className='oakrest-map-popup-header';
 const name=document.createElement('strong');name.textContent='THE OAKREST VALLEY';
 const close=document.createElement('button');close.type='button';close.id='oakrest-world-map-close';
 close.textContent='×';close.setAttribute('aria-label','Close expanded world map');
 header.append(name,close);dialog.append(header);app.append(dialog);
 let restoreTab='inventory';
 const restore=()=>{
  // Reparent before returning to the previous tab; do not discard any
  // inspector selection, map travel state or subscribed click listeners.
  body.append(map);
  if(windowUi.current()==='map')windowUi.open(restoreTab==='map'?'inventory':restoreTab);
  else minimap.setExpanded(false);
 };
 const closePopup=()=>{if(dialog.open)dialog.close();};
 close.addEventListener('click',closePopup);
 dialog.addEventListener('click',event=>{if(event.target===dialog)closePopup();});
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('close',restore);
 windowUi.subscribe?.(name=>{if(name!=='map'&&dialog.open)dialog.close();});
 return {open(){
  if(dialog.open)return;
  restoreTab=windowUi.current()||'inventory';
  windowUi.open('map');
  dialog.append(map);
  map.hidden=false;
  dialog.showModal();
  minimap.setExpanded(true);minimap.redraw();
  close.focus({preventScroll:true});
 },close:closePopup,isOpen:()=>dialog.open};
}
