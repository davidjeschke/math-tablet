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
// const debug = debug1('client:notebook-read-view');

import { assert, assertFalse, CssClass, notImplementedWarning, cssSizeInPixels, pixelsFromCssLength } from "../shared/common";

import { HtmlElement } from "../html-element";

import { Mode } from "../screens/notebook-read-screen/index";

import { PageReadView } from "./page-read-view";
import { ClientNotebook } from "../models/client-notebook";

// Types

// Constants

// TEMPORARY page data until our Notebooks are paginated:

//
// Global Variables

// Class

export class NotebookReadView extends HtmlElement<'div'> {

  // Class Methods

  // Public Constructor

  public constructor(notebook: ClientNotebook, mode: Mode) {
    // IMPORTANT: Call resize() after we are visible.
    const pageViews = notebook.pages.map(page=>new PageReadView(notebook, page));
    const $children = pageViews.map(pageView=>pageView.$elt);

    super({
      tag: 'div',
      class: <CssClass>'content',
      children: $children,
    });

    this.notebook = notebook;
    this.pageViews = pageViews;

    switch(mode) {
      case Mode.Reading:
        this.marginPercent = 0.025;
        this.pagesPerRow = 1;
        break;
      case Mode.Thumbnails:
        this.marginPercent = 0.1;
        this.pagesPerRow = 4;
        break;
      default: assertFalse();
    }
  }

  // Public Instance Properties

  // Public Instance Property Functions

  // Public Instance Methods

  public resize(): void {

    // Calculate the size of the page thumbnails
    // TODO: Different pages could have different sizes.
    const viewWidth = this.$elt.getBoundingClientRect().width;
    assert(viewWidth>0);
    const pageAspectRatio = pixelsFromCssLength(this.notebook.pageSize.width) / pixelsFromCssLength(this.notebook.pageSize.height);
    const w = viewWidth / (this.pagesPerRow + (this.pagesPerRow+1)*this.marginPercent);
    const pageWidth = Math.round(w);
    const pageHeight = Math.round(w / pageAspectRatio);
    const pageMargin = Math.round(w * this.marginPercent);

    const cssSize = cssSizeInPixels(pageWidth, pageHeight, 'px');
    for (const pageView of this.pageViews) {
      pageView.resizeViaStyle(cssSize);
      pageView.$elt.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  // NotebookView Interface Methods

  public onClosed(_reason: string): void {
    // TODO: update our display to indicate the notebook is closed.
    notImplementedWarning("NotebookReadView onClosed");
  }

  // -- PRIVATE --

  // Private Instance Properties

  private marginPercent: number;
  private notebook: ClientNotebook;
  private pagesPerRow: number;
  private pageViews: PageReadView[];

  // Private Instance Methods

}
