import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function listFilesRecursive(dir, baseDir = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
    }
  }
  return files;
}

export function computeDirectoryHash(dir, { exclude = [] } = {}) {
  const excludeSet = new Set(exclude);
  const files = listFilesRecursive(dir)
    .filter(file => !excludeSet.has(file))
    .sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(path.join(dir, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function shouldSkipUpload({ event, previousHash, newHash }) {
  if (event !== 'push') return false;
  if (!previousHash) return false;
  return previousHash === newHash;
}

export function planAssetDeletions(remoteAssetFiles, localAssetFiles) {
  const localSet = new Set(localAssetFiles);
  return remoteAssetFiles.filter(file => !localSet.has(file)).sort();
}

export function buildUploadPlan(relativeFilePaths) {
  const assets = [];
  const other = [];
  let hasIndex = false;

  for (const file of relativeFilePaths) {
    if (file === 'index.html') {
      hasIndex = true;
    } else if (file.startsWith('assets/')) {
      assets.push(file);
    } else {
      other.push(file);
    }
  }

  return {
    assets: assets.sort(),
    other: other.sort(),
    index: hasIndex ? 'index.html' : null,
  };
}

export function listRequiredDirectories(relativeFilePaths) {
  const dirs = new Set();
  for (const file of relativeFilePaths) {
    const parts = file.split('/').slice(0, -1);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      dirs.add(current);
    }
  }
  return [...dirs].sort((a, b) => {
    const depthDiff = a.split('/').length - b.split('/').length;
    return depthDiff !== 0 ? depthDiff : a.localeCompare(b);
  });
}

const SMB_LISTING_LINE =
  /^(.+?)\s+([ADHSRN]+)\s+\d+\s+\w{3}\s+\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4}$/;

export function parseSmbClientListing(output) {
  const files = [];
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    const match = line.match(SMB_LISTING_LINE);
    if (!match) continue;

    const [, name, attrs] = match;
    if (name === '.' || name === '..') continue;
    if (attrs.includes('D')) continue;

    files.push(name);
  }
  return files;
}
