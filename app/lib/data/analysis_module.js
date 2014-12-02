
// change line: 1 to line: 8 in node_modules/source-map/lib/source-map/source-node.js




// experiment for NaN bug checker
/*
J$.analysis = {};

((function (sandbox) {
    var ISNAN = isNaN;
    
    function putFieldPre (iid, base, offset, val) {
        if(typeof base !== 'undefined' && base !== null && (typeof val === 'number') && ISNAN(val) == true){
            console.log('[NaN iid: ' + iid +'] putField: ' + base + '.' + offset + ':' + val);
        }
        return val;
    }

    function literalPre (iid, val){
        if(typeof val === 'number' && ISNAN(val)){
            console.log('[NaN iid: ' + iid +'] introduing NaN literal:' + val);
        }
    }

    function binary (iid, op, left, right, result_c) {
        if(typeof result_c === 'number' && ISNAN(result_c)){
            console.log('[NaN iid: ' + iid +'] binary operation leads to NaN:' + result_c + ' <- ' + left + ' [' + typeof left + '] ' + op + ' ' + right + ' [' + typeof right + '] ');
        }
        return result_c;
    }

    function writePre (iid, name, val, lhs) {
        if(typeof val === 'number' && ISNAN(val)){
            console.log('[NaN iid: ' + iid +'] writing NaN value to variable:' + name + ': ' + val);
        }
    }

    function getField (iid, base, offset, val) {
        if(typeof base !== 'undefined' && base !== null && (typeof val === 'number') && ISNAN(val) == true){
            console.log('[NaN iid: ' + iid +'] getField: ' + base + '.' + offset + ':' + val);
        }
        return val;
    }

    function return_Rt (iid, val) {
        if(typeof val === 'number' && ISNAN(val)){
            console.log('[NaN iid: ' + iid +'] return NaN:' + val);
        }
        return val;
    }

    function readPre (iid, name, val, isGlobal) {
        if(typeof val === 'number' && ISNAN(val)){
            console.log('[NaN iid: ' + iid +'] read NaN from variable ' + name + ' :' + val);
        }
    }

    function declare (iid, name, val, isArgumentSync) {
        if(typeof val === 'number' && ISNAN(val)){
            console.log('[NaN iid: ' + iid +'] declare NaN in variable ' + name + ' :' + val);
        }
    }

    function unary (iid, op, left, result_c) {
        if(typeof result_c === 'number' && ISNAN(result_c)){
            console.log('[NaN iid: ' + iid +'] get NaN in unary operation: ' + result_c + ' <- ' + op + left + ' [' + typeof left + ']');
        }
        return result_c;
    }

    function conditionalPre (iid, left) {
        if(typeof left === 'number' && ISNAN(left)){
            console.log('[NaN iid: ' + iid +'] get NaN in conditional: ' + left);
        }
    }

    sandbox.putFieldPre = putFieldPre;
    sandbox.literalPre = literalPre;
    sandbox.binary = binary;
    sandbox.writePre = writePre;
    sandbox.getField = getField;
    sandbox.return_Rt = return_Rt;
    sandbox.readPre = readPre;
    sandbox.declare = declare;
    sandbox.unary = unary;
    sandbox.conditionalPre = conditionalPre;
})(J$.analysis));
*/

