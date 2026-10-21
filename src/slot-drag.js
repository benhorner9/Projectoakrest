/**
 * Pointer Events cover mouse, pen and iPad Safari touch without HTML5's
 * desktop-only drag data transfer. A tap keeps its normal Examine behaviour.
 */
export function bindSlotDrag(root,onDrop){
 let drag=null,lastDrop=0;
 const findTile=target=>target?.closest?.('[data-slot-index][data-scope]');
 const reset=()=>{
  if(!drag)return;
  drag.ghost?.remove();
  drag.origin?.classList.remove('oak-slot-source');
  root.querySelectorAll('.oak-slot-over').forEach(el=>el.classList.remove('oak-slot-over'));
  drag=null;
 };
 const move=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moving&&Math.hypot(dx,dy)<9)return;
  if(!drag.moving){
   drag.moving=true;
   drag.ghost=drag.origin.cloneNode(true);
   drag.ghost.removeAttribute('id');
   drag.ghost.className+=' oak-slot-ghost';
   drag.ghost.setAttribute('aria-hidden','true');
   drag.ghost.style.width=drag.origin.getBoundingClientRect().width+'px';
   drag.ghost.style.height=drag.origin.getBoundingClientRect().height+'px';
   document.body.append(drag.ghost);
   drag.origin.classList.add('oak-slot-source');
  }
  e.preventDefault();
  drag.ghost.style.left=e.clientX+'px';
  drag.ghost.style.top=e.clientY+'px';
  const hovered=findTile(document.elementFromPoint(e.clientX,e.clientY));
  root.querySelectorAll('.oak-slot-over').forEach(el=>el.classList.remove('oak-slot-over'));
  if(hovered&&root.contains(hovered))hovered.classList.add('oak-slot-over');
 };
 const end=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  if(drag.moving){
   e.preventDefault();
   const destination=findTile(document.elementFromPoint(e.clientX,e.clientY));
   const source=drag.origin;
   const params=destination&&root.contains(destination)?{
    fromScope:source.dataset.scope,toScope:destination.dataset.scope,
    fromIndex:Number(source.dataset.slotIndex),toIndex:Number(destination.dataset.slotIndex),
    canonical:source.dataset.canonical
   }:null;
   lastDrop=Date.now();
   reset();
   if(params)onDrop(params);
  }else reset();
  document.removeEventListener('pointermove',move);
  document.removeEventListener('pointerup',end);
  document.removeEventListener('pointercancel',cancel);
 };
 const cancel=e=>{reset();document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',cancel);};
 root.addEventListener('pointerdown',e=>{
  if(drag||e.button!==0)return;
  const tile=findTile(e.target);
  if(!tile||!root.contains(tile)||!tile.dataset.canonical)return;
  drag={pointerId:e.pointerId,origin:tile,x:e.clientX,y:e.clientY,moving:false,ghost:null};
  document.addEventListener('pointermove',move,{passive:false});
  document.addEventListener('pointerup',end);
  document.addEventListener('pointercancel',cancel);
 });
 // Drag endings on touch browsers can produce a synthetic click. Consume it,
 // but do not consume genuine taps and accessible keyboard activation.
 root.addEventListener('click',e=>{
  if(Date.now()-lastDrop<280){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 root.addEventListener('keydown',e=>{
  if(!e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  const tile=findTile(e.target);
  if(!tile||!root.contains(tile)||!tile.dataset.canonical)return;
  const scope=tile.dataset.scope;
  const cells=[...root.querySelectorAll('[data-slot-index][data-scope="'+scope+'"]')];
  const index=Number(tile.dataset.slotIndex),columns=Number(tile.closest('[data-columns]')?.dataset.columns)||4;
  const delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-columns:columns;
  const to=index+delta;
  if(to<0||to>=cells.length)return;
  e.preventDefault();
  onDrop({fromScope:scope,toScope:scope,fromIndex:index,toIndex:to,canonical:tile.dataset.canonical});
 });
 return cancel;
}
