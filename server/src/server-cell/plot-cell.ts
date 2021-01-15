/*
Math Tablet
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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { deepCopy, PlainText, SvgMarkup } from "../shared/common";
import { CellSource, CellType, PlotCellObject } from "../shared/cell";
import { cssSizeInPoints } from "../shared/notebook";
import { EMPTY_STROKE_DATA } from "../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
// import { plotUnivariate } from "../adapters/wolframscript";
// import { WolframExpression } from "../shared/formula";

// Constants

const DEFAULT_WIDTH = 6.5; // inches
const DEFAULT_SIZE = cssSizeInPoints(DEFAULT_WIDTH, 3);

// Exported Class

export class PlotCell extends ServerCell<PlotCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): PlotCell {
    const obj: PlotCellObject = {
      id: notebook.nextId(),
      type: CellType.Plot,
      cssSize: deepCopy(DEFAULT_SIZE),
      displaySvg: <SvgMarkup>'',
      formulaCellId: -1, // TODO:
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: PlotCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  public displaySvg(): SvgMarkup {
    const markup = <SvgMarkup>'<!-- Plot Cell SVG -->';
    // TODO: Need to cache the plot and return the cached version.
    // const plotMarkup = await plotUnivariate(<WolframExpression>"x^2 - 3", <WolframExpression>"x");
    // TODO: strip <svg></svg>
    return super.displaySvg(<SvgMarkup>(markup /* + plotMarkup */));
  }

}
