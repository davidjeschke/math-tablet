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

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject, StyleId,
         RelationshipObject, RelationshipProperties,
         StyleDeleted,
         StyleMoved,
         StyleInserted, StyleChanged
       } from '../../client/notebook';
import { SymbolData, WolframData, NotebookChangeRequest, StyleInsertRequest,
         StyleDeleteRequest,
         StylePropertiesWithSubprops, RelationshipPropertiesMap,
         RelationshipInsertRequest,  isEmptyOrSpaces,
//         RelationshipDeleteRequest
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute as executeWolframscript, draftChangeContextName } from '../wolframscript';
import { Config } from '../config';

export class SymbolClassifierObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      await this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] {
    return [];
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }


  // Note: This can be separated into an attempt to compute new solutions..
  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${toolStyle.id}`);
    return [];
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  private notebook: ServerNotebook;

  // Private Instance Methods

  private getLatestOfListOfStyleIds(styles: number[]) : number {
    debug("INPUT STYLES",styles);
    const [max,maxstyle] = styles.reduce(
      (acc,val) => {
          const idx = this.notebook.getThoughtIndex(val);
          const max = acc[0];
          if (idx > max) {
            return [idx,val]
          } else {
            return acc;
          }
      },[-1,-1]
    );

    debug("GREATEST",maxstyle);
    if (max >= 0)
      return maxstyle;
    else
      return -1; // This would actually be an internal error
  }

  private async deleteRule(change: StyleDeleted, rval: NotebookChangeRequest[]) : Promise<void>  {

    const style = change.style;
    if (style.type == 'SYMBOL' && (style.role == 'SYMBOL-USE' || style.role == 'SYMBOL-DEFINITION')) {
      this.deleteRelationships(style, rval);
    }
  }

  private async deleteRelationships(style: StyleObject, rval: NotebookChangeRequest[]) : Promise<void>  {

    debug("style.meaing",style.role);
      if (style.role == 'SYMBOL-DEFINITION') {
        const did = style.id;

        // not this is nullable, and is a Relationship.
        var duplicateof : RelationshipObject | undefined;
        const rs = this.notebook.allRelationships();
        rs.forEach(r => {
          if ((r.toId == did) && r.role == 'DUPLICATE-DEFINITION') {
            if (duplicateof != null) {
              debug("INTERNAL ERROR: Linearity of defintions broken1!");
              throw new Error("INTERNAL ERROR: Linearity of defintions broken1!"+r);
            }
            duplicateof = r;
          }
        });

        const U = this.notebook.getSymbolStylesThatDependOnMe(style);
        const users : number[] = [];
        for(const u of U) {
          users.push(u.id);
        }
        const rids = new Set<number>();
        for(const r of rs) {
          if ((r.fromId == did) || (r.toId == did)) {
            rids.add(r.id);
          }
        }
        debug("RIDS = ",rids);
        // console.log("users of me",users);
        // console.log("duplicateof",duplicateof);
        if (!(duplicateof === undefined)) {
          rids.add(duplicateof.id);
          for(const u of users) {
            const props : RelationshipProperties = { role: 'SYMBOL-DEPENDENCY' };
            rval.push({ type: 'insertRelationship',
                        fromId: duplicateof.fromId,
                        toId: u,
                        props: props,
                      });
          }
        }
        rids.forEach(id => rval.push({ type: 'deleteRelationship',
                                       id: id }));
      } else if  (style.role == 'SYMBOL-USE') {
        // Note: Deleting a use shold be simpler; a use is not a definition.
        // We have already insisted that the code keep a linear chain
        // of relationships; no matter what the definition chain, the
        // use just gets rid of the relationships that use it.
        const did = style.id;
        // note this is nullable, and is a Relationship.
        var singleuseof : RelationshipObject | undefined;
        const rs = this.notebook.allRelationships();
        rs.forEach(r => {
          if ((r.toId == did)) {
            if (singleuseof != null) {
              debug("INTERNAL ERROR: Linearity of defintions broken1!");
              throw new Error("INTERNAL ERROR: Linearity of defintions broken1!"+r);
            }
            singleuseof = r;
          }
        });
        if (singleuseof)
          rval.push({ type: 'deleteRelationship',
                      id: singleuseof.id });
      }
    // If this style has uses reaching it, those relationships
    // should be removed.
    debug("RVAL deletion ====XXXX",rval);
  }



  // Since a relationship may already exist and this code is trying to handle
  // both inserts and changes, we have to decide how we make sure there are not duplicates.
  // This is a little tricky, as we may be part of a chain. Possibly I should make a unit test
  // for this, to test that a change does not result int
  private async insertRule(change: StyleInserted | StyleChanged, rval: NotebookChangeRequest[]) : Promise<NotebookChangeRequest[]>  {
    const style = change.style;

    debug("AAAA in insertRule",change);
    var tlStyle;
    try {
      tlStyle = this.notebook.topLevelStyleOf(style.id);
    } catch (e) { // If we can't find a topLevelStyle, we have in
      // inconsistency most likely caused by concurrency in some way
    }
    if (!tlStyle) return rval;
    const tlid = tlStyle.id;
    // I believe listening only for the WOLFRAM/INPUT forces
    // a serialization that we don't want to support. We also must
    // listen for definition and use and handle them separately...
    if (style.type == 'WOLFRAM' && (style.role == 'INPUT' ||style.role == 'INPUT-ALT')) {
      // at this point, we are doing a complete "recomputtion" based the use.
      await this.addSymbolUseStyles(style, rval);
      await this.addSymbolDefStyles(style, rval);
//      await this.addEquationStyles(style,rval);
      debug("BBB rval",rval);
    }
    this.recomputeInsertRelationships(tlid,style,rval);
    return rval;
  }

  private async recomputeInsertRelationships(tlid: StyleId,
                                       style: StyleObject,
                                       rval: NotebookChangeRequest[])
  : Promise<NotebookChangeRequest[]>
  {

    if (style.type == 'SYMBOL' && (style.role == 'SYMBOL-USE' || style.role == 'SYMBOL-DEFINITION')) {
      const name = (style.role == 'SYMBOL-USE') ?
        style.data :
        style.data.name;
      const relationsUse: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-USE');
      const relationsDef: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-DEFINITION');
      const relations = (style.role == 'SYMBOL-USE') ? relationsDef : relationsUse;

      // defs and uses below are ment to be toplevel styles that participate in
      // a definition or a use

      // I believe these two pieces of code rely on the principle that only
      // thoughts that are previous to us can affect us. This may not work for the case
      // of a reordering.
        var defs:number[] = [];
      // @ts-ignore
      for (const [idStr, _props] of Object.entries(relationsDef)) {
        const v =  parseInt(idStr,10);
        const tlidv = this.notebook.topLevelStyleOf(v).id;
        if (tlidv < tlid)
          defs.push(v);
      }

      // In reality, we need to order by Top level object!
      // So when we have the ids, we have to sort by
      // a function based on top-level object!
      var uses:number[] = [];
      // @ts-ignore
      for (const [idStr, _props] of Object.entries(relationsUse)) {
        const v =  parseInt(idStr,10);
        const tlidv = this.notebook.topLevelStyleOf(v).id;
        // This is a little weird; uses must occur AFTER their
        // defintions, though this is very confusing
        if (tlidv > tlid)
          uses.push(v);
      }

      debug("defs",defs);
      debug("uses",uses);
      debug("rels",relations);

      // I've completely forgotten what I intended here. This makes little sense now.
      if (relations) {
        const index = (style.role == 'SYMBOL-USE') ?
          this.getLatestOfListOfStyleIds(defs) :
          this.getLatestOfListOfStyleIds(uses);
        if (index >= 0) {
          const props : RelationshipProperties = { role: 'SYMBOL-DEPENDENCY' };
          const changeReq: RelationshipInsertRequest =
            { type: 'insertRelationship',
              fromId:
              (style.role == 'SYMBOL-USE') ?
              index :
              style.id,
              toId:
              (style.role == 'SYMBOL-USE') ?
              style.id :
              index,
              props: props };
          rval.push(
            changeReq
          );
        }
      }

      // Now we need to check for inconsistency;
      if (style.role == 'SYMBOL-DEFINITION') {

        // In reality, we need to order by Top level object!
        // So when we have the ids, we have to sort by
        // a function based on top-level object!
        var defs:number[] = [];
        // @ts-ignore
        for (const [idStr, _props] of Object.entries(relationsDef)) {
          const v =  parseInt(idStr,10);
          if (v < style.id)
            defs.push(v);
        }
        if (defs.length >= 1) {
          const dup_prop : RelationshipProperties =
            { role: 'DUPLICATE-DEFINITION' };

          const last_def = this.getLatestOfListOfStyleIds(defs);

          if (last_def < style.id) {
            // @ts-ignore
            const changeReq: RelationshipInsertRequest =
              { type: 'insertRelationship',
                fromId: last_def,
                toId: style.id,
                props: dup_prop };
            rval.push(
              changeReq
            );
          }
        }
      }
    }
    debug("END of INSERT rval",rval);
    return rval;
  }

    private async moveRule(change: StyleMoved, rval: NotebookChangeRequest[]) : Promise<NotebookChangeRequest[]>  {
      debug("AAAA in moveRule",change);

      // Now trying to implement this using our recomputation capability...
      // we will remove all relationship references to this name,
      // and then use our recomputation to reinsert new values.
      const style = this.notebook.getStyleById(change.styleId);
      const tlStyle = this.notebook.topLevelStyleOf(style.id);
      // Now for each style is as use or defintion, collect the names...
      const symbols : Set<string> = new Set<string>();
      const syms = this.notebook.findChildStylesOfType(tlStyle.id,'SYMBOL');
      syms.forEach(sym => {
        const s = sym.data.name;
        symbols.add(s);
      });
      // Now that we have the symbols, we want to remove all relationships

      // that mention them...
      const rs = this.notebook.allRelationships();
      symbols.forEach(name => {
        rs.forEach(r => {
        const fromS = this.notebook.getStyleById(r.fromId);
        const toS = this.notebook.getStyleById(r.toId);
        if (fromS.type == 'SYMBOL' &&
            (fromS.role == 'SYMBOL-USE' ||
             fromS.role == 'SYMBOL-DEFINITION'
            ) &&
            fromS.data.name == name) {
          rval.push({ type: 'deleteRelationship',
                      id: r.id });
        }
        if (toS.type == 'SYMBOL' &&
            (toS.role == 'SYMBOL-USE' ||
             toS.role == 'SYMBOL-DEFINITION'
            ) &&
            toS.data.name == name) {
          rval.push({ type: 'deleteRelationship',
                      id: r.id });
        }
        });
      });

      const rels : RelationshipObject[] =
        this.notebook.recomputeAllSymbolRelationshipsForSymbols(symbols);
      rels.forEach(r => {
          const prop : RelationshipProperties =
            { role: r.role };
            const changeReq: RelationshipInsertRequest =
              { type: 'insertRelationship',
                fromId: r.fromId,
                toId: r.toId,
                props: prop };
            rval.push(
              changeReq
            );
      });

    return rval;
  }

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    if (change == null) return;

    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleDeleted': {
        this.deleteRule(change,rval);
        break;
      }
      case 'styleMoved': {
        this.moveRule(change,rval);
        break;
      }
      case 'styleChanged': {
        await this.insertRule(change,rval);
        debug("insert (from Change) RVAL =========",rval);
        break;
      }
      case 'styleInserted': {
        await this.insertRule(change,rval);
        debug("insert RVAL =========",rval);
        break;
        }
    }
  }

  // refactor this to be style independent so that we can figure it out later
  // private async addEquationStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {


  // }
  private async addSymbolDefStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    debug('addSymbolDefStyles',style.data);
    const script = `FullForm[Hold[${style.data}]]`;
    const result = await execute(script);
    debug('CCC result',result);
    if (!result) { return; }
    if (result.startsWith("Hold[Set[")) {
      // WARNING! TODO!  This may work but will not match
      // expressions which do not evaluate numerically.
      const name_matcher = /Hold\[Set\[(\w+),/g;
      const name_matches = name_matcher.exec(result);
      const value_matcher = /,\s+(.+)\]\]/g;
      const value_matches = value_matcher.exec(result);
      debug(`name_matches ${name_matches}`);
      debug(`value_matches ${value_matches}`);
      if (name_matches && value_matches) {
        // We have a symbol definition.
        const name = name_matches[1];
        // here we wat to check that this is a symbolic name, and a solitary one.

        debug(`name ${name}`);

        const value = value_matches[1];

      const relationsTo: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-USE');

        var styleProps: StylePropertiesWithSubprops;

        if (name.match(/^[a-z]+$/i)) {
          debug('defining symbol',name);
          const data = { name, value };
          styleProps = {
            type: 'SYMBOL',
            data,
            role: 'SYMBOL-DEFINITION',
            exclusiveChildTypeAndRole: true,
            relationsTo,
          }
        } else {
          // treat this as an equation
          debug('defining equation');
          // In math, "lval" and "rval" are conventions, without
          // the force of meaning they have in programming langues.
          const lhs = name_matches[1];
          const rhs = value_matches[1];
          debug(`lhs,rhs ${lhs} ${rhs}`);
          const data = { lhs, rhs };
          styleProps = {
            type: 'EQUATION',
            data,
            role: 'EQUATION-DEFINITION',
            relationsTo,
            exclusiveChildTypeAndRole: true,
          }
          // In this case, we need to treat lval and rvals as expressions which may produce their own uses....
          await this.addSymbolUseStylesFromString(lhs, style, rval);
          await this.addSymbolUseStylesFromString(rhs, style, rval);
          // Now let's try to add a tool tip to solve:
        }

        const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
        rval.push(changeReq);

        debug(`Inserting def style.`);

      } else {
        // Although we are not defining a symbol in this case,
        debug('YESYESYESYESYES'+result);
        // Basically we want to look for a simple equality here. In OUR input
        // langue, a simple "=" defines a equality, not an assignment. So if we have one,
        // we want to separate the lhs and rhs and create an equation. These values (rhs and lhs)
        // ARE currently added in the wolfram language, not our own!!

        var sides = style.data.split("=");
        // In this case we are have two sides
        if (sides.length == 2) {
          const lhs = sides[0];
          const rhs = sides[1];
          debug('lhs,rhs',lhs,rhs);

          // But we use the Wolfram interpretation for out other work...
          const script_lhs = `FullForm[Hold[${lhs}]]`;
          const result_lhs = await execute(script_lhs);
          const script_rhs = `FullForm[Hold[${rhs}]]`;
          const result_rhs = await execute(script_rhs);

          if (result_lhs && result_rhs) {
            const hold_matcher = /Hold\[(.*)\]/;
            const lwolfram = hold_matcher.exec(result_lhs);
            const rwolfram = hold_matcher.exec(result_rhs);

            debug("rwolfram",rwolfram, result_rhs);
            if (!(lwolfram && rwolfram)) {
              debug("internal regular expression error"+lwolfram+":"+rwolfram);
              console.error("internal regular expression error");
              return;
            }
            const lw = lwolfram[1];
            const rw = rwolfram[1];
            if (!(lw && rw)) {
              console.error("internal regular expression error");
              return;
            }
            await this.addSymbolUseStylesFromString(lw, style, rval);
            await this.addSymbolUseStylesFromString(rw, style, rval);
            // The relations here are wrong; we need to get all variables in each expression, actually!
            const relationsToLHS: RelationshipPropertiesMap =
              this.getAllMatchingNameAndType(lw,'SYMBOL-USE');
            const relationsToRHS: RelationshipPropertiesMap =
              this.getAllMatchingNameAndType(rw,'SYMBOL-USE');
            const relationsTo: RelationshipPropertiesMap  = {};
            debug("realtionsToLHS,relationsToRHS",relationsToLHS, relationsToRHS);
            for(const s in relationsToLHS) {
              relationsTo[s] = relationsToLHS[s];
            }
            for(const s in relationsToRHS) {
              relationsTo[s] = relationsToRHS[s];
            }


            const data = { lhs: lw, rhs: rw };
            debug("slhs,srhs",lw, rw);

            var styleProps: StylePropertiesWithSubprops;
            styleProps = {
              type: 'EQUATION',
              data,
              role: 'EQUATION-DEFINITION',
              exclusiveChildTypeAndRole: true,
              relationsTo,
            }
            const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
            rval.push(changeReq);
          }

        } else {
          debug('probably not an equation, not sure what to do:',result);
        }
      }
    }
  }

  private async  findSymbols(math: string): Promise<string[]> {
    if (isEmptyOrSpaces(math)) {
      return [];
    } else {
      const script = `runPrivate[Variables[` + math + `]]`;
      const oresult = await execute(script);
      if (!oresult) { return []; }
      debug("BEFORE: "+oresult);
      const result = draftChangeContextName(oresult);
      debug("CONTEXT REMOVED: "+result);

      // TODO: validate return value is in expected format with regex.
      const symbols = result.slice(1,-1).split(', ').filter( s => !!s)
      debug(`symbols ${symbols}`);
      return symbols;
    }
  }

  private getAllMatchingNameAndType(name: string,
                                    useOrDef: 'SYMBOL-DEFINITION' | 'SYMBOL-USE') :  RelationshipPropertiesMap {
      // Add the symbol-use style
      const relationsFrom: RelationshipPropertiesMap = {};
    // Add any symbol-dependency relationships as a result of the new symbol-use style
    if (this.notebook) {
      for (const otherStyle of this.notebook.allStyles()) {
        if (otherStyle.type == 'SYMBOL' &&
            otherStyle.role == useOrDef &&
            otherStyle.data.name == name) {
          relationsFrom[otherStyle.id] = { role: 'SYMBOL-DEPENDENCY' };
          debug(`Inserting relationship`);
        }
      }
    } else {
      // Surely this is an error?!?
    }
    return relationsFrom;
  }

  private getLatestMatchingNameAndType(name: string,
                                       useOrDef: 'SYMBOL-DEFINITION' | 'SYMBOL-USE') :  RelationshipPropertiesMap {
    // Add the symbol-use style

    const relationsFrom: RelationshipPropertiesMap = {};
    // Add any symbol-dependency relationships as a result of the new symbol-use style
    // This code as actually longer than doing it
    // in a loop; nontheless I prefer this "reduce" style
    // because I suspect we will have to do "sorting" by thought
    // order at some point, and this basic approach with then become
    // reusable.  In fact, I cold implment a "sort" now and use it
    // to compute the "lates" but that is a tad wastefule. - rlr
    const [max,maxstyle] = this.notebook.allStyles().reduce(
      (acc,val) => {
        if (val.type == 'SYMBOL' &&
          val.role == useOrDef &&
            val.data.name == name) {
          const idx = this.notebook.getThoughtIndex(val.id);
          const max = acc[0];
          if (idx > max) {
            return [idx,val.id]
          } else {
            return acc;
          }
        } else {
          return acc;
        }
      },[-1,-1]
    );;

    if (max >=0) {
      relationsFrom[maxstyle] = { role: 'SYMBOL-DEPENDENCY' };
    }
    return relationsFrom;
  }
  // There is only one "def", so we can handle that by exclusivity of the children, but in the case
  // of the uses, there may be more than one use. We therefore have little choice but to delete all
  // SYMBOL-USE / SYMBOL children before add these in.
  private async removeAllCurrentUses(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const children = this.notebook.findChildStylesOfType(style.id,
                                                         'SYMBOL');

    children.forEach( kid => {
      if ((kid.parentId == style.id) &&
          (kid.type == 'SYMBOL') &&
          (kid.role == 'SYMBOL-USE')) {
        const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                                                 styleId: kid.id };
        rval.push(deleteReq);
      };
    });

  }
  private async  addSymbolUseStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    await this.removeAllCurrentUses(style,rval);
    await this.addSymbolUseStylesFromString(style.data, style, rval);
  }

  private async  addSymbolUseStylesFromString(data: string,style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const symbols = await this.findSymbols(data);
    debug("SSS USES",data,symbols);
    symbols.forEach(s => {
      const relationsFrom: RelationshipPropertiesMap =
        this.getLatestMatchingNameAndType(s,'SYMBOL-DEFINITION');

      const data: SymbolData = { name: s };
      const styleProps: StylePropertiesWithSubprops = {
        type: 'SYMBOL',
        data,
        role: 'SYMBOL-USE',
        relationsFrom,
      }
      const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
      rval.push(changeReq);
      debug(`Inserting use style`);

    });
  }

}

  // Helper Functios

  async function execute(script: WolframData): Promise<WolframData|undefined> {
    let result: WolframData;
    try {
      // debug(`Executing: ${script}`)
      result = await executeWolframscript(script);
    } catch (err) {
      debug(`Wolfram '${script}' failed with '${err.message}'`);
      return;
    }
    debug(`Wolfram '${script}' returned '${result}'`);
    return result;
  }
