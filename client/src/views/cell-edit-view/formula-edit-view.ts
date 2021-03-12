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

// TODO: Render prefix, handle and status into display SVG.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:formula-edit-view');

import { CssClass } from "../../shared/common";
import { FormulaCellObject } from "../../shared/formula";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";

import { FormulaCell } from "../../models/client-cell/formula-cell";

import { NotebookEditView } from "../notebook-edit-view";

import { CellEditView } from "./index";
import { CELL_ICONS, HtmlElementSpecification, svgIconReferenceMarkup } from "../../dom";
import { CellType } from "../../shared/cell";

// Types

// Constants

// Exported Class

export class FormulaEditView extends CellEditView<FormulaCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(notebookEditView: NotebookEditView, cell: FormulaCell) {
    debug(`Creating instance: style ${cell.obj.id}`);

    const rightMarginButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      attrs: { tabindex: -1 },
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup(CELL_ICONS.get(CellType.Formula)!),
      asyncButtonHandler: (e: MouseEvent)=>this.onRecognizeFormulaButtonClicked(e),
    };
    super(notebookEditView, cell, <CssClass>'formulaCell', rightMarginButton);
  }

  // Public Instance Methods

  private async onRecognizeFormulaButtonClicked(event: MouseEvent): Promise<void> {
    // LATER: Cancel if user leaves screen when recognition request outstanding
    event.stopPropagation(); // Prevent our own 'onClicked' handler from being called.
    debug(`onRecognizeFormulaButtonClicked`);
    const response = await this.cell.recognizeFormulaRequest();
    this.suggestionPanel.setRecognitionResults(response.results);
    this.suggestionPanel.showIfHidden();
  }

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): boolean {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    // switch (update.type) {
    //   default: /* Nothing to do */ break;
    // }
    return false;
  }

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

}

// HELPER FUNCTIONS
