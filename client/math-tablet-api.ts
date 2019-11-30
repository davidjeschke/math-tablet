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

// Requirements

import { RelationshipProperties, StyleProperties, StyleId, NotebookChange, NotebookObject, StyleRelativePosition } from './notebook.js';

// Types

export type ImageData = string;
export type LatexData = string;
export type MathJsData = string;
export type MathMlData = string;
export type MthMtcaData = string;
export type Symbol = string;
export type TextData = string;
export type Tracker = string; // Tracking identifier supplied by the client.
export type WolframData = string;

export interface SymbolData {
  name: string;
  value?: string;
}

// Just the name of the notebook, no .mtnb extension.
export type NotebookName = string;

// MyScript Types

export type ToolName = string;
export interface ToolInfo {
  name: ToolName;
  // REVIEW: This is a sum type, not a product type.
  //         i.e. we use either the html field or the tex field but never both.
  html?: /* TYPESCRIPT: Html? */ string;
  tex?: LatexData;
  data?: any; // Black-box info that gets passed back to tool creator when tool is used.
}

export interface RelationshipPropertiesMap {
  [id: /* StyleId */number]: RelationshipProperties;
}
// RLR -- I'm not sure what the preferred TypeScript style here
// is. I'm trying ot allow "options" which are not required. Later
// these options might be elevated to properties of the MEANING
// themselves. At present, I just want a boolean
// "exclusiveChildTypeAndMeaning",
// which means this that only one style of that type and meaning
// should exist for the parent. If this is added at the time
// the insertion request is made, the code to do the insertion
// should automatically remove all other such instances
export interface StylePropertiesWithSubprops extends StyleProperties {
  subprops?: StylePropertiesWithSubprops[];
  relationsTo?: RelationshipPropertiesMap;
  relationsFrom?: RelationshipPropertiesMap;
  exclusiveChildTypeAndMeaning?: boolean;
}

// Notebook Change Requests

export type NotebookChangeRequest =
  RelationshipDeleteRequest|
  RelationshipInsertRequest|
  StyleChangeRequest|
  StyleDeleteRequest|
  StyleInsertRequest|
  StyleMoveRequest;
export interface RelationshipDeleteRequest {
  type: 'deleteRelationship';
  id: number;
}
export interface RelationshipInsertRequest {
  type: 'insertRelationship';
  fromId: StyleId;
  toId: StyleId;
  props: RelationshipProperties;
}
export interface StyleChangeRequest {
  type: 'changeStyle';
  styleId: StyleId;
  data: any;
}
export interface StyleDeleteRequest {
  type: 'deleteStyle';
  styleId: StyleId;
}
export interface StyleInsertRequest {
  type: 'insertStyle';
  afterId?: StyleRelativePosition;
  parentId?: StyleId; // undefined or 0 means top-level.
  styleProps: StylePropertiesWithSubprops;
}
export interface StyleMoveRequest {
  type: 'moveStyle';
  styleId: StyleId;
  afterId: StyleRelativePosition;
}

// Messages from the server

export type ServerMessage = NotebookChanged|NotebookClosed|NotebookOpened;
export interface NotebookChanged {
  type: 'notebookChanged';
  notebookName: NotebookName;
  changes: NotebookChange[];
  tracker?: Tracker;            // An optional, client-supplied, tracking
                                // identifier from the original change request.
  complete?: boolean;            // True iff this is the last set of changes
                                // resulting from the original request.
}
export interface NotebookClosed {
  type: 'notebookClosed';
  notebookName: NotebookName;
}
export interface NotebookOpened {
  type: 'notebookOpened';
  notebookName: NotebookName;
  obj: NotebookObject;
}

// Messages from the client

export type ClientMessage = ChangeNotebook|CloseNotebook|OpenNotebook|UseTool;
export interface ChangeNotebook {
  type: 'changeNotebook';
  notebookName: NotebookName;
  changeRequests: NotebookChangeRequest[];
  tracker?: Tracker;
}
export interface CloseNotebook {
  type: 'closeNotebook';
  notebookName: NotebookName;
}
export interface OpenNotebook {
  type: 'openNotebook';
  notebookName: NotebookName;
}
export interface UseTool {
  type: 'useTool';
  notebookName: NotebookName;
  styleId: StyleId;
}

export interface NameValuePair {
    name: string;
    value: string;
}

export function isEmptyOrSpaces(str: string) : boolean{
    return str === null || str.match(/^ *$/) !== null;
  }
