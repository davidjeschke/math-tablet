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
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// import { MthMtcaText } from '../client/math-tablet-api';
import { StyleObject, NotebookChange, StyleProperties, ToolMenu, ToolInfo,
         StyleSource,ThoughtId } from '../../client/math-tablet-api';
import { TDoc } from '../tdoc';
import { execute, constructSubstitution, checkEquiv } from './wolframscript';
import * as fs from 'fs';
import { runAsync } from '../common';
import { Config } from '../config';

// Exports

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });

    tDoc.on('useTool', function(this: TDoc, thoughtId: ThoughtId, source: StyleSource, info: ToolInfo){
      onUseTool(this, thoughtId, source, info);
    });

    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

async function onUseTool(tDoc: TDoc, _thoughtId: ThoughtId, _source: StyleSource, info: ToolInfo):  Promise<void> {
  if (info.name != 'checkeqv') return;
  debug("INSIDE onUSE BEGIN :");
  debug("INSIDE onUSE CHECKEQV :",info.data.styleId);

  const style = tDoc.getStyleById(info.data.styleId);
  debug("MAIN STTYLE",style);

  // We are apply this rule to top level expressions, so
  // we style a thought---which is rather confusing.
//  const parent = tDoc.getThoughtById(style.stylableId);
//  debug("PARENT STTYLE",style);
  const rs = tDoc.getSymbolStylesIDependOn(style);
  debug("RS",rs);
  // TODO: Possibly this basic functionality should be moved to
  // common usage, since it is now used in more than one place.
  try {
    // Now style.data contains the variables in the expression "parent.data",
    // but the rs map may have allowed some to be defined, and these must
    // be removed.
    let variables: string[] = [];
    for(var s in style.data) {
      variables.push(style.data[s]);
    }

    debug("variables, pre-process",variables);
    const sub_expr =
          constructSubstitution(style.data,
                                rs.map(
                                  s => {
                                    variables = variables.filter(ele => (
                                      ele != s.data.name));
                                    return { name: s.data.name,
                                             value: s.data.value};
                                  }
                                ));
    debug("variables, post-process",variables);
    debug("sub_expr",sub_expr);

    //    createdPlotSuccessfully = await plotSubtrivariate(sub_expr,variables,full_filename);

    // Now we must ask the question: how do we intend to operate and how to
    // produce our data?
    // I propose we produce an object, whose keys are style ids of
    // styles which are wolfram expressions, and whose values are booleans
    // (true if equivalent).
    // Since at present we do not have a convenient relationship structure
    // representing a calculation or proof, I will simply check ALL
    // expressions.
    const parentThought =  tDoc.getAncestorThought(style.id);

    const expressions = tDoc.allStyles().filter(
      (s: StyleObject, _index: number, _array: StyleObject[]) => {
        const anc = tDoc.getAncestorThought(s.id);
        if (anc == parentThought) return false;
        else {
          debug(s);
          debug(((s.type == 'WOLFRAM') && (s.meaning == 'INPUT' || s.meaning == 'INPUT-ALT')));
          return ((s.type == 'WOLFRAM') && (s.meaning == 'INPUT' || s.meaning == 'INPUT-ALT'));
        }
      });
    debug("expressions",expressions);
    // Now I will try to build a table...

    interface IStylableToBooleanMap
    {
      [key: number]: boolean;
    }

    const expressionEquivalence : IStylableToBooleanMap = {};
    for (var exp of expressions) {
      const expressID : number = exp.id;
      try {
        const equiv = await checkEquiv(style.data,exp.data);
        debug("exp id",exp.id);
        expressionEquivalence[expressID] = equiv;
      } catch (e) {
        debug("error evaluting equivalentce",e);
        expressionEquivalence[expressID] = false;
      }

    }
    debug("expressions",expressionEquivalence);
    for(var key in expressionEquivalence) {
      debug("key,value",key,expressionEquivalence[key]);
    }
    // Now we will add this as a new style--at least we will be able to
    // see it with Debug, and eventually can produce a GUI for it.
    tDoc.insertStyle(style,{ type: 'BOOLEAN-MAP',
                             data: expressionEquivalence,
                             meaning: 'EQUIVALENT-CHECKS',
                             source: 'MATHEMATICA' })

  } catch (e) {
    debug("MATHEMATICA Check Equivalence :",e);
    return;
  }
}


