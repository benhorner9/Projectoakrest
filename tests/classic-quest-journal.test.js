import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTS} from '../src/adventure-content.js';
import {questStatusLabel,questCompletionSummary} from '../src/classic-quest-journal.js';

test('Classic quest list uses canonical eight-story-quest content, without adding currency or save fields',()=>{
 assert.equal(QUESTS.length,8);
 assert.equal(questCompletionSummary(QUESTS).total,8);
 assert.equal(questCompletionSummary(QUESTS).completed,0);
 assert.equal(questCompletionSummary([]).completed,0);
});

test('Classic quest colours and labels distinguish all authoritative adventure states',()=>{
 assert.equal(questStatusLabel('available'),'Not started');
 assert.equal(questStatusLabel('active'),'In progress');
 assert.equal(questStatusLabel('ready'),'Ready to finish');
 assert.equal(questStatusLabel('completed'),'Completed');
 assert.equal(questStatusLabel('locked'),'Locked');
 assert.equal(questStatusLabel('other'),'Unknown');
 const catalogue=[
  {id:'one',status:'completed'},{id:'two',status:'active'},
  {id:'three',status:'ready'},{id:'four',status:'available'},
  {id:'five',status:'locked'}
 ];
 assert.deepEqual(questCompletionSummary(catalogue),{completed:1,total:5});
});
