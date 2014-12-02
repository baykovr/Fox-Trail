/*
 * Copyright 2013 Samsung Information Systems America, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Koushik Sen
// Refactored for Firefox Extension by Liang Gong
// Refactored for fox-trace by Robert Baykov

//var windowUtil = require("window-utils");

//Set by main.
var current_site;
var current_script;

var windowUtil = require('sdk/window/utils');

var window = windowUtil.activeBrowserWindow;
var ext_config = require('../../config/config.js').ext_config;

try{
(function(sandbox){
    if (typeof acorn === 'undefined') 
    {
        acorn = require("../../thirdparty/acorn/acorn.js");

        astUtil = require("../utils/astUtil.js");
        escodegen = require('../../thirdparty/escodegen-1.1.0/escodegen.js');
    }

    if (typeof estraverse === 'undefined')
    {
        estraverse = require('../../thirdparty/estraverse/estraverse.js');
    }

    var FILESUFFIX1 = "_jalangi_";
    var COVERAGE_FILE_NAME = ext_config.recordFileTraceFolder + "jalangi_coverage";
    var SMAP_FILE_NAME = ext_config.recordFileTraceFolder + "jalangi_sourcemap";
    var PREFIX1 = "J$";
    var RP = PREFIX1 + "_";

//    var N_LOG_LOAD = 0,
//    var N_LOG_FUN_CALL = 1,
//        N_LOG_METHOD_CALL = 2,
    var N_LOG_FUNCTION_ENTER = 4,
//        N_LOG_FUNCTION_RETURN = 5,
        N_LOG_SCRIPT_ENTER = 6,
//        N_LOG_SCRIPT_EXIT = 7,
        N_LOG_GETFIELD = 8,
//        N_LOG_GLOBAL = 9,
        N_LOG_ARRAY_LIT = 10,
        N_LOG_OBJECT_LIT = 11,
        N_LOG_FUNCTION_LIT = 12,
        N_LOG_RETURN = 13,
        N_LOG_REGEXP_LIT = 14,
//        N_LOG_LOCAL = 15,
//        N_LOG_OBJECT_NEW = 16,
        N_LOG_READ = 17,
//        N_LOG_FUNCTION_ENTER_NORMAL = 18,
        N_LOG_HASH = 19,
        N_LOG_SPECIAL = 20,
        N_LOG_STRING_LIT = 21,
        N_LOG_NUMBER_LIT = 22,
        N_LOG_BOOLEAN_LIT = 23,
        N_LOG_UNDEFINED_LIT = 24,
        N_LOG_NULL_LIT = 25;

    var logFunctionEnterFunName = PREFIX1 + ".Fe";
    var logFunctionReturnFunName = PREFIX1 + ".Fr";
    var logFunCallFunName = PREFIX1 + ".F";
    var logMethodCallFunName = PREFIX1 + ".M";
    var logAssignFunName = PREFIX1 + ".A";
    var logPutFieldFunName = PREFIX1 + ".P";
    var logGetFieldFunName = PREFIX1 + ".G";
    var logScriptEntryFunName = PREFIX1 + ".Se";
    var logScriptExitFunName = PREFIX1 + ".Sr";
    var logReadFunName = PREFIX1 + ".R";
    var logWriteFunName = PREFIX1 + ".W";
    var logIFunName = PREFIX1 + ".I";
    var logHashFunName = PREFIX1 + ".H";
    var logLitFunName = PREFIX1 + ".T";
    var logInitFunName = PREFIX1 + ".N";
    var logReturnFunName = PREFIX1 + ".Rt";
    var logReturnAggrFunName = PREFIX1 + ".Ra";
    var logUncaughtExceptionFunName = PREFIX1 + ".Ex";

    var logBinaryOpFunName = PREFIX1 + ".B";
    var logUnaryOpFunName = PREFIX1 + ".U";
    var logConditionalFunName = PREFIX1 + ".C";
    var logSwitchLeftFunName = PREFIX1 + ".C1";
    var logSwitchRightFunName = PREFIX1 + ".C2";
    var logLastFunName = PREFIX1 + "._";
    var logReadUndeclaredFunName = PREFIX1 + ".Ru";

    var instrumentCodeFunName = PREFIX1 + ".instrumentCode";


    var Syntax = {
        AssignmentExpression:'AssignmentExpression',
        ArrayExpression:'ArrayExpression',
        BlockStatement:'BlockStatement',
        BinaryExpression:'BinaryExpression',
        BreakStatement:'BreakStatement',
        CallExpression:'CallExpression',
        CatchClause:'CatchClause',
        ConditionalExpression:'ConditionalExpression',
        ContinueStatement:'ContinueStatement',
        DoWhileStatement:'DoWhileStatement',
        DebuggerStatement:'DebuggerStatement',
        EmptyStatement:'EmptyStatement',
        ExpressionStatement:'ExpressionStatement',
        ForStatement:'ForStatement',
        ForInStatement:'ForInStatement',
        FunctionDeclaration:'FunctionDeclaration',
        FunctionExpression:'FunctionExpression',
        Identifier:'Identifier',
        IfStatement:'IfStatement',
        Literal:'Literal',
        LabeledStatement:'LabeledStatement',
        LogicalExpression:'LogicalExpression',
        MemberExpression:'MemberExpression',
        NewExpression:'NewExpression',
        ObjectExpression:'ObjectExpression',
        Program:'Program',
        Property:'Property',
        ReturnStatement:'ReturnStatement',
        SequenceExpression:'SequenceExpression',
        SwitchStatement:'SwitchStatement',
        SwitchCase:'SwitchCase',
        ThisExpression:'ThisExpression',
        ThrowStatement:'ThrowStatement',
        TryStatement:'TryStatement',
        UnaryExpression:'UnaryExpression',
        UpdateExpression:'UpdateExpression',
        VariableDeclaration:'VariableDeclaration',
        VariableDeclarator:'VariableDeclarator',
        WhileStatement:'WhileStatement',
        WithStatement:'WithStatement'
    };


    function sanitizePath(path) {
        if (typeof process !== 'undefined' && process.platform === "win32") {
            return path.split("\\").join("\\\\");
        }
        return path;
    }

    function HOP(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }


    function isArr(val) {
        return Object.prototype.toString.call(val) === '[object Array]';
    }

    function MAP(arr, fun) {
        var len = arr.length;
        if (!isArr(arr)) {
            throw new TypeError();
        }
        if (typeof fun !== "function") {
            throw new TypeError();
        }

        var res = new Array(len);
        for (var i = 0; i < len; i++) {
            if (i in arr) {
                res[i] = fun(arr[i]);
            }
        }
        return res;
    }

    function getCode(filename) {
        if (typeof fs == 'undefined') {
            if (ext_config.isExtensionEvn == true) {
                fs = require('../../utils/fs.js');
            } else if (ext_config.isNodeJsEvn == true) {
                fs = require('../../utils/fs.js');
            } else if (ext_config.isBrowserJsEvn == true) {
                throw new Error('getCode in esnstrument should not be invoked in browser js environment!');
            }
        }
        
        return fs.readFileSync(filename, "utf8");
    }

    var CONTEXT = {
        RHS:1,
        IGNORE:2,
        OEXP:3,
        PARAMS:4,
        OEXP2:5,
        GETTER:6,
        SETTER:7,
        TYPEOF:8
    };

    function ignoreSubAst(node) {
        return node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' && node.callee.object.name === PREFIX1 &&
            node.callee.property.type === 'Identifier' && node.callee.property.name === 'I';
    }

    // need code refractoring, visitor pattern takes too much time and memory to transform code
    function transformAst(object, visitorPost, visitorPre, context, noIgnore) {
        var key, child, type, ret, newContext;

        type = object.type;
        if (visitorPre && HOP(visitorPre, type))
            visitorPre[type](object, context);


        for (key in object) {
            if (object.hasOwnProperty(key)) {
                child = object[key];
                if (typeof child === 'object' && child !== null && key !== "scope" && (noIgnore || !ignoreSubAst(object))) {
                    if ((type === 'AssignmentExpression' && key === 'left') ||
                        (type === 'UpdateExpression' && key === 'argument') ||
                        (type === 'UnaryExpression' && key === 'argument' && object.operator === 'delete') ||
                        (type === 'ForInStatement' && key === 'left') ||
                        ((type === 'FunctionExpression' || type === 'FunctionDeclaration') && key === 'id') ||
                        (type === 'LabeledStatement' && key === 'label') ||
                        (type === 'BreakStatement' && key === 'label') ||
                        (type === 'CatchClause' && key === 'param') ||
                        (type === 'ContinueStatement' && key === 'label') ||
                        ((type === 'CallExpression' || type === 'NewExpression') &&
                            key === 'callee' &&
                            (object.callee.type === 'MemberExpression' ||
                                (object.callee.type === 'Identifier' && object.callee.name === 'eval'))) ||
                        (type === 'VariableDeclarator' && key === 'id') ||
                        (type === 'MemberExpression' && !object.computed && key === 'property')) {
                        newContext = CONTEXT.IGNORE;
                    } else if (type === 'ObjectExpression' && key === 'properties') {
                        newContext = CONTEXT.OEXP;
                    } else if ((type === 'FunctionExpression' || type === 'FunctionDeclaration') && key === 'params') {
                        newContext = CONTEXT.PARAMS;
                    } else if (context === CONTEXT.OEXP) {
                        newContext = CONTEXT.OEXP2;
                    } else if (context === CONTEXT.OEXP2 && key === 'key') {
                        newContext = CONTEXT.IGNORE;
                    } else if (context === CONTEXT.PARAMS) {
                        newContext = CONTEXT.IGNORE;
                    } else if (type === 'Property' && key === 'value' && object.kind === 'get') {
                        newContext = CONTEXT.GETTER;
                    } else if (type === 'Property' && key === 'value' && object.kind === 'set') {
                        newContext = CONTEXT.SETTER;
                    } else if (type === 'UnaryExpression' && object.operator === 'typeof') {
                        newContext = CONTEXT.TYPEOF;
                    } else {
                        newContext = CONTEXT.RHS;
                    }
                    if(object.inst === false) {
                    
                    } else {
                        object[key] = transformAst(child, visitorPost, visitorPre, newContext, noIgnore);
                    }

                }
            }
        }

        if (visitorPost && HOP(visitorPost, type))
            ret = visitorPost[type](object, context);
        else
            ret = object;
        return ret;

    }

    var filename;

    function VisitorReplaceInExpr(asts) {
        this.asts2 = asts;
        this.Identifier = this.constructor.prototype.Identifier;
        this.BlockStatement = this.constructor.prototype.BlockStatement;
    }

    VisitorReplaceInExpr.prototype.Identifier = function(node) {
            if (node.name.indexOf(RP) === 0) {
                var i = parseInt(node.name.substring(RP.length));
                return this.asts2[i];
            } else {
                return node;
            }
        };

    VisitorReplaceInExpr.prototype.BlockStatement = function(node) {
            if (node.body[0].type === 'ExpressionStatement' && isArr(node.body[0].expression)) {
                node.body = node.body[0].expression;
            }
            return node;
        };

    function replaceInStatement(code) {
        var asts = [];
        for (var i=0;i<arguments.length;i++){
            asts.push(arguments[i])
        }

        // perhaps here we can refine the statement
        var visitorReplaceInExpr = new VisitorReplaceInExpr(asts);
        var ast = acorn.parse(code);
        var newAst = transformAst(ast, visitorReplaceInExpr, undefined, undefined, true);
        //console.log(newAst);
        return newAst.body;
    }

    function replaceInExpr(code) {
        var ret = replaceInStatement.apply(this, arguments);
        return ret[0].expression;
    }

    function createLiteralAst(name) {
        return {type:Syntax.Literal, value:name};
    }

    function createIdentifierAst(name) {
        return {type:Syntax.Identifier, name:name};
    }

    function transferLoc(newNode, oldNode) {
        if (oldNode.loc)
            newNode.loc = oldNode.loc;
        if (oldNode.raw)
            newNode.raw = oldNode.loc;
    }

    var inc = 4;
    // current static identifier for each conditional expression
    var condCount = 0 + inc;
    var iid = 1 + inc;
    var opIid = 2 + inc;

    function getIid() {
        var tmpIid = iid;
        iid = iid + inc;
        return createLiteralAst(tmpIid);
    }

    function getPrevIidNoInc() {
        return createLiteralAst(iid - inc);
    }

    function getCondIid() {
        var tmpIid = condCount;
        condCount = condCount + inc;
        return createLiteralAst(tmpIid);
    }

    function getOpIid() {
        var tmpIid = opIid;
        opIid = opIid + inc;
        return createLiteralAst(tmpIid);
    }

    var traceWfh;
    var fs;

    function writeLineToIIDMap(str) {
        if (traceWfh) {
            fs.writeSync(traceWfh, str);
        }
    }

    /**
     * if not yet open, open the IID map file and write the header.
     * @param {string} outputDir an optional output directory for the sourcemap file
     */
    function openIIDMapFile(outputDir) {
        if (traceWfh === undefined) {
			if (ext_config.isExtensionEvn == true) {
		        if (typeof fs == 'undefined') {
		            fs = require('../../utils/fs.js');
		        }
		    } else if (ext_config.isNodeJsEvn == true) {
		        if (typeof fs == 'undefined') {
		            fs = require('../../utils/fs.js');
		        }
		    } else if (ext_config.isBrowserJsEvn == true) {
		        throw new Error('openFile in esnstrument should not be invoked in  browser js environment!');
		    }
            
            var smapFile = outputDir ? (require('../utils/path').join(outputDir, SMAP_FILE_NAME)) : SMAP_FILE_NAME;
            traceWfh = fs.openSync(smapFile, 'w');
            writeLineToIIDMap("(function (sandbox) { var iids = sandbox.iids = []; var filename;\n");
        }
    }

    /**
     * if open, write footer and close IID map file
     */
    function closeIIDMapFile() {
        if (traceWfh) {
            writeLineToIIDMap("}(typeof " + PREFIX1 + " === 'undefined'? " + PREFIX1 + " = {}:" + PREFIX1 + "));\n");
            fs.closeSync(traceWfh);
            traceWfh = undefined;
        }
    }



    function printLineInfoAux(i,ast) {
        if (ast && ast.loc) {
            writeLineToIIDMap('iids[' + i + '] = [filename,' + (ast.loc.start.line) + "," + (ast.loc.start.column + 1) + "];\n");
        }
//        else {
//            console.log(i+":undefined:undefined");
//        }
    }

    function printIidToLoc(ast0) {
        printLineInfoAux(iid, ast0);
    }

    function printOpIidToLoc(ast0) {
        printLineInfoAux(opIid, ast0);
    }

    function printCondIidToLoc(ast0) {
        printLineInfoAux(condCount, ast0);
    }

    var traceWfh;
    var fs;

    function openFile() {
        //if (traceWfh === undefined) {
            // make sure the previous sourcemap file has been closed;
        //    try{
        //        closeFile();
        //    } catch(e) {}
        //}

        if (ext_config.isExtensionEvn == true) {
            if (typeof fs == 'undefined') {
                fs = require('../../utils/fs.js');
            }
            traceWfh = fs.openSync(SMAP_FILE_NAME + (sourceMapNumber++) + '.js', 'w');
        } else if (ext_config.isNodeJsEvn == true) {
            if (typeof fs == 'undefined') {
                fs = require('../../utils/fs.js');
            }
            traceWfh = fs.openSync(SMAP_FILE_NAME, 'w');
        
        } else if (ext_config.isBrowserJsEvn == true) {
            throw new Error('openFile in esnstrument should not be invoked in  browser js environment!');
        }
    }

    function writeLine(str) {
        if (traceWfh) {
            fs.writeSync(traceWfh, str);
        }
    }


    function closeFile() {
        if (traceWfh) {
            fs.closeSync(traceWfh);
        }
    }


    function wrapPutField(node, base, offset, rvalue) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logPutFieldFunName +
                "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4)",
            getIid(),
            base,
            offset,
            rvalue
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapModAssign(node, base, offset, op, rvalue) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logAssignFunName + "(" + RP + "1," + RP + "2," + RP + "3," + RP + "4)(" + RP + "5)",
            getIid(),
            base,
            offset,
            createLiteralAst(op),
            rvalue
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapMethodCall(node, base, offset, isCtor) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logMethodCallFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + (isCtor ? "true" : "false") + ")",
            getIid(),
            base,
            offset
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapFunCall(node, ast, isCtor) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logFunCallFunName + "(" + RP + "1, " + RP + "2, " + (isCtor ? "true" : "false") + ")",
            getIid(),
            ast
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapGetField(node, base, offset) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logGetFieldFunName + "(" + RP + "1, " + RP + "2, " + RP + "3)",
            getIid(),
            base,
            offset
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapRead(node, name, val, isReUseIid, isGlobal) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logReadFunName + "(" + RP + "1, " + RP + "2, " + RP + "3," + (isGlobal ? "true" : "false") + ")",
            isReUseIid ? getPrevIidNoInc() : getIid(),
            name,
            val
        );
        transferLoc(ret, node);
        return ret;
    }