//experiment for JIT compiler-fiendly checker
/*

J$.analysis = {};

((function (sandbox){
    // simulate stack trace in normal execution
    stack = [];

    ///////////////////////////////////////////////////
    var analysisDB = {};

    function isArr(arr) {
        if( Object.prototype.toString.call(arr) === '[object Array]' ) {
            return true
        }
        return false;
    }

    var HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;
    var HAS_OWN_PROPERTY_CALL = Object.prototype.hasOwnProperty.call;
    var ISNAN = isNaN;
    var PARSEINT = parseInt;

    function HOP(obj, prop) {
        return HAS_OWN_PROPERTY_CALL.apply(HAS_OWN_PROPERTY, [obj, prop]);
    }

    function getAnalysisDB() {
        return analysisDB;
    }

    function setAnalysisDB(db) {
        analysisDB = db;
    }

    function getCount(checkName, index) {
        index = index + '';
        if (!HOP(analysisDB, checkName)) {
            return undefined;
        }

        if (!HOP(analysisDB[checkName], index)) {
            return undefined;
        } else {
            if (!HOP(analysisDB[checkName][index], 'count')) {
                return undefined;
            } else {
                return analysisDB[checkName][index].count;
            }
        }
    }

    function addCount(checkName, index) {
        index = index + '';
        if (!HOP(analysisDB, checkName)) {
            analysisDB[checkName] = {};
        }

        if (!HOP(analysisDB[checkName], index)) {
            analysisDB[checkName][index] = {count: 1};
        } else {
            if (!HOP(analysisDB[checkName][index], 'count')) {
                analysisDB[checkName][index].count = 1;
            } else {
                analysisDB[checkName][index].count++;
            }
        }
    }

    function getByIndexArr (indexArr) {
        var curDB = analysisDB;
        for (var i=0; i<indexArr.length; i++) {
            if (!HOP(curDB, indexArr[i] + "")) {
                return undefined;
            }
            curDB = curDB[indexArr[i] + ""];
        }
        return curDB;
    }

    function setByIndexArr (indexArr, data) {
        var curDB = analysisDB;
        for (var i=0; i<indexArr.length - 1; i++) {
            if (!HOP(curDB, indexArr[i] + "")) {
                curDB[indexArr[i] + ""] = {};
            }
            curDB = curDB[indexArr[i] + ""];
        }

        curDB[indexArr[indexArr.length - 1] + ""] = data;
    }

    function AddCountByIndexArr (indexArr) {
        var metaData = getByIndexArr(indexArr);
        if(typeof metaData === 'undefined'){
            setByIndexArr(indexArr, {'count': 1});
        } else{
            metaData.count++;
        }
    }

    function getCountByIndexArr (indexArr) {
        var metaData = getByIndexArr(indexArr);
        if(typeof metaData === 'undefined'){
            return undefined;
        } else{
            return metaData.count;
        }
    }

    /////////////////////////////////////////

    function generateObjSig(obj) {
        var sig = {};
        var obj_layout  = '';
        try{
            if(typeof obj!=='string' && typeof obj!=='number' && typeof obj!=='boolean'){
                for (var prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        if(ISNAN(parseInt(prop))){ // if prop is number e.g., '0', '1' etc. then do not add it into the prop
                            obj_layout += prop + '|';
                        }
                    }
                }
            }
            
            sig = {'obj_layout': obj_layout, 'pto': 'empty', 'con': 'empty'};
            sig.pto = obj.__proto__;
            sig.con = obj.constructor;
        }catch(e) {
            sig = 'exception when generating signature';
        }
        return sig;
    }

    function isEqualObjSig (sig1, sig2) {
        if(sig1.obj_layout === sig2.obj_layout && sig1.pto === sig2.pto && sig1.con === sig2.con) {
            return true;
        } else {
            return false;
        }
    }

    function objSigToString (sig) {
        var str = '';
        try {
            str = JSON.stringify(sig);
            if(sig.con && sig.con.name){
                str = str + " | constructor: " + sig.con.name;
            }

            if(sig.pto && sig.pto.constructor){
                str = str + " | proto constructor: " + sig.pto.constructor.name;
            }
        }catch(e) {
            str = sig.obj_layout + ' | constructor or prototype cannot be stringified';
        }
        return str;
    }

    function isNormalNumber(num) {
        if (typeof num === 'number' && !ISNAN(num)) {
            return true;
        }
        return false;
    }

    var warning_limit = 10;

    function setWarningLimit(newlimit){
        warning_limit = newlimit;
    }

    function printResult () {
        try{
        var num = 0;
        console.log("----------------------------");
        console.log('Report of polymorphic statements:');

        // first sort the results
        var jitArr = [];
        var jitResult = getByIndexArr(['JIT-checker', 'polystmt']);
        for (var prop in jitResult) {
            if (HOP(jitResult, prop)) {
                var query_sig = jitResult[prop];
                if(query_sig && query_sig.length > 1){
                    jitArr.push({'sigList': query_sig, 'iid': PARSEINT(prop)});
                    num++;
                }
            }
        }

        // extract the second most frequently used signature count
        jitArr.sort(function compare(a, b) {
            var mostFreq = 0;
            var secMostFreq = 0;
            var curCnt = 0;
            for(var i=0;i<a.sigList.length;i++){
                curCnt = a.sigList[i].count;
                if(mostFreq < curCnt) {
                    secMostFreq = mostFreq;
                    mostFreq = curCnt;
                } else if (secMostFreq < curCnt) {
                    secMostFreq = curCnt;
                }
            }

            while(mostFreq >= 1){
                mostFreq /= 10.0;
            }

            var weightA = secMostFreq + mostFreq;

            mostFreq = 0;
            secMostFreq = 0;
            for(var i=0;i<b.sigList.length;i++){
                curCnt = b.sigList[i].count;
                if(mostFreq < curCnt) {
                    secMostFreq = mostFreq;
                    mostFreq = curCnt;
                } else if (secMostFreq < curCnt) {
                    secMostFreq = curCnt;
                }
            }

            while(mostFreq >= 1){
                mostFreq /= 10.0;
            }

            var weightB = secMostFreq + mostFreq;

            // sort in descending order
            return weightB - weightA;
        });

        for(var i=0;i<jitArr.length && i<warning_limit ;i++) {
            var query_sig = jitArr[i].sigList;
            if(query_sig && query_sig.length > 1){
                console.log('------');
                console.group('[iid: ' + jitArr[i].iid + '] <- No. layouts: ' + query_sig.length);
                for(var j=0;j<query_sig.length;j++) {
                    console.log('count: ' + query_sig[j].count + ' -> layout['+jitArr[i].iid+']:' + objSigToString(query_sig[j].sig));
                }
                console.groupEnd();
            }
        }
        console.log('...');
        console.log('Number of polymorphic statements spotted: ' + num);
        console.log("---------------------------");

        console.log('Report of loading undeclared or deleted array elements:')
        var uninitArrDB = getByIndexArr(['JIT-checker', 'uninit-array-elem']);
        num = 0;
        var jitUninitArr = [];
        for(var prop in uninitArrDB) {
            if (HOP(uninitArrDB, prop)) {
                jitUninitArr.push({'iid': prop, 'count': uninitArrDB[prop].count});
                num++;
            }
        }
        jitUninitArr.sort(function compare(a, b) {
            return b.count - a.count;
        });
        for(var i=0;i<jitUninitArr.length && i< warning_limit;i++){
            console.log('[iid: ' + jitUninitArr[i].iid + '] <- No. usages: ' + jitUninitArr[i].count); 
        }
        console.log('...');
        console.log('Number of loading undeclared or deleted array elements spotted: ' + num);
        

        console.log("---------------------------");
        console.log('Report of switching array type');
        var switchArrTypeArr = [];
        var switchArrTypeDB = getByIndexArr(['JIT-checker', 'arr-type-switch']);
        num = 0;
        for(var prop in switchArrTypeDB) {
            if (HOP(switchArrTypeDB, prop)) {
                switchArrTypeArr.push({'iid': prop, 'count': switchArrTypeDB[prop].count});
                num++;
            }
        }
        switchArrTypeArr.sort(function compare(a, b) {
            return b.count - a.count;
        });
        for(var i=0;i<switchArrTypeArr.length && i< warning_limit;i++){
            console.log('[iid: ' + switchArrTypeArr[i].iid + '] <- No. usages: ' + switchArrTypeArr[i].count); 
        }
        console.log('...');
        console.log('Number of switching array type spotted: ' + num);
        console.log("---------------------------");

        console.log('Report of making incontiguous array:')
        var incontArrDBArr = [];
        var incontArrDB = getByIndexArr(['JIT-checker', 'incont-array']);
        num = 0;
        for(var prop in incontArrDB) {
            if (HOP(incontArrDB, prop)) {
                incontArrDBArr.push({'iid': prop, 'count': incontArrDB[prop].count});
                num++;
            }
        }
        incontArrDBArr.sort(function compare(a, b) {
            return b.count - a.count;
        });
        for(var i=0;i<incontArrDBArr.length && i< warning_limit;i++){
            console.log('[iid: ' + incontArrDBArr[i].iid + '] <- No. usages: ' + incontArrDBArr[i].count); 
        }
        console.log('...');
        console.log('Number of putting incontiguous array statements: ' + num);
        console.log('Why: In order to handle large and sparse arrays, there are two types of array storage internally:\n' + 
                '\t * Fast Elements: linear storage for compact key sets\n' + 
                '\t * Dictionary Elements: hash table storage otherwise\n' + 
                'It\'s best not to cause the array storage to flip from one type to another.');
        console.log("---------------------------");

        console.log('Report of initialize object field in non-constructor:');
        var initObjNonConstrArr = [];
        var initObjNonConstrDB = getByIndexArr(['JIT-checker', 'init-obj-nonconstr']);
        num = 0;
        for(var prop in initObjNonConstrDB) {
            if (HOP(initObjNonConstrDB, prop)) {
                initObjNonConstrArr.push({'iid': prop, 'count': initObjNonConstrDB[prop].count});
                num++;
            }
        }
        initObjNonConstrArr.sort(function compare(a, b) {
            return b.count - a.count;
        });
        for(var i=0;i<initObjNonConstrArr.length && i< warning_limit;i++){
            console.log('[iid: ' + initObjNonConstrArr[i].iid + '] <- No. usages: ' + initObjNonConstrArr[i].count); 
        }
        console.log('Number of statements init objects in non-constructor: ' + num);
        console.log("---------------------------");
        }catch(e) {
            console.warn("error!!");
            console.log(e);
        }
    }

    
    
    function getField (iid, base, offset, val) {
        if(base){
            if(isArr(base)){
                // check using uninitialized 
                if(isNormalNumber(offset) && !HOP(base, offset+'')) {
                    AddCountByIndexArr(['JIT-checker', 'uninit-array-elem', iid]);
                }
                return val;
            }

            var sig = generateObjSig(base);
            var query_sig = getByIndexArr(['JIT-checker', 'polystmt', iid]);
            if(typeof query_sig === 'undefined') {
                setByIndexArr(['JIT-checker', 'polystmt', iid], [{'count': 1, 'sig': sig}]);
            } else if (isArr(query_sig)) {
                outter: {
                    for(var i=0;i<query_sig.length;i++){
                        if(isEqualObjSig(query_sig[i].sig, sig)) {
                            query_sig[i].count++;
                            break outter;
                        }
                    }
                    query_sig.push({'count': 1, 'sig': sig});
                }
            }
        }
        
        return val;
    }

    function putFieldPre (iid, base, offset, val) {
        if(isArr(base) && isNormalNumber(offset)) {
            // attach a meta data 'numeric' or 'non-numeric' to this array
            // if the meta data does not exist, check the type of this array
            if(typeof base['*J$*'] === 'undefined') {
                base['*J$*'] = {'arrType': 'unknown'};
                inner:
                for(var i=0;i<base.length;i++){
                    if(typeof base[i] !== 'number' && typeof base[i] !== 'undefined') {
                        base['*J$*'].arrType = 'non-numeric';
                        break inner;
                    }
                    base['*J$*'].arrType = 'numeric';
                }
            }

            // for now this code does not check switching from non-numeric array to numeric, as it might be expensive
            if(base['*J$*'].arrType === 'numeric') {
                if(typeof val !== 'number' && typeof val !== 'undefined') {
                    AddCountByIndexArr(['JIT-checker', 'arr-type-switch', iid]);
                    base['*J$*'].arrType = 'non-numeric';
                }
            }

            if(base.length < offset) {
                AddCountByIndexArr(['JIT-checker', 'incont-array', iid]);
            }
        } else if(typeof base[offset] === 'undefined' && typeof val !== 'undefined') { // check init object members in non-consturctor functions
            if(stack.length > 0 && stack[stack.length - 1].isCon === false) {
                //console.log('[checker]: initialize obj in non-consturctor detected');
                AddCountByIndexArr(['JIT-checker', 'init-obj-nonconstr', iid]);
            } else if (stack.length===0){
                //console.log('[checker]: initialize obj in non-consturctor detected');
                AddCountByIndexArr(['JIT-checker', 'init-obj-nonconstr', iid]);
            } else if (stack.length > 0 && !(base instanceof stack[stack.length - 1].fun)) {
                //console.log('[checker]: initialize obj in non-consturctor detected');
                AddCountByIndexArr(['JIT-checker', 'init-obj-nonconstr', iid]);
            }
        }
        return val;
    }

    function invokeFunPre (iid, f, base, args, isConstructor) {
        stack.push({"fun": f, "isCon": isConstructor});
    }

    function invokeFun (iid, f, base, args, val, isConstructor) {

        if(isConstructor){ // check the return value of the constructor
            var sig = generateObjSig(val);
            var query_sig = getByIndexArr(['JIT-checker', 'polystmt', iid]);
            if(typeof query_sig === 'undefined') {
                setByIndexArr(['JIT-checker', 'polystmt', iid], [{'count': 1, 'sig': sig}]);
            } else if (isArr(query_sig)) {
                outter: {
                    for(var i=0;i<query_sig.length;i++){
                        if(isEqualObjSig(query_sig[i].sig, sig)) {
                            query_sig[i].count++;
                            break outter;
                        }
                    }
                    query_sig.push({'count': 1, 'sig': sig});
                }
            }
        }

        stack.pop();
        return val;
    }

    sandbox.getField = getField;
    sandbox.putFieldPre = putFieldPre;
    sandbox.invokeFunPre = invokeFunPre;
    sandbox.invokeFun = invokeFun;
    sandbox.printResult = printResult;
    sandbox.getAnalysisDB = getAnalysisDB;
    sandbox.setAnalysisDB = setAnalysisDB;
    sandbox.setWarningLimit = setWarningLimit;
})(J$.analysis));
*/

