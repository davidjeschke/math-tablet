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

import { CssLength, Html, assert, deepCopy, escapeHtml, ExpectedError } from "./common";
import { WatchedResource, Watcher } from "./watched-resource";
import { NOTEBOOK_NAME_RE, NotebookName, NotebookPath } from "./folder";

// Types

export interface CssSize {
  height: CssLength;
  width: CssLength;
}

export interface FindRelationshipOptions {
  // NOTE: toId and fromId are mutually "or". The ids and all other fields are "and".
  dataflow?: boolean;
  toId?: StyleId;
  fromId?: StyleId;
  role?: RelationshipRole;
  source?: StyleSource;
}

export interface FindStyleOptions {
  // REVIEW: Rename this interface to FindStylePattern
  role?: StyleRole|RegExp;
  subrole?: StyleSubrole;
  source?: StyleSource;
  notSource?: StyleSource;
  type?: StyleType;
  recursive?: boolean;
}
export interface FormulaData {
  wolframData: MTLExpression;
}

export interface HintData {
  relationship: HintRelationship,
  status: HintStatus,
  idOfRelationshipDecorated? : RelationshipId;
}

export enum HintRelationship {
  Unknown = 0,
  Equivalent = 1,
  NotEquivalent = 2,
  Implies = 3,
  ImpliedBy = 4,
}

export enum HintStatus {
  Unknown = 0,
  Correct = 1,
  Incorrect = 2,
}

export type NotebookChange =
  RelationshipDeleted|RelationshipInserted|
  StyleChanged|StyleConverted|StyleDeleted|StyleInserted|StyleMoved;
export interface RelationshipDeleted {
  type: 'relationshipDeleted';
  // REVIEW: Only pass relationshipId?
  relationship: RelationshipObject;
}
export interface RelationshipInserted {
  type: 'relationshipInserted';
  relationship: RelationshipObject;
}
export interface StyleChanged {
  type: 'styleChanged';
  // REVIEW: Only pass styleId and new data?
  style: StyleObject;
  previousData: any;
}
export interface StyleConverted {
  type: 'styleConverted';
  styleId: StyleId;
  role?: StyleRole;
  subrole?: StyleSubrole;
  // TODO: Rename 'type' to 'action' and then 'styleType' to just 'type'.
  styleType?: StyleType;
  data?: any;
}
export interface StyleDeleted {
  type: 'styleDeleted';
  // REVIEW: Only pass styleId?
  style: StyleObject;
}
export interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
  afterId?: StyleRelativePosition;
  // REVIEW: position?: StylePosition for top-level styles?
}
export interface StyleMoved {
  type: 'styleMoved';
  styleId: StyleId;
  afterId: StyleRelativePosition;
  oldPosition: StyleOrdinalPosition;
  newPosition: StyleOrdinalPosition;
}

export interface NotebookObject {
  nextId: StyleId;
  pageConfig: PageConfig;
  pages: Page[];
  relationshipMap: RelationshipMap;
  styleMap: StyleMap;
  version: string;
}

export interface NotebookWatcher extends Watcher {
  onChange(change: NotebookChange): void;
}

interface Page {
  styleIds: StyleId[];
}

interface PageConfig {
  size: CssSize;
  margins: PageMargins;
}

interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

export type RelationshipId = number;

export interface RelationshipObject extends RelationshipProperties {
  // Some invariants are needed here:
  // The first definition of a symbol does not create a relationship.
  // The second mentions of a symbol creates a relationship attached
  // (via source) to either the use or definition.
  // Props may give this the role of DUPLICATE DEFINITION if that is true.
  // It is critically that all of these respect the "top level thought order",
  // not the style order, so that reordering thoughts has a role.
  // Each symbol name creates a separate independent "channel" of that name.
  id: RelationshipId;
  source: StyleSource;
  /* TODO: Legacy. Eliminate. */ fromId: StyleId;
  /* TODO: Legacy. Eliminate. */ toId: StyleId;
  inStyles: RelationshipStyle[];
  outStyles: RelationshipStyle[];
}

