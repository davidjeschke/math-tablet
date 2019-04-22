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

// Requirement

import { EventEmitter } from 'events';

import { Jiix, LatexMath, MathJsText, StrokeGroups, StyleObject, StyleMeaning, StyleSource, StyleType, TDocObject, ThoughtObject, ThoughtId, StyleId } from '../client/math-tablet-api';

// Types

type Stylable = Thought|Style;
type StylableId = number;
// type StyleRule = (tdoc: TDoc, style: Style)=>Style[];
type TextData = string;

// Constants

// VERSION CHANGES:
// 0.0.1 - Initial version.
// 0.0.2 - Made meaning required on styles.
const VERSION = "0.0.2";

// See https://stackoverflow.com/questions/39142858/declaring-events-in-a-typescript-class-which-extends-eventemitter
export declare interface TDoc {
  on(event: 'styleInserted', listener: (style: Style) => void): this;
  on(event: 'thoughtInserted', listener: (thought: Thought) => void): this;
  on(event: string, listener: Function): this;
}

export class TDoc extends EventEmitter {

  // Public Class Methods

  public static create(): TDoc {
    return new this();
  }

  public static fromJSON(obj: TDocObject): TDoc {
    // Validate the object
    if (!obj.nextId) { throw new Error("Invalid TDoc object JSON."); }
    if (obj.version != VERSION) { throw new Error("TDoc in unexpected version."); }

    // Reanimate the thoughts and styles
    const thoughts: Thought[] = obj.thoughts.map(Thought.fromJsonObject);
    const styles: Style[] = obj.styles.map(Style.fromJsonObject);

    // Create the TDoc object from its properties and reanimated thoughts and styles.
    const tDoc = Object.assign(Object.create(TDoc.prototype), { ...obj, styles, thoughts });

    // WARNING: This was not David's original code---I don't know if this is correct or not.
    // TODO: nextId should be restored from the JSON object. Doubt this is the correct fix.
    tDoc.nextId = (tDoc.getStyles().length + tDoc.getThoughts().length) + 1;
    return tDoc;
  }

  // Public Instance Properties

  public version: string;

  public nextId: StylableId;

  // To be used for providing dynamic TDoc scope. Any client may
  // attach data to this object, which is considered volatile (not part
  // of permanent state.
  public clientData: any;

  // Public Instance Methods

  // This can be asymptotically improved later.
  public stylableHasChildOfType(style: Style, tname: StyleType, meaning?: StyleMeaning): boolean {
    const id = style.id;
    return !!this.styles.find(s => s.stylableId == id &&
                            s.type == tname &&
                            (!meaning || s.meaning == meaning));
  }

  // IMPORTANT: Only deletes the specific style. Does not delete attached styles.
  public deleteStyle(styleId: StyleId): void {
    console.log(`Before deleting style ${styleId}:`);
    //console.dir(this);
    const index = this.styles.findIndex(s=>(s.id==styleId));
    if (index<0) { throw new Error(`Deleting unknown style ${styleId}`); }
    this.styles.splice(index, 1);
    console.log(`After deleting style ${styleId}:`);
    //console.dir(this);
  }

  // IMPORTANT: Only deletes the specific thought. Does not delete attached styles.
  public deleteThought(thoughtId: ThoughtId): void {
    console.log(`Before deleting thought ${thoughtId}:`);
    //console.dir(this);
    const index = this.thoughts.findIndex(t=>(t.id==thoughtId));
    if (index<0) { throw new Error(`Deleting unknown thought ${thoughtId}`); }
    this.thoughts.splice(index, 1);
    console.log(`After deleting thought ${thoughtId}:`);
    //console.dir(this);
  }

  public insertJiixStyle(stylable: Stylable, data: Jiix, meaning: StyleMeaning, source: StyleSource): JiixStyle {
    return this.insertStyle(new JiixStyle(this.nextId++, stylable, data, meaning, source));
  }