// to do list:
/*
1. extract more DSL
2. try to implement a set, rather than using list
*/

//experiment for implicit type coercion check

/*
different type binary calculation check,
this frontend detection plugin tries to detect binary opertion that some times takes different types of operand,
this might be error-prone:
*/

// check implicit type coercion

/*
J$.analysis = {};

((function (sandbox) {

    var num = 0;
    var susp_num = 0;

    var ISNAN = isNaN;

    function info (obj) {
        console.groupCollapsed();
        console.info(console.trace());
        console.groupEnd();
    }
    
    function isMeaningless (val) {
        if(typeof val == 'undefined'){
            return true;
        } else if(typeof val == 'number' && isNaN(val)){
            return true;
        }
        return false;   
    }

    function binary (iid, op, left, right, result_c) {
         if(((this.isMeaningless(left) || this.isMeaningless(right)) && op != '==' && op != '!=' && op != '===' && op != '!==' && op != 'instanceof' && op != 'in' && op != '&&' && op != '||') 
            || typeof val == 'undefined' ||  ((typeof val == 'number') && isNaN(val) == true)) {
            //console.warn('@1[strange binary operation: | iid: ' + iid +']:' + val);
            //console.group();
            console.warn('left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']');
            //this.info();
            //console.groupEnd();
            num++; 
        } 

        if(typeof left !== typeof right && op!= '>' && op!= '>=' && op!= '<' && op!= '<=' && op != '==' && op != '!=' && op != '===' && op != '!==' && op != 'instanceof' && op != 'in' && op != '&&' && op != '||') {
            if(op!== '+') {
                console.warn('@2[strange binary operation: | iid: ' + iid +']:' + val);
                console.group();
                console.warn('left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']');
                //this.info();
                console.groupEnd();
                susp_num++;
            }
        }
        return result_c;
    }

    sandbox.binary = binary;
})(J$.analysis));
*/


