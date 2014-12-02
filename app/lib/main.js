/*
 * Texas A&M University
 * Department of Computer Science & Engineering
 * SUCCESS Lab
 * Robert A. Baykov 2014
 *
 */

// --- Debug
var VERBATIM_TRANSFORM = false;
var VERBATIM_HTML = false;
var VERBATIM_INST = false;
var VERBATIM_DOM = false;
var VERBATIM_LOG = false;
var VERBATIM = false;
var ENABLED  = false;


var { ToggleButton } = require('sdk/ui/button/toggle');

// IO
var io = require('ftrace/ftrace.io.js');

// --- Classes
var current_site;
var current_page;

var site_map = []


function Site(name)
{
    this.name = name;
    this.pages = [];
}
function Page(name)
{
	this.name = name;
    this.js_libs = [];
}
function site_to_string()
{
    //Print Sites
    for (var i = 0; i < site_map.length; i++) 
    {
        console.log('Site '+site_map[i].name);

        //Print Pages
        for (var j = 0; j < site_map[i].pages.length; j++) 
        {
            console.log('Page '+site_map[i].pages[j].name);
            console.log('lib: '+site_map[i].pages[j].js_libs.toString());
            console.log('count: '+site_map[i].pages[j].js_libs.length);
            // Print Page external js
            // for (var k = 0; k < site_map[i].pages.js_libs.length; k++)
            // {
                
            // }
        }
    }
}
function add_js_lib(lib_url)
{
    // Add a lib to the current site : page
    current_page.js_libs.push(lib_url);
}
function add_site(name)
{
    for (var i = 0; i < site_map.length; i++) 
    {
        if(site_map[i].name == name)
        {
            //match
            return;
        }
    }
    // No match, add
    site_map.push( new Site(name) );
}
function add_page(name,page)
{

    for (var i = 0; i < site_map.length; i++) 
    {
        if(site_map[i].name == name)
        {
            site_map[i].pages.push( new Page(page) );

            current_site = site_map[i];
            current_page = current_site.pages[ current_site.pages.length-1 ];
        }
    }
}

// --- URL Processor Listener
function logURL(type,url) 
{
    if(type == 'site')
    {
        // Site Visit
        var parser = windowUtil.getFocusedWindow().content.document.createElement('a');
        parser.href = url;
        
        if(VERBATIM_LOG){
        console.log("[....] "+url);
        console.log("[....] "+parser.hostname);
        console.log("[....] "+parser.pathname);
        }
        current_site = parser.hostname;
        current_page = parser.pathname;

        add_site(parser.hostname);
        if(parser.pathname != 'undefined')
        {
            add_page(parser.hostname,parser.pathname);
        }
    }
    else if (type == 'javascript')
    {
        add_js_lib(url);
    }
    else
    {
        throw "[err] [logURL] unknown type "+type;
    }
}


// --- Jalangi --- //
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
 * 
 * Modifcations : Robert A. Baykov 2014
 */

var Request = require("sdk/request").Request;
var esnstrument = require('jalangi/instrument/esnstrument.js').esnstrument;
var ext_config = require('config/config.js').ext_config;


const { Cu, Ci, Cc, Cr } = require("chrome");

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

var {ChromeWorker} = Cu.import("resource://gre/modules/Services.jsm", null);
var simpleStorage = require("sdk/simple-storage");

// - assign a unique ID to each web worker,
// - so that the IID generated can be distinguished.
var webworker_id = 0;

var windowUtil = require('sdk/window/utils');

// - windowUtil.activeBrowserWindow;
var window  =  windowUtil.getFocusedWindow();

var Request = require("sdk/request").Request;
var esnstrument = require('jalangi/instrument/esnstrument.js').esnstrument;
var ext_config = require('config/config.js').ext_config;

function check_filter_list(url){
    for(var i=0;i<ext_config.filter_list.length;i++){
        if(ext_config.filter_list[i] === url){
            return true;
        }
    }
    return false;
}

// Start UI---------------------------------------------------------------------
var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");
var self = require("sdk/self");

// DumpLog Button Dumps the Current Log to console

var ft_log_button = buttons.ActionButton({
 id: "ft_log_button",
  label: "Fox-Trail-Log",
  icon: {
    "16": "./monitor.png",
    "32": "./monitor.png",
    "64": "./monitor.png"
  },
  onClick: dumplog
});
function dumplog(state) {
    console.log('Begin - Log');
    
    site_to_string();
}

// Main Fox-Trace button, holds Jalangi's code instrumentation section.
var ft_button = ToggleButton({
  id: "ft-button",
  label: "Fox-Trail",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onChange: handleChange
});

function updateWindow()
{
    window = windowUtil.getFocusedWindow();
}

// UI added for inputting analysis module for loading web page phase
var extension_data = require("sdk/self").data;

// Construct a panel, loading its content from the "text-entry.html"
// file in the "data" directory, and loading the "get-text.js" script into it.
var pannel_txt_entry = require("sdk/panel").Panel({
  width: windowUtil.getFocusedWindow().innerWidth*0.8,
  height: windowUtil.getFocusedWindow().innerHeight*0.8,
  contentURL: extension_data.url("analysis_code_input.html"),
  contentScriptFile: extension_data.url("analysis_code_input.js")
});
// Pannel on click binds to 
function handleChange(state) {
  if (state.checked) {
    pannel_txt_entry.show({
      position: ft_button
    });
  }
}
function handleHide() {
  ft_button.state('window', {checked: false});
}

