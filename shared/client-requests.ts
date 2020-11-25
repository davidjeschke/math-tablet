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

// TODO: Version the client/server API so if they get out of sync the user gets an error
//       message instead of a server or client crash.

// Requirements

import { CellId, CellRelativePosition, CellType, InputType } from "./cell";
import { CssSize, PlainText } from "./common";
import { FolderPath, NotebookPath, FolderName, NotebookName, } from "./folder";
import { StrokeId } from "./stylus";
import { Stroke } from "./myscript-types";
// Types

export type RequestId = '{RequestId}';

export type ClientRequest = FolderRequest|NotebookRequest;
interface RequestBase {
  requestId?: RequestId; // TYPESCRIPT: always added on at the end before sending. How to capture this?
}

// Client Folder Requests

export type FolderRequest =
  ChangeFolder |
  CloseFolder |
  OpenFolder;
interface FolderRequestBase extends RequestBase {
  type: 'folder';
  path: FolderPath;
}
export interface ChangeFolder extends FolderRequestBase {
  operation: 'change';
  changeRequests: FolderChangeRequest[];
}
export interface CloseFolder extends FolderRequestBase {
  operation: 'close';
  reason: string;
}
export interface OpenFolder extends FolderRequestBase {
  operation: 'open';
}

// Client Notebook Requests

export type NotebookRequest =
  ChangeNotebook |
  CloseNotebook |
  OpenNotebook |
  UseTool;
interface NotebookRequestBase extends RequestBase {
  type: 'notebook';
  path: NotebookPath;
}
export interface ChangeNotebook extends NotebookRequestBase {
  operation: 'change';
  changeRequests: NotebookChangeRequest[];
}
export interface CloseNotebook extends NotebookRequestBase {
  operation: 'close';
  reason: string;
}
export interface OpenNotebook extends NotebookRequestBase {
  operation: 'open';
}
export interface UseTool extends NotebookRequestBase {
  operation: 'useTool';
  cellId: CellId;
}

// Client Folder Change Requests

export type FolderChangeRequest =
  FolderCreateRequest|
  FolderDeleteRequest|
  FolderRenameRequest|
  NotebookCreateRequest|
  NotebookDeleteRequest|
  NotebookRenameRequest;
export interface FolderCreateRequest {
  type: 'createFolder';
  name: FolderName;
}
export interface FolderDeleteRequest {
  type: 'deleteFolder';
  name: FolderName;
}
export interface FolderRenameRequest {
  type: 'renameFolder';
  name: FolderName;
  newName: FolderName;
}
export interface NotebookCreateRequest {
  type: 'createNotebook';
  name: NotebookName;
}
export interface NotebookDeleteRequest {
  type: 'deleteNotebook';
  name: NotebookName;
}
export interface NotebookRenameRequest {
  type: 'renameNotebook';
  name: NotebookName;
  newName: NotebookName;
}

// Client Notebook Change Requests

export type NotebookChangeRequest =
  ChangeText |
  DeleteCell |
  DeleteStroke |
  InsertCell |
  InsertStroke |
  MoveCell |
  ResizeCell;
export interface DeleteCell {
  type: 'deleteCell';
  cellId: CellId;
}
export interface DeleteStroke {
  type: 'deleteStroke';
  cellId: CellId;
  strokeId: StrokeId;
}
export interface InsertCell {
  type: 'insertCell';
  cellType: CellType;
  inputType: InputType;
  afterId: CellRelativePosition;
}
export interface InsertStroke {
  type: 'insertStroke';
  cellId: CellId;
  stroke: Stroke;
}
export interface ChangeText {
  type: 'keyboardInputChange';
  cellId: CellId;
  start: number;          // 0-based index of first character to replace.
  end: number;            // 0-based index of character after last character to replace.
  replacement: PlainText; // Replacement text.
  value: PlainText;          // Full value of input text, may be able to eliminate.
}
export interface MoveCell {
  type: 'moveCell';
  cellId: CellId;
  afterId: CellRelativePosition;
}
export interface ResizeCell {
  type: 'resizeCell';
  cellId: CellId;
  cssSize: CssSize;
}