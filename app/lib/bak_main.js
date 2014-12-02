/*
 * Texas A&M University
 * Department of Computer Science & Engineering
 * SUCCESS Lab
 * Robert A. Baykov 2014
 *
 */

// --- Debug
var VERBATIM = false;


// IO
var io = require('ftrace/ftrace.io.js');


// --- Classes
var site_map = []

/*
 * Composed of pages
 *
 */
function Site()
{
	this.host_name;
}

//------------------------------
function Page(name,url)
{
	this.name = name;
	this.link = link;
}
function JSLib()
{

}

function add_site()
{

}

// --- Tabs
require("sdk/tabs").on("ready", logURL);
var tabs = require("sdk/tabs");
function logURL(tab) {
  console.log("[....] "+tab.url);
}

// --- Buttons
var { ToggleButton } = require('sdk/ui/button/toggle');
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
// Pannel on click binds to 
function handleChange(state) {
  if (state.checked) 
  {
  	processQueue();
    //pannel_txt_entry.show({position: ft_button});
  }
}
function handleHide() 
{
  ft_button.state('window', {checked: false});
}



//------------------------------------------------------------------------------
// TESTING PLEASE IGNORE
const { Cu, Ci, Cc, Cr } = require("chrome");

var windowUtil = require('sdk/window/utils')

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const debuggerService = Cc["@mozilla.org/js/jsd/debugger-service;1"].getService(Ci.jsdIDebuggerService);


// script queue --robert
var appDir, profDir;
var executedScripts = {__proto__: null};
var debuggerWasOn = false;
var debuggerOldFlags;
var queue = null;

var paused = false;

function start()
{
  // document.getElementById("tabs").addEventListener("select", function(event)
  // {
  //   if (event.target.localName != "tabs")
  //     return;

  //   closeFindbar();

  //   setTimeout(function()
  //   {
  //     // Move focus away from tabs when tab selection is switched (idea stolen from dialog.xml)
  //     let focusedElement = document.commandDispatcher.focusedElement;
  //     if (focusedElement && focusedElement.localName == "tab")
  //       document.commandDispatcher.advanceFocusIntoSubtree(focusedElement);
  //   }, 0);
  // }, false)

  // Initialize frames with data: URLs to prevent them from getting chrome privileges
  // let request = new XMLHttpRequest();
  // request.open("GET", "chrome://jsdeobfuscator/content/scriptList.xhtml", false);
  // request.send(null);
  // let scriptListURL = "data:text/xml," + encodeURIComponent(request.responseText);
  // for each (let frameId in ["compiled-frame", "executed-frame"])
  // {
  //   let frame = document.getElementById(frameId);
  //   frame.docShell.allowAuth = false;
  //   frame.docShell.allowImages = false;
  //   frame.docShell.allowJavascript = false;
  //   frame.docShell.allowMetaRedirects = false;
  //   frame.docShell.allowPlugins = false;
  //   frame.docShell.allowSubframes = false;
  //   frame.webNavigation.loadURI(scriptListURL, 0, null, null, null);
  // }

  // // Determine location of profile and application directory (scripts located there shouldn't be shown)
  // let dirServ = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
  // function getDirURL(key)
  // {
  //   try
  //   {
  //     let file = dirServ.get(key, Ci.nsIFile);
  //     return Services.io.newFileURI(file).spec.toLowerCase().replace(/\/+/g, "/");
  //   }
  //   catch (e)
  //   {
  //     return null;
  //   }
  // }
  // appDir = getDirURL("CurProcD");
  // profDir = getDirURL("ProfD");

  // updateFiltersUI();

  // Initialize debugger
  debuggerWasOn = debuggerService.isOn;
  if (!debuggerWasOn)
  {
    if ("asyncOn" in debuggerService)
    {
      // Gecko 2.0 branch
      debuggerService.asyncOn({onDebuggerActivated: onDebuggerActivated});
    }
    else
    {
      // Gecko 1.9.x branch
      debuggerService.on();
      onDebuggerActivated();
    }
  }
  else
    onDebuggerActivated();
}

