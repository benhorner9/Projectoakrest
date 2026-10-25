/** Secondary touches do not consistently synthesize click while a joystick is
 * captured. Activate on a completed touch and suppress its duplicate click. */
export function bindClassicPress(button,activate){
 let down=null,lastTouch=-Infinity;
 button.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||button.disabled||down)return;
  down={id:e.pointerId,x:e.clientX,y:e.clientY};button.setPointerCapture(e.pointerId);
 });
 button.addEventListener('pointerup',e=>{
  if(e.pointerId!==down?.id)return;
  const start=down;down=null;
  e.preventDefault();lastTouch=performance.now();
  const bounds=button.getBoundingClientRect();
  if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>14||button.disabled||
   e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)return;
  activate();
 });
 button.addEventListener('pointercancel',()=>{down=null;});
 button.addEventListener('lostpointercapture',()=>{down=null;});
 button.addEventListener('click',e=>{
  if(e.detail!==0&&performance.now()-lastTouch<650){e.preventDefault();return;}
  if(!button.disabled)activate();
 });
}
