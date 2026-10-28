import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicWindowController} from '../src/classic-ui-controller.js';

function harness(){
 const previous=globalThis.document;
 const tabs=['inventory','equipment','abilities','skills','quests','map','social'].map(name=>({
  id:'classic-'+name+'-toggle',pressed:null,
  setAttribute(key,value){if(key==='aria-pressed')this.pressed=value;}
 }));
 const body={dataset:{active:'none'}};
 const ids=['classic-item-close','classic-skills-close','classic-quests-close','classic-map-close','classic-social-close','classic-settings-close'];
 const closeButtons=Object.fromEntries(ids.map(id=>[id,{hidden:false,disabled:false,tabIndex:0}]));
 globalThis.document={
  getElementById:id=>id==='classic-sidebar-body'?body:closeButtons[id]||null,
  querySelectorAll:selector=>selector==='.classic-item-buttons button'?tabs:[]
 };
 let controller=null,expanded=false;
 const items={
  hidden:true,mode:null,
  open(mode){this.hidden=false;this.mode=mode;controller?.adopt(mode);},
  hide(){this.hidden=true;controller?.adopt(null);}
 };
 const panel=()=>({hidden:true});
 const map=panel(),settings=panel(),dialogue=panel(),quests=panel(),skills=panel(),social=panel();
 controller=createClassicWindowController({items,map,settings,dialogue,quests,skills,social,
  minimap:{setExpanded:value=>{expanded=value;}}});
 return {controller,items,body,tabs,closeButtons,panels:{map,settings,dialogue,quests,skills,social},
  expanded:()=>expanded,restore:()=>{globalThis.document=previous;}};
}
test('the permanent Classic tab cannot be dismissed by repeat selection or hide',()=>{
 const h=harness();
 try{
  h.controller.open('inventory');
  assert.equal(h.controller.current(),'inventory');
  assert.equal(h.items.hidden,false);
  assert.equal(h.body.dataset.active,'inventory');
  h.controller.open('inventory');
  h.controller.hide();
  assert.equal(h.controller.current(),'inventory');
  assert.equal(h.items.hidden,false);
  for(const tab of ['equipment','abilities','skills','quests','map','social','inventory']){
   h.controller.open(tab);
   assert.equal(h.controller.current(),tab);
   h.controller.open(tab);
   h.controller.hide();
   assert.equal(h.controller.current(),tab,'repeated or dismissed '+tab);
   assert.equal(h.tabs.filter(b=>b.pressed==='true').length,1,'exactly one pressed tab');
  }
  assert.equal(h.items.hidden,false);
  assert.ok(Object.values(h.closeButtons).every(b=>b.hidden&&b.disabled&&b.tabIndex===-1));
 }finally{h.restore();}
});
test('NPC dialogue, service and settings dismissal restore the last selected tab',()=>{
 const h=harness();
 try{
  h.controller.open('inventory');
  h.controller.open('quests');
  for(const temporary of ['dialogue','bank','shop','settings']){
   h.controller.open(temporary);
   assert.equal(h.controller.current(),temporary);
   h.controller.hide();
   assert.equal(h.controller.current(),'quests');
   assert.equal(h.panels.quests.hidden,false);
   assert.equal(h.body.dataset.active,'quests');
  }
  h.controller.open('map');assert.equal(h.expanded(),true);
  h.controller.open('dialogue');assert.equal(h.expanded(),false);
  h.controller.hide();assert.equal(h.expanded(),true);
  assert.equal(h.controller.current(),'map');
 }finally{h.restore();}
});
test('legacy item close callback repairs a hidden book without leaving current null',()=>{
 const h=harness();
 try{
  h.controller.open('inventory');
  h.items.hide();
  assert.equal(h.controller.current(),'inventory');
  assert.equal(h.items.hidden,false);
  h.controller.open('equipment');
  h.items.hide();
  assert.equal(h.controller.current(),'equipment');
  assert.equal(h.items.hidden,false);
 }finally{h.restore();}
});
