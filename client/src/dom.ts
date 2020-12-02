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

import { assert, CssClass, CssLength, CssLengthUnits, Html, SvgMarkup } from "./shared/common";
import { SyncListener, addSyncEventListener, addAsyncEventListener, AsyncListener } from "./error-handler";

// Types

export type CssSelector = '{CssSelector}';
export type ElementId = '{ElementId}';

interface Attributes {
  [name: string]: boolean | number | string,
}

interface AsyncListeners {
  blur?: SyncListener<FocusEvent>;
  change?: AsyncListener<InputEvent>;
  click?: AsyncListener<MouseEvent>;
  input?: AsyncListener<InputEvent>;
  keypress?: AsyncListener<KeyboardEvent>;
  keyup?: AsyncListener<KeyboardEvent>;
  submit?: AsyncListener<Event>;
}
interface SyncListeners {
  // REVIEW: Can we populate this declaratively from the standard DOM types?
  blur?: SyncListener<FocusEvent>;
  change?: SyncListener<InputEvent>;
  click?: SyncListener<MouseEvent>;
  dblclick?: SyncListener<MouseEvent>;
  dragend?: SyncListener<DragEvent>;
  dragstart?: SyncListener<DragEvent>;
  dragover?: SyncListener<DragEvent>;
  dragenter?: SyncListener<DragEvent>;
  drop?: SyncListener<DragEvent>;
  focus?: SyncListener<FocusEvent>;
  input?: SyncListener<InputEvent>;
  keydown?: SyncListener<KeyboardEvent>;
  keypress?: SyncListener<KeyboardEvent>;
  keyup?: SyncListener<KeyboardEvent>;
  mousedown?: SyncListener<MouseEvent>;
  pointercancel?: SyncListener<PointerEvent>;
  pointerdown?: SyncListener<PointerEvent>;
  pointerenter?: SyncListener<PointerEvent>;
  pointerleave?: SyncListener<PointerEvent>;
  pointermove?: SyncListener<PointerEvent>;
  pointerout?: SyncListener<PointerEvent>;
  pointerover?: SyncListener<PointerEvent>;
  pointerup?: SyncListener<PointerEvent>;
}

interface DataAttributes {
  [name: string]: string,
}

interface NewCommonOptions {
  asyncListeners?: AsyncListeners;
  attrs?: Attributes;
  class?: CssClass;
  classes?: CssClass[];
  data?: DataAttributes;
  disabled?: boolean;
  id?: ElementId;
  hidden?: boolean;
  listeners?: SyncListeners;
  style?: string;
  title?: string;
  type?: string;
  value?: string;
  selected?: boolean;

  // TYPESCRIPT: Allow only one of the following to be used at a time.
  appendTo?: Element;
  prependTo?: Element
  replaceInner?: Element;
}

export interface HtmlElementSpecification<K extends keyof HTMLElementTagNameMap> extends NewCommonOptions {
  tag: K;
  children?: HtmlElementOrSpecification[];
  html?: Html|SvgMarkup;
}

export interface SvgElementSpecification<K extends keyof SVGElementTagNameMap> extends NewCommonOptions {
  tag: K;
  children?: SvgElementSpecification<any>[];
  html?: SvgMarkup;
}

export type HtmlElementOrSpecification = HtmlElementSpecification<any>|HTMLElement|SVGElement;

// Keep this list in sync with server/views/iconmonstr.pug.
export type SvgIconId = 'iconMonstrBug12' | 'iconMonstrCalculator2' | 'iconMonstrClothing18' | 'iconMonstrFile5' |
                  'iconMonstrFile12' | 'iconMonstrFile15' | 'iconMonstrFolder2' | 'iconMonstrFolder5' |
                  'iconMonstrFullScreen7' | 'iconMonstrHome6' | 'iconMonstrLogout18' | 'iconMonstrNote23' |
                  'iconMagnifier6' | 'iconMonstrPencil9' | 'iconMonstrRedo4' | 'iconMonstrRefresh2' |
                  'iconMonstrText1' | 'iconMonstrTrashcan2' | 'iconMonstrUndo4' | 'iconMonstrUser1' |
                  'iconMonstrChart20' ;

  // Constants

