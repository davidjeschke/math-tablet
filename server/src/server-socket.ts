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

// TODO: use error-handler/reportError

import { Server } from "http";

import * as debug1 from "debug";
import { Request } from "express";
import * as WebSocket from "ws";

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.
import { assert, PromiseResolver, errorMessageForUser } from "./shared/common";
import { ClientRequest, } from "./shared/client-requests";
import { ServerResponse, ErrorResponse, } from "./shared/server-responses";

import { logError, logWarning } from "./error-handler";
import { ServerFolder } from "./server-folder";
import { ServerNotebook } from "./server-notebook";
import { clientMessageSynopsis, serverMessageSynopsis } from "./shared/debug-synopsis";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

export type ClientId = string;

// interface FolderWatchersObject {
//   [ path: /* TYPESCRIPT: FolderPath */string ]: FolderWatcher;
// }

// interface NotebookWatchersObject {
//   [ path: /* TYPESCRIPT: FolderPath */string ]: NotebookWatcher;
// }

// Constants

// const CLOSE_TIMEOUT_IN_MS = 5000;

// Exported Class

export class ServerSocket {

  // Public Class Properties

  public static get allInstances(): IterableIterator<ServerSocket> {
    return this.instanceMap.values();
  }

  // Public Class Methods

  public static close(id: ClientId, code?: number, reason?: string): Promise<void> {
    const instance = this.instanceMap.get(id);
    if (!instance) { throw new Error(`Unknown client socket ${id} requested in close.`); }
    return instance.close(code, reason);
  }