export type RelationshipRole =
  'SYMBOL-DEPENDENCY' |
  'DUPLICATE-DEFINITION' |
  'EQUIVALENCE' |
  'TRANSFORMATION' |
  'USER-DEFINED';

export interface RelationshipMap {
  [id: /* RelationshipId */number]: RelationshipObject;
}

export interface RelationshipProperties {
  id?: StyleId;
  role: RelationshipRole;
  status?: HintStatus;
  logic?: HintRelationship;
  data?: any;
  // REVIEW: Use role: DATAFLOW with a subrole instead of dataflow flag?
  dataflow?: boolean;
}

export interface RelationshipStyle {
  role: RelationshipStyleRole;
  id: StyleId;
}

export type RelationshipStyleRole =
  'LEGACY' |      // Legacy compatibility. TODO: remove
  'INPUT-FORMULA' |
  'OUTPUT-FORMULA' |
  'TRANSFORMATION-TOOL' |
  'TRANSFORMATION-HINT';

export interface Stroke {
  // id?: string;
  // p?: number[];
  // pointerId?: number;
  // pointerType?: 'PEN'|'TOUCH'|'ERASER';
  // t?: number[];
  x: number[];
  y: number[];
}

export interface StrokeData {
  size: CssSize;
  strokeGroups: StrokeGroup[];
}

export interface StrokeGroup {
  // penStyle?: string;
  // penStyleClasses?: string;
  strokes: Stroke[];
}


export type StyleId = number;

export interface StyleMap {
  [id: /* StyleId */number]: StyleObject;
}

export const STYLE_ROLES = [
  // Top level (cell) roles
  'FIGURE',
  'FORMULA',              // Hold FormulaData
  'HINT',                 // Explanation of why two formula are related
  'PLOT',
  'TEXT',                 // Data is null.
  'FIGURE',               // Data is null.
  'UNKNOWN',              // Type of the cell hasn't been determined.

  'ATTRIBUTE',            // Generic attribute. Meaning implied by type.
  'ERROR',                // An error message. Type should be text.
  'EVALUATION',           // CAS evaluation of an expression.
  'EVALUATION-ERROR',     // Error in CAS evaluation of an expression.
  'EXPOSITION',           // A longer discussion or description.
  'HANDWRITING',          // REVIEW: Used? Deprecate? Stroke information for the user's handwriting.
  'INPUT',                // Holds the original user input.
  'QUADRATIC',            // DEPRECATED: A quadratic expression, presumably worth plotting.
  'SIMPLIFICATION',       // CAS simplification of expression or equation.
  'EQUATION',             // An equation
  'EQUATION-SOLUTION',    // An equation
  'EQUATION-DEFINITION',  // A simple equality relation defined
  'REPRESENTATION',       // A representation of the parent style.
  'SYMBOL',               // Symbols extracted from an expression.
  'SYMBOL-DEFINITION',    // Definition of a symbol.
  'SYMBOL-TABLE',         //
  'SYMBOL-USE',           // Use of a symbol.
  'DECORATION',           // Clearly indicates this is NOT the input but a decoration
  'EQUIVALENT-CHECKS',    // Checking expression equivalence of with other styles
  'UNIVARIATE-QUADRATIC', // A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE',        // An expression in one or two variables presumable plottable.
] as const;
export type StyleRole = typeof STYLE_ROLES[number];

export interface StyleObject extends StyleProperties {
  id: StyleId;
  parentId: StyleId; // 0 if top-level style.
  source: StyleSource;
}

// Position of style in the notebook.
// Applies only to top-level styles.
// Position 0 is the first cell of the notebook.
export type StyleOrdinalPosition = number;

export interface StyleProperties {
  id?: StyleId;
  data: any;
  role: StyleRole;
  subrole?: StyleSubrole;
  type: StyleType;
}

