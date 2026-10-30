/** Touch-friendly Classic inventory actions and timed craft queue.
 * Gameplay mutations remain in the existing authoritative combat/adventure
 * session. UI progress is read-only and follows simulation ticks, not timers.
 */
import {RECIPES,ADVENTURE_MATERIALS} from './adventure-content.js';
import {classicItemDetails,canDropItem,usableItem} from './classic-item-state.js';
import {getItem} from './items.js';
import {recipeGuidance} from './classic-progression.js';

const make=(parent,tag,className,text)=>{
 const el=parent.ownerDocument.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 parent.append(el);return el;
};
const btn=(parent,text,run,disabled=false)=>{
 const b=make(parent,'button','oakrest-item-menu-option',text);
 b.type='button';b.disabled=disabled;b.addEventListener('click',run);return b;
};
export function craftQuantityLimit(save,recipe){
 if(!recipe||!recipe.cost||!Object.keys(recipe.cost).length)return 0;
 const materials=save.inventory?.materials||{};
 const ingredients=Math.min(99,...Object.entries(recipe.cost).map(([id,n])=>
  Number.isSafeInteger(n)&&n>0?Math.floor((materials[id]||0)/n):0));
 const result=recipe.result;
 if(!result?.material)return Math.min(1,ingredients);
 const output=materials[result.material]||0;
 const storage=Math.max(0,Math.floor((9999-output)/result.amount));
 return Math.max(0,Math.min(ingredients,storage));
}
export function setupClassicItemPopups({
 doc=document,save,style,combat,inspect,transact,craft,onUseWith
}){
 let itemLayer=null,craftLayer=null,craftView=null,anchor=null,previousCraft=null,lastProgressUpdate=-Infinity,requirementKey='';
 const closeItem=()=>{
  itemLayer?.remove();itemLayer=null;
  if(anchor?.isConnected)anchor.classList.remove('oakrest-item-selected');
 };
 const closeCraft=({cancel=false}={})=>{
  if(cancel&&combat.adventureState()?.work?.recipeId)
   craft('cancel');
  craftLayer?.remove();craftLayer=null;craftView=null;previousCraft=null;lastProgressUpdate=-Infinity;requirementKey='';
 };
 const selectRecipe=(filter=[])=>RECIPES.filter(r=>r.station==='inventory'&&
  filter.every(id=>Object.hasOwn(r.cost,id)));
 function openInspect(id){
  closeItem();
  const layer=make(doc.body,'div','oakrest-inventory-overlay');
  layer.addEventListener('click',e=>{if(e.target===layer)layer.remove();});
  const dialog=make(layer,'section','oakrest-item-inspection');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Examine item');
  const head=make(dialog,'header','oakrest-inventory-popup-head');
  make(head,'strong',null,'ITEM DETAILS');
  btn(head,'CLOSE',()=>layer.remove());
  const scroller=make(dialog,'div','oakrest-inventory-popup-scroll');
  inspect(scroller,id);
  dialog.querySelector('button')?.focus();
 }
 function openItem(tile,id){
  closeItem();
  const item=getItem(id),details=classicItemDetails(save(),id,style());
  if(!item||!details)return;
  anchor=tile;anchor.classList.add('oakrest-item-selected');
  const layer=make(doc.body,'div','oakrest-item-layer');
  itemLayer=layer;
  layer.addEventListener('pointerdown',e=>{if(e.target===layer)closeItem();});
  const menu=make(layer,'section','oakrest-item-context-menu');
  menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');
  menu.setAttribute('aria-label','Actions for '+item.title);
  make(menu,'strong','oakrest-item-context-title',item.title);
  const invoke=action=>{closeItem();transact(action);};
  if(details.action)btn(menu,details.equipped?'UNEQUIP':'EQUIP',()=>invoke(details.action),!details.allowed);
  if(usableItem(id))btn(menu,id==='material.ration'?'EAT':'DRINK',()=>invoke({type:'use',id}));
  const materials=selectRecipe([item.legacy?.itemId]);
  if(item.kind==='material'&&materials.length)
   btn(menu,'CRAFT…',()=>{closeItem();openCraft([item.legacy.itemId]);});
  if(item.kind==='material'&&materials.some(r=>Object.keys(r.cost).length>1))
   btn(menu,'USE WITH…',()=>{closeItem();onUseWith(item.legacy.itemId);});
  btn(menu,'EXAMINE',()=>openInspect(id));
  if(canDropItem(item)&&!details.equipped){
   const quantity=(save().inventory?.materials?.[item.legacy?.itemId]||1);
   if(quantity>1){
    const row=make(menu,'label','oakrest-item-drop-row','Drop quantity');
    const input=make(row,'input');
    input.type='number';input.min='1';input.max=String(quantity);input.step='1';
    input.inputMode='numeric';input.value='1';input.setAttribute('aria-label','Drop quantity');
    btn(menu,'DROP',()=>invoke({type:'drop',id,quantity:Number(input.value)}));
   }else btn(menu,'DROP',()=>invoke({type:'drop',id,quantity:1}));
  }
  btn(menu,'CANCEL',closeItem);
  const rect=tile.getBoundingClientRect(),width=224,margin=10;
  const availableWidth=doc.defaultView.innerWidth,availableHeight=doc.defaultView.innerHeight;
  let x=Math.max(margin,Math.min(availableWidth-width-margin,rect.left-width-4));
  if(x<margin+8&&rect.right+width+4<=availableWidth-margin)x=rect.right+4;
  const estimated=Math.min(menu.scrollHeight||250,availableHeight-2*margin);
  const y=Math.max(margin,Math.min(availableHeight-estimated-margin,rect.top-6));
  menu.style.left=x+'px';menu.style.top=y+'px';
  menu.querySelector('button:not([disabled])')?.focus({preventScroll:true});
 }
 function openCraft(filter=[]){
  closeItem();
  if(craftLayer)closeCraft();
  const recipes=selectRecipe(filter);
  if(!recipes.length)return;
  craftLayer=make(doc.body,'div','oakrest-inventory-overlay');
  const layer=craftLayer;
  const panel=make(layer,'section','oakrest-craft-popup');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Crafting');
  const head=make(panel,'header','oakrest-inventory-popup-head');
  make(head,'strong',null,'CRAFTING');
  btn(head,'CLOSE',()=>closeCraft({cancel:true}));
  const body=make(panel,'div','oakrest-inventory-popup-scroll');
  make(body,'label',null,'WHAT TO MAKE');
  const selector=make(body,'select','oakrest-craft-recipe-select');
  selector.setAttribute('aria-label','Choose crafting recipe');
  for(const recipe of recipes){
   const opt=make(selector,'option',null,recipe.title);opt.value=recipe.id;
  }
  const activeCraftId=combat.adventureState()?.work?.recipeId;
  if(recipes.some(r=>r.id===activeCraftId))selector.value=activeCraftId;
  const description=make(body,'div','oakrest-craft-requirements');
  const row=make(body,'div','oakrest-craft-quantity-row');
  const qtyLabel=make(row,'label',null,'QUANTITY (crafting cycles)');
  const quantity=make(qtyLabel,'input','oakrest-craft-quantity');
  quantity.type='number';quantity.min='1';quantity.step='1';quantity.value='1';
  quantity.inputMode='numeric';quantity.setAttribute('aria-label','Craft quantity');
  const maximum=make(row,'small','oakrest-craft-maximum');
  const timing=make(body,'p','oakrest-craft-timing');
  const progressText=make(body,'strong','oakrest-craft-status','Select what you want to craft.');
  const progress=make(body,'progress','oakrest-craft-progress');
  progress.max=1;progress.value=0;progress.setAttribute('aria-label','Crafting progress');
  const actions=make(body,'div','oakrest-craft-actions');
  const start=btn(actions,'START CRAFTING',()=>{
   const recipe=recipes.find(r=>r.id===selector.value),max=craftQuantityLimit(save(),recipe);
   const count=Number(quantity.value);
   if(!Number.isSafeInteger(count)||count<1||count>max){
    progressText.textContent='Choose between 1 and '+max+' cycles.';return;
   }
   const result=craft('craft',{id:recipe.id,quantity:count});
   if(result?.ok){
    previousCraft={id:recipe.id,total:count,completed:0};
    update(true);
   }else progressText.textContent=result?.reason||'Unable to craft.';
  });
  const stop=btn(actions,'STOP CRAFTING',()=>{
   craft('cancel');update(true);
  });
  craftView={recipes,selector,description,quantity,maximum,timing,progressText,progress,start,stop};
  selector.addEventListener('change',()=>{
   quantity.value='1';previousCraft=null;update(true);
  });
  quantity.addEventListener('input',()=>update(true));
  update(true);selector.focus({preventScroll:true});
 }
 function update(force=false){
  if(!craftView||!craftLayer?.isConnected)return;
  const now=combat.getState().time;
  if(!force&&now-lastProgressUpdate<.14)return;
  lastProgressUpdate=now;
  const {recipes,selector,description,quantity,maximum,timing,progressText,progress,start,stop}=craftView;
  const recipe=recipes.find(r=>r.id===selector.value);
  if(!recipe)return;
  const data=save(),limit=craftQuantityLimit(data,recipe);
  const guidance=recipeGuidance(data,recipe);
  const adventure=combat.adventureState();
  const current=adventure?.work;
  const finished=adventure?.lastCraft?.id===recipe.id?adventure.lastCraft:null;
  const active=current?.recipeId===recipe.id?current:null;
  const anyCraft=!!current?.recipeId;
  quantity.max=String(limit);maximum.textContent='Maximum '+limit+' cycles from your backpack';
  const key=JSON.stringify([recipe.id,guidance.training,...Object.entries(recipe.cost).map(([id,n])=>[id,n,data.inventory.materials[id]||0])]);
  if(key!==requirementKey){
   requirementKey=key;
   description.replaceChildren();
   make(description,'strong',null,recipe.title);
   make(description,'p',null,guidance.training);
   make(description,'p',null,recipe.result.material?'One '+recipe.seconds+'s cycle makes '+recipe.result.amount+' × '+(getItem('material.'+recipe.result.material)?.title||recipe.result.material):'One '+recipe.seconds+'s cycle makes one equipment item');
   for(const [id,n] of Object.entries(recipe.cost)){
    const ingredient=ADVENTURE_MATERIALS[id]?.[0]||getItem('material.'+id)?.title||id;
    make(description,'p',null,ingredient+': '+(data.inventory.materials[id]||0)+' owned / '+n+' each');
   }
  }
  const chosen=Number(quantity.value);
  const valid=Number.isSafeInteger(chosen)&&chosen>0&&chosen<=limit&&!guidance.owned&&guidance.ready;
  timing.textContent=recipe.seconds+' seconds per cycle · '+(Number.isSafeInteger(chosen)&&chosen>0?chosen*recipe.seconds:0)+' seconds total';
  start.disabled=anyCraft||!valid;
  stop.hidden=!anyCraft;
  selector.disabled=anyCraft;quantity.disabled=anyCraft;
  if(active){
   const gameTime=combat.getState().time;
   const cycleFraction=Math.max(0,Math.min(1,1-(active.end-gameTime)/(active.seconds||3)));
   progress.max=active.total;progress.value=active.completed+cycleFraction;
   progressText.textContent='Crafting '+(active.completed+1)+' of '+active.total+' · '+active.completed+' completed. XP already awarded for finished cycles.';
   previousCraft={id:active.recipeId,total:active.total,completed:active.completed};
  }else if(anyCraft){
   progressText.textContent='Another crafting or gathering task is active.';
  }else{
   if(finished||previousCraft?.id===recipe.id){
    const result=finished||previousCraft;
    progress.max=result.total;progress.value=result.completed;
    progressText.textContent=result.completed>=result.total?'Crafting complete · '+result.completed+' cycles rewarded.':
     'Stopped at '+result.completed+' / '+result.total+' cycles. Only finished items and XP are kept.';
   }else{
    progress.max=1;progress.value=0;
    progressText.textContent=guidance.owned?'You already own this equipment.':valid?'Ready to start.':'Check level, backpack space and ingredients.';
   }
  }
 }
 const escape=e=>{
  if(e.key!=='Escape')return;
  if(craftLayer){e.preventDefault();closeCraft({cancel:true});}
  else if(itemLayer){e.preventDefault();closeItem();}
 };
 doc.addEventListener('keydown',escape);
 return {openItem,openCraft,closeItem,closeCraft,tick:update,
  close:()=>{closeItem();closeCraft();}};
}
