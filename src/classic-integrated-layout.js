/** Fixed RuneScape-inspired Oakrest shell.
 * Reparent the existing live controls instead of recreating them: all IDs,
 * listeners, save boundaries and UI components remain identical.
 */
export function installClassicIntegratedLayout(doc=document){
 const app=doc.getElementById('classic-app');
 if(!app||doc.getElementById('classic-sidebar'))return;
 const get=id=>{
  const element=doc.getElementById(id);
  if(!element)throw Error('Classic shell missing '+id);
  return element;
 };
 const node=(tag,className,parent)=>{
  const element=doc.createElement(tag);element.className=className;parent.append(element);
  return element;
 };
 app.classList.add('oakrest-framed');
 const sidebar=node('aside','classic-sidebar',app);
 sidebar.id='classic-sidebar';sidebar.setAttribute('aria-label','Oakrest character, map and menu');
 const mapHead=node('section','classic-sidebar-map',sidebar);
 // The decorative Classic title header is hidden in the live framed HUD.
 // Reparent the real logout control into the visible top-right map header.
 // The existing logout control remains in the visible location header.
 const map=get('classic-minimap-expand').parentElement;
 // Reuse the actual live location and settings elements. No second indicator,
 // invented player count, or fake time-of-day state is introduced.
 const place=node('section','oakrest-place-card',mapHead);
 place.setAttribute('aria-label','Current location');
 const top=node('div','oakrest-place-top',place);
 node('strong','oakrest-place-brand',top).textContent='OAKREST';
 top.append(get('classic-settings-toggle'));
 const logout=get('classic-logout');
 logout.classList.add('oakrest-visible-logout');
 logout.textContent='LOG OUT';
 logout.setAttribute('aria-label','Save and return to character selection');
 top.append(logout);
 node('small','oakrest-place-kicker',place).textContent='CURRENT LOCATION';
 const liveLocation=map.querySelector('.location');
 if(liveLocation)place.append(liveLocation);
 const detail=node('p','oakrest-place-description',place);
 detail.id='classic-area-description';
 detail.textContent='Explore the Oakrest Valley.';
 mapHead.append(map);
 const tabs=doc.querySelector('.classic-item-buttons');
 sidebar.append(tabs);
 const body=node('div','classic-sidebar-body',sidebar);
 body.id='classic-sidebar-body';body.dataset.active='none';
 const idle=node('section','classic-side-idle',body);
 const title=node('h2','',idle);title.textContent='YOUR ADVENTURE';
 node('p','',idle).textContent='Choose BAG, GEAR, LEVELS or QUESTS to open your adventurer’s book.';
 node('p','',idle).textContent='The world stays fully visible while you browse.';
 for(const id of ['classic-item-window','classic-skills-window','classic-quests-window',
  'classic-map-window','classic-social-window','classic-settings-window','classic-dialogue'])body.append(get(id));
 const footer=node('footer','classic-action-footer',app);
 footer.setAttribute('aria-label','Character and combat controls');
 footer.append(doc.querySelector('.classic-panel'),doc.querySelector('.classic-combat-dock'));
 const feed=node('div','classic-footer-events',footer);
 feed.append(doc.querySelector('.classic-interaction-bar'),get('classic-toasts'));
 const health=node('div','classic-world-health',get('classic-game'));
 const playerHealth=node('section','classic-player-status',health);
 playerHealth.id='classic-player-status';playerHealth.hidden=true;
 playerHealth.setAttribute('aria-label','Your combat health');
 playerHealth.append(doc.querySelector('.player-hp'));
 health.append(get('classic-combat-target'));
 // Keep the action deck inside the LEFT world/chat column, immediately
 // above chat. The right sidebar book now owns the entire column height.
 // Reparent existing controls and retain their listeners and character state.
 const chat=node('section','oakrest-chat',app);
 chat.id='oakrest-chat';chat.setAttribute('aria-label','Oakrest chat and game messages');
 const action=node('section','oakrest-action-deck',app);
 app.insertBefore(action,chat);
 action.id='oakrest-action-deck';action.setAttribute('aria-label','Equipped combat style and eight action slots');
 action.append(footer);
 footer.prepend(get('classic-styles'));
 // Preserve the original attack / dodge / four ability buttons and listeners.
 // The two new slots will be wired to authoritative consumable transactions.
 const row=doc.querySelector('.classic-attack-row');
 const dodge=get('classic-dodge');
 for(const [id,text] of [['oakrest-food-slot','♨'],['oakrest-potion-slot','✚']]){
  const b=doc.createElement('button');
  b.type='button';b.id=id;b.className='oakrest-supply-slot';
  b.append(doc.createTextNode(text));
  const small=doc.createElement('small');small.textContent=id==='oakrest-food-slot'?'FOOD':'TONIC';
  b.append(small);row.insertBefore(b,dodge);
 }
 // A permanent world viewport ensures pointer raycasting and game rendering
 // remain independent from the chat, inventory and action controls.
 get('classic-game').append(get('classic-joystick'));
}