// When the panel is displayed it generated an event called
// "show": we will listen for that event and when it happens,
// send our own "show" event to the panel's script, so the
// script can prepare the panel for display.
pannel_txt_entry.on("show", function() {
  pannel_txt_entry.port.emit("show");
});

// Listen for messages called "text-entered" coming from
// the content script. The message payload is the text the user
// entered.
// In this implementation we'll just log the text to the console.
pannel_txt_entry.port.on("text-entered", function (text) {
  // record and load the analysis module
  
  simpleStorage.storage.analysisCode = text;
  //console.log("Got : "+simpleStorage.storage.analysisCode);
  //pannel_txt_entry.hide();
});

// End UI ----------------------------------------------------------------------

// + currently jalangi does nothing with this.
// - it seems like when httpChannel.getRequestHeader("Accept") == '*/*'
// - the requested content is javascript
var httpRequestObserver = {
    observe: function(aSubject, aTopic, aData) {
        try{
            //var url = aSubject.QueryInterface(Ci.nsIHttpChannel).originalURI.spec;
            //var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
            //httpChannel.getRequestHeader("Accept");
            //var content = httpChannel.getRequestHeader("Content-Type");
            //console.log(content + ' ************ browser requesting resource: ' + url);
        }catch(e){
            console.log('[....] [!] [httpRequestObserver]' + e);
        }
    }
};

// - intercept http request's response
// - Called after a response has been received from the web server.
// - Headers are available on the channel.
// - The response can be accessed and modified via nsITraceableChannel.
var httpResponseObserver = {
    observe: function(aSubject, aTopic, aData) {
        try{
            var url = aSubject.QueryInterface(Ci.nsIHttpChannel).originalURI.spec;
            var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
            try{
                var content = httpChannel.getResponseHeader("Content-Type");
            } catch(e)
            {
                console.log('[httpResponseObserver]: for aSubject: ' + aSubject + ' | aTopic: ' + aTopic + ', httpChannel.getResponseHeader failure | url: ' + url);
                return ;
            }

            //here this function may be called twice, one with response status code '200' and another with response status code '302'
            if ('http-on-examine-response' == aTopic && aSubject.responseStatus == '200') {
                if (content.indexOf('text/html') >= 0)
                {
                    if(check_filter_list(url) == false)
                    {
                        if(VERBATIM){
                        console.log('[!] [intercepting web page]: ' + url);
                        }
                        // Log to session
                        logURL('site',url);

                        var newListener = new HTMLListener();
                        aSubject.QueryInterface(Ci.nsITraceableChannel);
                        newListener.originalListener = aSubject.setNewListener(newListener);
                    }
                } else if (content.indexOf('javascript') >= 0) 
                {
                    if(url == ext_config.analyzerUrl)
                    { //intercepting the requrest to analyzer.js
                        console.log('[loading local ' + content + ']: ' + url);
                        var newListener = new ScriptListener();
                        aSubject.QueryInterface(Ci.nsITraceableChannel);
                        newListener.originalListener = aSubject.setNewListener(newListener);
                    }
                    else if(check_filter_list(url) == false)
                    {
                        if(VERBATIM){
                        console.log('[!] [intercepting javascript]: ' + url);
                        }
                        // These are always going to be external libs
                        // ironically (or not) jalangi does not handle them presently
                        // Log to session
                        logURL('javascript',url);
                        //
                        if(ENABLED)
                        {
                            var newListener = new ScriptListener();
                            aSubject.QueryInterface(Ci.nsITraceableChannel);
                            var oldListener = aSubject.setNewListener(newListener);
                            newListener.originalListener = oldListener;
                        }
                    }
                } else if (content.indexOf('text/plain') >= 0 && url.endsWith('.js'))
                {
                    if(VERBATIM_HTML)
                    {
                        console.log('[intercepting ' + content + ']: ' + url);
                    }

                    var newListener = new ScriptListener();
                    aSubject.QueryInterface(Ci.nsITraceableChannel);
                    newListener.originalListener = aSubject.setNewListener(newListener);
                } else {
                    if(content.indexOf('text/css')<0 && content.indexOf('image')<0)
                    {
                        // ignore css
                        if(VERBATIM){
                            console.log('[unintercept]: ' + content + ' ***** ' + url);
                        }
                    }
                }
            } else {
                console.log(aTopic + ' | status: ' + aSubject.responseStatus + ' : ' + url);
            }
        }catch(e){
        	console.log('[....] [!] [httpResponseObserver]' + e);
        }
    }
};

// configuration of the observer:
var mutationObserverConfig = { attributes: true, childList: true, characterData: true }
var mutationObserver       = null;

