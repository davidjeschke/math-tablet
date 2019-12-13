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

import debug1 from 'debug';

import { BaseObserver, Rules } from './base-observer';
import { convertTeXtoWolfram, execute, convertWolframToTeX } from '../wolframscript';
import { ServerNotebook } from '../server-notebook';
import { WolframData, LatexData, isEmptyOrSpaces } from '../../client/math-tablet-api';
import { StyleObject } from '../../client/notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class WolframObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return WolframObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<WolframObserver> {
    debug(`Opening Wolfram CAS observer for ${notebook._path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      // TODO: Add style as peer, not child
      name: "tex-to-wolfram",
      parentStyleTest: WolframObserver.isConvertibleLatexStyle,
      role: 'INPUT-ALT',
      type: 'WOLFRAM',
      computeAsync: WolframObserver.ruleConvertTexToWolfram,
    },
    {
      name: "wolfram-to-tex",
      parentStyleTest: { role: 'INPUT', type: 'WOLFRAM' },
      role: 'INPUT-ALT',
      type: 'LATEX',
      computeAsync: WolframObserver.ruleConvertWolframToTex,
    },
    {
      name: "evaluate-wolfram",
      parentStyleTest: { role: /^(INPUT|INPUT-ALT)$/, type: 'WOLFRAM' },
      // parentStylePattern: { role: 'INPUT', type: 'WOLFRAM' },
      role: 'EVALUATION',
      type: 'WOLFRAM',
      computeAsync: WolframObserver.ruleEvaluateWolframExpr,
    },
  ];

  // Private Class Methods

  private static isConvertibleLatexStyle(notebook: ServerNotebook, style: StyleObject): boolean {
    if (style.type != 'LATEX') { return false; }
    if (style.role!='INPUT' && style.role!='INPUT-ALT') { return false; }
    if (style.parentId) {
      const parentStyle = notebook.getStyleById(style.parentId);
      if (parentStyle.parentId) { return false; }
      if (parentStyle.type == 'WOLFRAM') { return false; }
    }
    return true;
  }

  private static async ruleConvertTexToWolfram(data: LatexData): Promise<WolframData|undefined> {
    // REVIEW: If conversion fails?
    return data ? await convertTeXtoWolfram(data) : undefined;
  }

  private static async ruleConvertWolframToTex(data: WolframData): Promise<LatexData|undefined> {
    // REVIEW: If conversion fails?
    return data ? await convertWolframToTeX(data) : undefined;
  }

  private static async ruleEvaluateWolframExpr(expr: WolframData) : Promise<WolframData|undefined> {
    // REVIEW: If evaluation fails?
    debug(`Evaluating: "${expr}".`);
    let rval: WolframData|undefined;
    if (isEmptyOrSpaces(expr)) {
      rval = undefined;
    } else {
      rval = await execute(`InputForm[runPrivate[${expr}]]`);
    }
    debug("Evaluated to: ", rval);
    return rval;
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}