  public insertLatexStyle(stylable: Stylable, data: LatexMath, meaning: StyleMeaning, source: StyleSource): LatexStyle {
    return this.insertStyle(new LatexStyle(this.nextId++, stylable, data, meaning, source));
  }

  public insertMathJsStyle(stylable: Stylable, data: MathJsText, meaning: StyleMeaning, source: StyleSource): MathJsStyle {
    return this.insertStyle(new MathJsStyle(this.nextId++, stylable, data, meaning, source));
  }

  public insertStrokeStyle(stylable: Stylable, data: StrokeGroups, meaning: StyleMeaning, source: StyleSource): StrokeStyle {
    return this.insertStyle(new StrokeStyle(this.nextId++, stylable, data, meaning, source));
  }

  public insertTextStyle(stylable: Stylable, data: TextData, meaning: StyleMeaning, source: StyleSource): TextStyle {
    return this.insertStyle(new TextStyle(this.nextId++, stylable, data, meaning, source));
  }

  // ENUMERATION AND INTERROGATION
  // We need a way to interrogate a TDoc. There are lots of
  // approaches here; I expect this to be constantly evolving.
  // In particular, dej has suggested accessing styles via
  // the thoughts they annotate; this seems like a good idea. -rlr

  public getThoughts(): Thought[] {
    return this.thoughts;
  }

  public getStyles(stylableId?: StylableId): Style[] {
    if (stylableId) { return this.styles.filter(s=>(s.stylableId==stylableId)); }
    else { return this.styles; }
  }

  public insertThought(): Thought {
    const thought = new Thought(this.nextId++);
    this.thoughts.push(thought);
    this.emit('thoughtInserted', thought);''
    return thought;
  }

  public jsonPrinter(): string {
    return JSON.stringify(this,null,' ');
  }

  public numStyles(tname: StyleType, meaning?: StyleMeaning) : number {
    return this.styles.reduce(
      function(total,x){
        return (x.type == tname && (!meaning || x.meaning == meaning))
          ?
          total+1 : total},
      0);
  }

  public summaryPrinter(): string {
    var numLatex = this.numStyles('LATEX');
    var numMath = this.numStyles('MATHJS');
    var numText = this.numStyles('TEXT');
    return `${this.thoughts.length} thoughts\n`
      + `${this.styles.length} styles\n`
      + `${numLatex} latex styles\n`
      + `${numMath} math styles\n`
      + `${numText} text styles\n`
    ;
  }

  public toJSON(): TDocObject {
    const obj = { ...this };
    for (const key in obj) {
      if (key.startsWith('_')) { delete obj[key]; }
    }
    return <TDocObject><unknown>obj;
  }

  // COMPILERS

  // take a set of comma-separated-values and
  // produce a tdoc full of thoughts; this is
  // useful mostly for testing.
  public addFromText(type: string, text: string): TDoc {
    let ths = text.split(";").map(s=>s.trim());
    // @ts-ignore
    let styleType = STYLE_CLASSES[type];
    ths.forEach(text => {
      let th = this.insertThought();

      let newst = Object.assign(
        Object.create(styleType.prototype),
        {
          type: type,
          data: text,
          meaning: 'INPUT',
          stylableId: th.id,
          id: this.nextId++
        });
      return this.insertStyle(newst);
    });
    return this;
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor() {
    super();

    this.nextId = 1;
    this.styles = [];
    this.thoughts = [];
    this.version = VERSION;
    this.clientData = [];
  }

  // Private Instance Properties

  private styles: Style[];
  private thoughts: Thought[];

  // Private Instance Methods

  // Helper method for tDoc.create*Style.
  private insertStyle<T extends Style>(style: T): T {
    this.styles.push(style);
    this.emit('styleInserted', style)
    return style;
  }

}

export class Thought {

  public static fromJsonObject(obj: ThoughtObject): Thought {
    // NOTE: This will throw for id === 0.
    if (!obj.id) { throw new Error("Invalid Thought object JSON"); }
    return Object.assign(Object.create(Thought.prototype), obj);
  }