const SVG_NS = 'http://www.w3.org/2000/svg';

const ENUMERATED_ATTRIBUTES = new Set<string>([ 'draggable']);

export const CHECKMARK_ENTITY = <Html>'&#x2713;'
export const CLOSE_X_ENTITY = <Html>'&#x2715;'
export const DOTTED_CIRCLE_ENTITY = <Html>'&#x25CC;';
export const PENCIL_ENTITY = <Html>'&#x270E;';
export const RIGHT_TRIANGLE_ENTITY = <Html>'&#x25B6;';
export const RIGHT_ARROW_ENTITY = <Html>'&#x27A1;';
// export const SIGMA_ENTITY = <Html>'&#x3A3;';

// Exported Functions

export function $<K extends keyof HTMLElementTagNameMap>(root: Element|Document, selector: string): HTMLElementTagNameMap[K] {
  const $elt = $maybe<K>(root, selector)!;
  assert($elt, `Expected element for selector '${selector}'.`);
  return $elt;
}

export function $maybe<K extends keyof HTMLElementTagNameMap>(root: Element|Document, selector: string): HTMLElementTagNameMap[K]|undefined {
  const $elts = $all<K>(root, selector);
  assert($elts.length <= 1, `Expected no more than one element for selector '${selector}', got ${$elts.length}.`);
  return $elts.length>=1 ? $elts[0] : undefined;
}

export function $all<K extends keyof HTMLElementTagNameMap>(root: Element|Document, selector: string): NodeListOf<HTMLElementTagNameMap[K]> {
  return root.querySelectorAll<HTMLElementTagNameMap[K]>(selector);
}

export function $allSvg<K extends keyof SVGElementTagNameMap>(root: Element|Document, selector: string): NodeListOf<SVGElementTagNameMap[K]> {
  return root.querySelectorAll<SVGElementTagNameMap[K]>(selector);
}

export function $attach<K extends keyof HTMLElementTagNameMap>(
  root: Element|Document,
  selector: CssSelector,
  options: NewCommonOptions,
): HTMLElementTagNameMap[K] {
  const $elt = $<K>(root, selector);
  $configure($elt, options);
  return $elt;
}

export function $configure($elt: HTMLElement|SVGElement, options: NewCommonOptions): void {
  if (options.id) { $elt.setAttribute('id', options.id); }
  if (options.class) { $elt.classList.add(options.class); }
  if (options.classes) {
    for (const cls of options.classes) { $elt.classList.add(cls); }
  }

  const attributes: Attributes = { ...options.attrs };
  if (options.data) {
    for (const [key, value] of Object.entries(options.data)) {
      attributes[`data-${key}`] = value;
    }
  }
  if (options.disabled) { attributes.disabled = true; }
  if (options.selected) { attributes.selected = true; }
  if (options.title) { attributes.title = options.title }
  if (options.type) { attributes.type = options.type }
  if (options.value) { attributes.value = options.value }
  attachAttributes($elt, attributes);

  if (options.style) { $elt.setAttribute('style', options.style); }
  if (options.hidden) { $elt.style.display = 'none'; }

  if (options.listeners) { attachSyncListeners($elt, options.listeners); }
  if (options.asyncListeners) { attachAsyncListeners($elt, options.asyncListeners); }

  if (options.appendTo) { options.appendTo.appendChild($elt); }
  // else if (options.prependTo) { options.prependTo.insertBefore($elt, options.prependTo.firstChild); }
  else if (options.replaceInner) { options.replaceInner.innerHTML = ''; options.replaceInner.appendChild($elt); }
}

export function $configureAll($elts: NodeListOf<HTMLElement|SVGElement>, options: NewCommonOptions): void {
  for (const $elt of $elts) { $configure($elt, options); }
}