// Monitors changes in the DOM ie what js is doing to modify the DOM structure.
function createNewMutationObserver(doc) {
    mutationObserver = new windowUtil.getFocusedWindow().content.MutationObserver(function(mutations) {
        try{
            if(VERBATIM_DOM)
            {
                console.log('[DOM] mutation observed');
            }
            mutations.forEach(function(mutation) {
                try{
                    // each mutation here is a mutation record, for more details, refer to https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#MutationRecord
                    //console.log('[Dom Mutation]: ' + mutation.type);
                    if (mutation.type == 'attributes') { // if it was an attribute mutation
                    } else if (mutation.type == 'characterData') { // characterData if it was a mutation to a CharacterData node.
                    } else if (mutation.type == 'childList') { // childList if it was a mutation to the tree of nodes

                        // the following code make sure that analysis.js and InputManager.js will not be moved or removed by target code
                        var head = doc.getElementsByTagName('head')[0];

                        if (mutation.target == head) {
                            var headChild = head.childNodes;

                            // remove all text node as it might cause confusion and complicate the following operation
                            for(var i=headChild.length-1;i>=0;i--){
                                if(headChild[i].toString() == '[object XrayWrapper [object Text]]'){
                                    head.removeChild(headChild[i]);
                                }
                            }

                            if(headChild.length == 0){
                                var script_tag = doc.createElement('script');
                                script_tag.setAttribute('type', 'text/javascript');
                                script_tag.setAttribute('src', ext_config.analysisUrl);
                                head.insertBefore(script_tag, head.firstChild);
                            }

                            if(headChild.length == 1){
                                var script_tag = doc.createElement('script');
                                script_tag.setAttribute('type', 'text/javascript');
                                script_tag.setAttribute('src', ext_config.analysisUrl);
                                head.appendChild(script_tag);
                            }

                            if (!headChild[0].src || headChild[0].src != ext_config.analysisUrl){
                                var script_tag = doc.createElement('script');
                                script_tag.setAttribute('type', 'text/javascript');
                                script_tag.setAttribute('src', ext_config.analysisUrl);
                                head.insertBefore(script_tag, head.firstChild);

                                for(var i=headChild.length-1;i>=0;i--){
                                    if(i!=0)
                                    if(headChild[i].src && headChild[i].src == ext_config.analysisUrl){
                                        head.removeChild(headChild[i]);
                                    }
                                }
                            }

                            if (!headChild[1].src || headChild[1].src != ext_config.InputManagerUrl){
                                var script_tag = doc.createElement('script');
                                script_tag.setAttribute('type', 'text/javascript');
                                script_tag.setAttribute('src', ext_config.InputManagerUrl);
                                head.insertBefore(script_tag, headChild[1]);

                                for(var i=headChild.length-1;i>=0;i--){
                                    if(i!=1)
                                    if(headChild[i].src && headChild[i].src == ext_config.InputManagerUrl){
                                        head.removeChild(headChild[i]);
                                    }
                                }
                            }
                        }

                        // the following code observe any newly added code and transfrom any newly added js
                        if (mutation.addedNodes){ // if the mutation is adding some nodes
                            // then for each of those nodes, transform all scripts contained.
                            for (var i=0, len = mutation.addedNodes.length; i < len; i++) {
                                // for each added nodes, also observe them with
                                mutationObserver.observe(mutation.addedNodes[i], mutationObserverConfig);

                                // here we assume that the added tag does not contain instrumented code
                                // need double check ...
                                intercepter.transformHandler(mutation.addedNodes[i]);

                                // if a <script> tag is added
                                if (mutation.addedNodes[i].tagName && mutation.addedNodes[i].tagName.toLowerCase() == 'script'){
                                    // if the <script> contains embedded js code
                                    if (mutation.addedNodes[i].innerHTML && mutation.addedNodes[i].innerHTML.trim() != ''){
                                        mutation.addedNodes[i].innerHTML = intercepter.transformEmbeddedScript(mutation.addedNodes[i].innerHTML, 'mutation-embedded');
                                    }

                                    // other wise the <script> points to external js code, which will be handled by the http intercepter
                                    // or maybe load the code in the cache? need double check ...
                                }
                            }
                        }
                    } else {
                        console.log('[Notice]: unhandled mutation type: ' + mutation.type);
                    }
                }catch(e){
                    console.log('!!!!!!!!!!!!!!!' + e);
                    console.log(e.stack);
                }
            });
        }catch(e){
            console.log('!!!!!!!!!!!!!!!' + e);
            console.log(e.stack);
        }
    });

}
// DOM Modificiation observer
var documentObserver = {
    observe: function(aSubject, aTopic, aData) {
        try{
        	if (aSubject.toString() == '[object XrayWrapper [object HTMLDocument]]' && aSubject === windowUtil.getFocusedWindow().content.document){
                if(VERBATIM_DOM){
        		console.log('[Dom Observered]: ' + aSubject + ' | aTopic: ' + aTopic);
        		}
                // observe everything in the document
				var all = aSubject.getElementsByTagName("*");

		        for (var i=0, max=all.length; i < max; i++) {
		        	//console.log('!!!!!!!!!!!!' + all[i]);
		            //here aSubject is the document.
		            // create an observer instance
		            try{
						// pass in the target node, as well as the observer options
		            	mutationObserver.observe(all[i], mutationObserverConfig);
		        	}catch(e)
                    {
                        if(VERBATIM_DOM)
                        {
                            console.log('[DOM] New Mutation Observer');
                        }
		        		createNewMutationObserver(aSubject);
		        		mutationObserver.observe(all[i], mutationObserverConfig);
		        	}
		        }

        	} else {
                if(VERBATIM_DOM){
        		console.log('[DOM] Unobservered: ' + aSubject + ' | aTopic: ' + aTopic);
                }
        	}
        }catch(e){
            console.log('[err] in document observer ' + e);
            console.log(e.stack);
        }
    }
}

//intercept http request
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

observerService.addObserver(httpRequestObserver, "http-on-modify-request", false);
observerService.addObserver(httpResponseObserver, "http-on-examine-response", false);
//intercept document events
observerService.addObserver(documentObserver, "document-element-inserted", false);


//------------------------------------------------ HTMLListener (start) ------------------------------------------------

// Helper function for XPCOM instanciation (from Firebug)
function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

// Copy response listener implementation.
function HTMLListener() {
    this.originalListener = null;
    this.storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
    this.receivedData = "";   // array for incoming data.
    //this.storageStream.init(1024*1024*4, 1024*1024*4, null); //4MB storage
    this.totalBytesReceived = 0;
}

