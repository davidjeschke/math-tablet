/*
Math Tablet
Copyright (C) 2019 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// TODO: Watch folder on disk. Generate change notifications if things are created, deleted, or renamed.
// TODO: Folder lifecycle. When and how are folders that are no longer used cleaned up?
// REVIEW: Where should we be checking if this.terminated is set?
``
// Requirements

import * as debug1 from "debug";
import { join } from "path";

import { assert, notImplemented } from "./shared/common";
import {
  Folder, FolderEntry, FolderName, FolderObject, FolderPath, FOLDER_PATH_RE, NotebookEntry,
  NotebookName, NotebookPath, FolderWatcher,
} from "./shared/folder";
import { ChangeFolder, CloseFolder, FolderRequest, OpenFolder, RequestId } from "./shared/client-requests";
import { FolderUpdated, FolderOpened, FolderResponse, FolderUpdate } from "./shared/server-responses";

import { AbsDirectoryPath, ROOT_DIR_PATH, dirStat, mkDir, readDir, rename, rmDir } from "./adapters/file-system";
import { ServerNotebook, notebookPath } from "./server-notebook";
import { OpenOptions } from "./shared/watched-resource";
import { logWarning } from "./error-handler";
import { ServerSocket } from "./server-socket";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);


// Types

export interface OpenFolderOptions extends OpenOptions<ServerFolderWatcher> {
  ephemeral?: boolean;    // true iff notebook not persisted to the file system and disappears after last close.
}

export interface ServerFolderWatcher extends FolderWatcher {
  onChanged(msg: FolderUpdated): void;
}

// Exported Class

export class ServerFolder extends Folder<ServerFolderWatcher> {

  // Public Class Properties

  public static nameFromPath(path: FolderPath): FolderName {
    const match = FOLDER_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid folder path: ${path}`); }
    return <FolderName>match[2] || 'Root'; // REVIEW: Could use user name for the Root folder?
  }

  // Public Class Property Functions

  // Public Class Methods

  // Public Class Properties

  public static get allInstances(): ServerFolder[] /* LATER: IterableIterator<ServerFolder> */{
    // LATER: ServerFolder.instanceMap should only have folders, not notebooks and folders.
    return <ServerFolder[]>Array.from(this.instanceMap.values()).filter(r=>r instanceof ServerFolder);
  }

  public static async delete(path: FolderPath): Promise<void> {
    this.close(path, "Folder is deleted"); // no-op if the folder is not open.
    const absPath = absDirPathFromFolderPath(path);
    debug(`Deleting folder directory ${absPath}`);
    await rmDir(absPath); // TODO: Handle failure.
  }

  public static async move(oldPath: FolderPath, newPath: FolderPath): Promise<FolderEntry> {
    // Called by the containing ServerFolder when one of its subfolders is renamed.

    const oldAbsPath = absDirPathFromFolderPath(oldPath);
    const newAbsPath = absDirPathFromFolderPath(newPath);

    await this.close(newPath, `Folder moving to ${newPath}`);

    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await rename(oldAbsPath, newAbsPath);

    return { path: newPath, name: this.nameFromPath(newPath) }
  }

  public static open(path: FolderPath, options: OpenFolderOptions): Promise<ServerFolder> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  public static validateFolderName(name: FolderName): void {
    if (!this.isValidFolderName(name)) { throw new Error(`Invalid folder name: ${name}`); }
  }

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    // Called by ServerSocket when a client sends a folder request.
    let instance = </* TYPESCRIPT: shouldn't have to cast. */ServerFolder>this.instanceMap.get(msg.path);
    if (!instance && msg.operation == 'open') {
      instance = await this.open(msg.path, { mustExist: true });
    }
    assert(instance);
    await instance.onClientRequest(socket, msg);
  }

  public static onSocketClosed(socket: ServerSocket): void {
    // REVIEW: If the server has a large number of folder instances, then
    //         we may want to create a map from sockets to lists of folder instances
    //         so we can handle this more efficiently.
    for (const instance of this.allInstances) {
      instance.onSocketClosed(socket);
    }
  }

  // Public Instance Methods

  // Public Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Property Functions

  protected static getInstance(path: FolderPath): ServerFolder {
    return <ServerFolder>super.getInstance(path);
  }

  // Private Class Methods

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: FolderPath, _options: OpenFolderOptions) {
    super(path);
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  private sockets: Set<ServerSocket>;

  // Private Instance Property Functions

  // Private Instance Methods

  protected async initialize(options: OpenFolderOptions): Promise<void> {
    if (options.mustExist) {
      const absPath = absDirPathFromFolderPath(this.path);
      debug(`Opening folder from filesystem: "${absPath}"`)
      const listings = await readDir(absPath);
      const notebooks: NotebookEntry[] = [];
      const folders: FolderEntry[] = [];

      const suffix = ServerNotebook.NOTEBOOK_DIR_SUFFIX;
      const suffixLen = suffix.length;

      for (const listing of listings) {

        // Skip hidden files and folders
        if (listing.startsWith(".")) { /* skip hidden */ continue; }

        // Skip non-directories
        const stats = await(dirStat(join(absPath, listing)));
        if (!stats.isDirectory()) { continue; }

        // Notebooks are directories that end with .mtnb.
        // Folders are all other directories.
        if (listing.endsWith(suffix)) {
          const nameWithoutSuffix: NotebookName = <NotebookName>listing.slice(0, -suffixLen);
          if (!ServerNotebook.isValidNotebookName(nameWithoutSuffix)) {
            logWarning(MODULE, `Skipping notebook with invalid name: '${listing}'`);
            continue;
          }
          notebooks.push({ name: nameWithoutSuffix, path: <NotebookPath>`${this.path}${listing}` })
        } else {
          if (!ServerFolder.isValidFolderName(<FolderName>listing)) {
            logWarning(MODULE, `Skipping folder with invalid name: '${listing}'`);
            continue;
          }
          folders.push({ name: <FolderName>listing, path: <FolderPath>`${this.path}${listing}/` })
        }
      }

      const obj: FolderObject = {
        path: this.path,
        folders,
        notebooks,
      };
      this.initializeFromObject(obj);
    } else {
      assert(false);
    }
  }

  private removeSocket(socket: ServerSocket): void {
    const hadSocket = this.sockets.delete(socket);
    assert(hadSocket);
    if (this.sockets.size == 0) {
      // TODO: purge this folder immediately or set a timer to purge it in the near future.
      notImplemented();
    }
  }

  private sendUpdateToAllSockets(update: FolderResponse, originatingSocket?: ServerSocket, requestId?: RequestId): void {
    for (const socket of this.sockets) {
      if (socket === originatingSocket) {
        socket.sendMessage({ requestId, ...update });
      } else {
        socket.sendMessage(update);
      }
    }
  }

  protected terminate(reason: string): void {
    super.terminate(reason);
  }

  // Private Instance Event Handlers

  private async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    assert(!this.terminated);
    switch(msg.operation) {
      case 'change': this.onChangeRequest(socket, msg); break;
      case 'close':  this.onCloseRequest(socket, msg); break;
      case 'open':  this.onOpenRequest(socket, msg); break;
      default: assert(false); break;
    }
  }

  private onSocketClosed(socket: ServerSocket): void {
    if (this.sockets.has(socket)) {
      this.removeSocket(socket);
    }
  }

  // Client Message Event Handlers

  private async onChangeRequest(socket: ServerSocket, request: ChangeFolder): Promise<void> {
    // TODO: Undo?

    const changes: FolderUpdate[] = [];
    assert(request.changeRequests.length>0);
    for (const changeRequest of request.changeRequests) {
      let change: FolderUpdate;
      switch (changeRequest.type) {
        case 'createFolder': {
          const name = changeRequest.name;
          ServerFolder.validateFolderName(name)
          const path = childFolderPath(this.path, name);
          debug(`Creating folder: ${path}`);
          const absPath = absDirPathFromFolderPath(path);
          console.log(absPath);
          await mkDir(absPath);  // TODO: Handle failure.
          change = { type: 'folderCreated', entry: { name, path }};
          break;
        }
        case 'createNotebook': {
          const name = changeRequest.name;
          ServerNotebook.validateNotebookName(name);
          const path = notebookPath(this.path, name);
          debug(`Creating notebook: ${path}`);
          const notebook = await ServerNotebook.open(path, { mustNotExist: true });
          notebook.close();
          debug(`Notebook created.`);
          change = { type: 'notebookCreated', entry: { name, path }};
          break;
        }
        case 'deleteFolder': {
          const name = changeRequest.name;
          const path = childFolderPath(this.path, name);
          ServerFolder.delete(path);
          change = { type: 'folderDeleted', entry: { name, path }};
          break;
        }
        case 'deleteNotebook': {
          const name = changeRequest.name;
          const path = notebookPath(this.path, name);
          await ServerNotebook.delete(path);
          change = { type: 'notebookDeleted', entry: { name, path }};
          break;
        }
        case 'renameFolder': {
          const oldName = changeRequest.name;
          const oldPath = childFolderPath(this.path, oldName);
          const newPath = childFolderPath(this.path, changeRequest.newName);
          const entry = await ServerFolder.move(oldPath, newPath);
          change = { type: 'folderRenamed', entry, oldName };
          break;
        }
        case 'renameNotebook': {
          const oldName = changeRequest.name;
          const oldPath = notebookPath(this.path, oldName);
          const newPath = notebookPath(this.path, changeRequest.newName);
          const entry = await ServerNotebook.move(oldPath, newPath);
          change = { type: 'notebookRenamed', entry, oldName };
          break;
        }
      }

      // REVIEW: Apply delete changes after notification?
      this.applyChange(change, false);
      changes.push(change);
    }
    const update: FolderUpdated = { type: 'folder', operation: 'updated', path: this.path, updates: changes, complete: true };
    this.sendUpdateToAllSockets(update, socket, request.requestId);
  }

  private onCloseRequest(socket: ServerSocket, _msg: CloseFolder): void {
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    // NOTE: No response is expected for a close request.
  }

  private onOpenRequest(socket: ServerSocket, msg: OpenFolder): void {
    this.sockets.add(socket);
    const obj = this.toJSON();
    const response: FolderOpened = {
      requestId: msg.requestId,
      type: 'folder',
      operation: 'opened',
      path: this.path,
      obj,
      complete: true
    };
    socket.sendMessage(response);
  }

}

// Exported Functions

// REVIEW: Which of these should be class and instance methods or properties?

// REVIEW: Memoize or save in global?
export function rootDir(): AbsDirectoryPath {
  return ROOT_DIR_PATH;
}

// Helper Functions

function absDirPathFromFolderPath(path: FolderPath): AbsDirectoryPath {
  const pathSegments = path.split('/').slice(1, -1);
  return join(ROOT_DIR_PATH, ...pathSegments);
}

function childFolderPath(path: FolderPath, name: FolderName): FolderPath {
  return <FolderPath>`${path}${name}/`;
}

// function parentFolderPath(path: FolderPath): FolderPath {
//   if (<string>path == '/') { throw new Error("Root folder does not have a parent folder."); }
//   const pathSegments = path.split('/');
//   pathSegments.splice(-2, 1); // Modifies pathSegments as a side-effect.
//   return <FolderPath>pathSegments.join('/');
// }
