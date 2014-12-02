/*
 * Copyright 2013 University of California, Berkeley.
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

// Author: Liang Gong

try{

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) { // for node.js
        exports = require(fs);
    } else if (typeof exports !== 'undefined') {	// for firefox extension
        factory(exports);
    } else {
    	throw new Error('utils/fs.js only support Firefox Extension and Node.js now.');
        // factory((root.fs = {}));	// for others
    }
}(this, function (exports) {

	const { Cu } = require("chrome");
	Cu.import("resource://gre/modules/FileUtils.jsm");

	// now just ignore the modeFlag
	exports.openSync = function (filename, modeFlag) {
		var file = new FileUtils.File(filename);
        var stream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE);
        //stream.write('test','test'.length);
        return stream;
	};

	exports.writeSync = function (stream, data) {
        stream.write(data, data.length);
	};

	exports.closeSync = function (stream){
		stream.close();
	}

	exports.readFileSync = function(filename, encoding) {
		if (encoding && encoding != 'UTF-8' && encoding != 'utf8') {
			throw new Error('utils/fs writeFileSync does not support encoding: ' + encoding);
		}
		
		var data = "";
        var file = new FileUtils.File(filename);
        var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
            createInstance(Ci.nsIFileInputStream);
        var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
            createInstance(Ci.nsIConverterInputStream);
        fstream.init(file, -1, 0, 0);
        cstream.init(fstream, FileEncoding.NodeJsToFFExt(encoding), 0, 0); // you can use another encoding here if you wish

        let (str = {}) {
            let read = 0;
            do {
                read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
                data += str.value;
            } while (read != 0);
        }
        cstream.close(); // this closes fstream
        return data;
	};

	// for now just ignore the encoding...
	exports.writeFileSync = function (filename, data, encoding) {
		if (encoding && encoding != 'UTF-8' && encoding != 'utf8') {
			throw new Error('utils/fs writeFileSync does not support encoding: ' + encoding);
		}

		var file = new FileUtils.File(filename);
        var stream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE);
        stream.write(data, data.length);
        stream.close();
	};

	// for now just ignore the encoding...
	exports.appendFileSync = function (filename, data, encoding) {
		if (encoding && encoding != 'UTF-8' && encoding != 'utf8') {
			throw new Error('utils/fs writeFileSync does not support encoding: ' + encoding);
		}

		var file = new FileUtils.File(filename);
        var stream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_APPEND);
        stream.write(data, data.length);
        stream.close();
	};
	

	var FileEncoding = {
		NodeJsToFFExt: function (encoding) {
			switch(encoding) {
				case 'utf8': 
					return 'UTF-8';
				default: 
					return encoding;
			}

			return encoding;
		}
	}

}));

}catch(e) {
	console.log(e);
	console.log(e.stack);
}