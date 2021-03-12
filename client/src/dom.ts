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

import {
  AbsoluteUrl,
  assert, CssClass, CssSelector, CssSize, ElementId, Html,
  pixelsFromCssLength,
  RelativeUrl, SvgMarkup
} from "./shared/common";
import { showError, monitorPromise } from "./error-handler";
import { CellType } from "./shared/cell";

// Types

export type AsyncListener<E extends Event> = (event: E)=>Promise<void>;
export type SyncListener<E extends Event> = (event: E)=>void;

interface AsyncListeners {
  // REVIEW: Can we populate this automatically from the standard DOM types?
  blur?: SyncListener<FocusEvent>;
  change?: AsyncListener<InputEvent>;
  click?: AsyncListener<MouseEvent>;
  drop?: SyncListener<DragEvent>;
  input?: AsyncListener<InputEvent>;
  keypress?: AsyncListener<KeyboardEvent>;
  keyup?: AsyncListener<KeyboardEvent>;
  submit?: AsyncListener</* TYPESCRIPT: SubmitEvent? */Event>;
}
interface SyncListeners {
  // REVIEW: Can we populate this automatically from the standard DOM types?
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
  load?: SyncListener</* TYPESCRIPT: */Event>;
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

interface Attributes {
  [name: string]: boolean | number | string,
}

interface DataAttributes {
  [name: string]: string,
}

interface NewCommonOptions {
  asyncButtonHandler?: AsyncListener<MouseEvent>;
  asyncListeners?: AsyncListeners;
  attrs?: Attributes;
  class?: CssClass;
  classes?: CssClass[];
  data?: DataAttributes;
  disabled?: boolean;
  id?: ElementId;
  hidden?: boolean;
  listeners?: SyncListeners;
  src?: AbsoluteUrl|RelativeUrl;
  style?: string;
  styles?: Styles;
  syncButtonHandler?: SyncListener<MouseEvent>;
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

interface Styles {
  [style: string]: string,
}

// Keep this list in sync with server/views/iconmonstr.pug.
export type SvgIconId =
  'iconMonstrArrow71' | 'iconMonstrArrow72' |'iconMonstrBook14' | 'iconMonstrBook17' | 'iconMonstrBug12' |
  'iconMonstrCalculator2' | 'iconMonstrClothing18' | 'iconMonstrEdit9Modified' | 'iconMonstrEraser2' | 'iconMonstrFile5' | 'iconMonstrFile12' |
  'iconMonstrFile15' | 'iconMonstrFolder2' | 'iconMonstrFolder5' | 'iconMonstrFullScreen7' | 'iconMonstrHome6' | 'iconMonstrInfo6' |
  'iconMonstrMagnifier6' | 'iconMonstrPencil9' | 'iconMonstrPrinter6' |
  'iconMonstrRedo4' | 'iconMonstrRefresh2' | 'iconMonstrRuler30' | 'iconMonstrText1' | 'iconMonstrTrashcan2' |
  'iconMonstrUndo4' | 'iconMonstrUser1' | 'iconMonstrChart20' ;

// Constants

export const CELL_ICONS: Map<CellType, SvgIconId> = new Map([
  [ CellType.Figure,  'iconMonstrRuler30' ],
  [ CellType.Formula, 'iconMonstrCalculator2' ],
  [ CellType.Plot,    'iconMonstrChart20' ],
  [ CellType.Text,    'iconMonstrText1' ],
]);

const SVG_NS = 'http://www.w3.org/2000/svg';

const ENUMERATED_ATTRIBUTES = new Set<string>([ 'draggable']);

export const CHECKMARK_ENTITY = <Html>'&#x2713;'
export const CLOSE_X_ENTITY = <Html>'&#x2715;'
export const DOTTED_CIRCLE_ENTITY = <Html>'&#x25CC;';
export const EULER_NUMBER_ENTITY = <Html>'&#x1D452;';
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
  for (const attr of ['src', 'title', 'type', 'value']) {
    if (options.hasOwnProperty(attr)) {
      // @ts-expect-error "Element implicitly has an 'any' type"
      attributes[attr] = options[attr];
    }
  }
  attachAttributes($elt, attributes);

  let style: /* TYPESCRIPT: */string  = '';
  if (options.styles) {
    style = Object.entries(options.styles).map(([key, value])=>`${key}: ${value}`).join('; ');
  }
  if (options.style) { style += options.style; }
  if (style.length>0) { $elt.setAttribute('style', style); }
  if (options.hidden) { $elt.style.display = 'none'; }

