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

exports.resolve = function(__dirname, file_path) {
		//console.log('------------' + __dirname + " + " + file_path + "resolve -> ");
		var tmp_path = __dirname + '/' + file_path;
		var arr = tmp_path.split('/');
		var new_arr = [];
		var skip = 0;
		for (var i=arr.length-1;i>=0;i--){
			if(arr[i]=='..'){
				skip++;
			} else if(arr[i]== '.' || arr[i] == ''){
				//do nothing
			} else if(skip>0){
				skip--;
			} else {
				new_arr.unshift(arr[i]);
			}
		}

		//linux
		var result = "";
		while(new_arr.length>0){
			result = result + "/" + new_arr.shift();
		}
		//console.log(result);

		return result;
	};


	//	path.basename('/foo/bar/baz/asdf/quux.html')
	// returns
	//'quux.html'

	//path.basename('/foo/bar/baz/asdf/quux.html', '.html')
	// returns
	//'quux'
exports.basename = function (filename, suffix) {
		var ret;
		try{
			var arr = filename.split('/');
			ret = arr[arr.length-1];
			if(typeof suffix == 'string') {
				var lastIndex = ret.lastIndexOf(suffix);
				if(lastIndex >= 0){
					if(lastIndex + suffix.length == ret.length){
						ret = ret.substring(0, lastIndex);
					}
				}
			}
		} catch (e) {
			console.log(e);
			console.log(e.stack);
			return undefined;
		}

		return ret;
	};

/*
	path.join([path1], [path2], [...])#
	Join all arguments together and normalize the resulting path.
	Arguments must be strings. In v0.8, non-string arguments were silently ignored. In v0.10 and up, an exception is thrown.
	Example:
	path.join('/foo', 'bar', 'baz/asdf', 'quux', '..')
	// returns
	'/foo/bar/baz/asdf'
	path.join('foo', {}, 'bar')
	// throws exception
	TypeError: Arguments to path.join must be strings
*/
exports.join = function () {
	var result = '';
	for(var i=0;i<arguments.length;i++){
		if(typeof arguments[i] !== 'string'){
			throw new Error('TypeError: Arguments to path.join must be strings.');
		}

		result = exports.resolve(result, arguments[i]);
	}
	return result;
}