//object allocation checker

/*
* Copyright 2013 Samsung Information Systems America, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

// Author: Koushik Sen
// Refactored by Liang Gong for front-end analysis

// notes: /[\W_]+/g is of type 'object', and are often created once and implicted once, e.g., arguments[b].replace(/[\W_]+/g,"").toLowerCase()
// return core_concat.apply( [], ret ); <- [] array is created to invoke a function
/*
J$.analysis = {};
(function (module) {

    function ObjectAllocationTrackerEngine(executionIndex) {
        var SPECIAL_PROP = '*J$*SHADOW';
        var DEFINEPROPERTY = Object.defineProperty;
        if (!(this instanceof ObjectAllocationTrackerEngine)) {
            return new ObjectAllocationTrackerEngine(executionIndex);
        }

        // iid or type could be object(iid) | array(iid) | function(iid)
        var iidToObjectInfo = {}; // type -> (field -> type -> iid -> true)

        function HOP(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        };

        function isArr(val) {
            return Object.prototype.toString.call(val) === '[object Array]';
        }

        getShadowInfo = function (obj) {
            var type = typeof obj;
            if ((type === "object" || type === "function") && obj !== null && obj.name !== "eval") {
                return obj[SPECIAL_PROP];
            }
            return undefined;
        };

        setShadowInfo = function (obj, shadowInfo){
            var type = typeof obj;
            if ((type === "object" || type === "function") && obj !== null && obj.name !== "eval") {
                DEFINEPROPERTY(obj, SPECIAL_PROP, 
                              {value : shadowInfo.shadow,
                               writable : true,
                               enumerable : false,
                               configurable : true});
            }
            
        };

        function ShadowInfo(concrete, shadow){
            if (! (this instanceof ShadowInfo)) {
                return new ShadowInfo(concrete, shadow);
            }
            this.concrete = concrete;
            this.shadow = shadow;
        }

        function getSetFields(map, key) {
            if (!HOP(map, key)) {
                return map[key] = {nObjects:0, maxLastAccessTime:0, averageLastAccessTime:0, isWritten:false};
            }
            var ret = map[key];
            return ret;
        }

        function updateObjectInfo(base, offset, value, updateLocation, isWritten) {
            var shadowInfo, iid;
            shadowInfo = getShadowInfo(base);
            if (shadowInfo) {
                iid = shadowInfo.loc;
                var oldLastAccessTime = shadowInfo.lastAccessTime;
                shadowInfo.lastAccessTime = instrCounter;
                var objectInfo = getSetFields(iidToObjectInfo, iid);
                objectInfo.averageLastAccessTime = objectInfo.averageLastAccessTime + instrCounter - oldLastAccessTime;
                var max = shadowInfo.lastAccessTime - shadowInfo.originTime;
                if (max > objectInfo.maxLastAccessTime) {
                    objectInfo.maxLastAccessTime = max;
                }
                if (isWritten) {
                    objectInfo.isWritten = true;
                }
            }
        }

        function annotateObject(creationLocation, obj) {
            var type, ret = obj, i, s;
            if (!getShadowInfo(obj)) {
                type = typeof obj;
                if ((type === "object" || type === "function") && obj !== null && obj.name !== "eval") {
                    if (isArr(obj)) {
                        type = "array";
                    }
                    s = type + "(" + creationLocation + ")";
                    ret = new ShadowInfo(obj, {loc:s, originTime:instrCounter, lastAccessTime:instrCounter});
                    var objectInfo = getSetFields(iidToObjectInfo, s);
                    objectInfo.nObjects++;
                }
            }
            return ret;
        }

        var instrCounter = 0;

        this.literalPre = function (iid, val) {
            instrCounter++;
        }

        this.invokeFunPre = function (iid, f, base, args, isConstructor) {
            instrCounter++;
        }

        this.getFieldPre = function (iid, base, offset) {
            instrCounter++;
        }

        this.readPre = function (iid, name, val) {
            instrCounter++;
        }

        this.writePre = function (iid, name, val) {
            instrCounter++;
        }

        this.binaryPre = function (iid, op, left, right) {
            instrCounter++;
        }

        this.unaryPre = function (iid, op, left) {
            instrCounter++;
        }

        this.conditionalPre = function (iid, left) {
            instrCounter++;
        }


        this.literal = function (iid, val) {
            setShadowInfo(val, annotateObject(iid, val));
            return val
        }

        this.putFieldPre = function (iid, base, offset, val) {
            instrCounter++;
            updateObjectInfo(base, offset, val, iid, true);
            return val;
        }

        this.invokeFun = function (iid, f, base, args, val, isConstructor) {
            if (isConstructor) {
                var shadowInfo = annotateObject(iid, val);
                setShadowInfo(val, shadowInfo);
            }
            return val;
        }

        this.getField = function (iid, base, offset, val) {
            if (typeof val !== 'undefined') {
                updateObjectInfo(base, offset, val, iid, false);
            }
            return val;
        }

        function sizeOfMap(obj) {
            var count = 0;
            for (var i in obj) {
                if (HOP(obj, i)) {
                    count++;
                }
            }
            return count;
        }

        function typeInfoWithLocation(type) {
            if (type.indexOf("(") > 0) {
                var type1 = type.substring(0, type.indexOf("("));
                var iid = type.substring(type.indexOf("(") + 1, type.indexOf(")"));
                if (iid === "null") {
                    throw new Error("Not expecting null");
                } else {
                    return "Location " + iid + " has created " + type1;
                }
            } else {
                throw new Error('type: ' + type + " Expecting '(' in object location");
                //return iid;
            }
        }

        var printItemLimit = 200;

        this.setPrintLimit = function (limit) {
            printItemLimit = limit;
        };

        this.printObjectInfo = function () {
            var stats = [];
            for (var iid in iidToObjectInfo) {
                if (HOP(iidToObjectInfo, iid)) {
                    var objectInfo = iidToObjectInfo[iid];
                    objectInfo.iid = iid;
                    stats.push(objectInfo);
                }
            }
            stats.sort(function (a, b) {
                return b.nObjects - a.nObjects;
            });

            var len = stats.length;
            for (var i = 0; i < len && i < printItemLimit; i++) {
                objectInfo = stats[i];
                iid = objectInfo.iid;
                var str = typeInfoWithLocation(iid);
                str = str + " " + objectInfo.nObjects +
                    " times\n with max last access time since creation = " + objectInfo.maxLastAccessTime + " instructions " +
                    "\n and average last access time since creation = " + (objectInfo.averageLastAccessTime / objectInfo.nObjects) + " instructions " +
                    (objectInfo.isWritten ? "" : "\n and seems to be Read Only");
                console.log(str);
            }

        }
    }

    module.analysis = new ObjectAllocationTrackerEngine();

}(J$));
*/

