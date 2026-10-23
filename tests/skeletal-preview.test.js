import test from 'node:test';
import assert from 'node:assert/strict';
import {skeletalPreviewEnabled} from '../src/skeletal-preview.js';
const flags='?qa=1&skeletal=1';
test('skeletal candidate requires two explicit query flags on dev or localhost only',()=>{
 assert.equal(skeletalPreviewEnabled({hostname:'localhost',pathname:'/',search:flags}),true);
 assert.equal(skeletalPreviewEnabled({hostname:'playcellbound.com',pathname:'/oakrest-dev/',search:flags}),true);
 assert.equal(skeletalPreviewEnabled({hostname:'127.0.0.1',pathname:'/rig-lab.html',search:flags}),true);
 for(const pathname of ['/oakrest','/oakrest/','/oakrest/index.html','/oakrest-dev-other/']){
  assert.equal(skeletalPreviewEnabled({hostname:'playcellbound.com',pathname,search:flags}),false);
 }
 assert.equal(skeletalPreviewEnabled({hostname:'localhost',pathname:'/oakrest/',search:flags}),false);
 for(const search of ['','?qa=1','?skeletal=1','?qa=0&skeletal=1','?skeletal=1&qa=0']){
  assert.equal(skeletalPreviewEnabled({hostname:'localhost',pathname:'/',search}),false);
 }
});