export type StyleRelativePosition = StyleId | StylePosition;

export enum StylePosition {
  Top = 0,
  Bottom = -1,
}

export const STYLE_SUBROLES = [

  // 'FIGURE' subroles
  'SKETCH',
  'DRAWING',

  // 'FORMULA' subroles
  'ASSUME',
  'DEFINITION',
  'PROVE',
  'OTHER',

  // 'HINT' subroles

  // 'PLOT' subroles

  // 'TEXT' subroles
  'HEADING1',
  'HEADING2',
  'NORMAL',

  // 'FIGURE' subroles
  // 'OTHER'

  // 'UNKNOWN' subroles
  'UNKNOWN',
];
export type StyleSubrole = typeof STYLE_SUBROLES[number];

export const STYLE_TYPES = [
  'CLASSIFICATION-DATA',  // DEPRECATED: A classifcication of the style.
  'EQUATION-DATA',   // An equation (ambiguously assertion or relation)
  'FORMULA-DATA',    // Type of data for top-level 'FORMULA' styles
  'HINT-DATA',       // Type of data for top-level 'HINT' styles
  'IMAGE-URL',       // ImageData: URL of image relative to notebook folder.
  'MYSCRIPT-DATA',   // Jiix: MyScript JIIX export from 'MATH' editor.
  'NONE',            // No data. Data field is null.
  'PLAIN-TEXT',      // PlainText:  // REVIEW: Specify encoding? UTF-8?
  'PLOT-DATA',       // Generic type to handle unspecified plot data
  'SOLUTION-DATA',   // The result of a "solve" operation
  'STROKE-DATA',     // Strokes of user sketch in our own format.
  'SVG-MARKUP',      // SvgMarkup: SVG markup
  'SYMBOL-DATA',     // SymbolData: symbol in a definition or expression.
  'SYMBOL-TABLE',     // SymbolTable // REVIEW: Rename SYMBOL-TABLE-DATA?
  'TEX-EXPRESSION',  // LatexData: LaTeX string // TODO: rename 'TEX'
  'TOOL-DATA',       // ToolInfo: Tool that can be applied to the parent style.
  'WOLFRAM-EXPRESSION', // WolframExpression: Wolfram language expression
  // 'UNKNOWN',       // Type is as-yet unknown. Data field should be 'null'.
] as const;
export type StyleType = typeof STYLE_TYPES[number];

export const STYLE_SOURCES = [
  'ALGEBRAIC-DATAFLOW-OBSERVER',
  'ALGEBRAIC-TOOLS',  // Algebraic tools provided by Wolfram
  'EQUATION-SOLVER',  // Attempt to expose Wolfram solutions
  'MATHEMATICA',      // Mathematica C.A.S.
  'MATHJAX-OBSERVER',
  'MYSCRIPT',         // MyScript handwriting recognition`
  'SANDBOX',          // Sandbox for temporary experiments
  'SUBTRIV-CLASSIFIER',
  'SYMBOL-CLASSIFIER',
  'SYMBOL-TABLE',
  'SYSTEM',           // Primary observer of Math Tablet, itself.
  'TEST',             // An example source used only by our test system
  'TEX-FORMATTER',
  'TEX-OBSERVER',
  'USER',             // Directly entered by user
  'WOLFRAM-OBSERVER', // Wolfram C.A.S.
] as const;
export type StyleSource = typeof STYLE_SOURCES[number];

export type WolframExpression = '{WolframExpression}';
// The is a type for "Math Tablet Languge" Expression
export type MTLExpression = '{MTLExpression}';

// Constants

const DEFAULT_PAGE_CONFIG: PageConfig = {
  size: { width: <CssLength>'8.5in', height: <CssLength>'11in' },
  margins: {
    top: <CssLength>'72pt', /* 72pt = 1 in */
    right: <CssLength>'72pt',
    bottom: <CssLength>'72pt',
    left: <CssLength>'72pt',
  }
}

