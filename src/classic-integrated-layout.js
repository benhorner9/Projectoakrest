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
 const map=get('classic-minimap-expand').parentElement;
 mapHead.append(map);
 const notes=node('div','classic-side-notes',mapHead);
 node('span','oakrest-overline',notes).textContent='YOU ARE HERE';
 node('strong','classic-side-label',notes).textContent='THE OAKREST VALLEY';
 node('p','classic-side-hint',notes).textContent='Explore · gather · make · fight';
 const tabs=doc.querySelector('.classic-item-buttons');
 sidebar.append(tabs);
 const body=node('div','classic-sidebar-body',sidebar);
 body.id='classic-sidebar-body';body.dataset.active='none';
 const idle=node('section','classic-side-idle',body);
 node('span','oakrest-overline',idle).textContent='THE ADVENTURER’S DESK';
 const title=node('h2','',idle);title.textContent='Field notes';
 node('p','oakrest-idle-intro',idle).textContent='A place for your equipment, quests and progress — the world stays yours to explore.';
 const actions=node('div','oakrest-quick-links',idle);
 const link=(text,target,cls='')=>{
  const button=node('button','oakrest-quick-link '+cls,actions);
  button.type='button';button.textContent=text;
  button.addEventListener('click',()=>get(target).click());
 };
 link('✦ Open quest journal','classic-quests-toggle','featured');
 link('▦ Check backpack','classic-inventory-toggle');
 link('◇ View levels','classic-skills-toggle');
 const tip=node('p','oakrest-idle-tip',idle);
 tip.textContent='TIP · Select materials in your bag to combine them, or tap MAKE to craft without a workstation.';
 for(const id of ['classic-item-window','classic-skills-window','classic-quests-window',
  'classic-map-window','classic-settings-window','classic-dialogue'])body.append(get(id));
 const footer=node('footer','classic-action-footer',app);
 footer.setAttribute('aria-label','Character and combat controls');
 footer.append(doc.querySelector('.classic-panel'),doc.querySelector('.classic-combat-dock'));
 const feed=node('div','classic-footer-events',footer);
 feed.append(get('classic-combat-target'),doc.querySelector('.classic-interaction-bar'),get('classic-toasts'));
 // A joystick is the one intentional touch control above the rendered ground.
 get('classic-game').append(get('classic-joystick'));
}