  public static initialize(server: Server): void {
    debug("Initialize");
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws: WebSocket, req: Request)=>{ this.onConnection(ws, req); });
  }

  // Public Instance Properties

  public id: ClientId;

  // Public Instance Property Functions

  // Public Instance Methods

  // public get allFolderWatchers(): FolderWatchersObject {
  //   const rval: FolderWatchersObject = {};
  //   for (const [key, val] of this.folderWatchers.entries()) { rval[key] = val; }
  //   return rval;
  // }

  // public get allNotebookWatchers(): NotebookWatchersObject {
  //   const rval: NotebookWatchersObject = {};
  //   for (const [key, val] of this.notebookWatchers.entries()) { rval[key] = val; }
  //   return rval;
  // }

  public close(code?: number, reason?: string): Promise<void> {
    // See https://github.com/Luka967/websocket-close-codes.
    // REVIEW: Can a close fail? That is, can we make a socket.close() call
    //         and never receive a 'close' event? (e.g. get 'error' event instead.)
    if (!this.closePromise) {
      if (this.socket.readyState != WebSocket.CLOSED) {
        // const notify = (this.socket.readyState == WebSocket.OPEN);
        ServerNotebook.onSocketClosed(this);
        ServerFolder.onSocketClosed(this);
        this.closePromise = new Promise((resolve, reject)=>{ this.closeResolver = { resolve, reject }; });
        if (this.socket.readyState != WebSocket.CLOSING) {
          debug(`Socket closing: ${this.id}`);
          this.socket.close(code, reason);
        } else {
          logWarning(MODULE, `Closing socket that is closing: ${this.id}.`)
        }
      } else {
        logWarning(MODULE , `Closing socket that is already closed: ${this.id}`)
        this.closePromise = Promise.resolve();
      }
    } else {
      // REVIEW: This may not be an error.
      logWarning(MODULE, `Repeat close call: ${this.id}`);
      return this.closePromise;
    }
    return this.closePromise;
  }

  // public closeNotebook(path: NotebookPath, notify: boolean): void {
  //   assert(!notify);  // REVIEW: Why have the parameter if it can only be false?
  //   const watcher = this.notebookWatchers.get(path)!;
  //   assert(watcher);
  //   this.notebookWatchers.delete(path);
  //   watcher.close();
  // }

  // public notifyNotebookChanged(
  //   path: NotebookPath,
  //   changes: NotebookChange[],
  //   undoChangeRequests: NotebookChangeRequest[]|undefined,
  //   requestId?: RequestId,
  //   complete?: boolean,
  // ): void {
  //   // ServerNotebook is notifying us that there are changes to the notebook.
  //   assert(this.notebookWatchers.get(path))
  //   const msg: NotebookChangedResponse = { type: 'notebook', operation: 'updated', path, changes, complete, requestId, undoChangeRequests };
  //   this.sendMessage(msg);
  // }

  // public removeFolderWatcher(path: FolderPath): void {
  //   // Called by watcher when the folder is closed from the server side.
  //   const had = this.folderWatchers.delete(path);
  //   assert(had);
  // }

  // public removeNotebookWatcher(path: NotebookPath): void {
  //   // Called by watcher when the notebook is closed from the server side.
  //   const had = this.notebookWatchers.delete(path);
  //   assert(had);
  // }

  public sendMessage(msg: ServerResponse): void {
    // Should only be called by our watchers.

    debug(`Sent: ${this.id} ${serverMessageSynopsis(msg)}`);
    // console.dir(msg, { depth: null });
    const json = JSON.stringify(msg);
    try {
      // REVIEW: Should we check ws.readyState
      // REVIEW: Should we use the callback to see if the message went through?
      this.socket.send(json);
    } catch(err) {
      logError(err, "Error sending websocket message: ReadyState ${this.socket.readyState}");
    }
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static instanceMap: Map<ClientId, ServerSocket> = new Map();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      debug(`New connection: ${req.url}`);
      // TODO: Client generate ID and send it with connection.
      const id: ClientId = `C${Date.now()}`;
      const instance = new this(id, ws);
      this.instanceMap.set(id, instance);
    } catch(err) {
      logError(err, "Web Socket: unexpected error handling web-socket connection event.");
    }
  }

  // Private Constructor

  private constructor(id: ClientId, ws: WebSocket) {
    debug(`Constructor`)
    this.id = id;
    this.socket = ws;
    // this.folderWatchers = new Map();
    // this.notebookWatchers = new Map();
    ws.on('close', (code: number, reason: string) => this.wsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.wsError(ws, err))
    ws.on('message', (message: string) => this.wsMessage(ws, message));
  }

  // Private Instance Properties

  private closePromise?: Promise<void>;
  private closeResolver?: PromiseResolver<void>;
  // private folderWatchers: Map<FolderPath, FolderWatcher>
  // private notebookWatchers: Map<NotebookPath, NotebookWatcher>;
  private socket: WebSocket;

  // Private Instance Methods

  // private closeAllFolders(notify: boolean): void {
  //   for (const path of this.folderWatchers.keys()) { this.closeFolder(path, notify); }
  // }

  // private closeFolder(path: FolderPath, notify: boolean): void {
  //   assert(!notify);  // REVIEW: Why have the parameter if it can only be false?
  //   const watcher = this.folderWatchers.get(path)!;
  //   assert(watcher);
  //   this.folderWatchers.delete(path);
  //   watcher.close();
  // }

  // private closeAllNotebooks(notify: boolean): void {
  //   for (const path of this.notebookWatchers.keys()) { this.closeNotebook(path, notify); }
  // }

  // Private Instance Event Handlers

  private async onClientRequest(msg: ClientRequest): Promise<void> {
    debug(`Recd: ${this.id} ${clientMessageSynopsis(msg)}`);
    switch(msg.type) {
      case 'folder': ServerFolder.onClientRequest(this, msg); break;
      case 'notebook': ServerNotebook.onClientRequest(this, msg); break;
      default: assert(false); break;
    }
  }

  private wsClose(_ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      if (this.closeResolver) {
        debug(`Socket closed by server: ${code} '${reason}'`);
        this.closeResolver.resolve();
      } else {
        debug(`Socket closed by client: ${code} '${reason}'`);
        ServerFolder.onSocketClosed(this);
        ServerNotebook.onSocketClosed(this);
      }
      ServerSocket.instanceMap.delete(this.id);
    } catch(err) {
      logError(err, "Client Socket: Unexpected error handling web-socket close.");
    }
  }

  private wsError(_ws: WebSocket, err: Error): void {
    try {
      // TODO: What to do in this case? Close the connection?
      logError(err, "Client Socket: web socket error: ${this.id}.");
      // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
    } catch(err) {
      logError(err, "Client Socket: Unexpected error handling web-socket error.");
    }
  }

  private wsMessage(_ws: WebSocket, message: WebSocket.Data): void {
    let msg: ClientRequest;
    try {
      msg = JSON.parse(message.toString());
    } catch(err) {
      logError(err, `Client Socket: invalid JSON in message received from client.`);
      return;
    }
    this.onClientRequest(msg).catch(err=>{
      logError(err, `Client Socket: unexpected error processing client ${msg.type}/${msg.operation} message.`);
      if (msg.requestId) {
        const response: ErrorResponse = {
          requestId: msg.requestId,
          type: 'error',
          message: errorMessageForUser(err),
          complete: true,
        };
        this.sendMessage(response);
      }
    });
  }

}

