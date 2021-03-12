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

import { $new } from "../../dom";
import { HtmlElement } from "../../html-element";
import { ClientCell } from "../../models/client-cell";
import { CellObject } from "../../shared/cell";
import { assert, CssClass, Html } from "../../shared/common";
import { FormulaRecognitionAlternative, FormulaRecognitionResults } from "../../shared/formula";

// Requirements

// Types

// Constants

// Global Variables

// Exported Class

export class SuggestionPanel<O extends CellObject> extends HtmlElement<'div'> {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor(cell: ClientCell<O>) {

    const $noSuggestionsMsg = $new<'div'>({
      tag: 'div',
      html: <Html>"<i>No suggestions.</i>",
    });

    const $recognitionResults = $new<'div'>({
      tag: 'div',
    });

    super({
      tag: 'div',
      class: <CssClass>'suggestionPanel',
      children: [ $noSuggestionsMsg, $recognitionResults ],
      hidden: true,
    });

    this.$noSuggestionsMsg = $noSuggestionsMsg;
    this.$recognitionResults = $recognitionResults;
    this.cell = cell;
  }

  // Public Instance Properties
  // Public Instance Property Functions

  // Public Instance Methods

  public setRecognitionResults(results: FormulaRecognitionResults): void {
    assert(results.alternatives.length>0);
    this.emptyRecognitionResults();
    for (const alternative of results.alternatives) {
      const $alternative = $new<'div'>({
        tag: 'div',
        asyncListeners: {
          click: e=>this.onRecognitionAlternativeClicked(e, alternative),
        },
        html: alternative.svg,
      });
      //const $svg = $outerSvg<'svg'>(alternative.svg);
      this.$recognitionResults.append($alternative);
    }
    this.showOrHideNoSuggestionsMsg();
  }

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

  // Private Instance Properties

  private $noSuggestionsMsg: HTMLDivElement;
  private $recognitionResults: HTMLDivElement;
  private cell: ClientCell<O>;

  // Private Instance Property Functions

  private noSuggestions(): boolean {
    // Returns true iff there are no suggestions in the suggestions panel.
    return this.$recognitionResults.childElementCount == 0;
  }

  // Private Instance Methods

  private emptyRecognitionResults(): void {
    this.$recognitionResults.innerHTML = '';
    this.showOrHideNoSuggestionsMsg();
  }

  private showOrHideNoSuggestionsMsg(): void {
    // Shows the "No suggestions" message if there are no suggestions
    // in the panel. Otherwise, hides it.
    // Call this at every point where we add or remove suggestions
    // to the panel.
    const show = this.noSuggestions();
    this.$noSuggestionsMsg.style.display = (show ? '' : 'none');
  }

  // Private Instance Event Handlers

  private async onRecognitionAlternativeClicked(_event: MouseEvent, alternative: FormulaRecognitionAlternative): Promise<void> {
    // REVIEW: What do we do if error happens on the request?
    await this.cell.typesetFormulaRequest(alternative);
    this.emptyRecognitionResults();
    if (this.noSuggestions()) { this.hide(); }
  }
}

