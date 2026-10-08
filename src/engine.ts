import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set([
  '.git',
  '.ai-undo',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  '.venv',
  '__pycache__',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
]);

export interface SnapshotManifest {
  timestamp: string;
  files: Record<string, string>; // relativePath -> content
}

export interface RollbackResult {
  restoredFiles: string[];
  deletedGhostFiles: string[];
  totalChanges: number;
}

export class UndoEngine {
  private workspaceRoot: string;
  private storageDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.storageDir = path.join(this.workspaceRoot, '.ai-undo');
  }

  private ensureGitignore(): void {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        if (!content.includes('.ai-undo')) {
          fs.appendFileSync(gitignorePath, '\n.ai-undo/\n');
        }
      } else {
        fs.writeFileSync(gitignorePath, '.ai-undo/\n');
      }
    } catch {
      // Ignore if readonly or inaccessible
    }
  }

  public collectFiles(currentDir: string = this.workspaceRoot): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          results.push(...this.collectFiles(fullPath));
        }
      } else if (entry.isFile()) {
        if (!IGNORED_FILES.has(entry.name)) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  public saveCheckpoint(): { fileCount: number; timestamp: string } {
    this.ensureGitignore();
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    const allFiles = this.collectFiles();
    const manifest: SnapshotManifest = {
      timestamp: new Date().toISOString(),
      files: {},
    };

    for (const file of allFiles) {
      try {
        const rel = path.relative(this.workspaceRoot, file).replace(/\\/g, '/');
        const content = fs.readFileSync(file, 'utf-8');
        manifest.files[rel] = content;
      } catch {
        // Skip unreadable files
      }
    }

    const manifestPath = path.join(this.storageDir, 'checkpoint.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf-8');

    return {
      fileCount: Object.keys(manifest.files).length,
      timestamp: manifest.timestamp,
    };
  }

  public hasCheckpoint(): boolean {
    const manifestPath = path.join(this.storageDir, 'checkpoint.json');
    return fs.existsSync(manifestPath);
  }

  public getCheckpointInfo(): { timestamp: string; fileCount: number } | null {
    const manifestPath = path.join(this.storageDir, 'checkpoint.json');
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const data = JSON.parse(raw) as SnapshotManifest;
      return {
        timestamp: data.timestamp,
        fileCount: Object.keys(data.files).length,
      };
    } catch {
      return null;
    }
  }

  public rollback(): RollbackResult {
    const manifestPath = path.join(this.storageDir, 'checkpoint.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('No checkpoint found to rollback to.');
    }

    const manifest: SnapshotManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const restoredFiles: string[] = [];
    const deletedGhostFiles: string[] = [];

    // 1. Detect and delete ghost files created after the checkpoint
    const currentFiles = this.collectFiles();
    for (const file of currentFiles) {
      const rel = path.relative(this.workspaceRoot, file).replace(/\\/g, '/');
      if (!(rel in manifest.files)) {
        try {
          fs.unlinkSync(file);
          deletedGhostFiles.push(rel);
        } catch {
          // Ignore
        }
      }
    }

    // 2. Restore modified or deleted files
    for (const [relPath, savedContent] of Object.entries(manifest.files)) {
      const fullPath = path.join(this.workspaceRoot, relPath);
      let needsRestore = true;

      if (fs.existsSync(fullPath)) {
        try {
          const currentContent = fs.readFileSync(fullPath, 'utf-8');
          if (currentContent === savedContent) {
            needsRestore = false;
          }
        } catch {
          needsRestore = true;
        }
      }

      if (needsRestore) {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(fullPath, savedContent, 'utf-8');
        restoredFiles.push(relPath);
      }
    }

    return {
      restoredFiles,
      deletedGhostFiles,
      totalChanges: restoredFiles.length + deletedGhostFiles.length,
    };
  }
}
