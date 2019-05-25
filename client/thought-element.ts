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

import { $new, Html } from './dom.js';
import { ThoughtObject } from './math-tablet-api.js';

// Exported Class

export class ThoughtElement {

  // Class Methods

  static insert($tDoc: HTMLElement, thought: ThoughtObject): ThoughtElement {
    var rval = new this(thought);
    $tDoc.appendChild(rval.$elt);
    return rval;
  }

  // Instance Properties

  public $elt: HTMLDivElement;

  // Instance Methods

  delete(): void {
    const $parent = this.$elt.parentElement;
    if (!$parent) { throw new Error("Thought element has no parent in delete."); }
    $parent.removeChild(this.$elt);
  }

  // PRIVATE

  // Private Constructor

  private constructor(thought: ThoughtObject) {
    const id = `S${thought.id}`;
    const classes = ['thought'];
    const deleteButtonHtml: Html = `<button class="deleteThought">&#x2715;</button>`;
    const headerHtml: Html = `<div class="header">T-${thought.id}</div>`
    const html: Html = `${deleteButtonHtml}${headerHtml}`;
    this.$elt = $new<HTMLDivElement>('div', id, classes, html);
  }

}