// eval is evil, never use eval:
/*
J$.analysis = {};

((function (sandbox) {
    var EVAL = eval;
    var ISNAN = isNaN;
    function invokeFun (iid, f, base, args, val, isConstructor) {
        if(EVAL === val){
            console.log('[iid: ' + iid + ']: eval is evil, do not use it');
        }
        return val;
    }

    sandbox.invokeFun = invokeFun;
})(J$.analysis));
*/
/*
// check NaN
    J$.analyzer = {
        // F: function call
        // function called before F
        // modify retFunction will modify the concret return value
        pre_F: function (iid, f, origArguments, isConstructor) {
        },
        // F: function call
        // function called after F
        // modify retFunction will modify the concret return value
        post_F: function (iid, f, origArguments, isConstructor, retFunction) {

            return retFunction;
        },
        // M: method call
        // function called before M
        pre_M: function (iid, base, offset, origArguments, isConstructor) {
         
        },
        // M: method call
        // function called after M
        // modify retFunction will modify the concret return value
        post_M: function (iid, base, offset, origArguments, isConstructor, retFunction) {
            return retFunction;
        },
        Fe: function (iid, val, dis) {

            //returnVal = undefined;
        },
        Fr: function (iid) {

        },
        Rt: function (iid, val) {
            if((typeof val) == 'number' && isNaN(val) == true){
                //console.warn('[NaN iid: ' + iid +'] [value return] ' + ' <= ' + val);
                var str1 = '[NaN iid: ' + iid +'] [value return] ' + ' <= ' + val;
                //this.info();
                this.record(str1);
            } else if ((typeof val) == 'undefined') {
                //console.warn('[undefined iid: ' + iid +'] [value return] ' + ' <= ' + (typeof val));
                //this.info();
                var str1 = '[undefined iid: ' + iid +'] [value return] ' + ' <= ' + (typeof val);
                this.record(str1);
            }
            return val;
            //return returnVal = val;
        },
        Ra: function () {
            //var ret = returnVal;
            //returnVal = undefined;
            //return ret;
        },
        Se: function (iid, val) {

        },
        Sr: function (iid) {

        },
        I: function (val) {
            //return val;
        },
        T: function (iid, val, type) {


            //return val;
        },
        H: function (iid, val) {

            //return val;
        },
        // R: read
        // function called before R
        // val is the read value
        pre_R: function (iid, name, val) {

        },
        // R: read
        // function called after R
        // val is the read value
        // return value will be the new read value
        post_R: function (iid, name, val) {
            if((typeof val) == 'number' && isNaN(val) == true){
                //console.log('[NaN iid: ' + iid +'] ' + name + ":" + val);
                var str1 = '[NaN iid: ' + iid +'] ' + name + ":" + val;
                //this.info();
                this.record(str1);
            }
            return val;
        },
        // W: write
        // function called before W
        // val is the value to write
        pre_W: function (iid, name, val, lhs) {
            
            //return val;
        },
        // W: write
        // function called after W
        // val is the value to write
        // return value will be the new written value
        post_W: function (iid, name, val, lhs) {
            if((typeof val) == 'number' && isNaN(val) == true){
                //console.warn('[NaN iid: ' + iid +'] ' + name + ' <= ' + val);
                var str1 = '[NaN iid: ' + iid +'] ' + name + ' <= ' + val;
                //this.info();
                this.record(str1);
            } else if ((typeof val) == 'undefined') {
                //console.warn('[undefined iid: ' + iid +'] ' + name + ' <= ' + (typeof val));
                var str1 = '[undefined iid: ' + iid +'] ' + name + ' <= ' + (typeof val);
                this.record(str1);
                //this.info();
            }
            return val;
        },
        N: function (iid, name, val, isArgumentSync) {
            if((typeof val) == 'number' && isNaN(val) == true){
                //console.log('[NaN iid: ' + iid +'] ' + name + ":" + val);
                var str1 = '[NaN iid: ' + iid +'] ' + name + ":" + val;
                this.record(str1);
            }
            //return val;
        },
        A: function (iid, base, offset, op) {
            if(typeof base != 'undefined' && base != null && (typeof base[offset] == 'number') && isNaN(base[offset]) == true){
                //console.log('[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val);
                var str1 = '[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val;
                //this.info(base);
                this.record(str1);
            } else if (typeof base != 'undefined' && base != null && (typeof base[offset] == 'undefined') ) {
                //console.warn('[undefined iid: ' + iid +'] ' + base + '.' + offset + ' ' + op + ' ' + (typeof val));
                var str1 = '[undefined iid: ' + iid +'] ' + base + '.' + offset + ' ' + op + ' ' + (typeof val);
                //this.info();
                this.record(str1);
            }
        },
        // G: get field
        // function called before G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        pre_G: function (iid, base, offset, norr) {
            //if((iid == 306509 || iid == 306517)  && (isNaN(base[offset]))) {
            //    console.log('pre get [iid: ' + iid +']:' + base[offset] + ':' + (typeof base[offset]));
            //}
        },
        // G: get field
        // function called after G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        // val is the value gets from base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_G: function (iid, base, offset, val, norr) {
            //if((iid == 306509 || iid == 306517)  && (isNaN(val))) {
            //    console.log('[iid: ' + iid +']:' + val + ':' + ((typeof val)));
            //}
            try{
                if(typeof base != 'undefined' && base != null && ((typeof val) == 'number') && isNaN(val) == true){
                    //console.log('[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val);
                    var str1 = '[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val;
                    //this.info(base);
                    this.record(str1);
                }
            }catch(e){
                console.log(e);
            }
            return val;
        },
        // P: put field
        // function called before P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        pre_P: function (iid, base, offset, val) {
            //return val;
        },
        // P: put field
        // function called after P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_P: function (iid, base, offset, val) {
            if(typeof base != 'undefined' && base != null && ((typeof val) == 'number') && isNaN(val) == true){
                //console.warn('[NaN iid: ' + iid +'] ' + base + '.' + offset + ' <= ' + val);
                var str1 = '[NaN iid: ' + iid +'] ' + base + '.' + offset + ' <= ' + val;
                //this.info(base);
                this.record(str1);
            } else if (typeof base != 'undefined' && base != null && ((typeof val) == 'undefined')) {
                //console.warn('[undefined iid: ' + iid +'] ' + base + '.' + offset + ' <= ' + (typeof val));
                var str1 = '[undefined iid: ' + iid +'] ' + base + '.' + offset + ' <= ' + (typeof val);
                this.record(str1);
                //this.info(base);
            }
            return val;
        },
        pre_B: function (iid, op, left, right) {
            //return result_c;
        },
        post_B: function (iid, op, left, right, val) {
            if(((this.isMeaningless(left) || this.isMeaningless(right)) && op != '==' && op != '!=' && op != '===' && op != '!==' && op != 'instanceof' && op != 'in' && op != '&&' && op != '||') 
                || (typeof val) == 'undefined' ||  (((typeof val) == 'number') && isNaN(val) == true)) {
                //console.warn('[strange binary operation: | iid: ' + iid +']:' + val);
                var str1 = '[strange binary operation: | iid: ' + iid +']:' + val;
                //console.group();
                //console.warn('left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']');
                var str2 = 'left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']';
                this.record(str1, str2);
                //this.info();
                //console.groupEnd();
            } 
            return val;
            //return result_c;
        },
        U: function (iid, op, left) {

            //return result_c;
        },
        C1: function (iid, left) {
            //var left_c;
            //return left_c;
        },
        C2: function (iid, left) {
            //var left_c, ret;;
            //return left_c;
        },
        C: function (iid, left) {
            //var left_c, ret; 
            //return left_c;
        },
        record: function(){
            var result = [];
            for(var i=0;i<arguments.length;i++){
                result.push(arguments[i]);
            }
            if(typeof this.recordList == 'undefined'){
                this.recordList = [];
            }
            this.recordList.push(result);
        },
        info: function (obj) {
            console.groupCollapsed();
            console.info(console.trace());
            if(obj){
                //console.dir(obj);
            }
            console.groupEnd();
        },
        isMeaningless: function (val) {
            if((typeof val) == 'undefined'){
                return true;
            } else if((typeof val) == 'number' && isNaN(val)){
                return true;
            }
            return false;   
        },
        errorInfo: function(){
            console.dir(this.recordList);
            if(this.recordList){
                for(var i=0;i<this.recordList.length;i++){
                    var record = this.recordList[i];
                    for(var j=0;j<record.length;j++){
                        if(j==1){
                            console.group();
                        }
                        console.log(record[j]);
                        if(j>0 && j==record.length-1){
                            console.groupEnd();
                        }
                    }
                }
            }
        }
    };

//J$.analyzer = undefined;




// try to find x === NaN or x == NaN operation
/*
J$.analysis = {
    binary: function (iid, op, left, right, result_c) {
        if(op === '==' || op == '===') {
            if(left !== left || right !== right) {
                console.warn('[iid: ' + iid + ']' + left + ' [type: ' + typeof left + ']'  + op + right + ' [type: ' + typeof right + ']');
            }
        }

        if(typeof left !== typeof right && typeof left !== typeof result_c &&  typeof right !== typeof result_c && op !== 'in' && op !== 'instanceof' && op !== '!=' && op !== '==' && op !== '===' && op !== '!==' && op !== '!===' && op.indexOf('<')<0  && op.indexOf('>')<0) {
            console.warn('hidden conversion: [iid: ' + iid + ']' + left + ' [type: ' + typeof left + ']'  + op + right + ' [type: ' + typeof right + '] -> ' + result_c + ' [type: ' + typeof result_c + ']');
        }

        if(op==='-' || op==='*' || op==='/'  || op==='%') {
            if(typeof left != typeof right){
                console.warn('hidden conversion: [iid: ' + iid + ']' + left + ' [type: ' + typeof left + ']'  + op + right + ' [type: ' + typeof right + '] -> ' + result_c + ' [type: ' + typeof result_c + ']');
            }
        }

        return result_c;
    },
    literalPre: function (iid, val) {
        if(val !== val) {
            console.warn('[iid: ' + iid + ']' + 'use of literal NaN');
        }
    }
};
*/

