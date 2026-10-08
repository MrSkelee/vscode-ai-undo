import * as vscode from 'vscode';
import path from 'node:path';
import { UndoEngine } from './engine.js';

let statusBarItem: vscode.StatusBarItem;

function getEngine(): UndoEngine | null {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return new UndoEngine(folders[0].uri.fsPath);
  }
  const activeDoc = vscode.window.activeTextEditor?.document;
  if (activeDoc && activeDoc.uri.scheme === 'file') {
    return new UndoEngine(path.dirname(activeDoc.uri.fsPath));
  }
  return null;
}

function updateStatusBar() {
  const eng = getEngine();
  if (!eng || !statusBarItem) return;

  const info = eng.getCheckpointInfo();
  if (info) {
    const time = new Date(info.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    statusBarItem.text = `$(history) AI Undo (${time})`;
    statusBarItem.tooltip = `Checkpoint saved at ${time} (${info.fileCount} files). Click to rollback or save new.`;
  } else {
    statusBarItem.text = `$(camera) AI Checkpoint`;
    statusBarItem.tooltip = `No checkpoint saved. Click to save before AI edits.`;
  }
  statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ai-undo.rollback';
  context.subscriptions.push(statusBarItem);

  const saveCommand = vscode.commands.registerCommand('ai-undo.saveCheckpoint', async () => {
    const eng = getEngine();
    if (!eng) {
      vscode.window.showErrorMessage('AI Undo: Open a workspace folder first.');
      return;
    }

    // Save all dirty in-memory buffers before checkpoint
    await vscode.workspace.saveAll(false);

    const res = eng.saveCheckpoint();
    updateStatusBar();
    vscode.window.showInformationMessage(`📸 AI Checkpoint saved: ${res.fileCount} files protected.`);
  });

  const rollbackCommand = vscode.commands.registerCommand('ai-undo.rollback', async () => {
    const eng = getEngine();
    if (!eng) {
      vscode.window.showErrorMessage('AI Undo: Open a workspace folder first.');
      return;
    }

    if (!eng.hasCheckpoint()) {
      const choice = await vscode.window.showInformationMessage(
        'No checkpoint found. Would you like to create one now?',
        'Save Checkpoint'
      );
      if (choice === 'Save Checkpoint') {
        vscode.commands.executeCommand('ai-undo.saveCheckpoint');
      }
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      'Rollback all AI changes to last checkpoint? (This will restore modified files and remove newly created ghost files).',
      { modal: true },
      'Rollback Now'
    );

    if (confirm !== 'Rollback Now') return;

    try {
      const result = eng.rollback();
      updateStatusBar();

      // Refresh opened documents in editor
      for (const editor of vscode.window.visibleTextEditors) {
        try {
          const doc = editor.document;
          if (doc.isDirty) {
            await doc.save();
          }
        } catch {
          // Ignore
        }
      }

      vscode.window.showInformationMessage(
        `⏪ AI Undo complete: restored ${result.restoredFiles.length} files, removed ${result.deletedGhostFiles.length} ghost files.`
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(`AI Undo Error: ${err.message}`);
    }
  });

  const showDiffCommand = vscode.commands.registerCommand('ai-undo.showDiff', async () => {
    const eng = getEngine();
    if (!eng || !eng.hasCheckpoint()) {
      vscode.window.showInformationMessage('No active checkpoint to compare with.');
      return;
    }
    vscode.commands.executeCommand('workbench.view.scm');
  });

  context.subscriptions.push(saveCommand, rollbackCommand, showDiffCommand);
  updateStatusBar();
}

export function deactivate() {
  if (statusBarItem) statusBarItem.dispose();
}
