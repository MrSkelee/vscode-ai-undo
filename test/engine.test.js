import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UndoEngine } from '../dist/engine.js';

const TEST_DIR = path.resolve('test-sandbox');

test.before(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });

  fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), 'Original File 1');
  fs.writeFileSync(path.join(TEST_DIR, 'file2.txt'), 'Original File 2');
});

test.after(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test('Engine: saveCheckpoint creates checkpoint and auto-updates gitignore', () => {
  const engine = new UndoEngine(TEST_DIR);
  const res = engine.saveCheckpoint();

  // 2 files + auto-created .gitignore = 3 files
  assert.equal(res.fileCount, 3);
  assert.equal(engine.hasCheckpoint(), true);

  const gitignore = fs.readFileSync(path.join(TEST_DIR, '.gitignore'), 'utf-8');
  assert.ok(gitignore.includes('.ai-undo'));
});

test('Engine: rollback restores modified file content', () => {
  const engine = new UndoEngine(TEST_DIR);

  // AI modifies file1
  fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), 'Corrupted by AI');

  const rollbackRes = engine.rollback();
  assert.ok(rollbackRes.restoredFiles.includes('file1.txt'));

  const restoredContent = fs.readFileSync(path.join(TEST_DIR, 'file1.txt'), 'utf-8');
  assert.equal(restoredContent, 'Original File 1');
});

test('Engine: rollback deletes ghost files created by AI', () => {
  const engine = new UndoEngine(TEST_DIR);

  // AI creates 2 ghost files
  const ghost1 = path.join(TEST_DIR, 'temp_ai_script.js');
  const ghost2 = path.join(TEST_DIR, 'trash.tmp');
  fs.writeFileSync(ghost1, 'console.log("ai");');
  fs.writeFileSync(ghost2, 'temp');

  assert.equal(fs.existsSync(ghost1), true);

  const rollbackRes = engine.rollback();
  assert.ok(rollbackRes.deletedGhostFiles.includes('temp_ai_script.js'));
  assert.ok(rollbackRes.deletedGhostFiles.includes('trash.tmp'));

  // Ghost file is deleted
  assert.equal(fs.existsSync(ghost1), false);
  assert.equal(fs.existsSync(ghost2), false);
});

test('Engine: rollback recreates accidentally deleted files', () => {
  const engine = new UndoEngine(TEST_DIR);

  // AI accidentally deletes file2.txt
  fs.unlinkSync(path.join(TEST_DIR, 'file2.txt'));
  assert.equal(fs.existsSync(path.join(TEST_DIR, 'file2.txt')), false);

  const rollbackRes = engine.rollback();
  assert.ok(rollbackRes.restoredFiles.includes('file2.txt'));
  assert.equal(fs.existsSync(path.join(TEST_DIR, 'file2.txt')), true);
  assert.equal(fs.readFileSync(path.join(TEST_DIR, 'file2.txt'), 'utf-8'), 'Original File 2');
});
