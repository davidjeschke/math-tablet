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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);
import { assert } from "chai";
import 'mocha';
import * as sinon from "sinon";

import { EMPTY_SVG, Html, PlainText } from "../shared/common";
import { EMPTY_FORMULA, FormulaCellObject } from "../shared/formula";
import { NotebookUpdate, CellInserted, CellObject } from "../shared/notebook";
import { NotebookChangeRequest, InsertCellRequest, StyleProperties, ToolData } from "../shared/euler-notebook-api";
import { ServerNotebook, ObserverInstance }  from "../models/server-notebook";
import { Config } from "../config";

import { ensureGlobalLoaded } from "./global";
import { CellType, InputType } from "../shared/cell";
ensureGlobalLoaded();

// Test Observer Class

class TestObserver implements ObserverInstance {
  static async initialize(_config: Config): Promise<void> { }
  static async onOpen(_notebook: ServerNotebook): Promise<TestObserver> { return new this(); }
  constructor() {}
  async onChangesAsync(_changes: NotebookUpdate[], _startIndex: number, _endIndex: number): Promise<NotebookChangeRequest[]> { return []; }
  public onChangesSync(_changes: NotebookUpdate[], _startIndex: number, _endIndex: number): NotebookChangeRequest[] { return []; }
  onClose(): void { }
  async useTool(_style: CellObject): Promise<NotebookChangeRequest[]> { return []; }
}

// Unit Tests

describe("server notebook", function() {

  describe("observer", function(){

    let notebook: ServerNotebook;
    let observer: TestObserver;

    const onOpenSpy: sinon.SinonSpy<[ServerNotebook], Promise<ObserverInstance>> = sinon.spy(TestObserver, 'onOpen');
    let onChangesAsyncSpy: sinon.SinonSpy<[NotebookUpdate[], number, number], Promise<NotebookChangeRequest[]>>;
    let onChangesSyncSpy: sinon.SinonSpy<[NotebookUpdate[], number, number], NotebookChangeRequest[]>;
    let onCloseSpy: sinon.SinonSpy<[], void>;
    let useToolSpy: sinon.SinonSpy<[CellObject], Promise<NotebookChangeRequest[]>>;

    before("onOpen is called when notebook is created", async function(){
      // Register the observer
      notebook = await ServerNotebook.openEphemeral();
      // const testObserver = await TestObserver.onOpen(notebook);
      // notebook.registerObserver('TEST', testObserver);

      // Observer's onOpen should be called with notebook as an argument
      // and return an observer instance. Spy on the observer.
      assert(onOpenSpy.calledOnce);
      assert.equal(onOpenSpy.lastCall.args[0], notebook);
      observer = <TestObserver>(await onOpenSpy.lastCall.returnValue);
      onChangesAsyncSpy = sinon.spy(observer, 'onChangesAsync');
      onChangesSyncSpy = sinon.spy(observer, 'onChangesSync');
      onCloseSpy = sinon.spy(observer, 'onClose');
      useToolSpy = sinon.spy(observer, 'useTool');
    });

    after("onClose is called when notebook is closed", async function(){
      // notebook should be open and observer's onClose should not have been called.
      // TODO: assert notebook is not closed.
      assert.equal(onCloseSpy.callCount, 0);

      // Close the notebook.
      notebook.close();

      // Observer's onClose should be called for the first and only time.
      // onClose takes no arguments.
      assert.equal(onCloseSpy.callCount, 1);

      sinon.restore();
    });

    it("onChanges is called when style is inserted", async function(){
      const callCountAsync = onChangesAsyncSpy.callCount;
      const callCountSync = onChangesSyncSpy.callCount;
      const data: FormulaCellObject = {
        type: CellType.Formula,
        inputType: InputType.None,
        height: 72, // points
        inputText: <PlainText>"",
        plainTextFormula: EMPTY_FORMULA,
      };
      const styleProps: StyleProperties = { role: 'FORMULA', type: 'FORMULA-DATA', data };
      const insertRequest: InsertCellRequest = { type: 'insertEmptyCell', cellObject: styleProps };
      const changeRequests = [insertRequest];
      await notebook.requestChanges('TEST', changeRequests);
      assert(onChangesAsyncSpy.callCount>callCountAsync);
      assert(onChangesSyncSpy.callCount>callCountSync);

    });

    it("useTool is called when tool is used", async function(){

      // Insert a top-level style with a tool style attached.
      const toolData: ToolData = { name: 'test-tool', html: <Html>"Check Equivalences", data: "tool-data" };
      const formulaData: FormulaCellObject = {
        type: CellType.Formula,
        inputType: InputType.None,
        height: 72, // points
        inputText: <PlainText>"",
        plainTextFormula: EMPTY_FORMULA,
      };
      const styleProps: StyleProperties = {
        role: 'FORMULA',
        type: 'FORMULA-DATA',
        data: formulaData,
        subprops: [
          { role: 'ATTRIBUTE', type: 'TOOL-DATA', data: toolData },
        ]
      };
      const insertRequest: InsertCellRequest = { type: 'insertEmptyCell', cellObject: styleProps };
      const changes = await notebook.requestChange('TEST', insertRequest);

      // Find the tool style that was inserted.
      const insertToolChange = changes.find(c=>c.type=='cellInserted' && c.cellObject.role=='ATTRIBUTE');
      const toolStyle = (<CellInserted>insertToolChange).cellObject;

      // Invoke the tool.
      const callCount = useToolSpy.callCount;
      await notebook.useTool(toolStyle.id);

      // Observer's useTool method should be called, passing the tool style.
      assert.equal(useToolSpy.callCount, callCount+1);
      assert.deepEqual(useToolSpy.lastCall.args[0], toolStyle);
    });
  });
});

