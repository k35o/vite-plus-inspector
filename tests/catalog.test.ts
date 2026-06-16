import { extractJsonArray } from '../src/catalog.ts';

describe('extractJsonArray', () => {
  test('strips the VITE+ banner and returns the array', () => {
    const out =
      'VITE+ - The Unified Toolchain for the Web\n\n[\n  {"a":1}\n]\n';
    expect(extractJsonArray(out)).toBe('[\n  {"a":1}\n]');
  });

  test('ignores a stray bracket in a banner/log line', () => {
    const out = 'note: scanning [packages]\n[\n  {"a":1}\n]\n';
    expect(extractJsonArray(out)).toBe('[\n  {"a":1}\n]');
  });

  test('drops trailing output after the array', () => {
    const out = '[\n  {"a":1}\n]\nDone in 1.2s\n';
    expect(extractJsonArray(out)).toBe('[\n  {"a":1}\n]');
  });

  test('returns null when there is no array', () => {
    expect(extractJsonArray('no json here')).toBeNull();
  });
});
