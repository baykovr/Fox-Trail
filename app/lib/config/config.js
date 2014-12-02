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

const {Cc, Ci} = require("chrome");
var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
prefs.setBoolPref("browser.cache.disk.enable", false);
prefs.setBoolPref("browser.cache.disk.smart_size.enabled", false);
prefs.setBoolPref("browser.cache.disk_cache_ssl", false);
prefs.setBoolPref("browser.cache.memory.enable", false);
prefs.setBoolPref("browser.cache.offline.enable", false);
prefs.setBoolPref("network.http.use-cache", false);
prefs.setBoolPref("privacy.clearOnShutdown.cache", false);
prefs.setBoolPref("privacy.cpd.cache", false);
prefs.setBoolPref("services.sync.prefs.sync.privacy.clearOnShutdown.cache", false);



// The maximum number of seconds that scripts running in chrome are allowed to run before being timed out.
// here it has been set to one week XD
prefs.setIntPref("dom.max_chrome_script_run_time", 60*60*24*7);
prefs.setIntPref("dom.max_script_run_time", 60*60*24*7);
prefs.setIntPref("devtools.hud.loglimit.console", 1000000);
prefs.setBoolPref("javascript.options.strict", false);


var HashUtils = require('utils/HashUtils.js');

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) { // for node.js
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {	// for firefox extension
        factory(exports);
    } else {
        factory((root.config = {}));	// for others
    }
}(this, function (exports) {

	//////////////////////////////////////////////////////////// start configuration ////////////////////////////////////////////////////////////
	var ext_config = 
	{
	//addon_base_dir: '/home/jacksongl/JacksonGL_Ubuntu_Workspace/Codebase/Jalangi_FF_extension/Firefox Extension/Firefox_Addon_SDK/addon-sdk-1.14/Jalangi_FF/',
	addon_base_dir: '/home/baykovr/Git/fox-trace/app/lib/',
	
	InputManagerUrl: 'https://raw.githubusercontent.com/JacksonGL/Jalangi_ref/master/InputManager.js',
		analysisUrl: 'https://raw.githubusercontent.com/baykovr/fox-trace/master/app/lib/lib/analysis.js',
					//'https://raw.githubusercontent.com/JacksonGL/Jalangi_ref/master/analysis.js',
		analyzerUrl: 'https://raw.githubusercontent.com/JacksonGL/Jalangi_ref/master/analyzer.js',
							//'https://raw.github.com/JacksonGL/Jalangi_ref/master/analysis2.js';
						  //'https://raw.github.com/SRA-SiliconValley/jalangi/master/src/js/analysis.js';
		filter_list: ['http://www.google-analytics.com/ga.js', 'http://www.googletagservices.com/tag/js/gpt.js']
	};

	ext_config.tmp_js_code_dir = ext_config.addon_base_dir + 'data/fetched_code_snippets/';
	ext_config.analyzer_local_file_name = ext_config.addon_base_dir + 'lib/frontend/analyzer.js';

	ext_config.filter_list.push(ext_config.analysisUrl);
	ext_config.filter_list.push(ext_config.InputManagerUrl);
	ext_config.filter_list.push(ext_config.analyzerUrl);
	
	ext_config.transform_signature = '/*[J$ Transformed]*/';

	ext_config.events_to_listen = new HashUtils.HashSet();

	//all possible javascript events (not sure if this is complete)
	var events = ['oncopy',
				'oncut',
				'onpaste',
				'onabort',
				'oncanplay',
				'oncanplaythrough',
				'onchange',
				'onclick',
				'oncontextmenu',
				'ondblclick',
				'ondrag',
				'ondragend',
				'ondragenter',
				'ondragleave',
				'ondragover',
				'ondragstart',
				'ondrop',
				'ondurationchange',
				'onemptied',
				'onended',
				'oninput',
				'oninvalid',
				'onkeydown',
				'onkeypress',
				'onkeyup',
				'onloadeddata',
				'onloadedmetadata',
				'onloadstart',
				'onmousedown',
				'onmousemove',
				'onmouseout',
				'onmouseover',
				'onmouseup',
				'onpause',
				'onplay',
				'onplaying',
				'onprogress',
				'onratechange',
				'onreset',
				'onseeked',
				'onseeking',
				'onselect',
				'onshow',
				'onstalled',
				'onsubmit',
				'onsuspend',
				'ontimeupdate',
				'onvolumechange',
				'onwaiting',
				'onmozfullscreenchange',
				'onmozfullscreenerror',
				'onmozpointerlockchange',
				'onmozpointerlockerror',
				'onblur',
				'onerror',
				'onfocus',
				'onload',
				'onscroll',
				'onmouseenter',
				'onmouseleave',
				'onwheel'];

	ext_config.events_to_listen.addAll(events);
	//for(var i=0;i<events.length;i++){
	//	ext_config.events_to_listen.add(events[i]);
	//}

	ext_config.instrumentCodeLengthLimit = 500*1000;
	ext_config.is_remove_use_strict = true;
	ext_config.isHandleWebWorker = true;
	ext_config.handWebWorkerCode = "\r\n try{ if( ((typeof window) == 'undefined') && ((typeof self) != 'undefined') && ((typeof importScripts) != 'undefined') && ((typeof J$) == 'undefined') ){ importScripts('" + ext_config.analysisUrl + "'); \r\n importScripts('" + ext_config.InputManagerUrl + "');} \r\n }catch(e){throw e;} \r\n"

	ext_config.isExtensionEvn = true;
    ext_config.isNodeJsEvn = false;
    ext_config.isBrowserJsEvn = false;
    ext_config.isInstrumentCodeForReplay = false;	// switch on/off the file saving for record/replay
    ext_config.recordFileTraceFolder = ext_config.addon_base_dir + 'data/record/';

    ext_config.isSaveInstrumentedPageAndFiles = false;	// a file saving mechanism at the early development stage


	// -- Wow, why are these hardcoded paths? --robert.
    ext_config.nodejs_analysis_js_path = 
    '/home/baykovr/Git/fox-trace/app/lib/lib/analysis.js';
    ext_config.nodejs_inputmanager_js_path = 
    '/home/baykovr/Git/fox-trace/app/lib/lib/InputManager.js';
    ext_config.nodejs_esnstrument_js_path = 
    '/home/baykovr/Git/fox-trace/app/lib/jalangi/instrument/esnstrument.js';

	//////////////////////////////////////////////////////////// end configuration ////////////////////////////////////////////////////////////

	exports.ext_config = ext_config;
}));