/*

// check migration issues
    J$.analyzer = {
        // F: function call
        // function called before F
        // modify retFunction will modify the concret return value
        pre_F: function (iid, f, isConstructor) {
            if(f && f === document.getElementsByClassName) {
                console.warn('[iid: ' + iid + ']' + 'use of document.getElementsByClassName()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (f && f === document.getElementsByTagName) {
                console.warn('[iid: ' + iid + ']' + 'use of document.getElementsByTagName()');
                this.groupInfo('Not supported by IE 5.5');
            } else if (f && f === document.querySelector) {
                console.warn('[iid: ' + iid + ']' + 'use of document.querySelector()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (f && f === document.querySelectorAll) {
                console.warn('[iid: ' + iid + ']' + 'use of document.querySelectorAll()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }
        },
        // F: function call
        // function called after F
        // modify retFunction will modify the concret return value
        post_F: function (iid, f, isConstructor, retFunction) {

            return retFunction;
        },
        // M: method call
        // function called before M
        pre_M: function (iid, base, offset, isConstructor) {
            
        },
        // M: method call
        // function called after M
        // modify retFunction will modify the concret return value
        post_M: function (iid, base, offset, isConstructor, retFunction) {
            if(base && base[offset]){
                var f = base[offset];
                if(f && f === document.getElementsByClassName) {
                    console.warn('[iid: ' + iid + ']' + 'use of document.getElementsByClassName()');
                    this.groupInfo('Not supported by IE 5.5,6,7,8');
                } else if (f && f === document.getElementsByTagName) {
                    console.warn('[iid: ' + iid + ']' + 'use of document.getElementsByTagName()');
                    this.groupInfo('Not supported by IE 5.5');
                } else if (f && f === document.querySelector) {
                    console.warn('[iid: ' + iid + ']' + 'use of document.querySelector()');
                    this.groupInfo('Not supported by IE 5.5,6,7,8');
                } else if (f && f === document.querySelectorAll) {
                    console.warn('[iid: ' + iid + ']' + 'use of document.querySelectorAll()');
                    this.groupInfo('Not supported by IE 5.5,6,7,8');
                }
            }
            return retFunction;
        },
        // R: read
        // function called before R
        // val is the read value
        pre_R: function (iid, name, val) {

        },
        // R: read
        // function called after R
        // val is the read value
        // return value will be the new read value
        post_R: function (iid, name, val) {

            return val;

        },
        // W: write
        // function called before W
        // val is the value to write
        pre_W: function (iid, name, val, lhs) {

            //return val;
        },
        // W: write
        // function called after W
        // val is the value to write
        // return value will be the new written value
        post_W: function (iid, name, val, lhs) {

            return val;
        },
        // G: get field
        // function called before G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        pre_G: function (iid, base, offset, norr) {


        },
        // G: get field
        // function called after G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        // val is the value gets from base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_G: function (iid, base, offset, val, norr) {
             if(base && base !== document && offset=='querySelector' && typeof val == 'function') {
                console.warn('[iid: ' + iid + ']' + 'use of element.querySelector()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base !== document && offset=='querySelectorAll' && typeof val == 'function') {
                console.warn('[iid: ' + iid + ']' + 'use of element.querySelectorAll()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'childNodes') {
                console.warn('[iid: ' + iid + ']' + 'use of element.childNodes[]');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'firstChild') {
                console.warn('[iid: ' + iid + ']' + 'use of element.firstChild');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'lastChild') {
                console.warn('[iid: ' + iid + ']' + 'use of element.lastChild');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'nextSibling') {
                console.warn('[iid: ' + iid + ']' + 'use of element.nextSibling');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'previousSibling') {
                console.warn('[iid: ' + iid + ']' + 'use of element.previousSibling');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            } else if (base && base.tagName && base.innerHTML && offset == 'childElementCount') {
                console.warn('[iid: ' + iid + ']' + 'use of element.childElementCount');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'children') {
                console.warn('[iid: ' + iid + ']' + 'use of element.children[]');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'firstElementChild') {
                console.warn('[iid: ' + iid + ']' + 'use of element.firstElementChild');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'lastElementChild') {
                console.warn('[iid: ' + iid + ']' + 'use of element.lastElementChild');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'nextElementSibling') {
                console.warn('[iid: ' + iid + ']' + 'use of element.nextElementSibling');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'previousElementSibling') {
                console.warn('[iid: ' + iid + ']' + 'use of element.previousElementSibling');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'removeAttribute') {
                console.warn('[iid: ' + iid + ']' + 'use of element.removeAttribute()');
                this.groupInfo('Not supported by IE 5.5,6,7,8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'remove') {
                console.warn('[iid: ' + iid + ']' + 'use of element.remove()');
                this.groupInfo('Not supported by IE, Safari and Opera (Win 12, Mac 12 and Linux 12)');
            }  else if (base && base.tagName && base.innerHTML && offset == 'appendData') {
                console.warn('[iid: ' + iid + ']' + 'use of element.appendData()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'deleteData') {
                console.warn('[iid: ' + iid + ']' + 'use of element.deleteData()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'insertData') {
                console.warn('[iid: ' + iid + ']' + 'use of element.insertData()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'normalize') {
                console.warn('[iid: ' + iid + ']' + 'use of element.normalize()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'replaceData') {
                console.warn('[iid: ' + iid + ']' + 'use of element.replaceData()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'splitText') {
                console.warn('[iid: ' + iid + ']' + 'use of element.splitText()');
                this.groupInfo('Not supported by IE 5.5, 6, 7, 8, 9');
            }  else if (base && base.tagName && base.innerHTML && offset == 'substringData') {
                console.warn('[iid: ' + iid + ']' + 'use of element.substringData()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'wholeText') {
                console.warn('[iid: ' + iid + ']' + 'use of element.wholeText()');
                this.groupInfo('Not supported by IE 5.5, 6, 7, 8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'attributes') {
                console.warn('[iid: ' + iid + ']' + 'use of element.attributes[]');
                this.groupInfo('Not supported by IE and Firefox');
            }  else if (base && base.tagName && base.innerHTML && offset == 'createAttribute') {
                console.warn('[iid: ' + iid + ']' + 'use of element.createAttribute()');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'getAttribute') {
                console.warn('[iid: ' + iid + ']' + 'use of element.getAttribute()');
                this.groupInfo('Not supported by IE 5.5, 6, 7');
            }  else if (base && base.tagName && base.innerHTML && offset == 'getAttributeNode') {
                console.warn('[iid: ' + iid + ']' + 'use of element.getAttributeNode()');
                this.groupInfo('Not supported by IE 5.5, 6, 7');
            }  else if (base && base.tagName && base.innerHTML && offset == 'hasAttribute') {
                console.warn('[iid: ' + iid + ']' + 'use of element.hasAttribute()');
                this.groupInfo('Not supported by IE 5.5, 6, 7');
            }  else if (base && base.tagName && base.innerHTML && offset == 'name') {
                console.warn('[iid: ' + iid + ']' + 'use of element.name');
                this.groupInfo('Not supported by IE 5.5');
            }  else if (base && base.tagName && base.innerHTML && offset == 'compareDocumentPosition') {
                console.warn('[iid: ' + iid + ']' + 'use of element.compareDocumentPosition()');
                this.groupInfo('Not supported by IE 5.5, 6, 7');
            }  else if (base && base.tagName && base.innerHTML && offset == 'getElementsByName') {
                console.warn('[iid: ' + iid + ']' + 'use of element.getElementsByName()');
                this.groupInfo('Incorrect and Incomplete in IE 5.5, 6, 7, 8, 9');
            }  else if (base && base.tagName && base.innerHTML && offset == 'isEqualNode') {
                console.warn('[iid: ' + iid + ']' + 'use of element.isEqualNode()');
                this.groupInfo('Incorrect and Incomplete in IE 5.5, 6, 7, 8');
            }  else if (base && base.tagName && base.innerHTML && offset == 'ownerDocument') {
                console.warn('[iid: ' + iid + ']' + 'use of element.ownerDocument');
                this.groupInfo('Incorrect and Incomplete in IE 5.5');
            }
            return val;
        },
        // P: put field
        // function called before P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        pre_P: function (iid, base, offset, val) {
            if(typeof base != 'undefined' && base != null && (typeof val == 'number') && isNaN(val) == true){
                console.log('[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val);
                this.info(base);
            }
            //return val;
        },
        // P: put field
        // function called after P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_P: function (iid, base, offset, val) {
            if(typeof base != 'undefined' && base != null && (typeof val == 'number') && isNaN(val) == true){
                console.warn('[NaN iid: ' + iid +'] ' + base + '.' + offset + ':' + val);
                this.info(base);
            } 
            return val;
        },
        info: function (obj) {
            console.groupCollapsed();
            console.info(console.trace());
            if(obj){
                //console.dir(obj);
            }
            console.groupEnd();
        },
        isMeaningless: function (val) {
            if(typeof val == 'undefined'){
                return true;
            } else if(typeof val == 'number' && isNaN(val)){
                return true;
            }
            return false;   
        },
        isDocument: function (doc) {
            //[18:10:00.673] "[object HTMLDocument]"
            if(doc && doc.toString && doc.toString() == '[object HTMLDocument]'){
                return true;
            } else {
                return false;
            }
        },
        groupInfo: function (message) {
            console.group();
            console.log(message);
            console.groupEnd();
        }
    };

    */