const RIGHT_ARROW_ENTITY = '&#x27A1;';

export const VERSION = "0.0.16";

// Exported Class

export abstract class Notebook<W extends NotebookWatcher> extends WatchedResource<NotebookPath, W> {

  // Public Class Property Functions

  public static isValidNotebookName(name: NotebookName): boolean {
    return NOTEBOOK_NAME_RE.test(name);
  }

  // Public Class Methods

  public static validateObject(obj: NotebookObject): void {
    // Throws an exception with a descriptive message if the object is not a valid notebook object.
    // LATER: More thorough validation of the object.
    if (!obj.nextId) { throw new Error("Invalid notebook object JSON."); }
    if (obj.version != VERSION) {
      throw new ExpectedError(`Invalid notebook version ${obj.version}. Expect version ${VERSION}`);
    }
  }

  // Public Instance Properties

  public nextId: StyleId;
  public pageConfig: PageConfig;
  public pages: Page[];

  // Public Instance Property Functions

  public allRelationships(): RelationshipObject[] {
    // REVIEW: Return an iterator?
    // REVIEW: Does it matter whether we return relationships in sorted order or not?
    //       This could be as simple as: return Object.values(this.relationshipMap);
    //       Caller can sort if necessary.
    const sortedIds: RelationshipId[] = Object.keys(this.relationshipMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.relationshipMap[id]);
  }

  public allStyles(): StyleObject[] {
    // REVIEW: Return an iterator?
    // REVIEW: Does it matter whether we return relationships in sorted order or not?
    //       This could be as simple as: return Object.values(this.relationshipMap);
    //       Caller can sort if necessary.
    const sortedIds: StyleId[] = Object.keys(this.styleMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.getStyle(id));
  }

  public childStylesOf(id: StyleId): StyleObject[] {
    return this.allStyles().filter(s=>(s.parentId==id));
  }

  public compareStylePositions(id1: StyleId, id2: StyleId): number {
    // Returns a negative number if style1 is before style2,
    // zero if they are the same styles,
    // or a positive number if style1 is after style2.
    const p1 = this.pages[0].styleIds.indexOf(id1);
    const p2 = this.pages[0].styleIds.indexOf(id2);
    assert(p1>=0 && p2>=0);
    return p1 - p2;
  }

  public followingStyleId(id: StyleId): StyleId {
    // Returns the id of the style immediately after the top-level style specified.
    const i = this.pages[0].styleIds.indexOf(id);
    assert(i>=0);
    if (i+1>=this.pages[0].styleIds.length) { return 0; }
    return this.pages[0].styleIds[i+1];
  }

  public getRelationship(id: RelationshipId): RelationshipObject {
    const rval = this.relationshipMap[id];
    assert(rval, `Relationship ${id} doesn't exist.`);
    return rval;
  }

  public getStyle(id: StyleId): StyleObject {
    const rval = this.styleMap[id];
    assert(rval, `Style ${id} doesn't exist.`);
    return rval;
  }

  public getStyleThatMayNotExist(id: StyleId): StyleObject|undefined {
    return this.styleMap[id];
  }

  public isEmpty(): boolean {
    // Returns true iff the notebook does not have any contents.
    return this.pages[0].styleIds.length == 0;
  }

  public isTopLevelStyle(id: StyleId): boolean {
    return (this.getStyle(id).parentId == 0);
  }

  public precedingStyleId(id: StyleId): StyleId {
    // Returns the id of the style immediately before the top-level style specified.
    const i = this.pages[0].styleIds.indexOf(id);
    assert(i>=0);
    if (i<1) { return 0; }
    return this.pages[0].styleIds[i-1];
  }

  public relationshipsOf(id: StyleId): RelationshipObject[] {
    return this.allRelationships().filter(r=>r.inStyles.find(rs=>rs.id == id) || r.outStyles.find(rs=>rs.id == id));
  }