function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted':
    runAsync(mathMathematicaRule(tDoc, change.style), MODULE, 'mathMathematicaRule');
    runAsync(convertMathMlToWolframRule(tDoc, change.style), MODULE, 'convertMathMlToWolframRule');
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  debug(`Mathematica tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`Mathematica: tDoc open: ${tDoc._path}`);
}

async function evaluateExpressionPromiseWS(expr: string) : Promise<string> {
  debug("INSIDE EVALUATE WS",expr);
  // WARNING! This works to make definitions private
  // from wolframscript, but not when executed here!?!
  let result : string = await execute("InputForm[runPrivate["+expr+"]]");
  debug("RESULT FROM WS",result);
  return result;
}

// const OUR_PRIVATE_CTX_NAME = "runPrv`";
// function draftChangeContextName(expr,ctx = OUR_PRIVATE_CTX_NAME) {
//   return expr.replace(ctx,'');
// }

// REVIEW: Caller doesn't do anything with the return value. Does not need to return a value.
// REVIEW: This does not need to be exported, as it does not occur anywhere else in the source.
export async function mathMathematicaRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {

  debug("INSIDE RULE :",style);
  // We only extract symbols from Wolfram expressions that are user input.
  if (style.type != 'WOLFRAM') { return []; }
  if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return []; }

  var styles = [];

  var assoc;
  try {
    //    assoc = await evaluateExpressionPromiseWS(style.data);
    assoc = await evaluateExpressionPromiseWS(style.data);

    debug("ASSOC RETURNED",assoc,assoc.toString());
//    assoc = draftChangeContextName(assoc);
    debug("After context switch",assoc,assoc.toString());
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
    assoc = null;
  }

  // Mathematica returns an "association" with a lot of
  // information. We will eventually wish to place all of
  // this in a style. For the time being, we will extract
  // only the most concise result.


  // now we will attempt to discern if a .gif file was created,
  // and if so, move it into the notebook directory and create
  // a style.  This is a bit of a hacky means that allows
  // us to avoid having to understand too much about the expression.
  var path = tdoc.absoluteDirectoryPath();
  debug("path",path);
  // we do not yet have the code to use the tdoc path quite ready, so instead we are going to use
  // public/tmp as a place for images until we are ready.
  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  path = ".";

  try {
    fs.readdir(path, function(_err, items) {
      for (var i=0; i <items.length; i++) {
        const ext = items[i].split('.').pop();
        if (ext == "gif") {
          const fn = items[i]
          var dest = targetPath+"/"+fn;
          fs.rename(fn, dest, err => {
            if (err) return console.error(err);
            debug('success!');
            var imageStyle =
                tdoc.insertStyle(style,{ type: 'IMAGE',
                                   data: urlPath+"/"+fn,
                                   meaning: 'PLOT',
                                   source: 'MATHEMATICA' })
            styles.push(imageStyle);
          });
        }
      }
    });
  } catch(e) {
    debug("ERROR Trying to read: ",e);
  }

  // @ts-ignore --- I don't know how to type this.
  //  let result = assoc[1][2]; // "magic" for Mathematica
  if (assoc) {
  let result = assoc.toString();
  debug(" RESULT STRING :",result);
  var exemplar = tdoc.insertStyle(style, { type: 'MATHEMATICA',
                                           data: <string>result,
                                           meaning: 'EVALUATION',
                                           source: 'MATHEMATICA' });

    styles.push(exemplar);

    const toolMenu: ToolMenu = [
      { name: 'checkeqv',
        html: "Check Equivalences",
        data: { styleId: style.id }
      }
    ]
    const styleProps: StyleProperties = {
      type: 'TOOL-MENU',
      meaning: 'ATTRIBUTE',
      source: 'MATHEMATICA',
      data: toolMenu,
    }
    tdoc.insertStyle(style, styleProps);
  }
  return styles;
}

async function convertMathMlToWolframRule(tdoc: TDoc, style: StyleObject): Promise<void> {

  if (style.type != 'MATHML') { return; }
  if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

  const mathMl = style.data.split('\n').join('').replace(/"/g, '\\"');
  debug("mathML",mathMl);
  const cmd = `InputForm[MakeExpression[ImportString["${mathMl}", "MathML"]]]`;
  debug(cmd);
  try {
    const data = await execute(cmd);
    // In our current style, the result comes back as
    // HoldComplete[result].
    const regex = /HoldComplete\[(.*)\]/;
    const results = regex.exec(data);
    debug("regex results",results);
    if (results == null) throw new Error("could not match pattern:"+data);
    if (results[1] == null) throw new Error("could not match pattern:"+data);
    const wolframexpr = results[1];

    tdoc.insertStyle(style, { type: 'WOLFRAM', source: 'MATHEMATICA', meaning: 'INPUT-ALT', data: wolframexpr });


  } catch(err) {
    tdoc.insertStyle(style, { type: 'TEXT', source: 'MATHEMATICA', meaning: 'EVALUATION-ERROR', data: `Cannot convert to Wolfram expression: ${err.message}` });
  }
}