/*

J$.output = function(str) {
    console.log(str); 
    //window.postMessage(str, window.location.href);
};

(function (){J$.variables = {}; J$.variables.concat = String.prototype.concat;})();

     J$.analysis = {
        putFieldPre: function (iid, base, offset, val) {
            if (typeof base === 'boolean' || typeof base === 'number' || typeof base === 'string') {
                J$.output('[iid: ' + iid + '] setting property [' + offset + '] of base object: ' + typeof base);
            }

            if (offset === '__proto__') {
                J$.output('[iid: ' + iid + '] setting property [' + offset + '] of base object: ' + typeof base);
            }
            return val;
        },
        getFieldPre: function (iid, base, offset) {
            if(typeof base === 'string'){
                if(/[\uD800-\uDFFF]/.test(base) && (offset === 'length' || offset === 'charAt' || offset === 'charCodeAt')) {
                    J$.output('[iid: ' + iid + '] getting property [' + offset + '] of string containing surrogate pair: ' + base);
                }
            }
        },
        invokeFunPre: function (iid, f, base, args, isConstructor) {
            if(f===J$.variables.concat && args[0] && args[0].callee && args[0].length) {
                J$.output(args);
                J$.output('[iid: ' + iid + '] calling concat function with arguments');
            } 
        },
        binaryPre: function (iid, op, left, right) {
            if(typeof left === 'string' && typeof right === 'object' && right !== null && right.__proto__ === Object.prototype) {
                if (left == right){
                    J$.output('[iid: ' + iid + '] string == object (===)');
                }
            } else if (typeof right === 'string' && typeof left === 'object' && left !== null && left.__proto__ === Object.prototype) {
                if (left == right){
                    J$.output('[iid: ' + iid + '] string == object (===)');
                }
            } 
        },
        readPre: function (iid, name, val, isGlobal) { 
            if(name === 'this' && val === window) {
                J$.output('[iid: ' + iid + '] this===window'); 
            }
        }
    }; 

    */


    /*  
 *  Plug-in template for you, 
 *  do whatever you want. Have fun :)
 */
