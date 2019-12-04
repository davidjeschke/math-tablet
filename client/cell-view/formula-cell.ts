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

import { $new, escapeHtml, Html } from '../dom.js';
import { StyleObject, FindRelationshipOptions, FindStyleOptions } from '../notebook.js';
import { NotebookView } from '../notebook-view.js';
import { getRenderer } from '../renderers.js';

import { CellView } from './index.js';
import { ToolInfo } from '../math-tablet-api.js';

// Types

// Constants

// Class

export class FormulaCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): FormulaCellView {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    this.renderFormula(style);
    this.renderTools(style);
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'formulaCell');

    // Create our child elements: handle, status, formula, tools, and delete button.
    // REVIEW: Use $new above to create children declaratively.
    $new<HTMLDivElement>('div', { class: 'handle', html: `(${style.id})`, appendTo: this.$elt });
    $new<HTMLDivElement>('div', { class: 'status', html: "&nbsp;", appendTo: this.$elt });
    this.$formula = $new<HTMLDivElement>('div', { class: 'formula', appendTo: this.$elt });
    this.$tools = $new<HTMLDivElement>('div', { class: 'tools', appendTo: this.$elt });
  }

  // Private Instance Properties

  private $formula: HTMLDivElement;
  private $tools: HTMLDivElement;

  // Private Instance Methods

  private renderFormula(style: StyleObject): void {
    // TODO: Render LaTeX if top-level style is not LaTeX,
    //       but has LaTeX style attached.

    if (style.meaning!='INPUT') {
      throw new Error(`Cannot render unknown formula meaning ${style.meaning}`);
    }
    const renderer = getRenderer(style.type);
    let { html, errorHtml } = renderer(style.data);
    if (errorHtml) {
      html = `<div class="error">${errorHtml}</div><tt>${escapeHtml(style.data.toString())}</tt>`;
    }

    // Render list of equivalent styles, if there are any.
    // REVIEW: Rendering equivalency annotations should probably be
    //         done separately from rendering the formula,
    //         but for now, for lack of a better place to put them,
    //         we are just appending the list of equivalent formulas
    //         to the end of the formula.
    const findOptions: FindRelationshipOptions = { fromId: style.id, toId: style.id, meaning: 'EQUIVALENCE' };
    const relationships = this.notebookView.openNotebook.findRelationships(findOptions);
    const equivalentStyleIds = relationships.map(r=>(r.toId!=style.id ? r.toId : r.fromId)).sort();
    if (equivalentStyleIds.length)
    html += ` [=${equivalentStyleIds.join(', ')}]`;

    this.$formula.innerHTML = html!;
  }

  private renderTools(style:StyleObject): void {
    this.$tools.innerHTML = '';
    // REVIEW: If we attached tool styles to the top-level style,
    //         then we would not need to do a recursive search.
    const findOptions2: FindStyleOptions = { type: 'TOOL', recursive: true };
    const toolStyles = this.notebookView.openNotebook.findStyles(findOptions2, style.id);
    for (const toolStyle of toolStyles) {
      const toolInfo: ToolInfo = toolStyle.data;
      let html: Html;
      if (toolInfo.tex) {
        const latexRenderer = getRenderer('LATEX');
        const results = latexRenderer!(toolInfo.tex);
        if (results.html) { html = results.html; }
        else { html = results.errorHtml!; }
      } else {
        html = toolInfo.html!;
      }
      const $button = $new('button', {
        class: 'tool',
        html,
        listeners: { 'click': _e=>this.notebookView.useTool(toolStyle.id) }
      });
      this.$tools.appendChild($button);
    }

  }
}