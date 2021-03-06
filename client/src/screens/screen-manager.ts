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

import * as debug1 from "debug";
const debug = debug1('client:screen-manager');

import { Html, assertFalse } from "../shared/common";
import { FOLDER_PATH_RE, NOTEBOOK_PATH_RE, FolderPath, NotebookPath } from "../shared/folder";

import { addSyncEventListener } from "../dom";

import { Screen } from ".";
import { FolderScreen } from "./folder-screen";
import { HomeScreen } from "./home-screen";
import { NotebookEditScreen } from "./notebook-edit-screen";
import { Mode, NotebookReadScreen } from "./notebook-read-screen";

// Types

export type Pathname = '{Pathname}';

// Constants

const NOTEBOOK_PATH_WITH_VIEW_RE = new RegExp("^(" + NOTEBOOK_PATH_RE.toString().slice(2,-2) + ")\\?view=(read|edit)$");

// Exported Class

export abstract class ScreenManager {

  // Public Class Methods

  public static initialize(): void {
    debug("Initializing.");
    // REVIEW: Could resize come before DOMContentLoaded?
    addSyncEventListener<UIEvent>(window, 'resize', e=>this.onResize(window, e), <Html>"Window resize event");
  }

  public static navigateTo(pathname: Pathname): void {
    debug(`Navigating to ${pathname}`);

    if (this.currentScreen) { this.currentScreen.hide(); }

    let nextScreen = this.instanceMap.get(pathname);
    if (!nextScreen) {
      nextScreen = this.createScreenForPathname(pathname);
      this.$body.append(nextScreen.$elt);
      this.instanceMap.set(pathname, nextScreen);
    } else {
      if (nextScreen == this.currentScreen) { assertFalse(); }
    }
    nextScreen.show();
    this.currentScreen = nextScreen;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static $body: HTMLBodyElement = <HTMLBodyElement>window.document.body;
  private static instanceMap: Map<Pathname, Screen> = new Map;
  private static currentScreen: Screen|undefined;

  // Private Class Methods

  private static createScreenForPathname(pathname: Pathname): Screen {
    if (pathname == <Pathname>'/') {
      return new HomeScreen();
    } else {
      const match = NOTEBOOK_PATH_WITH_VIEW_RE.exec(pathname);
      if (match) {
        const path = <NotebookPath>match[1];
        const view = match[5];
        switch(view) {
          case 'edit':
            return new NotebookEditScreen(path);
          case 'read':
            return new NotebookReadScreen(path, Mode.Reading);
          default:
            assertFalse();
            break;
        }
      } else if (NOTEBOOK_PATH_RE.test(pathname)) {
        return new NotebookReadScreen(<NotebookPath>pathname, Mode.Thumbnails);
      } else if (FOLDER_PATH_RE.test(pathname)) {
        return new FolderScreen(<FolderPath>pathname);
      } else  {
        throw new Error("Invalid path.");
      }
    }
  }

  // Private Class Event Handlers

  public static onResize(window: Window, event: UIEvent): void {
    // REVIEW: Notify all screens of resize?
    //         Note that $elt.getBoundingClientRect() doesn't work if the element is not displayed,
    //         so it might be more complicated for the screen to figure out it's size if it is not
    //         shown. We could flag any screens that were hidden when a resize comes in, and notify
    //         them that a resize occurred when they are shown.
    this.currentScreen?.onResize(window, event);
  }
}
