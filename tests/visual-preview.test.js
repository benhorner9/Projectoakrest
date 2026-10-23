import test from 'node:test';
import assert from 'node:assert/strict';
import {visualPreviewEnabled as enabled} from '../src/visual-preview.js';
test('candidate playtest requires both explicit flags in local or development context',()=>{
 const search='?qa=1&visual-foundation=1';
 assert.equal(enabled({hostname:'localhost',pathname:'/',search}),true);
 assert.equal(enabled({hostname:'playcellbound.com',pathname:'/oakrest-dev/',search}),true);
 for(const pathname of ['/oakrest','/oakrest/','/oakrest/index.html','/oakrest-dev-other/','/'])assert.equal(enabled({hostname:'playcellbound.com',pathname,search}),false);
 assert.equal(enabled({hostname:'localhost',pathname:'/oakrest/',search}),false);
 for(const search of ['','?qa=1','?visual-foundation=1','?qa=0&visual-foundation=1'])assert.equal(enabled({hostname:'localhost',search}),false);
});
