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

// Types

export type LatexMath = string;
export type MathJsText = string;
export type NotebookName = string;
export type StyleMeaning =
  'EVALUATION'|       // CAS evaluation of an expression.
  'EVALUATION-ERROR'| // Error in CAS evaluation of an expression
  'HANDWRITING'|      // Stroke information for the user's handwriting.
  'INPUT'|            // Primary representation of something that the user has input.
  'PRETTY' |          // A more visually-pleasing representation. e.g. LaTeX version of plain-text math.
  'SIMPLIFICATION' |  // CAS simplification of expression or equation.
  'INDENTED'|         // Indented text for the purpose of exposition.
  'SYMBOL';           // Symbols extracted from an expression.
export type StyleType =
  // TYPE   // DATA
  'JIIX'|   // MyScript JIIX export from 'MATH' editor.
  'LATEX'|  // LaTeX string
  'MATHJS'| // MathJS plain text expression
  'STROKE'| // MyScript strokeGroups export from 'TEXT' editor.
  'TEXT';   // Plain text
export type StyleSource =
  'TEST'|       // An example source used only hour test system
  'USER'|       // Directly enterred by user
  'MATHJS'|     // The Mathjs Computer Algebra System system
  'MATHSTEPS'   // The Mathsteps CAS system
export type UserName = string;

// MyScript Types

export interface Jiix {

}

export interface MyScriptServerKeys {
  applicationKey: string;
  hmacKey: string;
}

export interface StrokeGroups {

}

// Plain object version of TDoc

export type ThoughtId = number;
export type StyleId = number;
export type StylableId = ThoughtId|StyleId;

// TYPESCRIPT: Separate out styles by datatype.
export interface StyleObject {
  data: any;
  id: ThoughtId;
  meaning: StyleMeaning;
  source: StyleSource;
  stylableId: StylableId;
  type: StyleType;
}

export interface TDocObject {
  nextId: StylableId;
  version: string;
  thoughts: ThoughtObject[];
  styles: StyleObject[];
}

export interface ThoughtObject {
  id: ThoughtId;
}

// Notebook Change types:

export type NotebookChange = StyleDeleted|StyleInserted|ThoughtDeleted|ThoughtInserted;

interface StyleDeleted {
  type: 'styleDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the style has already been deleted from
  //         the TDoc when this event is fired.
  stylableId: StylableId;
  styleId: StyleId;
}

interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
}

interface ThoughtDeleted {
  type: 'thoughtDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the thought has already been deleted from
  //         the TDoc when this event is fired.
  thoughtId: ThoughtId;
}

interface ThoughtInserted {
  type: 'thoughtInserted';
  thought: ThoughtObject;
}

// Messages from the server

export type ServerMessage = NotebookChanged|NotebookClosed|NotebookOpened;

interface NotebookChanged {
  action: 'notebookChanged';
  notebookName: NotebookName;
  change: NotebookChange;
}

interface NotebookClosed {
  action: 'notebookClosed';
  notebookName: NotebookName;
}

interface NotebookOpened {
  action: 'notebookOpened';
  notebookName: NotebookName;
  notebook: TDocObject;
}

// Messages from the client

export type ClientMessage = CloseNotebook|DeleteThought|InsertHandwrittenMath|InsertHandwrittenText|InsertMathJsText|OpenNotebook;

interface CloseNotebook {
  action: 'closeNotebook';
  notebookName: NotebookName;
}

interface DeleteThought {
  action: 'deleteThought';
  notebookName: NotebookName;
  thoughtId: number;
}

interface InsertHandwrittenMath {
  action: 'insertHandwrittenMath';
  notebookName: NotebookName;
  latexMath: LatexMath;
  jiix: Jiix;
}

interface InsertHandwrittenText {
  action: 'insertHandwrittenText';
  notebookName: NotebookName;
  text: string;
  strokeGroups: StrokeGroups;
}

interface InsertMathJsText {
  action: 'insertMathJsText';
  notebookName: NotebookName;
  mathJsText: MathJsText;
}

interface OpenNotebook {
  action: 'openNotebook';
  notebookName: NotebookName;
}
