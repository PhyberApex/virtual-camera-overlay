import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  computeDirectoryHash,
  shouldSkipUpload,
  planAssetDeletions,
  buildUploadPlan,
  parseSmbClientListing,
  listRequiredDirectories,
} from './lib.js';

describe('computeDirectoryHash', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'deploy-hash-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('produces the same hash for identical content regardless of excluded files', () => {
    writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');

    const first = computeDirectoryHash(dir, { exclude: ['app-config.json'] });

    writeFileSync(path.join(dir, 'app-config.json'), '{"haToken":"one"}');
    const second = computeDirectoryHash(dir, { exclude: ['app-config.json'] });

    writeFileSync(path.join(dir, 'app-config.json'), '{"haToken":"two"}');
    const third = computeDirectoryHash(dir, { exclude: ['app-config.json'] });

    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('changes when a file is added, removed, renamed, or its content changes', () => {
    writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    const base = computeDirectoryHash(dir, { exclude: ['app-config.json'] });

    writeFileSync(path.join(dir, 'index.html'), '<html>changed</html>');
    const changedContent = computeDirectoryHash(dir, {
      exclude: ['app-config.json'],
    });
    expect(changedContent).not.toBe(base);

    rmSync(path.join(dir, 'index.html'));
    writeFileSync(path.join(dir, 'other.html'), '<html></html>');
    const renamed = computeDirectoryHash(dir, {
      exclude: ['app-config.json'],
    });
    expect(renamed).not.toBe(base);
    expect(renamed).not.toBe(changedContent);
  });

  it('is deterministic regardless of filesystem iteration order', () => {
    writeFileSync(path.join(dir, 'b.txt'), 'b');
    writeFileSync(path.join(dir, 'a.txt'), 'a');
    writeFileSync(path.join(dir, 'c.txt'), 'c');

    const hash1 = computeDirectoryHash(dir, { exclude: [] });
    const hash2 = computeDirectoryHash(dir, { exclude: [] });

    expect(hash1).toBe(hash2);
  });
});

describe('shouldSkipUpload', () => {
  it('skips a push when the hash matches the previous deploy', () => {
    expect(shouldSkipUpload({ event: 'push', previousHash: 'abc', newHash: 'abc' })).toBe(true);
  });

  it('does not skip a push when the hash differs', () => {
    expect(shouldSkipUpload({ event: 'push', previousHash: 'abc', newHash: 'def' })).toBe(false);
  });

  it('does not skip a push when there is no previous hash', () => {
    expect(shouldSkipUpload({ event: 'push', previousHash: null, newHash: 'def' })).toBe(false);
  });

  it('never skips a manual run, even when the hash matches', () => {
    expect(
      shouldSkipUpload({
        event: 'manual',
        previousHash: 'abc',
        newHash: 'abc',
      })
    ).toBe(false);
  });
});

describe('planAssetDeletions', () => {
  it('deletes remote assets absent from the new build', () => {
    const remote = ['app-abc123.js', 'app-abc123.css', 'logo-old111.png'];
    const local = ['app-def456.js', 'app-def456.css'];

    expect(planAssetDeletions(remote, local)).toEqual([
      'app-abc123.css',
      'app-abc123.js',
      'logo-old111.png',
    ]);
  });

  it('deletes nothing when every remote asset is still present locally', () => {
    const remote = ['app-abc123.js'];
    const local = ['app-abc123.js', 'app-def456.css'];

    expect(planAssetDeletions(remote, local)).toEqual([]);
  });
});

describe('buildUploadPlan', () => {
  it('groups assets, other files, and index.html, each sorted', () => {
    const plan = buildUploadPlan([
      'index.html',
      'assets/b.js',
      'app-config.json',
      'assets/a.js',
      'favicon.ico',
    ]);

    expect(plan).toEqual({
      assets: ['assets/a.js', 'assets/b.js'],
      other: ['app-config.json', 'favicon.ico'],
      index: 'index.html',
    });
  });

  it('reports a null index when index.html is absent from the file list', () => {
    const plan = buildUploadPlan(['assets/a.js', 'app-config.json']);

    expect(plan.index).toBeNull();
  });
});

describe('parseSmbClientListing', () => {
  it('extracts file names, skipping directories and dot entries', () => {
    const output = `
  .                                   D        0  Mon Jan  1 00:00:00 2024
  ..                                  D        0  Mon Jan  1 00:00:00 2024
  app-def456.js                       N    12345  Mon Jan  1 00:00:00 2024
  app-def456.css                      A     4096  Mon Jan  1 00:00:00 2024
  subdir                              D        0  Mon Jan  1 00:00:00 2024

		7801548 blocks of size 1024. 7801548 blocks available
`;

    expect(parseSmbClientListing(output)).toEqual(['app-def456.js', 'app-def456.css']);
  });

  it('returns an empty list for empty or error-only output', () => {
    expect(parseSmbClientListing('')).toEqual([]);
    expect(parseSmbClientListing('NT_STATUS_OBJECT_NAME_NOT_FOUND listing \\assets')).toEqual([]);
  });
});

describe('listRequiredDirectories', () => {
  it('lists ancestor directories shallowest-first, deduplicated', () => {
    expect(
      listRequiredDirectories([
        'index.html',
        'rain/janis.png',
        'rain/morty.png',
        'assets/sub/deep.js',
      ])
    ).toEqual(['assets', 'rain', 'assets/sub']);
  });

  it('returns an empty list when no file is nested in a directory', () => {
    expect(listRequiredDirectories(['index.html', 'favicon.ico'])).toEqual([]);
  });
});
