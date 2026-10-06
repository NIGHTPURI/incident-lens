import { beforeEach, expect, it } from 'vitest';
import { readPlatform,savePlatform,platformKey } from './execution-platform';
beforeEach(()=>localStorage.clear());
it('copies the legacy OS preference without deleting or changing learning records',()=>{
  localStorage.setItem('incidentlens.learning.platform.v1','windows');
  localStorage.setItem('incidentlens.learning.notes','personal browser note');
  expect(readPlatform(localStorage)).toBe('windows');
  expect(localStorage.getItem(platformKey)).toBe('windows');
  expect(savePlatform(localStorage,'linux')).toBe(true);
  expect(readPlatform(localStorage)).toBe('linux');
  expect(localStorage.getItem('incidentlens.learning.platform.v1')).toBe('windows');
  expect(localStorage.getItem('incidentlens.learning.notes')).toBe('personal browser note');
});
it('does not infer PC readiness and supports blocked storage',()=>{
  expect(readPlatform({getItem:()=>{throw Error('blocked')}})).toBe('linux');
  expect(savePlatform({setItem:()=>{throw Error('blocked')}},'windows')).toBe(false);
});