export function $new<K extends keyof HTMLElementTagNameMap>(options: HtmlElementSpecification<K>): HTMLElementTagNameMap[K] {
  const $elt = document.createElement(options.tag);
  $configure($elt, options);
  if (options.html) { $elt.innerHTML = options.html; }
  if (options.children) {
    for (const childOptions of options.children) {
      if (childOptions instanceof HTMLElement || childOptions instanceof SVGElement) {
        $elt.append(childOptions);
      } else {
        $new({ ...childOptions, appendTo: $elt});
      }
    }
  }
  return $elt;
}

export function $newSvg<K extends keyof SVGElementTagNameMap>(options: SvgElementSpecification<K>): SVGElementTagNameMap[K] {
  const $elt = document.createElementNS(SVG_NS, options.tag);
  $configure($elt, options);
  return $elt;
}

export function $outerSvg<K extends keyof SVGElementTagNameMap>(markup: SvgMarkup): SVGElementTagNameMap[K] {
  const $parent = document.createElement('div');
  $parent.innerHTML = markup;
  const $elt: SVGElement = <SVGElement>$parent.firstElementChild!;
  assert($elt);
  // assert($elt instanceof SVGElement);  // REVIEW: <path> elements don't appear to mneet this instanceof test.
  return <SVGElementTagNameMap[K]>$elt;
}

export function $svg<K extends keyof SVGElementTagNameMap>(root: Element|Document, selector: string): SVGElementTagNameMap[K] {
  const $elts = $allSvg<K>(root, selector);
  assert($elts.length == 1, `Expected one element for selector '${selector}', got ${$elts.length}.`);
  return $elts[0];
}

// export function $svgIconReference(id: SvgIconId): SVGSVGElement {
//   return $outerSvg<'svg'>(svgIconReferenceMarkup(id));
// }

// export function escapeHtml(str: string): Html {
//   // From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
//   var $div = document.createElement('div');
//   $div.appendChild(document.createTextNode(str));
//   return <Html>$div.innerHTML;
// }

export function cssLength(length: CssLength, units: CssLengthUnits): number {
  assert(length.endsWith(units)); // LATER: Allow unit conversions.
  return parseFloat(length);
}

export function svgIconReferenceMarkup(id: SvgIconId): SvgMarkup {
  return <SvgMarkup>`<svg class="icon"><use xlink:href="#${id}"/></svg>`
}

// HELPER FUNCTIONS

function attachAttributes($elt: Element, attrs: Attributes): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value !== 'boolean') {
      $elt.setAttribute(key, value.toString());
    } else {
      // Boolean types are present if set to any value, and MDN documentation recommends the empty string,
      // unless they are "enumerated", in which case they should be explicitly "true" or "false".
      if (ENUMERATED_ATTRIBUTES.has(key)) {
        $elt.setAttribute(key, value.toString());
      } else {
        if (value) { $elt.setAttribute(key, ''); }
      }
    }
  }
}

function attachAsyncListeners($elt: Element, listeners: AsyncListeners): void {
  // REVIEW: Might be nice to pass a function to generate the error message to addSyncEventListener,
  //         so we don't have to do the work of generating the "specifier" unless an error actually occurs.
  const specifier = elementSpecifier($elt);
  for (const [ eventName, listener ] of Object.entries(listeners)) {
    addAsyncEventListener($elt, eventName, listener, <Html>`Internal error processing ${specifier} ${eventName} event.`);
  }
}

function attachSyncListeners($elt: Element, listeners: SyncListeners): void {
  // REVIEW: Might be nice to pass a function to generate the error message to addSyncEventListener,
  //         so we don't have to do the work of generating the "specifier" unless an error actually occurs.
  const specifier = elementSpecifier($elt);
  for (const [ eventName, listener ] of Object.entries(listeners)) {
    addSyncEventListener($elt, eventName, listener, <Html>`Internal error processing ${specifier} ${eventName} event.`);
  }
}

function elementSpecifier($elt: Element): string {
  // Returns a string that attempts to identify the element for debugging.
  // LATER: We could walk the parent chain concatenating specifiers.
  let specifier = $elt.tagName;
  if ($elt.id) { specifier += `#${$elt.id}` }
  for (let i = 0; i<$elt.classList.length; i++) {
    specifier += `.${$elt.classList.item(i)}`
  }
  return specifier;
}
