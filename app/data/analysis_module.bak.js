
// change line: 1 to line: 8 in node_modules/source-map/lib/source-map/source-node.js

// experiment for NaN bug checker
/*
J$.analysis = { 
    putFieldPre: function (iid, base, offset, val) {
        if(typeof base !== 'undefined' && base !== null && (typeof val === 'number') && isNaN(val) == true){
            console.log('[NaN iid: ' + iid +'] putField: ' + base + '.' + offset + ':' + val);
        }
        return val;
    },
    literalPre: function (iid, val){
        if(typeof val === 'number' && isNaN(val)){
            console.log('[NaN iid: ' + iid +'] introduing NaN literal:' + val);
        }
    },
    binary: function (iid, op, left, right, result_c) {
        if(typeof result_c === 'number' && isNaN(result_c)){
            console.log('[NaN iid: ' + iid +'] binary operation leads to NaN:' + result_c + ' <- ' + left + ' [' + typeof left + '] ' + op + ' ' + right + ' [' + typeof right + '] ');
        }
        return result_c;
    },
    writePre: function (iid, name, val, lhs) {
        if(typeof val === 'number' && isNaN(val)){
            console.log('[NaN iid: ' + iid +'] writing NaN value to variable:' + name + ': ' + val);
        }
    },
    getField: function (iid, base, offset, val) {
        if(typeof base !== 'undefined' && base !== null && (typeof val === 'number') && isNaN(val) == true){
            console.log('[NaN iid: ' + iid +'] getField: ' + base + '.' + offset + ':' + val);
        }
        return val;
    },
    return_Rt: function (iid, val) {
        if(typeof val === 'number' && isNaN(val)){
            console.log('[NaN iid: ' + iid +'] return NaN:' + val);
        }
        return val;
    },
    readPre: function (iid, name, val, isGlobal) {
        if(typeof val === 'number' && isNaN(val)){
            console.log('[NaN iid: ' + iid +'] read NaN from variable ' + name + ' :' + val);
        }
    },
    declare: function (iid, name, val, isArgumentSync) {
        if(typeof val === 'number' && isNaN(val)){
            console.log('[NaN iid: ' + iid +'] declare NaN in variable ' + name + ' :' + val);
        }
    },
    unary: function (iid, op, left, result_c) {
        if(typeof result_c === 'number' && isNaN(result_c)){
            console.log('[NaN iid: ' + iid +'] get NaN in unary operation: ' + result_c + ' <- ' + op + left + ' [' + typeof left + ']');
        }
        return result_c;
    },
    conditionalPre: function (iid, left) {
        if(typeof left === 'number' && isNaN(left)){
            console.log('[NaN iid: ' + iid +'] get NaN in conditional: ' + left);
        }
    }
}
*/

//experiment for JIT compiler-fiendly checker
/**/

J$.analysis = {};

