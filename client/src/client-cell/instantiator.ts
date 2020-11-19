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

import { CellObject, CellType, FigureCellObject, PlotCellObject, TextCellObject } from "../shared/cell";
import { assertFalse } from "../shared/common";
import { FormulaCellObject } from "../shared/formula";

import { FormulaClientCell } from "./formula-cell";
import { FigureClientCell } from "./figure-cell";
import { PlotClientCell } from "./plot-cell";
import { TextClientCell } from "./text-cell";

import { ClientCell } from "./index";
import { ClientNotebook } from "../client-notebook";

// Constants

// Exports

export function createCell<O extends CellObject>(notebook: ClientNotebook, obj: O): ClientCell<O> {

  // If a style has a child of REPRESENTATION|INPUT/STROKES then use a stylus cell.
  let rval: FigureClientCell|FormulaClientCell|TextClientCell|PlotClientCell;
  switch(obj.type) {
    case CellType.Figure:   rval = new FigureClientCell(notebook, <FigureCellObject><unknown>obj); break;
    case CellType.Formula:  rval = new FormulaClientCell(notebook, <FormulaCellObject><unknown>obj); break;
    case CellType.Text:     rval = new TextClientCell(notebook, <TextCellObject><unknown>obj); break;
    case CellType.Plot:     rval = new PlotClientCell(notebook, <PlotCellObject><unknown>obj); break;
    default: assertFalse();
  }
  return <ClientCell<O>><unknown>rval;
}
