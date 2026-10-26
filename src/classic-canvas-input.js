/** Only pointers that begin on the world canvas participate in camera gestures.
 * Two-finger pan or pinch cancels taps until ALL those fingers are released. */
export function installClassicCanvasInput(canvas,{tap,orbit,zoom,currentZoom}){
 const pointers=new Map();let gesturing=false;
 const pair=()=>{
  const touches=[...pointers.values()].filter(p=>p.touch);
  if(touches.length<2)return null;
  const [a,b]=touches;
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
 };
 const reset=()=>{pointers.clear();gesturing=false;};
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  const p={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,
   touch:event.pointerType==='touch',moved:false};
  pointers.set(event.pointerId,p);canvas.setPointerCapture(event.pointerId);
  if(pair())gesturing=true;
 });
 canvas.addEventListener('pointermove',event=>{
  const p=pointers.get(event.pointerId);if(!p)return;
  const before=pair();p.x=event.clientX;p.y=event.clientY;
  p.moved ||= Math.hypot(p.x-p.startX,p.y-p.startY)>13;
  const after=pair();
  if(before&&after){
   gesturing=true;event.preventDefault();
   orbit((after.x-before.x)*.006,(before.y-after.y)*.005);
   if(before.distance>12&&after.distance>12)zoom(currentZoom()*after.distance/before.distance);
  }
 },{passive:false});
 const end=(event,cancelled=false)=>{
  const p=pointers.get(event.pointerId);if(!p)return;
  const wasGesture=gesturing;pointers.delete(event.pointerId);
  if(!pointers.size)gesturing=false;
  if(cancelled||wasGesture||p.moved||Math.hypot(event.clientX-p.startX,event.clientY-p.startY)>13)return;
  const bounds=canvas.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)return;
  tap(event.clientX,event.clientY);
 };
 canvas.addEventListener('pointerup',event=>end(event));
 canvas.addEventListener('pointercancel',event=>end(event,true));
 canvas.addEventListener('lostpointercapture',event=>end(event,true));
 return {reset};
}
