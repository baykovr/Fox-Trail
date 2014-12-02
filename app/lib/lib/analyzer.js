
console.log('analyzer loaded');

if(window.J$){

} else {
    window.J$ = {};
}

function setShadow(obj, sValue){
    if(obj && typeof obj != 'number'){
        obj['J$-shadow'] = sValue;
    }
}

function getShadow(obj){
    if(obj && typeof obj != 'number'){
        return obj['J$-shadow'];
    } else {
        return undefined;
    }
}

try{
    window.J$.analyzer = {
        // F: function call
        // function called before F
        // modify retFunction will modify the concret return value
        pre_F: function(iid, f, isConstructor) {
            
        },
        // F: function call
        // function called after F
        // modify retFunction will modify the concret return value
        post_F: function(iid, f, isConstructor, retFunction) {
            
        },
        // M: method call
        // function called before M
        pre_M: function(iid, base, offset, isConstructor) {

        },
        // M: method call
        // function called after M
        // modify retFunction will modify the concret return value
        post_M: function(iid, base, offset, isConstructor, retFunction) {
            
        },
        Fe: function(iid, val, dis) {
            
            //returnVal = undefined;
        },
        Fr: function(iid) {
            
        },
        Rt: function(iid, val) {
            //return returnVal = val;
        },
        Ra: function() {
            //var ret = returnVal;
            //returnVal = undefined;
            //return ret;
        },
        Se: function(iid,val) {
            
        },
        Sr: function(iid) {
            
        },
        I: function(val) {
            //return val;
        },
        T: function(iid, val, type) {
            

            //return val;
        },
        H: function(iid, val) {
            
            //return val;
        },
        // R: read
        // function called before R
        // val is the read value
        pre_R: function(iid, name, val) {
            //console.log('typeof name: ' + typeof name + ' | typeof val' + typeof val);
        },
        // R: read
        // function called after R
        // val is the read value
        // return value will be the new read value
        post_R: function(iid, name, val) {
            return val;
        },
        // W: write
        // function called before W
        // val is the value to write
        pre_W: function(iid, name, val, lhs) {
            
            //return val;
        },
        // W: write
        // function called after W
        // val is the value to write
        // return value will be the new written value
        post_W: function(iid, name, val, lhs) {

            return val;
        },
        N: function(iid, name, val, isArgumentSync) {
            
            //return val;
        },
        A: function(iid,base,offset,op) {
            
        },
        // G: get field
        // function called before G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        pre_G: function(iid, base, offset, norr) {

        },
        // G: get field
        // function called after G
        // base is the object from which the field will get
        // offset is either a number or a string indexing the field to get
        // val is the value gets from base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_G: function(iid, base, offset, val, norr) {

            return val;
        },
        // P: put field
        // function called before P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        pre_P: function(iid, base, offset, val) {
            
            //return val;
        },
        // P: put field
        // function called after P
        // base is the object to which the field will put
        // offset is either a number or a string indexing the field to get
        // val is the value puts to base.[offset]
        // return value will affect the retrieved value in the instrumented code
        post_P: function(iid, base, offset, val) {
            
            return val;
        },
        B: function(iid, op, left, right) {
            //return result_c;
        },
        U: function(iid, op, left) {
            
            //return result_c;
        },
        C1: function(iid, left) {
            //var left_c;
            //return left_c;
        },
        C2: function(iid, left) {
            //var left_c, ret;
            //return left_c;
        },
        C: function(iid, left) {
            //var left_c, ret;
            //return left_c;
        }
    };
}catch(e){
    console.log(e);
}