J$.analysis = {};

((function (sandbox){
    // called before reading a variable
    function readPre (iid, name, val, isGlobal) {
        console.log('read operation intercepted');
    }
    
    // called during reading a variable, 
    // val is the read value, do not forget to return it
    function read (iid, name, val, isGlobal) {
        return val;
    }
    
    // called before writing a variable
    function writePre (iid, name, val) {
    }

    // called during writing a variable
    // val is the value to be written, do not forget to return it
    function write (iid, name, val) {
        return val;
    }
    
    // called before setting field to an entity (e.g., object, function etc.)
    // base is the entity, offset is the field name, so val === base[offset]
    // should return val
    function putFieldPre (iid, base, offset, val) {
        return val;
    }

    // called during setting field
    // should return val
    function putField (iid, base, offset, val) {
        return val;
    }
    
    // before retrieving field from an entity
    function getFieldPre (iid, base, offset) {
    }

    // during retrieving field from an entity
    function getField (iid, base, offset, val) {
        return val;
    }
    
    // before creating a literal
    function literalPre (iid, val) {
    }

    // during creating a literal
    // should return val
    function literal (iid, val) {
        return val;
    }

    // before invoking a function/method
    function invokeFunPre (iid, f, base, args, isConstructor) {
    }

    // during invoking a function/method
    // val is the return value and should be returned
    function invokeFun (iid, f, base, args, val, isConstructor) {
        console.log("Function invoked: "+val);
        return val;
    }
    
    // before doing a binary operation
    function binaryPre (iid, op, left, right) {
    }

    // during a binary operation
    // result_c is the result and should be returned
    function binary (iid, op, left, right, result_c) {
        return result_c;
    }

    // before doing a unary operation
    function unaryPre (iid, op, left) {
    }

    // during a unary operation
    // result_c is the result and should be returned
    function unary (iid, op, left, result_c) {
        return result_c;
    }

    // before getting a conditional expression evaluation
    function conditionalPre (iid, left) {
    }

    // during a conditional expression evaluation
    // result_c is the evaluation result and should be returned
    function conditional (iid, left, result_c) {
        return result_c;
    }
    
    sandbox.readPre = readPre;
    sandbox.read = read;
    sandbox.writePre = writePre;
    sandbox.write = write;
    sandbox.putFieldPre = putFieldPre;
    sandbox.putField = putField;
    sandbox.literalPre = literalPre;
    sandbox.literal = literal;
    sandbox.invokeFunPre = invokeFunPre;
    sandbox.invokeFun = invokeFun;
    sandbox.getFieldPre = getFieldPre;
    sandbox.getField = getField;
    sandbox.binaryPre = binaryPre;
    sandbox.binary = binary;
    sandbox.unaryPre = unaryPre;
    sandbox.unary = unary;
    sandbox.conditionalPre = conditionalPre;
    sandbox.conditional = conditional;
})(J$.analysis));
        
    