((function (sandbox){

    type_memo = [];
    type_count = [];
    array_uninit_memo = [];
    array_change_elem_type = [];
    array_incont_array = [];
    stack = [];
    init_obj_in_non_cons = [];

    ///////////////////////////////////////////////////

    function isArr(arr) {
        if( Object.prototype.toString.call(arr) === '[object Array]' ) {
            return true
        }
        return false;
    }

    var HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;
    var HAS_OWN_PROPERTY_CALL = Object.prototype.hasOwnProperty.call;
    var ISNAN = isNaN;

    function HOP(obj, prop) {
        return HAS_OWN_PROPERTY_CALL.apply(HAS_OWN_PROPERTY, [obj, prop]);
    }

    var analysisDB = {};

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

    /////////////////////////////////////////

    function generateObjSig(obj) {
        var sig = {};
        var obj_layout  = '';
        try{
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    obj_layout += prop + '|';
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
        var str = JSON.stringify(sig);
        if(sig.con && sig.con.constructor){
            str = str + " || constructor: " + sig.con.name;
        }

        if(sig.pto && sig.pto.constructor){
            str = str + " || proto constructor: " + sig.pto.constructor.name;
        }
        return str;
    }

    function isNormalNumber(num) {
        if (typeof num === 'number' && !ISNAN(num)) {
            return true;
        }
        return false;
    }

    function printResult () {
        if(type_memo){
            var num = 0;
            for(var i=0;i<type_memo.length;i++){
                if(type_memo[i] && type_memo[i].length > 1){
                    console.log('iid: ' + i + ':' + ' times: ' + type_count[i]);
                    console.group();
                    for(var j=0;j<type_memo[i].length;j++){
                        console.log('sig['+j+']:' + objSigToString(type_memo[i][j]));
                    }
                    console.groupEnd();
                    num++;
                }
            }
            console.log('Number of polymorphic statements spotted: ' + num);
            console.log("---------------------------");
        } else {
            type_memo = [];
        }

        if(array_uninit_memo){
            console.log('Number of load of uninitialized or deleted array elements spotted: ' + array_uninit_memo.length);
            console.log(JSON.stringify(array_uninit_memo));
            console.log("---------------------------");
        } else {
            array_uninit_memo = [];
        }

        if(array_change_elem_type) {
            console.log('Number of putting non-numeric values in numeric array statements spotted: ' + array_change_elem_type.length);
            console.log(JSON.stringify(array_change_elem_type));
            console.log("---------------------------");
        } else {
            array_change_elem_type = [];
        }

        if(array_incont_array) {
            console.log('Number of putting incontiguous array statements: ' + array_incont_array.length);
            console.log(JSON.stringify(array_incont_array));
            console.log('Why: In order to handle large and sparse arrays, there are two types of array storage internally:\n' + 
                '\t * Fast Elements: linear storage for compact key sets\n' + 
                '\t * Dictionary Elements: hash table storage otherwise\n' + 
                'It\'s best not to cause the array storage to flip from one type to another.');
            console.log("---------------------------");
        } else {
            array_change_elem_type = [];
        }

        if(init_obj_in_non_cons) {
            console.log('Number of statements init objects in non-constructor: ' + init_obj_in_non_cons.length);
            console.log(JSON.stringify(init_obj_in_non_cons));
            console.log("---------------------------");
        } else {
            init_obj_in_non_cons = [];
        }
    }
    
    function getField (iid, base, offset, val) {
        if(base){
            if(isArr(base)){
                if(isNormalNumber(offset) && HOP(base, offset+'')) { // use hasOwnProperty
                    array_uninit_memo.push(iid); 
                }
                return val;
            }

            if(typeof offset == 'number') {
                return val;
            }

            if(typeof base != 'object') {
                return val;
            }
            var iOffset;
            var shouldReturn = true;
            try{
                iOffset = parseInt(offset)
            } catch(e){
                shouldReturn = false;
            }

            if(shouldReturn===true && !isNaN(iOffset)){
                return val;
            }

            if(type_memo){
                var sig = generateObjSig(base);

                if(type_memo[iid]){
                    type_count[iid] ++;
                    outter:{
                        for(var i=0;i<type_memo[iid].length;i++){
                            if(isEqualObjSig(type_memo[iid][i], sig)) {
                                break outter;
                            }
                        }
                        type_memo[iid].push(sig);
                    }
                } else {
                    type_memo[iid] = [];
                    type_memo[iid].push(sig);
                    type_count[iid] = 0;
                }
            } else {
                type_memo = [];
            }
        }
        
        return val;
    }

    function putFieldPre (iid, base, offset, val) {
        if(isArr(base) && isNormalNumber(offset)) {
            // attach a meta data 'numeric' or 'non-numeric' to this array
            // if the meta data does not exist, check the type of this array
            if(typeof base[offset]!== 'undefined' && typeof base[offset] === 'number' && typeof val !== 'number'){
                array_change_elem_type.push(iid); 
            }

            if(base.length < offset) {
                array_incont_array.push(iid);
            }
        } else if(typeof base[offset] === 'undefined' && typeof val !== 'undefined') { // check init object members in non-consturctor functions
            if(stack.length > 0 && stack[stack.length - 1].isCon === false) {
                console.log('[checker]: initialize obj in non-consturctor detected');
                init_obj_in_non_cons.push(iid);
            } else if (stack.length===0){
                console.log('[checker]: initialize obj in non-consturctor detected');
                init_obj_in_non_cons.push(iid);
            } else if (stack.length > 0 && !(base instanceof stack[stack.length - 1].fun)) {
                console.log('[checker]: initialize obj in non-consturctor detected');
                init_obj_in_non_cons.push(iid);
            }
        }
        return val;
    }

    function invokeFunPre (iid, f, base, args, isConstructor) {
        stack.push({"fun": f, "isCon": isConstructor});
    }

    function invokeFun (iid, f, base, args, val, isConstructor) {
        stack.pop();
        return val;
    }

    sandbox.getField = getField;
    sandbox.putFieldPre = putFieldPre;
    sandbox.invokeFunPre = invokeFunPre;
    sandbox.invokeFun = invokeFun;
    sandbox.printResult = printResult;
})(J$.analysis));




//experiment for implicit type coercion check

/*
different type binary calculation check,
this frontend detection plugin tries to detect binary opertion that some times takes different types of operand,
this might be error-prone:
*/

/*
J$.num = 0;
J$.susp_num = 0;
// check NaN
    J$.analyzer = {
        post_B: function (iid, op, left, right, val) {
            if(((this.isMeaningless(left) || this.isMeaningless(right)) && op != '==' && op != '!=' && op != '===' && op != '!==' && op != 'instanceof' && op != 'in' && op != '&&' && op != '||') 
                || typeof val == 'undefined' ||  ((typeof val == 'number') && isNaN(val) == true)) {
                //console.warn('@1[strange binary operation: | iid: ' + iid +']:' + val);
                //console.group();
                console.warn('left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']');
                //this.info();
                //console.groupEnd();
                J$.num++; 
            } 

            if(typeof left !== typeof right && op!= '>' && op!= '>=' && op!= '<' && op!= '<=' && op != '==' && op != '!=' && op != '===' && op != '!==' && op != 'instanceof' && op != 'in' && op != '&&' && op != '||') {
                if(op!== '+') {
                    console.warn('@2[strange binary operation: | iid: ' + iid +']:' + val);
                    console.group();
                    console.warn('left: ' + left + '[' + typeof left +']' + '  op:' + op + '  right: ' + right + '[' + typeof right +']');
                    //this.info();
                    console.groupEnd();
                    J$.susp_num++;
                }
            }
            return val;
            //return result_c;
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
        }
    };
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