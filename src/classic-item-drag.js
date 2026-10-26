/** Pointer drag with touch scrolling: swipe vertically to scroll, hold then
 * move to drag. No HTML5 drag dependency on iPad Safari. */
export function bindClassicItemDrag(root,onDrop){
 let gesture=null,suppressUntil=0;
 const tile=target=>target?.closest?.('[data-scope][data-slot-index]');
 const scrollParent=node=>{
  for(let p=node.parentElement;p&&p!==root;p=p.parentElement)
   if(p.scrollHeight>p.clientHeight+2&&/auto|scroll/.test(getComputedStyle(p).overflowY))return p;
  return null;
 };
 function cleanup(){
  gesture?.ghost?.remove();gesture?.source?.classList.remove('oak-slot-source');
  root.querySelectorAll('.oak-slot-over').forEach(n=>n.classList.remove('oak-slot-over'));
  gesture=null;
  document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',cancel);
 }
 const cancel=()=>cleanup();
 function move(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  const g=gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.mode&&Math.hypot(dx,dy)<15)return;
  if(!g.mode)g.mode=g.touch&&performance.now()-g.started<260&&Math.abs(dy)>Math.abs(dx)*1.15?'scroll':'drag';
  e.preventDefault();
  if(g.mode==='scroll'){
   if(g.scroller)g.scroller.scrollTop-=e.clientY-g.lastY;
   g.lastY=e.clientY;return;
  }
  if(!g.ghost){
   g.ghost=g.source.cloneNode(true);g.ghost.removeAttribute('id');g.ghost.className+=' oak-slot-ghost';
   g.ghost.setAttribute('aria-hidden','true');g.ghost.style.width=g.source.getBoundingClientRect().width+'px';
   document.body.append(g.ghost);g.source.classList.add('oak-slot-source');
  }
  g.ghost.style.left=e.clientX+'px';g.ghost.style.top=e.clientY+'px';
  const dest=tile(document.elementFromPoint(e.clientX,e.clientY));
  root.querySelectorAll('.oak-slot-over').forEach(n=>n.classList.remove('oak-slot-over'));
  if(dest&&root.contains(dest))dest.classList.add('oak-slot-over');
  if(g.scroller){const r=g.scroller.getBoundingClientRect();if(e.clientY<r.top+25)g.scroller.scrollTop-=12;else if(e.clientY>r.bottom-25)g.scroller.scrollTop+=12;}
 }
 function end(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  const g=gesture,dest=tile(document.elementFromPoint(e.clientX,e.clientY));
  const payload=g.mode==='drag'&&dest&&root.contains(dest)?{
   fromScope:g.source.dataset.scope,toScope:dest.dataset.scope,
   fromIndex:Number(g.source.dataset.slotIndex),toIndex:Number(dest.dataset.slotIndex),
   canonical:g.source.dataset.canonical,binding:g.source.dataset.binding,slot:dest.dataset.equipmentSlot
  }:null;
  if(g.mode){e.preventDefault();suppressUntil=performance.now()+400;}
  cleanup();if(payload)onDrop(payload);
 }
 root.addEventListener('pointerdown',e=>{
  if(gesture){if(e.pointerId!==gesture.id)cleanup();return;}
  suppressUntil=0; // A new deliberate press must not inherit the previous drag's click suppression.
  const source=tile(e.target);
  if(e.button!==0||!source||!root.contains(source)||!source.dataset.canonical&&!source.dataset.binding)return;
  gesture={id:e.pointerId,source,x:e.clientX,y:e.clientY,lastY:e.clientY,started:performance.now(),touch:e.pointerType==='touch',scroller:scrollParent(source)};
  document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end);document.addEventListener('pointercancel',cancel);
 });
 root.addEventListener('click',e=>{
  if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 root.addEventListener('dragstart',e=>{if(tile(e.target))e.preventDefault();});
 root.addEventListener('contextmenu',e=>{if(tile(e.target))e.preventDefault();});
 root.addEventListener('keydown',e=>{
  if(!e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  const source=tile(e.target);if(!source?.dataset.canonical)return;
  const from=Number(source.dataset.slotIndex),to=from+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key]);
  if(to<0||!root.querySelector('[data-scope="'+source.dataset.scope+'"][data-slot-index="'+to+'"]'))return;
  e.preventDefault();e.stopPropagation();onDrop({fromScope:source.dataset.scope,toScope:source.dataset.scope,fromIndex:from,toIndex:to,canonical:source.dataset.canonical});
 });
 addEventListener('blur',cleanup);return cleanup;
}