  // Call tDoc.createThought instead of calling this constructor directly.
  /* private */ constructor(id: StylableId) {
    this.id = id;
  }

  // Public Instance Properties
  public id: StylableId;

  // Public Instance Methods
  public toObject(): ThoughtObject {
    // TYPESCRIPT: We are counting on the fact that a Thought that has
    // been stringified and then parsed is a ThoughtObject.
    return <any>this;
  }
}

export abstract class Style {

  public static fromJsonObject(obj: StyleObject): Style {
    if (!obj.type) { throw new Error("Invalid Style object JSON"); }
    // @ts-ignore // TYPESCRIPT:
    const cl = STYLE_CLASSES[obj.type];
    if (!cl) { throw new Error(`Style class not found in STYLE_CLASSES: ${obj.type}`); }
    return Object.assign(Object.create(cl.prototype), obj);
  }

  constructor(id: StylableId, stylable: Stylable) {
    this.id = id;
    this.stylableId = stylable.id;
  }

  // Instance Properties
  public id: number;
  public stylableId: number;
  public abstract type: StyleType;
  public abstract data: any;
  public abstract meaning: StyleMeaning;
  public abstract source: StyleSource;

  // Instance Methods

  public toObject(): StyleObject {
    // TYPESCRIPT: We are counting on the fact that a Style that has
    // been stringified and then parsed is a StyleObject.
    return <any>this;
  }
}

class JiixStyle extends Style {
  // Call tDoc.insertJiixStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: Jiix, meaning: StyleMeaning, source: StyleSource) {
    super(id, stylable);
    this.type = 'JIIX';
    this.data = data;
    this.meaning = meaning;
    this.source = source;
  }

  // Instance Properties
  type: 'JIIX';
  data: Jiix;
  meaning: StyleMeaning;
  source: StyleSource;
}

export class LatexStyle extends Style {
  // Call tDoc.insertLatexStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: LatexMath, meaning: StyleMeaning, source: StyleSource) {
    super(id, stylable);
    this.type = 'LATEX';
    this.data = data;
    this.meaning = meaning;
    this.source = source;
  }

  // Instance Properties
  type: 'LATEX';
  data: LatexMath;
  meaning: StyleMeaning;
  source: StyleSource;
}

export class MathJsStyle extends Style {
  // Call tDoc.insertMathJsPlainStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: MathJsText, meaning: StyleMeaning, source: StyleSource) {
    super(id, stylable);
    this.type = 'MATHJS';
    this.data = data;
    this.meaning = meaning;
    this.source = source;
  }

  // Instance Properties
  type: 'MATHJS';
  data: MathJsText;
  meaning: StyleMeaning;
  source: StyleSource;
}

class StrokeStyle extends Style {
  // Call tDoc.insertStrokeStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: StrokeGroups, meaning: StyleMeaning, source: StyleSource) {
    super(id, stylable);
    this.type = 'STROKE';
    this.data = data;
    this.meaning = meaning;
    this.source = source;
  }

  // Instance Properties
  type: 'STROKE';
  data: StrokeGroups;
  meaning: StyleMeaning;
  source: StyleSource;
}

class TextStyle extends Style {
  // Call tDoc.insertTextStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: TextData, meaning: StyleMeaning, source: StyleSource) {
    super(id, stylable);
    this.type = 'TEXT';
    this.data = data;
    this.meaning = meaning;
    this.source = source;
  }

  // Instance Properties
  type: 'TEXT';
  data: TextData;
  meaning: StyleMeaning;
  source: StyleSource;
}

const STYLE_CLASSES /* : { [type: string]: } */ = {
  'JIIX': JiixStyle,
  'LATEX': LatexStyle,
  'MATHJS': MathJsStyle,
  'STROKE': StrokeStyle,
  'TEXT': TextStyle,
}
