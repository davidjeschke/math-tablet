/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { EMPTY_FORMULA, EMPTY_TEX_EXPRESSION, EMPTY_WOLFRAM_EXPRESSION, FormulaObject, PlainTextFormula, TexExpression, WolframExpression } from "../shared/formula";
import { StrokeData } from "../shared/stylus";

import { postLatexRequest as myScriptLatexRequest } from "../adapters/myscript";
import { convertPlainTextFormulaToWolfram, convertTeXtoWolfram, convertWolframToPlainTextFormula, convertWolframToTeX } from "../adapters/wolframscript";
import { convertTexToSvg, convertTexToSvg as mathjaxConvertTextToSvg } from "../adapters/mathjax";
import { SvgMarkup } from "../shared/common";

// Types

// Parallels shared/formula.ts/FormulaRecognitionAlternative
interface ServerFormulaRecognitionAlternative {
  formula: ServerFormula;
  svg: SvgMarkup;
}

// Parallels shared/formula.ts/FormulaRecognitionResults
interface ServerFormulaRecognitionResults {
  alternatives: ServerFormulaRecognitionAlternative[];
}

// Constants

// Global Variables

// Exported Class

export class ServerFormula {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods

  public static createEmpty(): ServerFormula {
    return new this({ plain: EMPTY_FORMULA, tex: EMPTY_TEX_EXPRESSION, wolfram: EMPTY_WOLFRAM_EXPRESSION });
  }

  public static async createFromPlainText(plain: PlainTextFormula): Promise<ServerFormula> {
    const wolfram = convertPlainTextFormulaToWolfram(plain);
    const tex = await convertWolframToTeX(wolfram);
    return new this({ plain, tex, wolfram });
  }

  public static async createFromTeX(tex: TexExpression): Promise<ServerFormula> {
    const wolfram = await convertTeXtoWolfram(tex);
    const plain = convertWolframToPlainTextFormula(wolfram);
    return new this({ plain, tex, wolfram });
  }

  public static async recognizeStrokes(strokeData: StrokeData): Promise<ServerFormulaRecognitionResults> {
    const tex = await myScriptLatexRequest(strokeData);
    const formula = await this.createFromTeX(tex);
    const svg = convertTexToSvg(tex);
    return { alternatives: [ { formula, svg } ] };
  }

  // Public Class Event Handlers

  public constructor(
    obj: FormulaObject, // IMPORTANT: We hold on to this object.
                        //            Caller must not modify object after passing to constructor.
  ) {
    this.obj = obj;
  }

  // Public Instance Properties

  public obj: FormulaObject;

  // Public Instance Property Functions

  public get tex(): TexExpression {
    return this.obj.tex;
  }

  public get wolfram(): WolframExpression {
    return this.obj.wolfram;
  }

  // Public Instance Methods

  public renderSvg(): SvgMarkup {
    if (!this.cachedSvg) {
      this.cachedSvg = mathjaxConvertTextToSvg(this.obj.tex)
    }
    return this.cachedSvg;
  }

  public updateFormula(obj: FormulaObject): void {
    this.obj.plain = obj.plain;
    this.obj.tex = obj.tex;
    this.obj.wolfram = obj.wolfram;
    delete this.cachedSvg;
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Public Constructor

  // Private Instance Properties

  private cachedSvg?: SvgMarkup;

  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

