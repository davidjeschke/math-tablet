/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { CellObject, CellType } from "./cell";
import { SvgMarkup } from "./common";

// Types

// This type is for the variation of plain-text math input that we accept.
// Currently, it is the same as WolframExpression
// except that we convert single equals to double equals.
export type PlainTextFormula = '{PlainTextFormula}';
export type TexExpression = '{TexExpression}';
export type WolframExpression = '{WolframExpression}';

export interface FormulaCellObject extends CellObject {
  type: CellType.Formula,
  formula: FormulaObject;
}

export interface FormulaObject {
  plain: PlainTextFormula;
  tex: TexExpression;
  wolfram: WolframExpression;
}

export interface FormulaRecognitionAlternative {
  formula: FormulaObject;
  svg: SvgMarkup;
}

export interface FormulaRecognitionResults {
  alternatives: FormulaRecognitionAlternative[];
}

// CONSTANTS

export const EMPTY_FORMULA = <PlainTextFormula>'';
export const EMPTY_TEX_EXPRESSION = <TexExpression>'';
export const EMPTY_WOLFRAM_EXPRESSION = <WolframExpression>'';
