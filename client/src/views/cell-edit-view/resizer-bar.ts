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

// TODO: Don't let shrink to conceal any ink.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:resizer-bar');

import { CssClass, LengthInPixels, PositionInPixels } from "../../shared/common";
import { RIGHT_TRIANGLE_ENTITY } from "../../dom";
import { HtmlElement } from "../../html-element";

// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;

export interface CallbackFunctions {
  cancel: ()=>void;
  down: ()=>void;
  insert: ()=>Promise<void>;
  move: (deltaY: LengthInPixels)=>void;
  up: (deltaY: LengthInPixels)=>void;
}

interface PointerInfo {
  clientY: PositionInPixels;
  lastDeltaY: LengthInPixels;
}

// Constants

// Class

// Exported Class

export class ResizerBar extends HtmlElement<'div'>  {

  // Class Methods


  // Public Constructor

  public constructor(callbackFunctions: CallbackFunctions) {

    super({
      tag: 'div',
      class: <CssClass>'resizeBar',
      listeners: {
        pointercancel:  e=>this.onPointerCancel(e),
        pointerdown:    e=>this.onPointerDown(e),
        // pointerenter:   e=>this.onPointerEnter(e),
        // pointerleave:   e=>this.onPointerLeave(e),
        pointermove:    e=>this.onPointerMove(e),
        // pointerout:     e=>this.onPointerOut(e),
        // pointerover:    e=>this.onPointerOver(e),
        pointerup:      e=>this.onPointerUp(e),
      },
      children: [{
        tag: 'button',
        attrs: { tabindex: -1 },
        classes: [ <CssClass>'insertCellBelowButton', <CssClass>'iconButton' ],
        html: RIGHT_TRIANGLE_ENTITY,
        asyncButtonHandler: e=>this.onInsertButtonClicked(e),
      }],
    });

    this.callbackFunctions = callbackFunctions;
    this.pointerMap = new Map();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private callbackFunctions: CallbackFunctions;
  private pointerMap: PointerMap;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

  private async onInsertButtonClicked(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.callbackFunctions.insert();
  }

  private onPointerCancel(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    if (!this.pointerMap.delete(event.pointerId)) {
      console.warn(`Unknown pointer ID on pointer cancel: ${event.pointerId}`);
      return;
    }
    this.$elt.releasePointerCapture(event.pointerId);
    this.callbackFunctions.cancel();
  }

  private onPointerDown(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    if (event.target !== this.$elt) { /* User clicked on insert button. */ return; }

    // Prevent compatibility mouse events
    // REVIEW: This doesn't prevent a click event on cell.
    event.preventDefault();

    this.$elt.setPointerCapture(event.pointerId);

    const pi: PointerInfo = {
      clientY: event.clientY,
      lastDeltaY: 0,
    };
    this.pointerMap.set(event.pointerId, pi);

    this.callbackFunctions.down();
  }

  // private onPointerEnter(event: PointerEvent): void {
  //  debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  // }

  // private onPointerLeave(event: PointerEvent): void {
  //  debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  // }

  private onPointerMove(event: PointerEvent): void {
    // debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    const pi = this.pointerMap.get(event.pointerId);
    if (!pi) { /* Pointer is not down */ return; }

    // Call the resize callback unless the vertical displacement hasn't changed.
    const deltaY = Math.round(event.clientY-pi.clientY);
    if (deltaY != pi.lastDeltaY) {
      pi.lastDeltaY = deltaY;
      this.callbackFunctions.move(deltaY);
    }
  }

  // private onPointerOut(event: PointerEvent): void {
  //  debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  // }

  // private onPointerOver(event: PointerEvent): void {
  //  debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  // }

  private onPointerUp(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);

    const pi = this.pointerMap.get(event.pointerId);
    if (!pi) {
      // User clicked on insert button, or started the mouse press on another element.
      return;
    }

    this.pointerMap.delete(event.pointerId);
    this.$elt.releasePointerCapture(event.pointerId);

    const deltaY = Math.round(event.clientY-pi.clientY);
    this.callbackFunctions.up(deltaY);
  }

}