HTMLListener.prototype = {
    onDataAvailable: function(request, context, inputStream, offset, count) {
        try{
            //console.log('offset: ' + offset + ' | ' + 'count: ' + count);
            //buffer the content
            var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream");
            binaryInputStream.setInputStream(inputStream);
            // Copy received data as they come.
            var data = binaryInputStream.readBytes(count);
            //var encoding = request.getResponseHeader('Content-Encoding');
            //console.log('encoding: ' + encoding);
            //var data = NetUtil.readInputStreamToString(inputStream, count, {charset: encoding});
            this.receivedData += data;
            //console.log(data);
            this.totalBytesReceived += count;
        }catch(e){console.log('!!!!!!!!!' + e);}
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function(request, context, statusCode) {
        try{
            // Get entire response
            var data = this.receivedData;
            try{
                data = intercepter.transformHTML(data);
            }catch(e){
                console.log('!!!!!!!!!!!!' + e);
                console.log(e.stack);
            }
            if(VERBATIM_HTML){
            console.log('[HTML] transformed: ' + request.name);
            }
            //dispatch the transformed content into the next chain element
            var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
            //var binaryinputStream = CCIN("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream");
            inputStream.setData(data, data.length);
            //binaryinputStream.setInputStream(inputStream);
            //be careful: data.length != this.totalBytesReceived here as the code has been transformed!
            this.originalListener.onDataAvailable(request, context, inputStream, 0, data.length);
            this.originalListener.onStopRequest(request, context, statusCode);
        }catch(e){console.log('!!!!!!!!!!!' + e); console.log(e.stack);}
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Cr.NS_NOINTERFACE;
    }
}
//------------------------------------------------ HTMLListener (end) ------------------------------------------------

//------------------------------------------------ ScriptListener (start) ------------------------------------------------

// Copy response listener implementation.
function ScriptListener() {
    this.originalListener = null;
    this.storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
    this.receivedData = "";   // array for incoming data.
    //this.storageStream.init(1024*1024*4, 1024*1024*4, null); //4MB storage
    this.totalBytesReceived = 0;
    this.isLoadingLocal = false;
    this.localFileName = null;
}



ScriptListener.prototype = {
    onDataAvailable: function(request, context, inputStream, offset, count)
    {
        try{
            if(this.isLoadingLocal == true){

            } else {
                //console.log('offset: ' + offset + ' | ' + 'count: ' + count);
                //buffer the content
                var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream");
                //var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1", "nsIBinaryOutputStream");
                binaryInputStream.setInputStream(inputStream);
                //binaryOutputStream.setOutputStream(this.storageStream.getOutputStream(this.totalBytesReceived));
                // Copy received data as they come.
                var data = binaryInputStream.readBytes(count);
                this.receivedData += data;
                this.totalBytesReceived += count;
                //var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                //inputStream.setData('', 0);
                //this.originalListener.onDataAvailable(request, context, inputStream, 0, ''.length);
            }
        }catch(e){console.log('[err] script listener' + e);}
    },

    onStartRequest: function(request, context) {
        if(request.name == ext_config.analyzerUrl){
            this.isLoadingLocal = true;
            this.localFileName = ext_config.analyzer_local_file_name;
        }
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function(request, context, statusCode)
    {
        var data = null;
        if(this.isLoadingLocal == true){
            try{
                data = intercepter.sync_reading_file(this.localFileName);
            } catch(e) {
                console.log('!!!!!!!!!!!' + e);
            } finally {
                this.originalListener.onStopRequest(request, context, statusCode);
            }
        } else 
        {
            // Get entire response
            data = this.receivedData;
            if(VERBATIM){
            console.log('outsourcing transformation to webworkers');
            }
            webworker_id++;
            var sendObj = {code: data, name: request.name, workerId: webworker_id};
            var myWorker = new ChromeWorker(self.data.url("TransformWorker.js"));
            var listener = this.originalListener;
            myWorker.addEventListener("message", function (oEvent) {
                var receiveObj = null;
                try{
                    receiveObj = JSON.parse(oEvent.data);
                    if(receiveObj.exception){
                        console.log(receiveObj.exception);
                        myWorker.postMessage({cmd: 'terminate'});  // terminate the web worker
                    } else if (receiveObj.code){
                        if(VERBATIM){
                        console.log('outsourcing transformed code received');
                        }
                        var inst_code = receiveObj.code;

                        // This whole section fails to inject (me thinks)
                        if(request.name === ext_config.analysisUrl) 
                        {

                            //console.log('appending (editor) analsis module to analysis_module.js');
                            
                            

                            var analysis_module_code = self.data.load("analysis_module.js");

                            inst_code += "\n\n\n\n" + analysis_module_code;

                            // Instrumentation Code Injection
                            // From the editor 
                            // if(simpleStorage.storage.analysisCode)
                            // {
                            //     inst_code += "\n\n\n\n" + simpleStorage.storage.analysisCode
                            // }
                        }

                        var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                        inputStream.setData(inst_code, inst_code.length);

                        //be careful: data.length != this.totalBytesReceived here as the code has been transformed!
                        listener.onDataAvailable(request, context, inputStream, 0, inst_code.length);
                        listener.onStopRequest(request, context, statusCode);
                        myWorker.postMessage({cmd: 'terminate'});  // terminate the web worker
                    } 
                    else 
                    {
                        if(VERBATIM)
                        {
                            console.log('[webworker]: ' + receiveObj);
                        }
                    }
                }catch(e) {
                    if(VERBATIM)
                    {
                    console.log('[webworker]: ' + oEvent.data);
                    }
                }

            }, false);
            myWorker.postMessage(JSON.stringify(sendObj));
        }
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Cr.NS_NOINTERFACE;
    }
}


// Js Replacer
function replaceAll (str, character,replaceChar)
{
        var word = str.valueOf();

        while(word.indexOf(character) != -1) {
            console.log('[instrument]: replace ' + character + ' with ' + replaceChar);
            word = word.replace(character,replaceChar);
        }
        return word;
    }
//------------------------------------------------ ScriptListener (end) ------------------------------------------------


// web page interception part (end)

// intercepter (start)  // requires the code editor
var intercepter = {
    transformHTML: function (htmlCode) {
        if(VERBATIM_HTML){
        console.log('start transforming the web page');
        }
        //parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
        //doc = parser.parseFromString(htmlCode, "text/html");

        var doc = window.document.implementation.createHTMLDocument("name");
        doc.documentElement.innerHTML = htmlCode;

        // returns a HTMLDocument, which also is a Document.
        var jsCodeSnippets = []; //clear the buffer
        //first of all, instrument all embeded script code
        try{
            var scripts = doc.getElementsByTagName("script");
            for(var i=0;i<scripts.length;i++){
                scripts[i].removeAttribute('async');
                //try to extract between <script> </script>
                var innerHTML = scripts[i].innerHTML;
                if(typeof innerHTML == 'string'){
                    innerHTML = innerHTML.trim();
                    if(innerHTML != "")
                    {
                        var snippet = {type: "script_tag", url: null, code: scripts[i].innerHTML};
                        snippet.sourceTag = scripts[i];
                        jsCodeSnippets.push(snippet);
                    }
                }
            }

        }catch(e){
            console.log(e);
            console.log(e.stack);
        }

        //do instrumentation
        if(VERBATIM){
        console.log('clearing previous fetched code...');
        }
        //this.clear_dir(ext_config.tmp_js_code_dir);


        //locate all imported javascript files
        for(var i=0;i<jsCodeSnippets.length;i++){
            try{
                jsCodeSnippets[i].inst_code = this.transformEmbeddedScript(jsCodeSnippets[i].code, 'embedded');
            } catch (e) {
                jsCodeSnippets[i].exception = e;
            }
        }

        //first add the following tags into the code
        //<script src="../../../src/js/analysis.js" type="text/javascript"></script>
        var script_tag = doc.createElement('script');
        script_tag.setAttribute('type', 'text/javascript');
        var heads = doc.getElementsByTagName('head');
        //var data = this.sync_reading_file(ext_config.addon_base_dir + 'lib/jalangi/InputManager.js');
        //script_tag.innerHTML = data;
        script_tag.setAttribute('src', ext_config.InputManagerUrl);
        heads[0].insertBefore(script_tag, heads[0].firstChild);
        //now add:
        //<script src="../../../src/js/InputManager.js" type="text/javascript"></script><!---->
        script_tag = doc.createElement('script');
        script_tag.setAttribute('type', 'text/javascript');
        //data = this.sync_reading_file(ext_config.addon_base_dir + 'lib/jalangi/analysis.js');
        //script_tag.innerHTML = data;
        script_tag.setAttribute('src', ext_config.analysisUrl);
        heads[0].insertBefore(script_tag, heads[0].firstChild);
        //now add:
        //<script src="analyzer.js" type="text/javascript"></script><!---->
        script_tag = doc.createElement('script');
        script_tag.setAttribute('type', 'text/javascript');
        //data = this.sync_reading_file(ext_config.addon_base_dir + 'lib/jalangi/analysis.js');
        //script_tag.innerHTML = data;
        script_tag.setAttribute('src', ext_config.analyzerUrl);
        //heads[0].insertBefore(script_tag, heads[0].firstChild);

        //now insert the instrumented code
        for(var i=0;i<jsCodeSnippets.length;i++){
            var snippet = jsCodeSnippets[i];
            if(snippet.exception==undefined && snippet.exception==null) {
                var dom_elem = snippet.sourceTag;
                var inst_code = snippet.inst_code;
                if(snippet.type == 'script_tag') {
                    //console.log('setting inner html');
                    dom_elem.innerHTML = inst_code;
                } else if (snippet.type == 'external') {
                    //console.log("removing src");
                    dom_elem.removeAttribute('src');
                    dom_elem.innerHTML = inst_code;
                }
            }
        }

        //now instrument all possible javascript event handlers in the dom tree
        var all = doc.getElementsByTagName("*");
        for (var i=0, max=all.length; i < max; i++) {
            this.transformHandler(all[i]);
        }

        //change the title
        var titles = doc.getElementsByTagName("title");
        if(titles!=null && titles != undefined && titles.length>0){
            titles[0].innerHTML = '[J$] ' + titles[0].innerHTML;
        }

        if(VERBATIM_INST)
        {
            // INST DONE
            console.log('instrument web page done');
        }

        var final_html_code = doc.documentElement.outerHTML;
        //console.log(final_html_code);
        var html_path = ext_config.tmp_js_code_dir + 'instru_page' + new Date().toString() + '.html';
        if(ext_config.isSaveInstrumentedPageAndFiles) {
            this.sync_writing_file(html_path, final_html_code);
        }

        if(VERBATIM){
        console.log('instrumented webpage written into -> ' + html_path);
        }
        var scripts = doc.getElementsByTagName("script");

        return final_html_code;
    },
    transformHandler: function (tag){
    	var attrs=tag.attributes;
        var isWrappedWithCDATA = false;
    	if(attrs){
    		outter:
	        for (var i=0, l=attrs.length; i<l; i++){
                var prop = attrs[i].name; //get attribute name
                var attr_value = tag.getAttribute(prop);
	            try{
                    if(attr_value && ext_config.events_to_listen.contains(prop)){
                        if(attr_value.indexOf(ext_config.transform_signature)>=0){
                            continue outter;
                        }
                        // some handler contains code: 'javascript: ', remove it
                        attr_value = attr_value.replace('javascript:', '');

                        if(attr_value.indexOf('//<![CDATA[')>=0){ //check if the original code is wrapped with CDATA tag
                            isWrappedWithCDATA = true;
                        }

                        if(VERBATIM_TRANSFORM){
                        console.log('instrumenting handler: ' + (typeof tag) + '.' + prop);
                        }

                        attr_value = esnstrument.instrumentCode(attr_value, true, ' [js event handler] ');
                        attr_value = ext_config.transform_signature + ' ' + attr_value; //add signature
                        attr_value = replaceAll(attr_value, '\"','\\\"');

                        if(isWrappedWithCDATA){ // restore CDATA tag if necessary
                            attr_value = '//<![CDATA[ \n' + attr_value + '\n //]]>';
                        }
                        tag.setAttribute(prop, attr_value);
                        if(VERBATIM){
                        console.log('instrument done');
                        }
                    }
                } catch(e) {
                    console.log('[warning] could not transform : ' + attr_value);
                }
	        }
    	}
    },
    transformEmbeddedScript: function (js_code, code_type) {
    	if (js_code.indexOf(ext_config.transform_signature) >=0 ){
    		return js_code;
    	}

        var isWrappedWithCDATA = false;

        if(this.embed_script_number==undefined){
            this.embed_script_number = 0;
        }
        this.embed_script_number++;

        var data = "";
        if(ext_config.isSaveInstrumentedPageAndFiles) {
            data += code_type + "\r\n -------------------------------------------- \r\n\r\n";
            data += 'no url' + "\r\n -------------------------------------------- \r\n\r\n";
            data += js_code + "\r\n -------------------------------------------- \r\n\r\n";
            this.sync_writing_file(ext_config.tmp_js_code_dir + "snippet_" + this.embed_script_number + ".txt", data);
        }

        var inst_code;
        var stream = null;
        try
        {
            data = "";
            data += code_type + "\r\n -------------------------------------------- \r\n\r\n";
            data += 'no url' + "\r\n -------------------------------------------- \r\n\r\n";

            if(js_code.indexOf('//<![CDATA[') >= 0){ //check if the original code is wrapped with CDATA tag
                isWrappedWithCDATA = true;
            }

            // EMBEDED code interceptio
            if(VERBATIM_INST)
            {
                console.log('start instrumenting embedded code snippet [' + this.embed_script_number + ']: [type: ' + code_type + "]");
            }

            var inst_code = esnstrument.instrumentCode(js_code, true, ' [embedded js script] ');
            inst_code = ext_config.transform_signature + '\r\n' + inst_code; //add signature

            data += inst_code + "\r\n -------------------------------------------- \r\n\r\n";
            if(ext_config.isSaveInstrumentedPageAndFiles) {
                this.sync_writing_file(ext_config.tmp_js_code_dir + "snippet_" + this.embed_script_number + "_jalangi.txt", data);
            }

            if(isWrappedWithCDATA){ // restore CDATA tag if necessary
                inst_code = '//<![CDATA[ \n' + inst_code + '\n //]]>';
            }
            if(VERBATIM){
            console.log('instrument done');
            }
        }
        catch(e)
        {
            console.log('exception of instrumenting and writing:');
            console.log(e);
            if(stream!=null || stream!=undefined){
                stream.close();
                stream = null;
            }
            throw e;
        }
        return inst_code;
    },
    transformExternalScript: function (js_code, url) { // this method is not used now (WHAT --robert)
        if(check_filter_list(url) == true){
            return js_code;
        }

        if (js_code.indexOf(ext_config.transform_signature) >=0 ){
    		return js_code;
    	}

        if(this.ext_script_number==undefined){
            this.ext_script_number = 0;
        }
        this.ext_script_number++;
        if(ext_config.isSaveInstrumentedPageAndFiles) {
            this.sync_writing_file(ext_config.tmp_js_code_dir + "external_snippet_" + this.ext_script_number + ".txt", url + '\r\n----------------------------\r\n' + js_code);
        }
        console.log('start instrumenting code snippet: [type: external, url: ' + url + "]");

        var inst_code = null;
        try
        {
            //EXTERNAL
            inst_code = esnstrument.instrumentCode(js_code, true, url);
            inst_code = 'try{ J$.console.log(\'[ext-js-inst]: ' + url + '\'); } catch(e) { } \r\n' + inst_code;
            inst_code = ext_config.transform_signature + '\r\n' + inst_code; // add signature

            if(ext_config.isHandleWebWorker == true){
                inst_code = ext_config.handWebWorkerCode + inst_code;
            }
            if(ext_config.isSaveInstrumentedPageAndFiles) {
                this.sync_writing_file(ext_config.tmp_js_code_dir + "external_snippet_" + this.ext_script_number + "_jalangi.txt", url + '\r\n----------------------------\r\n' + inst_code);
            }
            console.log('instrumenting done');
        }catch(e){
            console.log('!!!! exception occur during instrumentation: ' + e);
            inst_code = js_code;
            return inst_code;
        }
        return inst_code;
    },
    sync_writing_file: function(filename, data){
        var file = new FileUtils.File(filename);
        var stream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE);
        stream.write(data, data.length);
        stream.close();
    },
    sync_reading_file: function(filename) {
        var data = "";
        var file = new FileUtils.File(filename);
        var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
            createInstance(Ci.nsIFileInputStream);
        var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
            createInstance(Ci.nsIConverterInputStream);
        fstream.init(file, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish

        let (str = {}) {
            let read = 0;
            do {
                read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
                data += str.value;
            } while (read != 0);
        }
        cstream.close(); // this closes fstream
        return data;
    }
}

////////////////////////////////////////////////////////////////////////////////////////// intercepter (end) //////////////////////////////////////////////////////////////////////////////////////////

// Essentially this is jalangi main

var Jalangi_FF = {
    instrumentPage: function() { //embed instrumented page into the webpage

    	console.log('[ ! ] starting jalangi');

        if(VERBATIM_HTML){
        console.log('start instrumenting webpage');
        }
        //first add the following tags into the code
        //<script src="../../../src/js/analysis.js" type="text/javascript"></script>
        //
        var script_tag = window.content.document.createElement('script');
        script_tag.setAttribute('type', 'text/javascript');
        var heads = window.content.document.getElementsByTagName('head');

        var data = this.sync_reading_file('jalangi/InputManager.js');

        script_tag.innerHTML = data;
        heads[0].insertBefore(script_tag, heads[0].firstChild);
        //now add:
        //<script src="../../../src/js/InputManager.js" type="text/javascript"></script><!---->
        script_tag = window.content.document.createElement('script');
        script_tag.setAttribute('type', 'text/javascript');

        data = this.sync_reading_file('jalangi/analysis.js');

        script_tag.innerHTML = data;
        heads[0].insertBefore(script_tag, heads[0].firstChild);

        //now insert the instrumented code
        for(var i=0;i<this.jsCodeSnippets.length;i++){
            var snippet = this.jsCodeSnippets[i];
            if(snippet.exception==undefined && snippet.exception==null) {
                var dom_elem = snippet.sourceTag;
                var inst_code = snippet.inst_code;
                if(snippet.type == 'script_tag') {
                    console.log('setting inner html');
                    dom_elem.innerHTML = inst_code;
                } else if (snippet.type == 'external') {
                    console.log("removing src");
                    dom_elem.removeAttribute('src');
                    dom_elem.innerHTML = inst_code;
                }
            }
        }
        if(VERBATIM_INST)
        {
            console.log('instrument web page done');
        }

        var final_html_code = window.content.document.documentElement.outerHTML;
        // TODOD : tmp js code is local
        var html_path = ext_config.tmp_js_code_dir + 'instru_page.html';
        this.sync_writing_file(html_path, final_html_code);
        console.log('instrumented webpage written into -> ' + html_path);
    },
    sync_reading_file: function(filename) {
        var data = "";
        var file = new FileUtils.File(filename);
        var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
            createInstance(Ci.nsIFileInputStream);
        var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
            createInstance(Ci.nsIConverterInputStream);
        fstream.init(file, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish

        let (str = {}) {
            let read = 0;
            do {
                read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
                data += str.value;
            } while (read != 0);
        }
        cstream.close(); // this closes fstream
        return data;
    },
    sync_writing_file: function(filename, data){
        var file = new FileUtils.File(filename);
        var stream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE);
        stream.write(data, data.length);
        stream.close();
    },
    instrument: function() {
        //do instrumentation
        //console.log('clearing previous fetched code...');
        this.clear_dir(ext_config.tmp_js_code_dir);

        //require('jalangi/instrument/esnstrument.js');

        //locate all imported javascript files
        for(var i=0;i<this.jsCodeSnippets.length;i++) {
            var data = "";
            data += this.jsCodeSnippets[i].type + "\r\n -------------------------------------------- \r\n\r\n";
            data += this.jsCodeSnippets[i].url + "\r\n -------------------------------------------- \r\n\r\n";
            data += this.jsCodeSnippets[i].code + "\r\n -------------------------------------------- \r\n\r\n";

            this.sync_writing_file(ext_config.tmp_js_code_dir + "snippet_" + i + ".txt", data);

            var stream = null;
            try{
                data = "";
                data += this.jsCodeSnippets[i].type + "\r\n -------------------------------------------- \r\n\r\n";
                data += this.jsCodeSnippets[i].url + "\r\n -------------------------------------------- \r\n\r\n";
                console.log('start instrumenting code snippet: [type: ' + this.jsCodeSnippets[i].type + ", url: " + this.jsCodeSnippets[i].url + "]");
                var inst_code = esnstrument.instrumentCode(this.jsCodeSnippets[i].code, true, this.jsCodeSnippets[i].type + '|' + this.jsCodeSnippets[i].url);
                this.jsCodeSnippets[i].inst_code = inst_code;

                data += inst_code + "\r\n -------------------------------------------- \r\n\r\n";

                this.sync_writing_file(ext_config.tmp_js_code_dir + "snippet_" + i + "_jalangi.txt", data);
            }catch(e){
                console.log('exception of instrumenting and writing:');
                console.log(e)
                if(stream!=null || stream!=undefined){
                    stream.close();
                    stream = null;
                }
                this.jsCodeSnippets[i].exception = e;
            }
        }

        console.log('---- instrumentation complete -----');

        //console.log(window.J$);

        //console.log(esnstrument.instrumentFile);
        /*for(var i=0;i<window.require_exception.length;i++){
         console.log(window.require_exception[i]);
         }*/
        //console.log(require);
        
        //esprima = require('thirdparty/esprima/esprima.js');

        // console.log(typeof esnstrument.instrumentCode);

        // console.log(JSON.stringify(esprima));
        // console.log(window);
        // console.log(window.require_exception[window.require_exception.length-1]);
        // console.log(JSON.stringify(esprima));

        //save the original file
        //save the instrumented file

        //reimport the instrumented file

        //start the socket (send the files and traces)
        //var data = JSON.stringify(this.jsCodeSnippets);
    },
    clear_dir: function() {
        //clear the dir
        try{
            var root = new FileUtils.File(ext_config.tmp_js_code_dir);
            console.log('clearing dir: ' + ext_config.tmp_js_code_dir);
            var entries = root.directoryEntries;
            while (entries.hasMoreElements()) {
                var entry = entries.getNext();
                entry.QueryInterface(Ci.nsIFile);
                var file = new FileUtils.File(entry.path);
                file.remove(true);
            }

            root = new FileUtils.File(ext_config.recordFileTraceFolder);
            console.log('clearing dir: ' + ext_config.recordFileTraceFolder);
            entries = root.directoryEntries;
            while (entries.hasMoreElements()) {
                var entry = entries.getNext();
                entry.QueryInterface(Ci.nsIFile);
                var file = new FileUtils.File(entry.path);
                file.remove(true);
            }
        }catch(e){
            console.log(e);
        }
    },
    fetch_js: function() {
        try{
            this.jsCodeSnippets = []; //clear the buffer
            updateWindow();
            scripts = window.content.document.getElementsByTagName("script");

            for(var i=0;i<scripts.length;i++){
                //try to extract between <script> </script>
                var innerHTML = scripts[i].innerHTML;
                if(innerHTML!="" && innerHTML != null && innerHTML != undefined){
                    var snippet = {type: "script_tag", url: null, code: scripts[i].innerHTML};
                    snippet.sourceTag = scripts[i];
                    this.jsCodeSnippets.push(snippet);
                }

                //try to extract code in <script src="external.js">
                var src = scripts[i].getAttribute("src");
                if(src!="" && src != null && src != undefined){

                    //isCompleteUrl(url) method is copied from Internet, and is problematic
                    //so we need is_complete_2 to fix some of the problems called by isCompleteUrl(url)
                    var is_complete_2 = false;
                    if(src.indexOf('//')==0){
                        src = 'http:' + src;
                        //console.log('::: ' + src);
                        is_complete_2 = true;
                    } else if (src.indexOf('http://')==0 || src.indexOf('https://')==0){
                        is_complete_2 = true;
                    } else if(src.indexOf('/')==0){
                        is_complete_2 = false;
                    }

                    if(this.isCompleteUrl(src) || is_complete_2 == true){

                    } else {
                        if(src.indexOf('/')==0){
                            src = src.substring(1, src.length);
                            src = this.getBaseUrl(window.content.location + "") + src;
                        } else {
                            console.log('getting latest base url');
                            src = this.getLastBaseUrl(window.content.location + "") + src;
                        }

                        //console.log(src + "    is it a valid url?");
                    }
                    console.log('requesting: ' + src);
                    this.fetch_js_code(src, scripts[i]);
                }
            }

        }catch(e){
            console.log(e);
        }
    },
    fetch_js_code: function (url_str, dom_script_tag) {
        var myRequest = Request({
            url: url_str,
            onComplete: function (response) {
                try{
                    var snippet = new Object();
                    snippet.type = "external";
                    snippet.url = myRequest.url;
                    snippet.code = response.text;
                    snippet.sourceTag = dom_script_tag;
                    //console.log(dom_script_tag);
                    //console.log(response.text);
                    console.log('received: ' + myRequest.url);
                    //console.log(JSON.stringify(obj));
                    Jalangi_FF.jsCodeSnippets.push(snippet);
                }catch(e){
                    console.log(e);
                }
            }
        }).get();

    },
    getBaseUrl: function(url){
        var index = url.indexOf("://");
        //if the last char is '/' then return
        /*if(url[url.length-1] == '/') {
         return url;
         }*/

        var startIndex = index>0 ? index + 3 : 0;
        var resultIndex = url.indexOf("/", startIndex);
        var result = null;
        if(resultIndex>0){
            result = url.substring(0, resultIndex);
        } else {
            result = url;
        }

        if(result[result.length-1] != '/') {
            result = result + '/';
        }
        return result;
    },
    getLastBaseUrl: function(url){
        console.log(url);
        var index = url.indexOf("://");
        //if the last char is '/' then return
        if(url[url.length-1] == '/') {
            return url;
        }

        //var startIndex = index>0 ? index + 3 : 0;
        var resultIndex = url.lastIndexOf("/"); //lastIndexOf searches backwards from the end of the string
        var result = null;
        if(resultIndex>0){
            result = url.substring(0, resultIndex);
        } else {
            result = url;
        }

        if(result[result.length-1] != '/') {
            result = result + '/';
        }
        return result;
    },
    isCompleteUrl: function(url){
        if(this.ValidUrl(url)==false){
            return false;
        }

        if(url.startsWith("http://") || url.startsWith("https://")){
            return true;
        }

        return false;
    },
    ValidUrl: function(str) {
        try{
            var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
                '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
                '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
                '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
                '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
                '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
            if(!pattern.test(str)) {
                return false;
            } else {
                return true;
            }
        }catch(e){
            console.log(e);
        }
    }
}

Jalangi_FF.jsCodeSnippets = [];