function onDebuggerActivated()
{
  debuggerService.scriptHook = scriptHook;
  debuggerService.functionHook = scriptHook;
  debuggerService.topLevelHook = scriptHook;

  debuggerOldFlags = debuggerService.flags;
  debuggerService.flags = ("DISABLE_OBJECT_TRACE" in Ci.jsdIDebuggerService ? Ci.jsdIDebuggerService.DISABLE_OBJECT_TRACE : 0);
}

var scriptHook =
{
  onScriptCreated: function(script)
  {
    processAction("compiled", script);
  },
  onScriptDestroyed: function(script)
  {
  },
  onCall: function(frame, type)
  {
    if (type == Ci.jsdICallHook.TYPE_TOPLEVEL_START || 
        type == Ci.jsdICallHook.TYPE_FUNCTION_CALL)
    {
        processAction("executed", frame.script);
    }
    else if (type == Ci.jsdICallHook.TYPE_TOPLEVEL_END ||
     type == Ci.jsdICallHook.TYPE_FUNCTION_RETURN)
    {
        processAction("returned", frame.script);
    }
  },
  prevScript: null,
  QueryInterface: XPCOMUtils.generateQI([Ci.jsdIScriptHook, Ci.jsdICallHook])
}

// Puts the script into the process Queue --robert
function processAction(action, script)
{
  if (paused)
    {return;}

  // For returns accept only known scripts. For other actions check filters.
  if (action == "returned")
  {
    if (!(script.tag in executedScripts))
      return;
  }
  else
  {
    //fuck the filters.
    // if (Prefs.filters.include.length && !checkMatch(script.fileName, Prefs.filters.include))
    //   return;
    // if (checkMatch(script.fileName, Prefs.filters.exclude))
    //   return;
    
    // Process everything , I guess -robert
  }

  if (!queue)
  {
    queue = [];
    //setTimeout(processQueue, 100);
  }

  // Get the script source now, it might be gone later :-(
  let source = null;
  if (action == "compiled" || (action == "executed" && !(script.tag in executedScripts)))
    source = script.functionSource;

  queue.push([action, script, source, new Date()]);
  if (action == "executed" && !(script.tag in executedScripts))
    executedScripts[script.tag] = null;
}


function processQueue()
{
  console.log("queue");
  
  let compiledFrame = document.getElementById("compiled-frame").contentWindow;
  
  let executedFrame = document.getElementById("executed-frame").contentWindow;

  let needScrollCompiled = (compiledFrame.scrollY >= compiledFrame.scrollMaxY - 10);
  let needScrollExecuted = (executedFrame.scrollY >= executedFrame.scrollMaxY - 10);

  let updateNeeded = {__proto__: null};

  let scripts = queue;
  queue = null;
  for each (let [action, script, source, time] in scripts)
  {
    switch (action)
    {
      case "compiled":
      {
        //addScript(compiledFrame, script, source, time);
        console.log("[!]"+script+source+time);
        break;
      }
      case "executed":
      {
        // Update existing entry for known scripts
        let scriptData = (script.tag in executedScripts ? executedScripts[script.tag] : null);
        if (scriptData)
        {
          if (typeof scriptData.executionTime != "undefined")
          {
            if (scriptData.calls != scriptData.returns)
              scriptData.executionTime = undefined;
            else
              scriptData.startTime = time.getTime();
          }
          scriptData.calls++;
          updateNeeded[script.tag] = scriptData;
        }
        else
        {
          executedScripts[script.tag] = {
            entry: addScript(executedFrame, script, source, time),
            source: source,
            startTime: time.getTime(),
            calls: 1,
            returns: 0,
            executionTime: 0
          };
        }
        break;
      }
      case "returned":
      {
        let scriptData = executedScripts[script.tag];
        if (scriptData.startTime)
        {
          scriptData.returns++;
          if (typeof scriptData.executionTime != "undefined")
            scriptData.executionTime += time.getTime() - scriptData.startTime;
          scriptData.startTime = 0;
          updateNeeded[script.tag] = scriptData;
        }
        break;
      }
    }
  }

  for each (let scriptData in updateNeeded)
    updateExecutedScript(scriptData);

  if (needScrollCompiled)
    compiledFrame.scrollTo(compiledFrame.scrollX, compiledFrame.scrollMaxY);
  if (needScrollExecuted)
    executedFrame.scrollTo(executedFrame.scrollX, executedFrame.scrollMaxY);
}



start();