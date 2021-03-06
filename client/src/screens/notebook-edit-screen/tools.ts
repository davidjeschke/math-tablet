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

import { CellId } from "../../shared/cell";
import { CssClass } from "../../shared/common";

import { HtmlElement } from "../../html-element";
import { NotebookEditScreen } from ".";

// Types

// Constants

// Global Variables

// Class

export class Tools extends HtmlElement<'div'>{

  // Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {
    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: <CssClass>'tools',
    });
    this.screen = screen;
  }

  // Instance Methods

  public clear(): void {
    this.$elt.innerHTML = '';
  }

  public render(_styleId: CellId): void {
    // const style = this.screen.notebook.getCell(cellId);


    // // Render the symbol table
    // const findOptions: FindStyleOptions = { role: 'SYMBOL-TABLE', /* recursive: true */ };
    // const symbolTableStyle = this.screen.notebook.findStyle(findOptions, style.id);
    // if (symbolTableStyle) {
    //   const symbolTableData = <SymbolTable>symbolTableStyle.data;
    //   let html = <Html>'<tr><td colspan="2">Symbols</td></tr>';
    //   for (const [symbol, constraints] of Object.entries(symbolTableData)) {
    //     html += `<tr><td>${escapeHtml(symbol)}</td><td>${constraints.map(c=>escapeHtml(c)).join('; ')}</td></tr>`
    //   }
    //   const $table = $new({ tag: 'table', class: <CssClass>'symbolTable', html });
    //   this.$elt.appendChild($table);
    // }

    // // REVIEW: If we attached tool styles to the top-level style,
    // //         then we would not need to do a recursive search.
    // const findOptions2: FindStyleOptions = { type: 'TOOL-DATA', recursive: true };
    // const toolStyles = this.screen.notebook.findStyles(findOptions2, style.id);
    // for (const toolStyle of toolStyles) {
    //   const toolData: ToolData = toolStyle.data;
    //   const html: Html = toolData.html!;
    //   assert(html);
    //   if (toolData.tex) {
    //     console.warn(`Tool TeX rendering not implemented: ${toolData.tex}`);
    //   }

    //   const $button = $new({
    //     tag: 'button',
    //     class: <CssClass>'tool',
    //     html,
    //     syncButtonHandler: _e=>this.screen.content.useTool(toolStyle.id),
    //   });
    //   this.$elt.appendChild($button);
    // }
  }

  // -- PRIVATE --

  // Private Instance Properties

  // @ts-expect-error // TODO:
  private screen: NotebookEditScreen;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
