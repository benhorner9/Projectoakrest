import test from 'node:test';
import assert from 'node:assert/strict';
import {storageKey} from '../src/storage-key.js';

test('public Oakrest keeps the legacy save and settings names',()=>{
  for(const path of ['/', '/oakrest/', '/oakrest/index.html']){
    assert.equal(storageKey('oakrest-v1',path),'oakrest-v1');
    assert.equal(storageKey('oakrest-before-greenwood',path),'oakrest-before-greenwood');
    assert.equal(storageKey('oakrest-quality',path),'oakrest-quality');
  }
});

test('Oakrest dev uses independent save, backup and settings names',()=>{
  for(const path of ['/oakrest-dev','/oakrest-dev/','/oakrest-dev/index.html']){
    assert.equal(storageKey('oakrest-v1',path),'oakrest-dev-v1');
    assert.equal(storageKey('oakrest-before-greenwood',path),'oakrest-dev-before-greenwood');
    assert.equal(storageKey('oakrest-quality',path),'oakrest-dev-quality');
    assert.equal(storageKey('oakrest-look-speed',path),'oakrest-dev-look-speed');
  }
  assert.equal(storageKey('oakrest-v1','/oakrest-dev-other/'),'oakrest-v1');
});