  public toHtml(): Html {
    if (this.isEmpty()) { return <Html>"<i>Notebook is empty.</i>"; }
    else {
      return <Html>this.topLevelStyleOrder()
      .map(styleId=>{
        const style = this.getStyle(styleId);
        return this.styleToHtml(style);
      })
      .join('');
    }
  }

  public topLevelStyleOrder(): StyleId[] {
    // REVIEW: Return IterableIterator<StyleId>?
    return this.pages.reduce((acc: StyleId[], page: Page)=>acc.concat(page.styleIds), []);
  }

  public topLevelStyles(): StyleObject[] {
    // REVIEW: Return an iterator?
    return this.pages[0].styleIds.map(styleId=>this.getStyle(styleId));
  }

  public topLevelStyleOf(id: StyleId): StyleObject {
    let style = this.getStyle(id);
    if (!style) { throw new Error(`Cannot find top-level style of style ${id}`); }
    while (style.parentId) {
      style = this.getStyle(style.parentId);
    }
    return style;
  }

  public topLevelStylePosition(id: StyleId): StyleOrdinalPosition {
    // Return the order-dependent position of the top level thought
    // this is attached to; this is used in "causal ordering".
    // getThoughtIndex(A) < getThoughtIndex(B) implies A may not
    // in anyway depend on B.
    const top = this.topLevelStyleOf(id);
    return this.pages[0].styleIds.indexOf(top.id);
  }

  // Public Instance Methods