  if (options.listeners) { attachSyncListeners($elt, options.listeners); }
  if (options.syncButtonHandler) {
    assert($elt instanceof HTMLButtonElement);
    attachSyncButtonHandler(<HTMLButtonElement>$elt, options.syncButtonHandler);
  }
  if (options.asyncListeners) { attachAsyncListeners($elt, options.asyncListeners); }
  if (options.asyncButtonHandler) {
    assert($elt instanceof HTMLButtonElement);
    attachAsyncButtonHandler(<HTMLButtonElement>$elt, options.asyncButtonHandler);
  }
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
  if (options.html) { $elt.innerHTML = options.html; }
  $configure($elt, options);
  return $elt;
}

export function $newSvgFromMarkup<K extends keyof SVGElementTagNameMap>(markup: SvgMarkup, options?: NewCommonOptions): SVGElementTagNameMap[K] {
  const $parent = document.createElement('div');
  $parent.innerHTML = markup;
  const $elt: SVGElement = <SVGElement>$parent.firstElementChild!;
  assert($elt);
  // assert($elt instanceof SVGElement);  // REVIEW: <path> elements don't appear to mneet this instanceof test.
  if (options) { $configure($elt, options); }
  return <SVGElementTagNameMap[K]>$elt;
}

export function $outerSvg<K extends keyof SVGElementTagNameMap>(markup: SvgMarkup): SVGElementTagNameMap[K] {
  const $parent = document.createElement('div');
  $parent.innerHTML = markup;
  const $elt: SVGElement = <SVGElement>$parent.firstElementChild!;
  assert($elt);
  assert($elt instanceof SVGElement);
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

export function addAsyncEventListener<E extends Event>(target: EventTarget, type: string, listener: AsyncListener<E>, message: Html): SyncListener<E> {
  // Returns the actual listener added, in case the caller wants to remove it later.
  // TODO: Type this so that callers don't have to specify the type of the event.
  //       It should be inferred from the type parameter.
  // REVIEW: Does anyone use the return value?
  const wrappedListener = function(event: E): void {
    try { monitorPromise(listener(event), message); }
    catch (err) { showError(err, message); }
  }
  target.addEventListener(type, </* TYPESCRIPT: */EventListener>wrappedListener);
  return wrappedListener;
}

export function addSyncEventListener<E extends Event>(target: EventTarget, type: string, listener: SyncListener<E>, message: Html): SyncListener<E> {
  // Returns the actual listener added, in case the caller wants to remove it later.
  // TODO: Type this so that callers don't have to specify the type of the event.
  //       It should be inferred from the type parameter.
  // REVIEW: Does anyone use the return value?
  const wrappedListener = function(event: E): void {
    try { listener(event); }
    catch (err) { showError(err, message); }
  }
  target.addEventListener(type, </* TYPESCRIPT: */EventListener>wrappedListener);
  return wrappedListener;
}

// export function escapeHtml(str: string): Html {
//   // From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
//   var $div = document.createElement('div');
//   $div.appendChild(document.createTextNode(str));
//   return <Html>$div.innerHTML;
// }

export function svgIconReferenceMarkup(id: SvgIconId): SvgMarkup {
  return <SvgMarkup>`<svg class="icon"><use href="#${id}"/></svg>`
}

export function viewBoxFromCssSize(cssSize: CssSize): string {
  const width = pixelsFromCssLength(cssSize.width);
  const height = pixelsFromCssLength(cssSize.height);
  return `0 0 ${width} ${height}`;
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

function attachAsyncButtonHandler($elt: HTMLButtonElement, handler: AsyncListener<MouseEvent>): void {
  const specifier = elementSpecifier($elt);
  addSyncEventListener($elt, 'mousedown', preventDefaultListener, <Html>`Internal error processing ${specifier} mousedown event.`);
  addAsyncEventListener($elt, 'click', async (event: MouseEvent)=>{
    $elt.disabled = true;
    await handler(event);
    $elt.disabled = false;
  }, <Html>`Internal error processing ${specifier} click event.`);
}

function attachAsyncListeners($elt: Element, listeners: AsyncListeners): void {
  // REVIEW: Might be nice to pass a function to generate the error message to addSyncEventListener,
  //         so we don't have to do the work of generating the "specifier" unless an error actually occurs.
  const specifier = elementSpecifier($elt);
  for (const [ eventName, listener ] of Object.entries(listeners)) {
    addAsyncEventListener($elt, eventName, listener, <Html>`Internal error processing ${specifier} ${eventName} event.`);
  }
}

function attachSyncButtonHandler($elt: HTMLButtonElement, handler: SyncListener<MouseEvent>): void {
  const specifier = elementSpecifier($elt);
  addSyncEventListener($elt, 'mousedown', preventDefaultListener, <Html>`Internal error processing ${specifier} mousedown event.`);
  addSyncEventListener($elt, 'click', handler, <Html>`Internal error processing ${specifier} click event.`);
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

function preventDefaultListener(event: Event): void {
  event.preventDefault();
}
