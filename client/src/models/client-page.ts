/*
Math Tablet
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
// const debug = debug1('client:client-page');

import {
  assert, CssLength, CssSelector, ElementId, LengthInPixels, LengthInPoints, SvgMarkup
} from "../shared/common";
import { CellIndex, PageIndex } from "../shared/cell";

import { $, $newSvg, convertPointsToPixels, pixelsFromCssLength } from "../dom";

import { ClientNotebook } from "./client-notebook";

// Types

// Exported Class

export class ClientPage {

  // Public Constructor

  public constructor(
    notebook: ClientNotebook,
    pageIndex: PageIndex,
    cellIndex: CellIndex,
    numCells: number,
  ) {
    this.notebook = notebook;
    this.index = pageIndex;

    // REVIEW: points to pixels conversion?
    const x = pixelsFromCssLength(notebook.margins.left);
    let y = pixelsFromCssLength(notebook.margins.top);
    let pageMarkup: SvgMarkup = <SvgMarkup>'';
    // TODO: Just the cells of this page.

    for (let i = cellIndex; i < cellIndex+numCells; i++) {
      const cell = notebook.cells[i];
      const cellMarkup: SvgMarkup = <SvgMarkup>`<use href="#n${notebook.id}c${cell.id}" x="${x}" y="${y}"/>\n`;
      pageMarkup += cellMarkup; // <SvgMarkup>(pageMarkup + cellMarkup);
      y += pixelsFromCssLength(cell.obj.cssSize.height);
    }

    const $svgSymbol = $newSvg({
      tag: 'symbol',
      id: <ElementId>`n${notebook.id}p${pageIndex}`,
      attrs: {
        viewBox: `0 0 ${this.widthInPixels} ${this.heightInPixels}`
      },
      html: pageMarkup,
    });
    $(document, <CssSelector>'#svgContent').append($svgSymbol);
    // this.$svgSymbol = $svgSymbol;

  }

  // Public Instance Properties

  public index: PageIndex;

  // Public Instance Property Functions

  public get heightInPixels(): LengthInPixels {
    return convertPointsToPixels(this.heightInPoints);
  }

  public get heightInPoints(): LengthInPoints {
    return extractPointsFromCssLength(this.notebook.pageSize.height);
  }

  public get widthInPixels(): LengthInPixels {
    return convertPointsToPixels(this.heightInPoints);
  }

  public get widthInPoints(): LengthInPoints {
    return extractPointsFromCssLength(this.notebook.pageSize.height);
  }


  // --- PRIVATE ---

  // Private Instance Properties

  // private $svgSymbol: SVGSymbolElement;
  private notebook: ClientNotebook;
  // private pageNo: PageNumber;
}

// Helper Functions

function extractPointsFromCssLength(length: CssLength): LengthInPoints {
  assert(length.endsWith('pt'));
  return parseInt(length, 10);
}