  public applyChange(change: NotebookChange): void {
    assert(change);

    // REVEIW: Maybe all change notification should go out prior?
    //         Then the styleChanged would not have to include "previousData"
    // Some change notifications are sent before the change is applied to the notebook so the watcher can
    // examine the style or relationship before it is modified.
    const notifyBefore = (change.type == 'relationshipDeleted' || change.type == 'styleConverted' || change.type == 'styleDeleted');
    if (notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change); }
    }

    switch(change.type) {
      case 'relationshipDeleted':   this.deleteRelationship(change.relationship); break;
      case 'relationshipInserted':  this.insertRelationship(change.relationship); break;
      case 'styleChanged':          this.changeStyle(change); break;
      case 'styleConverted':        this.convertStyle(change); break;
      case 'styleDeleted':          this.deleteStyle(change.style); break;
      case 'styleInserted':         this.insertStyle(change.style, change.afterId); break;
      case 'styleMoved':            this.moveStyle(change); break;
      default:
        throw new Error(`Applying unexpected change type: ${(<any>change).type}`);
    }

    // Send change notifications that are supposed to go out *after* the change has been applied.
    if (!notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change); }
    }
  }

  public applyChanges(changes: NotebookChange[]): void {
    for (const change of changes) { this.applyChange(change); }
  }

  public deleteRelationship(relationship: RelationshipObject): void {
    // REVIEW: Making this public for the purpose of error handling in server-notebook - rlr
    // TODO: relationship may have already been deleted by another observer.
    const id = relationship.id;
    if (!this.relationshipMap[id]) { throw new Error(`Deleting unknown relationship ${id}`); }
    delete this.relationshipMap[id];
  }

  public findRelationships(options: FindRelationshipOptions): RelationshipObject[] {
    // TODO: Find relationships with styles of certain relationship roles.
    const rval: RelationshipObject[] = [];
    // REVIEW: Ideally, relationships would be stored in a Map, not an object,
    //         so we could obtain an iterator over the values, and not have to
    //         construct an intermediate array.
    for (const relationship of <RelationshipObject[]>Object.values(this.relationshipMap)) {
      if (typeof options.dataflow != 'undefined' && relationship.dataflow != options.dataflow) { continue; }
      if (options.fromId && !relationship.inStyles.find(rs=>rs.id==options.fromId)) { continue; }
      if (options.toId && !relationship.outStyles.find(rs=>rs.id==options.toId)) { continue; }
      if (options.source && relationship.source != options.source) { continue; }
      if (options.role && relationship.role != options.role) { continue; }
      rval.push(relationship);
    }
    return rval;
  }

  public findStyle(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  ): StyleObject|undefined {
    // REVIEW: If we don't need to throw on multiple matches, then we can terminate the search
    //         after we find the first match.
    // Like findStyles but expects to find zero or one matching style.
    // If it finds more than one matching style then it returns the first and outputs a warning.
    const styles = this.findStyles(options, rootId);
    if (styles.length > 0) {
      if (styles.length > 1) { console.warn(`WARNING: More than one style found for ${rootId}/${JSON.stringify(options)}`); }
      return styles[0];
    } else {
      return undefined;
    }
  }

  public findStyles(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
    rval: StyleObject[] = []
  ): StyleObject[] {
    // Option to throw if style not found.
    const styles = rootId ? this.childStylesOf(rootId) : this.topLevelStyles();
    for (const style of styles) {
      if (styleMatchesPattern(style, options)) { rval.push(style); }
      if (options.recursive) {
        this.findStyles(options, style.id, rval);
      }
    }
    return rval;
  }

  public hasRelationshipId(relationshipId: RelationshipId): boolean {
    return this.relationshipMap.hasOwnProperty(relationshipId);
  }

  public hasStyleId(styleId: StyleId): boolean {
    return this.styleMap.hasOwnProperty(styleId);
  }

  public hasStyle(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  ): boolean {
    // Returns true iff findStyles with the same parameters would return a non-empty list.
    // OPTIMIZATION: Return true when we find the first matching style.
    // NOTE: We don't use 'findStyle' because that throws on multiple matches.
    const styles = this.findStyles(options, rootId);
    return styles.length>0;
  }

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Methods

  // Private Constructor

  protected constructor(path: NotebookPath) {
    super(path);
    this.nextId = 1;
    this.pages = [{ styleIds: []}];
    this.relationshipMap = {};
    this.pageConfig = deepCopy(DEFAULT_PAGE_CONFIG),
    this.styleMap = {};
  }

  // Private Instance Properties

  protected relationshipMap: RelationshipMap;
  protected styleMap: StyleMap;     // Mapping from style ids to style objects.

  // Private Instance Property Functions

  private relationshipToHtml(relationship: RelationshipObject): Html {
    const dataJson = (typeof relationship.data != 'undefined' ? escapeHtml(JSON.stringify(relationship.data)) : 'undefined' );
    const logic = relationship.logic;
    const status = relationship.status;
    const inStylesHtml = relationship.inStyles.map(rs=>`${rs.role} ${rs.id}`).join(", ");
    const outStylesHtml = relationship.outStyles.map(rs=>`${rs.role} ${rs.id}`).join(", ");
    return <Html>`<div><span class="leaf">R${relationship.id} ${relationship.role} [${inStylesHtml} ${RIGHT_ARROW_ENTITY} ${outStylesHtml}] (${relationship.fromId} ${RIGHT_ARROW_ENTITY} ${relationship.toId}) ${dataJson} logic: ${logic} status: ${status}</span></div>`;
  }

  private styleToHtml(style: StyleObject): Html {
    // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
    const childStyleObjects = Array.from(this.childStylesOf(style.id));
    // TODO: This is very inefficient as notebook.relationshipOf goes through *all* relationships.
    const relationshipObjects = Array.from(this.relationshipsOf(style.id));
    const dataJson = (typeof style.data != 'undefined' ? escapeHtml(JSON.stringify(style.data)) : 'undefined' );
    const roleSubrole = (style.subrole ? `${style.role}|${style.subrole}` : style.role);
    const styleInfo = `S${style.id} ${roleSubrole} ${style.type} ${style.source}`
    if (childStyleObjects.length == 0 && relationshipObjects.length == 0 && dataJson.length<30) {
      return <Html>`<div><span class="leaf">${styleInfo} <tt>${dataJson}</tt></span></div>`;
    } else {
      const stylesHtml = childStyleObjects.map(s=>this.styleToHtml(s)).join('');
      const relationshipsHtml = relationshipObjects.map(r=>this.relationshipToHtml(r)).join('');
      const [ shortJsonTt, longJsonTt ] = dataJson.length<30 ? [` <tt>${dataJson}</tt>`, ''] : [ '', `<tt>${dataJson}</tt>` ];
      return <Html>`<div>
  <span class="collapsed">${styleInfo}${shortJsonTt}</span>
  <div class="nested" style="display:none">${longJsonTt}
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  // Private Instance Methods

  private changeStyle(change: StyleChanged): void {
    const styleId = change.style.id;
    const style = this.getStyle(styleId);
    // console.log(`Changing style ${styleId} data to ${JSON.stringify(change.style.data)}`); // BUGBUG
    style.data = change.style.data;
  }

  private convertStyle(change: StyleConverted): void {
    const style = this.getStyle(change.styleId);
    if (!style) { throw new Error(`Converting unknown style ${change.styleId}`); }
    if (change.role) { style.role = change.role; }
    if (change.subrole) { style.subrole = change.subrole; }
    if (change.styleType) { style.type = change.styleType; }
    if (change.data) { style.data = change.data; }
  }

  private deleteStyle(style: StyleObject): void {
    // If this is a top-level style then remove it from the top-level style order first.
    if (!style.parentId) {
      const i = this.pages[0].styleIds.indexOf(style.id);
      if (i<0) { throw new Error(`Deleting unknown top-level style ${style.id}`); }
      this.pages[0].styleIds.splice(i,1);
    }
    if (!this.styleMap[style.id]) { throw new Error(`Deleting unknown style ${style.id}`); }
    delete this.styleMap[style.id];
  }

  protected initializeFromObject(obj: NotebookObject): void {
    this.nextId = obj.nextId;
    this.pageConfig = obj.pageConfig;
    this.pages = obj.pages;
    this.relationshipMap = obj.relationshipMap;
    this.styleMap = obj.styleMap;
  }

  private insertRelationship(relationship: RelationshipObject): void {
    this.relationshipMap[relationship.id] = relationship;
  }

  private insertStyle(style: StyleObject, afterId?: StyleRelativePosition): void {

    this.styleMap[style.id] = style;
    // Insert top-level styles in the style order.
    if (!style.parentId) {
      if (!afterId || afterId===StylePosition.Top) {
        this.pages[0].styleIds.unshift(style.id);
      } else if (afterId===StylePosition.Bottom) {
        this.pages[0].styleIds.push(style.id);
      } else {
        const i = this.pages[0].styleIds.indexOf(afterId);
        if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
        this.pages[0].styleIds.splice(i+1, 0, style.id);
      }
    }
  }

  private moveStyle(change: StyleMoved): void {
    // Although questionable, executed a "moveStyle" on children
    // of a top level style. However, only a move a top-level thought
    // actually should be affected here.
    if (this.isTopLevelStyle(change.styleId)) {
      this.pages[0].styleIds.splice(change.oldPosition, 1);
      this.pages[0].styleIds.splice(change.newPosition, 0, change.styleId);
    }
  }
}

// Helper Classes

// Helper Functions

export function StyleInsertedFromNotebookChange(change: NotebookChange): StyleInserted {
  // TODO: Rename this function so it doesn't start with a capital letter.
  if (change.type != 'styleInserted') { throw new Error("Not StyleInserted change."); }
  return change;
}

export function styleMatchesPattern(style: StyleObject, options: FindStyleOptions): boolean {
  return    (!options.role || (typeof options.role == 'object' && </* TYPESCRIPT: */any>options.role instanceof RegExp ? (<RegExp>options.role).test(style.role) : style.role == options.role))
         && (!options.subrole || style.subrole == options.subrole)
         && (!options.type || style.type == options.type)
         && (!options.source || style.source == options.source)
         && (!options.notSource || style.source != options.notSource);
}
