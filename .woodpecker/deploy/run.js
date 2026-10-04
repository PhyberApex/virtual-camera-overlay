import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildUploadPlan,
  computeDirectoryHash,
  listFilesRecursive,
  listRequiredDirectories,
  parseSmbClientListing,
  planAssetDeletions,
  shouldSkipUpload,
} from './lib.js';

const DIST_DIR = path.resolve('dist');
const REMOTE_ROOT = 'www';
const HASH_FILENAME = '.deploy-hash';
const APP_CONFIG_FILENAME = 'app-config.json';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function smb(commands) {
  execFileSync(
    'smbclient',
    [
      `//${requireEnv('SMB_SHARE')}`,
      '-U',
      `${requireEnv('SMB_USER')}%${requireEnv('SMB_PASS')}`,
      '-c',
      commands,
    ],
    { stdio: 'inherit' }
  );
}

function smbCapture(commands) {
  return execFileSync('smbclient', [
    `//${requireEnv('SMB_SHARE')}`,
    '-U',
    `${requireEnv('SMB_USER')}%${requireEnv('SMB_PASS')}`,
    '-c',
    commands,
  ]).toString();
}

function fetchPreviousHash(workDir) {
  const localPath = path.join(workDir, HASH_FILENAME);
  try {
    smb(`cd ${REMOTE_ROOT}; prompt OFF; get ${HASH_FILENAME} "${localPath}"`);
  } catch {
    return null;
  }
  if (!existsSync(localPath)) return null;
  const content = readFileSync(localPath, 'utf8').trim();
  return content || null;
}

// mkdir errors when a directory already exists, which is the expected
// steady state after the first deploy — each attempt is best-effort.
function ensureRemoteDirectories(files) {
  for (const dir of listRequiredDirectories(files)) {
    try {
      smb(`cd ${REMOTE_ROOT}; prompt OFF; mkdir "${dir}"`);
    } catch {
      // already exists
    }
  }
}

function putFiles(files) {
  if (files.length === 0) return;
  ensureRemoteDirectories(files);
  const commands = [
    `cd ${REMOTE_ROOT}`,
    'prompt OFF',
    ...files.map(file => `put "${path.join(DIST_DIR, file)}" "${file}"`),
  ];
  smb(commands.join('; '));
}

function deleteStaleAssets(staleFiles) {
  if (staleFiles.length === 0) return;
  const commands = [
    `cd ${REMOTE_ROOT}/assets`,
    'prompt OFF',
    ...staleFiles.map(file => `del "${file}"`),
  ];
  smb(commands.join('; '));
}

function main() {
  const event = requireEnv('CI_PIPELINE_EVENT');
  const haToken = requireEnv('HA_TOKEN');

  const newHash = computeDirectoryHash(DIST_DIR, {
    exclude: [APP_CONFIG_FILENAME],
  });

  const workDir = mkdtempSync(path.join(tmpdir(), 'deploy-'));
  try {
    const previousHash = fetchPreviousHash(workDir);

    if (shouldSkipUpload({ event, previousHash, newHash })) {
      console.log(`Build output unchanged (hash ${newHash}); skipping upload.`);
      return;
    }

    writeFileSync(path.join(DIST_DIR, APP_CONFIG_FILENAME), JSON.stringify({ haToken }));

    const localFiles = listFilesRecursive(DIST_DIR);
    const plan = buildUploadPlan(localFiles);

    putFiles(plan.assets);
    putFiles(plan.other);
    if (plan.index) putFiles([plan.index]);

    const remoteAssetListing = smbCapture(`cd ${REMOTE_ROOT}/assets; prompt OFF; ls`);
    const remoteAssetFiles = parseSmbClientListing(remoteAssetListing);
    const localAssetFiles = plan.assets.map(file => path.posix.relative('assets', file));
    const staleAssets = planAssetDeletions(remoteAssetFiles, localAssetFiles);
    deleteStaleAssets(staleAssets);

    const hashPath = path.join(workDir, HASH_FILENAME);
    writeFileSync(hashPath, newHash);
    smb(`cd ${REMOTE_ROOT}; prompt OFF; put "${hashPath}" "${HASH_FILENAME}"`);

    console.log(`Deploy complete (hash ${newHash}).`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
