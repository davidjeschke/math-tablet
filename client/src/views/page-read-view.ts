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

// import * as debug1 from "debug";
// const debug = debug1('client:cell-read-view');

import { CssClass, SvgMarkup } from "../shared/common";

import { ClientNotebook } from "../models/client-notebook";
import { ClientPage } from "../models/client-page";
import { SvgElement } from "../svg-element";
import { viewBoxFromCssSize } from "../dom";

// Exported Class

export class PageReadView extends SvgElement<'svg'> {

  // Public Constructor

  public constructor(
    notebook: ClientNotebook,
    page: ClientPage,
  ) {
    super({
      tag: 'svg',
      class: <CssClass>'page',
      attrs: {
        viewBox: viewBoxFromCssSize(page.cssSize),
      },
      html: <SvgMarkup>`<use href="#n${notebook.id}p${page.index}" x="0" y="0"/>`,
      // listeners: {
      //   click: e=>this.onPageClicked(e),
      //   dblclick: e=>this.onPageDoubleClicked(e),
      // },
    });
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Methods

  // Private Event Handlers

  // private onPageClicked(event: MouseEvent): void {
  //   const $page = <SVGSVGElement>event.target;
  //   console.log(`Page double clicked: ${$page.id}`);

  //   // Unselect all other pages.
  //   // REVIEW: Use selector to select only selected pages?
  //   for (const $otherPage of $allSvg<'svg'>(this.$elt, '.page')) {
  //     if ($otherPage == $page) { continue; }
  //     $otherPage.classList.remove('selected');
  //   }

  //   // Select the page that was clicked on.
  //   $page.classList.add('selected');
  // }

  // private onPageDoubleClicked(_event: MouseEvent): void {
  //   // TODO: double-click on thumbnail should go to page, not cells.
  //   notImplementedError("NotebookReadView onPageDoubleCLicked");
  // }

}