//    function wrapReadWithUndefinedCheck(node, name) {
//        var ret = replaceInExpr(
//            "("+logIFunName+"(typeof ("+name+") === 'undefined'? "+RP+"2 : "+RP+"3))",
//            createIdentifierAst(name),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst("undefined")),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst(name), true)
//        );
//        transferLoc(ret, node);
//        return ret;
//    }

/*
    // jacksongl-change
    function wrapReadWithUndefinedCheck(node, name, context) {
        var ret;
        if (context && context === CONTEXT.TYPEOF){
        if(true){
        //if (name !== 'location' && name !== 'self') {
                ret = replaceInExpr(
                    "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3)))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            } else {
                ret = replaceInExpr(
                    "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3)))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            }
        } else {
            if (name !== 'location' && name !== 'self') {
                ret = replaceInExpr(
                    //"(eval('try{" + name + "}catch(e){J$.Ru();}'),(" + name + "=" + RP + "3))",
                    "(eval('try{" + name + "}catch(e){J$.Ru(\\\'" + name + "\\\');}'),(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3))))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            } else {
                ret = replaceInExpr(
                     //"(try {" + name + ";}catch(e) {" + logReadUndeclaredFunName + "("+getIid()+","+name+");},(" + RP + "3))",
                      "(eval('try{" + name + "}catch(e){J$.Ru(\\\'" + name + "\\\');}')," + "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3))))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            }
        }
        
        transferLoc(ret, node);
        return ret;
    }
*/

    // #19 fix
    function wrapReadWithUndefinedCheck(node, name, context) {
        var ret;
        //if (context && context == CONTEXT.TYPEOF) {
        if (true) {
            if (name !== 'location') {
                ret = replaceInExpr(
                    "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3)))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            } else {
                ret = replaceInExpr(
                    "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3)))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            }
        } else {
            if (name !== 'location') {
                ret = replaceInExpr(
                    //"(eval('try{" + name + "}catch(e){J$.Ru();}'),(" + name + "=" + RP + "3))",
                    //"(eval('try{" + name + "}catch(e){J$.Ru(\\\'" + name + "\\\');}'),(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3))))",
                    "(((function (){\'J$-no-inst\';try{" + name + "}catch(e){J$.Ru(\'" + name + "\');} })(\'J$-no-inst\')),(" + logIFunName + "(typeof (" + name + ") === 'undefined'? ((" + RP + "3),(" + name + "=" + RP + "2)) : (" + name + "=" + RP + "3))))",
                    //"((function(){try{window = window;}catch(e){test;}})())",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            } else {
                ret = replaceInExpr(
                    //"(try {" + name + ";}catch(e) {" + logReadUndeclaredFunName + "("+getIid()+","+name+");},(" + RP + "3))",
                    //"(eval('try{" + name + "}catch(e){J$.Ru(\\\'" + name + "\\\');}')," + "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3))))",
                    "(((function (){\'J$-no-inst\';try{" + name + "}catch(e){J$.Ru(\'" + name + "\');} })(\'J$-no-inst\'))," + "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3))))",
                    createIdentifierAst(name),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                    wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
                );
            }
        }
        
        transferLoc(ret, node);
        return ret;
    }


/*
    function wrapReadWithUndefinedCheck(node, name) {
        var ret;

        if (name !== 'location') {
            ret = replaceInExpr(
                //"(eval('try{" + name + "}catch(e){J$.Ru();}'),(" + name + "=" + RP + "3))",
                "(eval('try{" + name + "}catch(e){J$.Ru(\"" + name + "\");}'),(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3))))",
                createIdentifierAst(name),
                wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
            );
        } else {
            ret = replaceInExpr(
                 //"(try {" + name + ";}catch(e) {" + logReadUndeclaredFunName + "("+getIid()+","+name+");},(" + RP + "3))",
                  "(eval('try{" + name + "}catch(e){J$.Ru(\"" + name + "\");}')," + "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3))))",
                createIdentifierAst(name),
                wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true),
                wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true)
            );
        }
        transferLoc(ret, node);
        return ret;
    }
*/

    function wrapWrite(node, name, val, lhs) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4)",
            getIid(),
            name,
            val,
            lhs
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapWriteWithUndefinedCheck(node, name, val, lhs) {
        printIidToLoc(node);
//        var ret2 = replaceInExpr(
//            "("+logIFunName+"(typeof ("+name+") === 'undefined'? "+RP+"2 : "+RP+"3))",
//            createIdentifierAst(name),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst("undefined")),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst(name), true)
//        );
        var ret = replaceInExpr(
            logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + logIFunName + "(typeof(" + lhs.name + ")==='undefined'?undefined:" + lhs.name + "))",
            getIid(),
            name,
            val
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapRHSOfModStore(node, left, right, op) {
        var ret = replaceInExpr(RP + "1 " + op + " " + RP + "2",
            left, right);
        transferLoc(ret, node);
        return ret;
    }

    function makeNumber(node, left) {
        var ret = replaceInExpr(" + "+RP + "1 ",left);
        transferLoc(ret, node);
        return ret;
    }

    function wrapLHSOfModStore(node, left, right) {
        var ret = replaceInExpr(RP + "1 = " + RP + "2",
            left, right);
        transferLoc(ret, node);
        return ret;
    }

    function wrapLiteral(node, ast, funId) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logLitFunName + "(" + RP + "1, " + RP + "2, " + RP + "3)",
            getIid(),
            ast,
            createLiteralAst(funId)
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapReturn(node, expr) {
        var lid = (expr === null) ? node : expr;
        printIidToLoc(lid);
        if (expr === null) {
            expr = createIdentifierAst("undefined");
        }
        var ret = replaceInExpr(
            logReturnFunName + "(" + RP + "1, " + RP + "2)",
            getIid(),
            expr
        );
        transferLoc(ret, lid);
        return ret;
    }

    function wrapHash(node, ast) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logHashFunName + "(" + RP + "1, " + RP + "2)",
            getIid(),
            ast
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapEvalArg(ast) {
        var ret =  replaceInExpr(
        //    instrumentCodeFunName+"("+PREFIX1+".getConcrete("+RP+"1), true)",
              PREFIX1+".getConcrete("+RP+"1)",
            ast
        );
        transferLoc(ret, ast);
        return ret;
    }

    function wrapUnaryOp(node, argument, operator) {
        printOpIidToLoc(node);
        var ret = replaceInExpr(
            logUnaryOpFunName + "(" + RP + "1," + RP + "2," + RP + "3)",
            getOpIid(),
            createLiteralAst(operator),
            argument
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapBinaryOp(node, left, right, operator) {
        printOpIidToLoc(node);
        var ret = replaceInExpr(
            logBinaryOpFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4)",
            getOpIid(),
            createLiteralAst(operator),
            left,
            right
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapLogicalAnd(node, left, right) {
        printCondIidToLoc(node);
        var ret = replaceInExpr(
            logConditionalFunName + "(" + RP + "1, " + RP + "2)?" + RP + "3:" + logLastFunName + "()",
            getCondIid(),
            left,
            right
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapLogicalOr(node, left, right) {
        printCondIidToLoc(node);
        var ret = replaceInExpr(
            logConditionalFunName + "(" + RP + "1, " + RP + "2)?" + logLastFunName + "():" + RP + "3",
            getCondIid(),
            left,
            right
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapSwitchDiscriminant(node, discriminant) {
        printCondIidToLoc(node);
        var ret = replaceInExpr(
            logSwitchLeftFunName + "(" + RP + "1, " + RP + "2)",
            getCondIid(),
            discriminant
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapSwitchTest(node, test) {
        printCondIidToLoc(node);
        var ret = replaceInExpr(
            logSwitchRightFunName + "(" + RP + "1, " + RP + "2)",
            getCondIid(),
            test
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapConditional(node, test) {
        if (node === null) {
            return node;
        } // to handle for(;;) ;

        printCondIidToLoc(node);
        var ret = replaceInExpr(
            logConditionalFunName + "(" + RP + "1, " + RP + "2)",
            getCondIid(),
            test
        );
        transferLoc(ret, node);
        return ret;
    }

    function createCallWriteAsStatement(node, name, val) {
        printIidToLoc(node);
        var ret = replaceInStatement(
            logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3)",
            getIid(),
            name,
            val
        );
        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallInitAsStatement(node, name, val, isArgumentSync) {
        printIidToLoc(node);
        var ret;

        if (isArgumentSync)
            ret = replaceInStatement(
                RP + "1 = " + logInitFunName + "(" + RP + "2, " + RP + "3, " + RP + "4, " + isArgumentSync + ")",
                val,
                getIid(),
                name,
                val
            );
        else
            ret = replaceInStatement(
                logInitFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + isArgumentSync + ")",
                getIid(),
                name,
                val
            );

        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallAsFunEnterStatement(node) {
        printIidToLoc(node);
        var ret = replaceInStatement(
            logFunctionEnterFunName + "(" + RP + "1,arguments.callee, this)",
            getIid()
        );
        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallAsScriptEnterStatement(node, instrumentedFileName) {
        printIidToLoc(node);
        var ret = replaceInStatement(logScriptEntryFunName + "(" + RP + "1," + RP + "2)",
            getIid(),
            createLiteralAst(instrumentedFileName));
        transferLoc(ret[0].expression, node);
        return ret;
    }

    var labelCounter = 0;

    function wrapScriptBodyWithTryCatch(node, body) {
        printIidToLoc(node);
        var iid1 = getIid();
        printIidToLoc(node);
        var l = labelCounter++;
        var ret = replaceInStatement(
            "function n() { jalangiLabel" + l + ": while(true) { try {" + RP + "1} catch(" + PREFIX1 +
            "e) { //console.log(" + PREFIX1 + "e); console.log(" +
                PREFIX1 + "e.stack);\n  " + logUncaughtExceptionFunName + "(" + RP + "2," + PREFIX1 +
                "e); } finally { if (" + logScriptExitFunName + "(" +
                RP + "3)) continue jalangiLabel" + l + ";\n else \n  break jalangiLabel" + l + ";\n }\n }}", body,
            iid1,
            getIid()
        );
        //console.log(JSON.stringify(ret));

        ret = ret[0].body.body;
        transferLoc(ret[0], node);
        return ret;
    }
    
    function wrapFunBodyWithTryCatch(node, body) {
        printIidToLoc(node);
        var iid1 = getIid();
        printIidToLoc(node);
        var l = labelCounter++;
        var ret = replaceInStatement(
            "function n() { jalangiLabel" + l + ": while(true) { try {" + RP + "1} catch(" + PREFIX1 +
                "e) { //console.log(" + PREFIX1 + "e); console.log(" +
                PREFIX1 + "e.stack);\n " + logUncaughtExceptionFunName + "(" + RP + "2," + PREFIX1 +
                "e); } finally { if (" + logFunctionReturnFunName + "(" +
                RP + "3)) continue jalangiLabel" + l + ";\n else \n  return " + logReturnAggrFunName + "();\n }\n }}", body,
            iid1,
            getIid()
        );
        //console.log(JSON.stringify(ret));

        ret = ret[0].body.body;
        transferLoc(ret[0], node);
        return ret;
    }

//    function wrapScriptBodyWithTryCatch(node, body) {
//        printIidToLoc(node);
//        var ret = replaceInStatement("try {"+RP+"1} catch("+PREFIX1+
//                "e) { console.log("+PREFIX1+"e); console.log("+
//                PREFIX1+"e.stack); throw "+PREFIX1+
//                "e; } finally { "+logScriptExitFunName+"("+
//                RP+"2); }",
//            body,
//            getIid()
//        );
//        transferLoc(ret[0], node);
//        return ret;
//    }

    function prependScriptBody(node, body) {
        var path = require('../utils/path');
        var preFile = ext_config.nodejs_analysis_js_path;
        var inputManagerFile = ext_config.nodejs_inputmanager_js_path;
        var thisFile = ext_config.nodejs_esnstrument_js_path;
//        var inputFile = path.resolve(process.cwd()+"/inputs.js");

        var n_code = 'if (typeof window ==="undefined") {\n' +
            '    require("' + sanitizePath(preFile) + '");\n' +
            '    require("' + sanitizePath(inputManagerFile) + '");\n' +
            '    require("' + sanitizePath(thisFile) + '");\n' +
            '    require(process.cwd()+"/inputs.js");\n' +
            '}\n';
        var ret = replaceInStatement(n_code +
            "\n{" + RP + "1}\n",
            body
        );
        transferLoc(ret[0], node);
        return ret;
    }

    function syncDefuns(node, scope, isScript) {
        var ret = [];
        if (!isScript) {
            ret = ret.concat(createCallInitAsStatement(node,
                createLiteralAst("arguments"),
                createIdentifierAst("arguments"),
                true));
        }
        if (scope) {
            for (var name in scope.vars) {
                if (HOP(scope.vars, name)) {
                    if (scope.vars[name] === "defun") {
                        var ident = createIdentifierAst(name);
                        ident.loc = scope.funLocs[name];
                        ret = ret.concat(createCallInitAsStatement(node,
                            createLiteralAst(name),
                            wrapLiteral(ident, ident, N_LOG_FUNCTION_LIT),
                            false));
                    }
                    if (scope.vars[name] === "arg") {
                        ret = ret.concat(createCallInitAsStatement(node,
                            createLiteralAst(name),
                            createIdentifierAst(name),
                            true));
                    }
                    if (scope.vars[name] === "var") {
                        ret = ret.concat(createCallInitAsStatement(node,
                            createLiteralAst(name),
                            createIdentifierAst(name),
                            false));
                    }
                }
            }
        }
        return ret;
    }


    var scope;


    function instrumentFunctionEntryExit(node, ast) {
        var body = createCallAsFunEnterStatement(node).
            concat(syncDefuns(node, scope, false)).concat(ast);
        return body;
    }

//    function instrumentFunctionEntryExit(node, ast) {
//        return wrapFunBodyWithTryCatch(node, ast);
//    }

    function instrumentScriptEntryExit(node, body0) {
        var modFile = (typeof filename === "string")?
            filename.replace(".js",FILESUFFIX1+".js"):
            "internal";
        var body = createCallAsScriptEnterStatement(node, modFile).
            concat(syncDefuns(node, scope, true)).
            concat(body0);
        return body;
    }


    function getPropertyAsAst(ast) {
        return ast.computed ? ast.property : createLiteralAst(ast.property.name);
    }

    function instrumentCall(ast, isCtor) {
        var ret;
        if (ast.type === 'MemberExpression') {
            ret = wrapMethodCall(ast, ast.object,
                getPropertyAsAst(ast),
                isCtor);
            return ret;
        } else if (ast.type === 'Identifier' && ast.name === "eval") {
            return ast;
        } else {
            ret = wrapFunCall(ast, ast, isCtor);
            return ret;
        }
    }

    function instrumentStore(node) {
        var ret;
        if (node.left.type === 'Identifier') {
            if (scope.hasVar(node.left.name)) {
                ret = wrapWrite(node.right, createLiteralAst(node.left.name), node.right, node.left);
            } else {
                ret = wrapWriteWithUndefinedCheck(node.right, createLiteralAst(node.left.name), node.right, node.left);

            }
            node.right = ret;
            return node;
        } else {
            ret = wrapPutField(node, node.left.object, getPropertyAsAst(node.left), node.right);
            return ret;
        }
    }

    function instrumentLoad(ast) {
        var ret;
        if (ast.type ==='Identifier') {
            if (ast.name === "undefined") {
                ret = wrapLiteral(ast, ast, N_LOG_UNDEFINED_LIT);
                return ret;
            } else if (ast.name === "NaN" || ast.name === "Infinity") {
                ret = wrapLiteral(ast, ast, N_LOG_NUMBER_LIT);
                return ret;
            } if(ast.name === PREFIX1 ||
                ast.name === "eval"){
                return ast;
            } else if (scope.hasVar(ast.name)) {
                ret = wrapRead(ast, createLiteralAst(ast.name),ast);
                return ret;
            } else {
                ret = wrapReadWithUndefinedCheck(ast, ast.name, arguments[1]);
                return ret;
            }
        } else if (ast.type==='MemberExpression') {
            return wrapGetField(ast, ast.object, getPropertyAsAst(ast));
        } else {
            return ast;
        }
    }

    function instrumentLoadModStore(node, isNumber) {
        if (node.left.type === 'Identifier') {
            var tmp0 = instrumentLoad(node.left);
            if (isNumber) {
                tmp0 = makeNumber(node, instrumentLoad(tmp0));
            }
            var tmp1 = wrapRHSOfModStore(node.right, tmp0, node.right, node.operator.substring(0, node.operator.length - 1));

            var tmp2;
            if (scope.hasVar(node.left.name)) {
                tmp2 = wrapWrite(node.right, createLiteralAst(node.left.name), tmp1, node.left);
            } else {
                tmp2 = wrapWriteWithUndefinedCheck(node.right, createLiteralAst(node.left.name), tmp1, node.left);

            }
            tmp2 = wrapLHSOfModStore(node, node.left, tmp2);
            return tmp2;
        } else {
            var ret = wrapModAssign(node, node.left.object,
                getPropertyAsAst(node.left),
                node.operator.substring(0, node.operator.length - 1),
                node.right);
            return ret;
        }
    }

    function instrumentPreIncDec(node) {
        var right = createLiteralAst(1);
        var ret = wrapRHSOfModStore(node, node.argument, right, node.operator.substring(0, 1) + "=");
        return instrumentLoadModStore(ret, true);
    }

    function adjustIncDec(op, ast) {
        if (op === '++') {
            op = '-';
        } else {
            op = '+';
        }
        var right = createLiteralAst(1);
        var ret = wrapRHSOfModStore(ast, ast, right, op);
        return ret;
    }


	// should a try-catch block be inserted at the top level of the instrumented code?
	// we need this flag since when we're instrumenting eval'd code, we want to avoid
	// wrapping the code in a try-catch, since that may not be syntactically valid in 
	// the surrounding context, e.g.:
	//    var y = eval("x + 1");
    var insertTopLevelTryCatch = true;
    var tryCatch = false;

    function setScope(node) {
        scope = node.scope;
    }

    // jacksongl-change
    var visitorRRPre = {
        'Program': setScope,
        'FunctionDeclaration': setScope,
        'FunctionExpression': setScope
    };

    function callback_2(def) {
        if (def.init !== null) {
            var init = wrapWrite(def.init, createLiteralAst(def.id.name), def.init, def.id);
            def.init = init;
        }
        return def;
    }

    var visitorRRPost = {
        'Literal':function (node, context) {
            if (context === CONTEXT.RHS) {

                var litType;
                switch (typeof node.value) {
                    case 'number':
                        litType = N_LOG_NUMBER_LIT;
                        break;
                    case 'string':
                        litType = N_LOG_STRING_LIT;
                        break;
                    case 'object': // for null
                        if (node.value === null)
                            litType = N_LOG_NULL_LIT;
                        else
                            litType = N_LOG_REGEXP_LIT;
                        break;
                    case 'boolean':
                        litType = N_LOG_BOOLEAN_LIT;
                        break;
                }
                var ret1 = wrapLiteral(node, node, litType);
                return ret1;
            } else {
                return node;
            }
        },
        "Program":function (node) {
            if (insertTopLevelTryCatch) {
                var ret = instrumentScriptEntryExit(node, node.body);
                node.body = ret;

            }
            scope = scope.parent;
            return node;
        },
        "VariableDeclaration":function (node) {
            var declarations = MAP(node.declarations, callback_2);
            node.declarations = declarations;
            return node;
        },
        "NewExpression":function (node) {
            var ret = {
                type:'CallExpression',
                callee:instrumentCall(node.callee, true),
                'arguments':node.arguments
            };
            transferLoc(ret, node);
            var ret1 = wrapLiteral(node, ret, N_LOG_OBJECT_LIT);
            return ret1;
        },
        "CallExpression":function (node) {
            var isEval = node.callee.type === 'Identifier' && node.callee.name === "eval";

            if(node.callee && node.callee.object && node.callee.object.expressions && node.callee.object.expressions[0] && node.callee.object.expressions[0].arguments && node.callee.object.expressions[0].arguments[0] && node.callee.object.expressions[0].arguments[0].value === 'J$-no-inst') {
                // fix #19
                for(prop in node) {
                    if(node.hasOwnProperty(prop)){
                        prop.inst = false;
                    }
                }
                //node.callee.object.expressions[0].
                return node;
            } else {
                var callee = instrumentCall(node.callee, false);
                node.callee = callee;
            }
            
            if (isEval) {
                node.arguments = MAP(node.arguments, wrapEvalArg);
            }
            return node;
        },
        "AssignmentExpression":function (node) {
            var ret1;
            if (node.operator === "=") {
                ret1 = instrumentStore(node);
            } else {
                ret1 = instrumentLoadModStore(node);
            }
            return ret1;
        },
        "UpdateExpression":function (node) {
            var ret1;
            ret1 = instrumentPreIncDec(node);
            if (!node.prefix) {
                ret1 = adjustIncDec(node.operator, ret1);
            }
            return ret1;
        },
        "FunctionExpression":function (node, context) {
            if(node.inst === false || (node.body && node.body.body && node.body.body[0] && node.body.body[0].expression && node.body.body[0].expression.value === 'J$-no-inst')) { // fix #19
                return node;
            }
            node.body.body = instrumentFunctionEntryExit(node, node.body.body);
            var ret1;
            if (context === CONTEXT.GETTER || context === CONTEXT.SETTER) {
                ret1 = node;
            } else {
                ret1 = wrapLiteral(node, node, N_LOG_FUNCTION_LIT);
            }
            scope = scope.parent;
            return ret1;
        },
        "FunctionDeclaration":function (node) {
            //console.log(node.body.body);
            node.body.body = instrumentFunctionEntryExit(node, node.body.body);
            scope = scope.parent;
            return node;
        },
        "ObjectExpression":function (node) {
            var ret1 = wrapLiteral(node, node, N_LOG_OBJECT_LIT);
            return ret1;
        },
        "ArrayExpression":function (node) {
            var ret1 = wrapLiteral(node, node, N_LOG_ARRAY_LIT);
            return ret1;
        },
        'ThisExpression':function (node) {
            var ret = wrapRead(node, createLiteralAst('this'), node);
            return ret;
        },
        'Identifier':function (node, context) {
            if (context === CONTEXT.RHS || context === CONTEXT.TYPEOF) {
                var ret = instrumentLoad(node, context);
                return ret;
            } else {
                return node;
            }
        },
        'MemberExpression':function (node, context) {
            if (context === CONTEXT.RHS) {
                var ret = instrumentLoad(node);
                return ret;
            } else {
                return node;
            }
        },
        "ForInStatement":function (node) {
            var ret = wrapHash(node.right, node.right);
            node.right = ret;
            return node;
        },
        "ReturnStatement":function (node) {
            var ret = wrapReturn(node, node.argument);
            node.argument = ret;
            return node;
        }
    };

    function funCond(node) {
        var ret = wrapConditional(node.test, node.test);
        node.test = ret;
        return node;
    }

    function callback_1(acase){
        var test;
        if (acase.test) {
            test = wrapSwitchTest(acase.test, acase.test);
            acase.test = test;
        }
        return acase;
    }

    var visitorOps = {
        "Program":function (node) {
            var body = wrapScriptBodyWithTryCatch(node, node.body);
            if (insertTopLevelTryCatch) {
                var ret = prependScriptBody(node, body);
                node.body = ret;

            }
            return node;
        },
        'BinaryExpression':function (node) {
            var ret = wrapBinaryOp(node, node.left, node.right, node.operator);
            return ret;
        },
        'LogicalExpression':function (node) {
            var ret;
            if (node.operator === "&&") {
                ret = wrapLogicalAnd(node, node.left, node.right);
            } else if (node.operator === "||") {
                ret = wrapLogicalOr(node, node.left, node.right);
            }
            return ret;
        },
        'UnaryExpression':function (node) {
            var ret;
            if (node.operator === "delete" || node.operator === "void") {
                return node;
            } else {
                ret = wrapUnaryOp(node, node.argument, node.operator);
            }
            return ret;
        },
        "SwitchStatement":function (node) {
            var dis = wrapSwitchDiscriminant(node.discriminant, node.discriminant);
            var cases = MAP(node.cases, callback_1);
            node.discriminant = dis;
            node.cases = cases;
            return node;
        },
        "FunctionExpression":function (node) {
            if(node.inst === false || (node.body && node.body.body && node.body.body[0] && node.body.body[0].expression && node.body.body[0].expression.value === 'J$-no-inst')) { // fix #19
                //node.body.body[0].block.body[0].inst = true;
                return node;
            }
            node.body.body = wrapFunBodyWithTryCatch(node, node.body.body);
            return node;
        },
        "FunctionDeclaration":function (node) {
            node.body.body = wrapFunBodyWithTryCatch(node, node.body.body);
            return node;
        },
        "ConditionalExpression":funCond,
        "IfStatement":funCond,
        "WhileStatement":funCond,
        "DoWhileStatement":funCond,
        "ForStatement":funCond
    };


    var exprDepth = 0;
    var exprDepthStack = [];
    var topLevelExprs;
    var visitorIdentifyTopLevelExprPre = {
        "CallExpression":function (node) {
            if (node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === PREFIX1) {
                var funName = node.callee.property.name;
                if ((exprDepth === 0 &&
                    (funName === 'A' ||
                        funName === 'P' ||
                        funName === 'G' ||
                        funName === 'R' ||
                        funName === 'W' ||
                        funName === 'H' ||
                        funName === 'T' ||
                        funName === 'Rt' ||
                        funName === 'B' ||
                        funName === 'U' ||
                        funName === 'C' ||
                        funName === 'C1' ||
                        funName === 'C2'
                        )) ||
                    (exprDepth === 1 &&
                        (funName === 'F' ||
                            funName === 'M'))) {
                    topLevelExprs.push(node.arguments[0].value);
                }
                exprDepth++;
            } else if (node.callee.type === 'CallExpression' &&
                node.callee.callee.type === 'MemberExpression' &&
                node.callee.callee.object.type === 'Identifier' &&
                node.callee.callee.object.name === PREFIX1 &&
                (node.callee.callee.property.name === 'F' ||
                    node.callee.callee.property.name === 'M')) {
                exprDepth++;
            }
        }
        ,
        "FunctionExpression":function (node, context) {
            exprDepthStack.push(exprDepth);
            exprDepth = 0;
        },
        "FunctionDeclaration":function (node) {
            exprDepthStack.push(exprDepth);
            exprDepth = 0;
        }

    };

    var visitorIdentifyTopLevelExprPost = {
        "CallExpression":function (node) {
            if (node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === PREFIX1) {
                exprDepth--;
            } else if (node.callee.type === 'CallExpression' &&
                node.callee.callee.type === 'MemberExpression' &&
                node.callee.callee.object.type === 'Identifier' &&
                node.callee.callee.object.name === PREFIX1 &&
                (node.callee.callee.property.name === 'F' ||
                    node.callee.callee.property.name === 'M')) {
                exprDepth--;
            }
            return node;
        }
        ,
        "FunctionExpression":function (node, context) {
            exprDepth = exprDepthStack.pop();
            return node;
        },
        "FunctionDeclaration":function (node) {
            exprDepth = exprDepthStack.pop();
            return node;
        }
    };



    function Scope(parent) {
            this.vars = {};
            this.funLocs = {};
            this.hasEval = false;
            this.hasArguments = false;
            this.parent = parent;
        }

        Scope.prototype.addVar = function (name, type, loc) {
            this.vars[name] = type;
            if (type === 'defun') {
                this.funLocs[name] = loc;
            }
        };

        Scope.prototype.hasOwnVar = function (name) {
            var s = this;
            if (s && HOP(s.vars, name))
                return s.vars[name];
            return null;
        };

        Scope.prototype.hasVar = function (name) {
            var s = this;
            while (s !== null) {
                if (HOP(s.vars, name))
                    return s.vars[name];
                s = s.parent;
            }
            return null;
        };

        Scope.prototype.addEval = function () {
            var s = this;
            while (s !== null) {
                s.hasEval = true;
                s = s.parent;
            }
        };

        Scope.prototype.addArguments = function () {
            var s = this;
            while (s !== null) {
                s.hasArguments = true;
                s = s.parent;
            }
        };

        Scope.prototype.usesEval = function () {
            return this.hasEval;
        };

        Scope.prototype.usesArguments = function () {
            return this.hasArguments;
        };

    function addScopes(ast) {

        var currentScope = null;

        // rename arguments to J$_arguments
        var fromName = 'arguments';
        var toName = PREFIX1 + "_arguments";

        function handleFun(node) {
            var oldScope = currentScope;
            currentScope = new Scope(currentScope);
            node.scope = currentScope;
            if (node.type === 'FunctionDeclaration') {
                oldScope.addVar(node.id.name, "defun", node.loc);
                if(node.params){
                    MAP(node.params, function (param) {
                        if (param.name === fromName) {         // rename arguments to J$_arguments
                            param.name = toName;
                        }
                        currentScope.addVar(param.name, "arg");
                    });
                }
            } else if (node.type === 'FunctionExpression') {
                if (node.id !== null) {
                    currentScope.addVar(node.id.name, "lambda");
                }
                if(node.params){
                    MAP(node.params, function (param) {
                        if (param.name === fromName) {         // rename arguments to J$_arguments
                            param.name = toName;
                        }
                        currentScope.addVar(param.name, "arg");
                    });
                }
            }
        }

        function handleVar(node) {
            currentScope.addVar(node.id.name, "var");
        }

        function handleCatch(node) {
            currentScope.addVar(node.param.name, "catch");
        }

        function popScope(node) {
            currentScope = currentScope.parent;
            return node;
        }

        var visitorPre = {
            'Program':handleFun,
            'FunctionDeclaration':handleFun,
            'FunctionExpression':handleFun,
            'VariableDeclarator':handleVar,
            'CatchClause':handleCatch
        };

        var visitorPost = {
            'Program':popScope,
            'FunctionDeclaration':popScope,
            'FunctionExpression':popScope,
            'Identifier':function (node, context) {         // rename arguments to J$_arguments
                if (context === CONTEXT.RHS  && node.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.name = toName;
                }
                return node;
            },
            "UpdateExpression":function (node) {         // rename arguments to J$_arguments
                if (node.argument.type === 'Identifier' && node.argument.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.argument.name = toName;
                }
                return node;
            },
            "AssignmentExpression":function (node) {         // rename arguments to J$_arguments
                if (node.left.type === 'Identifier' && node.left.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.left.name = toName;
                }
                return node;
            }
        }

        transformAst(ast, visitorPost, visitorPre);
    }



    function transformString(code, visitorsPost, visitorsPre) {
        //console.log('[esnstrument]: esprima start parsing');

        var newAst = acorn.parse(code, {locations:true, ranges:true});

        //console.log('[esnstrument]: esprima parsing done');
        //console.log('[esnstrument]: addScopes');
        addScopes(newAst);
        //console.log('[esnstrument]: addScopes done');
        //console.log('[esnstrument]: start transforming Ast');
        var len = visitorsPost.length;
        // looks like this code snippet here is the bottleneck
        //console.log('[esnstrument]: number of ASTs: ' + len);
        for (var i=0; i<len; i++) 
        { // 2 visitors here
            newAst = transformAst(newAst, visitorsPost[i], visitorsPre[i], CONTEXT.RHS);
        }
        //console.log('[esnstrument]: transforming Ast done');

        return newAst;
    }

    var noInstr = "/* JALANGI DO NOT INSTRUMENT */";

    function makeInstCodeFileName(name) {
        return name.replace(".js", FILESUFFIX1 + ".js")
    }

    function getMetadata(newAst) {
        var serialized = astUtil.serialize(newAst);
        if (topLevelExprs) {
            // update serialized AST table to include top-level expr info
            topLevelExprs.forEach(function (iid) {
                var entry = serialized[iid];
                if (!entry) {
                    entry = {};
                    serialized[iid] = entry;
                }
                entry.topLevelExpr = true;
            });
        }
        return serialized;
    }


    function replaceAll (str, character,replaceChar)
    {
        var word = str.valueOf();

        while(word.indexOf(character) != -1) {
            console.log('[instrument]: replace ' + character + ' with ' + replaceChar);
            word = word.replace(character,replaceChar);
        }
        return word;
    }

    var fileNumber = 1;
    var sourceMapNumber = 1;
    var coverageNumber = 1;

    //generate filename
    function generateFileName(){
        return ext_config.recordFileTraceFolder + 'script_' + (fileNumber++) + '.js';
    }

    function instrumentCode(code, noTryCatchAtTop, url) 
    {
		var tryCatchAtTop = !noTryCatchAtTop;
        // if record and replay, then use another function
        if(ext_config.isInstrumentCodeForReplay) {
            var n_code = instrumentCodeAndSaveFile(code, generateFileName(), url);
            return n_code;
        }

        ////////////////// if not for record/replay //////////////////

        var oldCondCount;

        // between the first "" pair, there is an invisible weird character that may hind the instrumentation.
        code = replaceAll(code, "﻿", "");

        if(ext_config.is_remove_use_strict == true) {
            code = replaceAll(code, '"use strict";', "");
            code = replaceAll(code, "'use strict';", "");
            code = replaceAll(code, "'use strict'", "'tcirts esu'");
            code = replaceAll(code, '"use strict"', '"tcirts esu"');
        }

        if(code.length > ext_config.instrumentCodeLengthLimit)
        {
            console.log('[esnstrument]: code length (' + code.length + ') > transform limit (' + ext_config.instrumentCodeLengthLimit + '), tranformation aborted');
            return code;
        }

        if (typeof  code === "string" && !(code.indexOf(noInstr)>=0))
        {
            if (noTryCatchAtTop) 
            {
                oldCondCount = condCount;
                condCount = 3;
            }
            insertTopLevelTryCatch = tryCatchAtTop;
            //var newAst = transformString(code, [visitorRRPost, visitorOps], [visitorRRPre, undefined]);
            topLevelExprs = [];

            var newAst = transformString(code, [visitorRRPost, visitorOps, visitorIdentifyTopLevelExprPost], [visitorRRPre, undefined, visitorIdentifyTopLevelExprPre]);
            


            var hoistedFunctions = [];

            //console.log('hoisting function declaration...');

            var newAst = hoistFunctionDeclaration(newAst, hoistedFunctions);
            
            if(hoistedFunctions.length>0)
            {

                console.log('hoisted functions: ' + hoistedFunctions.toString());
            }
            


            //console.log('[esnstrument]: escodegen done');
            var newCode = escodegen.generate(newAst);
            //console.log('[esnstrument]: escodegen done');

            if (!tryCatchAtTop) {
                condCount = oldCondCount;
            }
            var ret = newCode+ " " + noInstr;
            return ret;
        } 
        else 
        {
            // oh so we don't hoist external js?!
            return code;
        }
    }

    // (kindof) broken here
    function hoistFunctionDeclaration(ast, hoistedFunctions) {
        
        var key, child, startIndex = 0;
        if(ast.body)
        {
            var newBody = [];
            if (ast.body.length > 0)
            { // do not hoist function declaration before J$.Fe or J$.Se 
                if (ast.body[0].type == 'ExpressionStatement') 
                {
                    if (ast.body[0].expression.type == 'CallExpression') 
                    {
                        if (ast.body[0].expression.callee.object && ast.body[0].expression.callee.object.name == 'J$'
                            && ast.body[0].expression.callee.property 
                            && (ast.body[0].expression.callee.property.name == 'Se' || ast.body[0].expression.callee.property.name == 'Fe')) {
                            
                            newBody.push(ast.body[0]);
                            startIndex = 1;
                        }
                    }
                }
            }
            for(var i=startIndex;i<ast.body.length;i++)
            {

                if (ast.body[i].type == 'FunctionDeclaration')
                {
                    //-- 

                    console.log("[!] [hoist] declaration "+ast.body[i].id.name);
                    //

                    newBody.push(ast.body[i]);

                    if(newBody.length != i+1)
                    {
                        hoistedFunctions.push(ast.body[i].id.name);
                    }
                }
            }
            for(var i=startIndex;i<ast.body.length;i++)
            {
                if (ast.body[i].type != 'FunctionDeclaration')
                {
                    newBody.push(ast.body[i]);
                }
            }
            //while(ast.body.length>0){
            //    ast.body.pop();
            //}
            for(var i=0;i<newBody.length;i++){
                ast.body[i] = newBody[i];
            }
            newBody = null;
        } 
        else 
        {

            //console.log("[!] [hoist declaration] typeof ast.body "+typeof ast.body);
            // 
        }
        for (key in ast) 
        {
            // jacksongl-change
            if (ast.hasOwnProperty(key) && key!== 'parent') {
                child = ast[key];
                if (typeof child === 'object' && child !== null && key !== "scope") 
                {
                    hoistFunctionDeclaration(child, hoistedFunctions);
                }
                
            }
        }

        return ast;
    }

    // function instrumentFile() { } funciton removed for firefox extension

    // function that instruments code and save file for replay in the backend
    function instrumentCodeAndSaveFile(code, filepath, url) {

        // between the first "" pair, there is an invisible weird character that may hind the instrumentation.
        code = replaceAll(code, "﻿", "");

        if(ext_config.is_remove_use_strict == true) {
            code = replaceAll(code, '"use strict";', "");
            code = replaceAll(code, "'use strict';", "");
            code = replaceAll(code, "'use strict'", "'tcirts esu'");
            code = replaceAll(code, '"use strict"', '"tcirts esu"');
        }

        code = "/*code intercepted from: " + replaceAll(url, '*/', '[STAR]') + "  */ " + code;

        if(code.length > ext_config.instrumentCodeLengthLimit){
            console.log('[esnstrument]: code length (' + code.length + ') > transform limit (' + ext_config.instrumentCodeLengthLimit + '), tranformation aborted');
            return code;
        }

        // global variable filename will be used by other funcitons
        filename = filepath;

        function regex_escape (text) {
            return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }

        var saveCode = function (code, filename, fileOnly) {
//            var preFile = path.resolve(__dirname,'analysis.js');
//            var inputManagerFile = path.resolve(__dirname,'InputManager.js');
//            var thisFile = path.resolve(__filename);
//            var inputFile = path.resolve(process.cwd()+"/inputs.js");

//            var n_code = 'if (typeof window ==="undefined") {\n' +
//                '    require("'+preFile+'");\n' +
//                '    require("'+inputManagerFile+'");\n' +
//                '    require("'+thisFile+'");\n' +
//                '    require("'+inputFile+'");\n' +
//                '}\n'+
            var n_code = code + "\n" + noInstr + "\n";
            n_code += '\n//@ sourceMappingURL=' + fileOnly + '.map';
            fs.writeFileSync(filename, n_code,"utf8");
            fs.writeFileSync(COVERAGE_FILE_NAME + (coverageNumber++), JSON.stringify({"covered":0, "branches":condCount/inc*2, "coverage":[]}),"utf8");
        }

        var path = require('../utils/path.js');

        openFile();
        writeLine("(function (sandbox) { if(!(sandbox.iids)) { sandbox.iids = []; } var iids = sandbox.iids; var filename;\n")

        try{
//        for (i=2; i< args.length; i++) {
//            filename = args[i];
            writeLine("filename = \"" + filename + "\";\n");

            insertTopLevelTryCatch = true;
            var newAst = transformString(code, [visitorRRPost, visitorOps], [visitorRRPre, undefined]);
            //console.log(JSON.stringify(newAst, null, '\t'));
            console.log('hoisting function declaration...');
            var hoistedFunctions = [];
            var newAst = hoistFunctionDeclaration(newAst, hoistedFunctions);
            if(hoistedFunctions.length>0){
                console.log('hoisted functions: ' + hoistedFunctions.toString());
            }
            //console.log('[esnstrument]: escodegen done');
            //var newCode = escodegen.generate(newAst);
            //console.log('[esnstrument]: escodegen done');
            console.log("saving original js code for replay review: " + filename + " ...");
            fs.writeFileSync(filename, code,"utf8");

            var newFileName = filename.replace(".js",FILESUFFIX1+".js");
            var fileOnly = path.basename(filename);
            var newFileOnly = path.basename(newFileName);
            var smap = escodegen.generate(newAst, {sourceMap: fileOnly});
            smap = smap.replace(fileOnly, newFileOnly);

            console.log("saving instrumented js file for replay: " + filename + " ...");
            fs.writeFileSync(newFileName+".map", smap,"utf8");

            var n_code = escodegen.generate(newAst);
            n_code = "/*code intercepted from: " + replaceAll(url, '*/', '[STAR]') + "  */ " + n_code;
            saveCode(n_code, newFileName, newFileOnly);
        }catch(e){
            throw e;
        } finally{
            writeLine("}(typeof "+PREFIX1+" === 'undefined'? "+PREFIX1+" = {}:"+PREFIX1+"));\n")
            closeFile();
        }
//        }
        
        return n_code;
    }

    if (typeof window === 'undefined' && (typeof require !== "undefined") && require.main === module) {
        //instrumentFile();
        //console.log(instrumentCode('({"f1":"hello", "f2":"world"})', true));
    } else {
        sandbox.instrumentCode = instrumentCode;
        sandbox.instrumentFile = instrumentFile;
        sandbox.fileSuffix = FILESUFFIX1;
        sandbox.openIIDMapFile = openIIDMapFile;
        sandbox.closeIIDMapFile = closeIIDMapFile;
    }
}(exports.esnstrument? exports.esnstrument : exports.esnstrument = {})); // be careful: exports only works for firefox extension (or node.js maybe)



//console.log(transformString("var x = 3 * 4;", visitor1));
//console.log(transformFile("tests/unit/instrument-test.js", [visitorRRPost, visitorOps], [visitorRRPre, undefined]));

}catch(e){
    console.log(e);
}
