#!/usr/bin/env node

import { UndoEngine } from '../dist/engine.js';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args[0] || 'help';

const engine = new UndoEngine(process.cwd());

switch (command) {
  case 'save':
  case 'checkpoint': {
    const res = engine.saveCheckpoint();
    console.log(`📸 Checkpoint saved: ${res.fileCount} files snapshot at ${new Date(res.timestamp).toLocaleTimeString()}`);
    break;
  }

  case 'rollback':
  case 'undo': {
    if (!engine.hasCheckpoint()) {
      console.error('Error: No checkpoint found in this workspace.');
      process.exit(1);
    }
    const res = engine.rollback();
    console.log(`⏪ Rollback complete:`);
    console.log(`   - Restored files: ${res.restoredFiles.length}`);
    console.log(`   - Removed ghost files: ${res.deletedGhostFiles.length}`);
    break;
  }

  case 'status': {
    const info = engine.getCheckpointInfo();
    if (!info) {
      console.log('No checkpoint found in this directory.');
    } else {
      console.log(`Active Checkpoint: ${info.fileCount} files, saved at ${new Date(info.timestamp).toLocaleString()}`);
    }
    break;
  }

  default:
    console.log('AI Undo - 1-Click Snapshot & Rollback for Coding Agents');
    console.log('Usage:');
    console.log('  npx ai-undo save      # Save checkpoint before AI prompt');
    console.log('  npx ai-undo rollback  # Restore files & delete AI ghost files');
    console.log('  npx ai-undo status    # Show current checkpoint details');
    break;
}
