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

import { HtmlElement } from "../../html-element";
import { CssClass, Html } from "../../shared/common";

// Requirements

// Types

// Constants

// Global Variables

// Exported Class

export class SuggestionPanel extends HtmlElement<'div'> {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor() {

    super({
      tag: 'div',
      class: <CssClass>'suggestionPanel',
      // children: [{
      //   tag: 'button',
      //   attrs: { tabindex: -1 },
      //   classes: [ <CssClass>'insertCellBelowButton', <CssClass>'iconButton' ],
      //   html: RIGHT_TRIANGLE_ENTITY,
      //   asyncButtonHandler: e=>this.onInsertButtonClicked(e),
      // }],
      html: <Html>"<i>No suggestions.</i>",
      hidden: true,
    });

  }

  // Public Instance Properties
  // Public Instance Property Functions

  // Public Instance Methods

  public /* override */ show(): void {
    // We override show in order to position ourselves immediately above our parent element.
    const $parent = this.$elt.parentElement!;
    const domRect = $parent.getBoundingClientRect();
    const parentHeight = domRect.height;
    this.$elt.style.bottom = `${parentHeight}px`;
    super.show();
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers
  // Private Constructor
  // Private Instance Properties
  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