// // Helper Classes

// class FolderWatcher implements ServerFolderWatcher {

//   // Public Class Methods

//   public static async open(
//     socket: ServerSocket,
//     msg: OpenFolder
//   ): Promise<{ watcher: FolderWatcher, obj: FolderObject }> {
//     const watcher = new this(socket);
//     const folder = watcher.folder = await ServerFolder.open(msg.path, { mustExist: true, watcher });
//     const obj = folder.toJSON();
//     return { watcher, obj };
//   }

//   // Public Instance Properties

//   public folder!: ServerFolder;
//   public socket: ServerSocket;

//   // Public Instance Methods

//   public close(): void {
//     this.folder.close(this);
//   }

//   // ServerFolderWatcher Interface

//   public onChange(_change: FolderChange): void {}

//   public onChanged(msg: FolderChangedResponse): void {
//     // ServerFolder is notifying us that the batch of changes is complete.
//     this.socket.sendMessage(msg);
//   }

//   public onClosed(reason: string): void {
//     // ServerFolder is notifying us that the folder is being closed on the server end.
//     const msg: FolderClosedResponse = { type: 'folder', operation: 'closed', path: this.folder.path, reason, complete: true };
//     this.socket.sendMessage(msg);
//     this.socket.removeFolderWatcher(this.folder.path);
//     // TODO: Remove from folderWatchers?
//   }

//   // Event Handlers

//   public async onFolderChangeMessage(msg: ChangeFolder): Promise<FolderChangedResponse> {
//     return await this.folder.onFolderChangeMessage(this, msg);
//   }

//   // --- PRIVATE ---

//   // Private Constructor

//   private constructor(socket: ServerSocket) {
//     // this.folder assigned asynchronously in 'open'.
//     this.socket = socket;
//   }

//   // Private Instance Properties

// }

// class NotebookWatcher implements ServerNotebookWatcher {

//   // Public Class Methods

//   public static async open(
//     socket: ServerSocket,
//     msg: OpenNotebook
//   ): Promise<{ watcher: NotebookWatcher, obj: NotebookObject }> {
//     const watcher = new this(socket);
//     const notebook = watcher.notebook = await ServerNotebook.open(msg.path, { mustExist: true, watcher });
//     const obj = notebook.toJSON();
//     return { watcher, obj };
//   }

//   // Public Instance Properties

//   public notebook!: ServerNotebook;
//   public socket: ServerSocket;

//   // Public Instance Methods

//   public close(): void {
//     this.notebook.close(this);
//   }

//   // ServerNotebookWatcher Interface

//   public onChange(_change: NotebookChange): void { };

//   public onChanged(msg: NotebookChangedResponse): void {
//     // ServerNotebook is notifying us that the batch of changes is complete.
//     this.socket.sendMessage(msg);
//   }

//   public onClosed(reason: string): void {
//     // ServerNotebook is notifying us that the folder is being closed on the server end.
//     const msg: NotebookClosedResponse = { type: 'notebook', operation: 'closed', path: this.notebook.path, reason, complete: true };
//     this.socket.sendMessage(msg);
//     this.socket.removeNotebookWatcher(this.notebook.path);
//     // TODO: Remove from folderWatchers?
//   }

//   // Event Handlers

//   public onNotebookChangeMessage(msg: ChangeNotebook): void {
//     // .requestChanges('USER', msg.changeRequests, options);
//     this.notebook.onNotebookChangeMessage(this, msg);
//   }

//   public onNotebookUseToolMessage(msg: UseTool): void {
//     // .requestChanges('USER', msg.changeRequests, options);
//     this.notebook.onNotebookUseToolMessage(this, msg);
//   }

//   // --- PRIVATE ---

//   // Private Constructor

//   private constructor(socket: ServerSocket) {
//     // this.folder assigned asynchronously in 'open'.
//     this.socket = socket;
//   }

//   // Private Instance Properties

// }

// Helper Functions
