/*
 * Copyright (c) 2017 American Institutes for Research. All rights reserved.
 */

// Set to true when loading a "Release" NaCl module, false when loading a
// "Debug" NaCl module.
var isRelease = true;

var $ = function(selector) {
  return document.querySelector(selector);
};

var webviewcontainer = null;

var defaultUrl = "https://mobile.tds.cambiumast.com/launchpad/";

let portMap = {};
let initScripts = [];
let promises = [];
let failedExtensionConnectionId = [];


// Javascript module pattern:
// see http://en.wikipedia.org/wiki/Unobtrusive_JavaScript#Namespaces
// In essence, we define an anonymous function which is immediately called and
// returns a new object. The new object contains only the exported definitions;
// all other definitions in the anonymous function are inaccessible to external
// code.
var common = (function() {

  
  /**
   * Add the default "load" and "message" event listeners to the element with id
   * "listener".
   * 
   * The "load" event is sent when the module is successfully loaded. The
   * "message" event is sent when the naclModule posts a message using
   * PPB_Messaging.PostMessage() (in C) or pp::Instance().PostMessage() (in
   * C++).
   */
  function attachDefaultListeners() {
    var listenerDiv = document.getElementById('listener');
    listenerDiv.addEventListener('load', moduleDidLoad, true);
    listenerDiv.addEventListener('message', handleMessage, true);
    listenerDiv.addEventListener('error', handleError, true);
    listenerDiv.addEventListener('crash', handleCrash, true);
    if (typeof window.attachListeners !== 'undefined') {
      window.attachListeners();
    }
  }

  /**
   * Called when the NaCl module fails to load.
   * 
   * This event listener is registered in createNaClModule above.
   */
  function handleError(event) {
    // We can't use common.naclModule yet because the module has not been
    // loaded.
    var moduleEl = document.getElementById('nacl_module');
    updateStatus('ERROR [' + moduleEl.lastError + ']');

    webviewcontainer.style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('errorMessage').innerHTML = 'ERROR ['
        + moduleEl.lastError + ']';
  }

  /**
   * Called when the Browser can not communicate with the Module
   * 
   * This event listener is registered in attachDefaultListeners above.
   */
  function handleCrash(event) {
    webviewcontainer.style.display = 'none';
    document.getElementById('error').style.display = 'block';
    if (common.naclModule.exitStatus == -1) {
      updateStatus('CRASHED');

      document.getElementById('errorMessage').innerHTML = 'Native Client Module Crashed';
    } else {
      updateStatus('EXITED [' + common.naclModule.exitStatus + ']');
      document.getElementById('errorMessage').innerHTML = 'EXITED ['
          + common.naclModule.exitStatus + ']';
    }

  }

  /**
   * Called when the NaCl module is loaded.
   * 
   * This event listener is registered in attachDefaultListeners above.
   */
  function moduleDidLoad() {
    common.naclModule = document.getElementById('nacl_module');
    updateStatus('RUNNING');

    if (typeof window.moduleDidLoad !== 'undefined') {
      window.moduleDidLoad();
    }
  }

  /**
   * Hide the NaCl module's embed element.
   * 
   * We don't want to hide by default; if we do, it is harder to determine that
   * a plugin failed to load. Instead, call this function inside the example's
   * "moduleDidLoad" function.
   * 
   */
  function hideModule() {
    // Setting common.naclModule.style.display = "None" doesn't work; the
    // module will no longer be able to receive postMessages.
    common.naclModule.style.height = '0';
  }


  /**
   * Add a message to an element with id "log".
   * 
   * This function is used by the default "log:" message handler.
   * 
   * @param {string}
   *          message The message to log.
   */
  function logMessage(message) {
      if (!isRelease)
        console.log(message);
  }

  /**
   * Called when the NaCl module sends a message to JavaScript (via
   * PPB_Messaging.PostMessage())
   * 
   * This event listener is registered in createNaClModule above.
   * 
   * @param {Event}
   *          message_event A message event. message_event.data contains the
   *          data sent from the NaCl module.
   */
  function handleMessage(message_event) {

    if (typeof window.sendResponse !== 'undefined') {

      var response = {
        command : "BROWSER HASH",
        status : 'OK',
        message : message_event.data
      };

      window.sendResponse(response);
      return;
    }

    logMessage('Unhandled message: ' + message_event.data);
  }

  /**
   * Called when the DOM content has loaded; i.e. the page's document is fully
   * parsed. At this point, we can safely query any elements in the document via
   * document.querySelector, document.getElementById, etc.
   * 
 
   */
  function domContentLoaded() {
    // If the page loads before the Native Client module loads, then set the
    // status message indicating that the module is still loading. Otherwise,
    // do not change the status message.
    updateStatus('Page loaded.');
    if (common.naclModule == null) {
      attachDefaultListeners();
    } else {
      // It's possible that the Native Client module onload event fired
      // before the page's onload event. In this case, the status message
      // will reflect 'SUCCESS', but won't be displayed. This call will
      // display the current message.
      updateStatus('Waiting.');
    }
  }

  /** Saved text to display in the element with id 'statusField'. */
  var statusText = 'NO-STATUSES';

  /**
   * Set the global status message. If the element with id 'statusField' exists,
   * then set its HTML to the status message as well.
   * 
   * @param {string}
   *          opt_message The message to set. If null or undefined, then set
   *          element 'statusField' to the message from the last call to
   *          updateStatus.
   */
  function updateStatus(opt_message) {
    if (opt_message) {
      statusText = opt_message;
    }
    logMessage(statusText);
  }

  // The symbols to export.
  return {
    /** A reference to the NaCl module, once it is loaded. */
    naclModule : null,

    attachDefaultListeners : attachDefaultListeners,
    domContentLoaded : domContentLoaded,
    hideModule : hideModule,
    logMessage : logMessage,
    updateStatus : updateStatus
  };

}());

// Listen for the DOM content to be loaded. This event is fired when parsing of
// the page's document has finished.
document
    .addEventListener(
        'DOMContentLoaded',
        function() {
          var body = document.body;

          /*
           * Once DOM content is loaded we will call common function of domContentLoaded
           */
          common.domContentLoaded();

          window
              .addEventListener("message",
                  function(event) {

                    if (event.data.type
                        && (event.data.type == "CHROME COMMAND")) {
                      var rand = Math.floor((Math.random() * 10000000))
                      var request = {
                        command : event.data.command,
                        params : event.data.params,
                        id : rand
                      };

                      switch (request.command) {
                      case 'TTS INIT':
                        (new MessageHandler.INIT(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS INITWITHHACK':
                        (new MessageHandler.INIT_WITH_HACK(request,
                            sendResponse)).execute();
                        break;
                      case 'TTS SPEAK':
                        (new MessageHandler.SPEAK(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS SPEAKCHUNKS':
                        (new MessageHandler.SPEAKCHUNKS(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS STOP':
                        (new MessageHandler.STOP(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS PAUSE':
                        (new MessageHandler.PAUSE(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS RESUME':
                        (new MessageHandler.RESUME(request, sendResponse))
                            .execute();
                        break;
                      case 'TTS STATUS':
                        (new MessageHandler.STATUS(request, sendResponse))
                            .execute();
                        break;
                      case 'UI FULLSCREEN':
                        (new MessageHandler.FULLSCREEN(request, sendResponse))
                            .execute();
                        break;
                      case 'APP CLOSE':
                        (new MessageHandler.CLOSE(request, sendResponse))
                            .execute();
                        break;
                      case 'APP STOREDATA':
                        (new MessageHandler.STOREDATA(request, sendResponse))
                            .execute();
                        break;
                      case 'APP CLEARDATA':
                        (new MessageHandler.CLEARDATA(request, sendResponse))
                            .execute();
                        break;
                      case 'APP GETVOLUME':
                        (new MessageHandler.GETVOLUME(request, sendResponse))
                            .execute();
                        break;
                      case 'APP SETVOLUME':
                        (new MessageHandler.SETVOLUME(request, sendResponse))
                            .execute();
                        break;
                      case 'BROWSER HASH':
                        (new MessageHandler.HASH(event)).execute();
                        break;
                      case 'CONNECT EXTENSION':
                    	  (new MessageHandler.CONNECT(request,sendResponse)).execute();
                          break;
                      case 'APP KEEPAWAKE':
                    	  	(new MessageHandler.KEEPAWAKE(request, sendResponse)).execute();
                    	  	break;
                      case 'APP SPOKEN_FEEDBACK':
                  	  	(new MessageHandler.SPOKEN_FEEDBACK(request, sendResponse)).execute();
                  	  	break;
                      break;
                    default:
                      (new MessageHandler.ERROR(request, sendResponse))
                          .execute();
                      break;
                    }
                  }
                }, false);

        });

var MessageHandler = {};

var TTS = {
  status : "Stopped"
};

MessageHandler.HASH = function(event) {
  this.execute = function() {
    common.naclModule.postMessage(event.data.message);
  }
};

MessageHandler.SPOKEN_FEEDBACK = function(request, sendResponse) {
	  this.execute = function() {
		  var message = "";
		  var status = "OK"
		  try {
		
			    
				  if (request.params != undefined && request.params!=null) {
					
					  chrome.accessibilityFeatures.spokenFeedback.set({
					        value : request.params,
					        scope : 'regular'
					      });
					  message = "Spoken feedback changed";
				  } else {
					  chrome.accessibilityFeatures.spokenFeedback.set({
					        value : false,
					        scope : 'regular'
					      });
				  }

			 } catch (ex) {
				  message = "Error occured while changing spoken feedback";
				  status = "FAIL";
			 } finally {
			  	console.log(message);
				sendResponse({
				        command : request.command,
				        id : request.id,
				        params : request.params,
				        status : status,
				        result : "",
				        message : message
				 });
			}
	  }
};

MessageHandler.KEEPAWAKE = function(request, sendResponse) {
	  this.execute = function() {
		  var message = "";
		  var status = "OK"
		  try {
				  if (request.params != undefined && request.params!=null && request.params.length > 0) {
					  chrome.power.requestKeepAwake(request.params);
					  message = "Keep Awake set to " + request.params;
				  } else {
					  chrome.power.releaseKeepAwake();
					  message = "Keep Awake Released"
				  }

			 } catch (ex) {
				  message = "Error occured while setting Keep Awake";
				  status = "FAIL";
			 } finally {
			  	console.log(message);
				sendResponse({
				        command : request.command,
				        id : request.id,
				        params : request.params,
				        status : status,
				        result : "",
				        message : message
				 });
			}
	  }
};

MessageHandler.ERROR = function(request, sendResponse) {
  this.execute = function() {
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'FAIL',
      result : "",
      message : "Unknown command"
    });
  }
};

// Chrome 25 on chrome OS has a bug in it.
// Until speak is called, all the other calls fail and no useful data is
// returned.
// So, in order to initialize the interal data structures used by
// chrome/chromeOS, we do a dummy speak and then
// do our real INIT
MessageHandler.INIT_WITH_HACK = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.speak("ready", {
      lang : 'en-US',
      volume : 0.01,
      onEvent : function(event) {
        switch (event.type) { // All the TTS terminal conditions for our test
        // utterance
        case 'end':
        case 'interrupted':
        case 'cancelled':
        case 'error':
          (new MessageHandler.INIT(request, sendResponse)).execute();
          break;
        default:
        }
      }
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
}

MessageHandler.INIT = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.getVoices(function(voices) {
      var voiceNames = [];
      for (var i = 0; i < voices.length; i++) {
        voiceNames.push(voices[i].voiceName);
      }
      var result = {
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'OK',
        result : voiceNames.join(','),
        message : ""
      };
      sendResponse(result);
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

MessageHandler.SPEAK = function(request, sendResponse) {
  this.execute = function() {
    if (!request.params)
      return;

    // Add a progress listener
    request.params[1].onEvent = function(event) {
      var result = null;
      switch (event.type) {
      case 'start':
      case 'resume':
        TTS.status = "Playing";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Playing',
          message : ""
        };
        break;
      case 'pause':
        TTS.status = "Paused";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Paused',
          message : ""
        };
        break;
      case 'end':
      case 'interrupted':
      case 'cancelled':
      case 'error':
        TTS.status = "Stopped";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Stopped',
          message : ""
        };
        break;
      case 'word':
        result = {
          command : 'TTS WORD',
          id : request.id,
          params : '',
          status : 'OK',
          result : event.charIndex,
          message : ''
        };
        break;
      default:
      }
      if (result != null) {
        sendResponse(result);
      }
    };
    chrome.tts.speak(request.params[0], request.params[1]);
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.SPEAKCHUNKS = function(request, sendResponse) {
  this.execute = function() {
    if (!request.params)
      return;

    var chunks = request.params[0];
    var options = request.params[1];
    options.enqueue = true; // this property tells the chrome TTS engine to not
    // abort the current TTS playback and queue the
    // chunks to play one after the other.

    var scheduledStopTimer; // This is needed because between chunks, we get
    // playing and stopped events. We dont need to
    // propagate these to the upper layers so we try to
    // suppress them here

    // Add a progress listener
    options.onEvent = function(event) {
      var result = null;
      // console.log(event.type+" "+event.charIndex+" "+event.message);
      switch (event.type) {
      case 'start':
      case 'resume':
        if (scheduledStopTimer) { // This is a start event for the next chunk
          clearTimeout(scheduledStopTimer);
        } else {
          TTS.status = "Playing";
          result = {
            command : 'TTS STATUS',
            id : request.id,
            params : "",
            status : 'OK',
            result : 'Playing',
            message : ""
          };
        }
        break;
      case 'pause':
        TTS.status = "Paused";
        result = {
          command : 'TTS STATUS',
          id : request.id,
          params : "",
          status : 'OK',
          result : 'Paused',
          message : ""
        };
        break;
      case 'end':
      case 'interrupted':
      case 'cancelled':
      case 'error':
        scheduledStopTimer = setTimeout(function() { // lets make sure this is
          // a "real" stop and not
          // one between chunks. We
          // are arbitrarily chosing
          // to wait 1 second
          TTS.status = "Stopped";
          result = {
            command : 'TTS STATUS',
            id : request.id,
            params : "",
            status : 'OK',
            result : 'Stopped',
            message : ""
          };
        }, 1000);
        break;
      case 'word':
        result = {
          command : 'TTS WORD',
          id : request.id,
          params : '',
          status : 'OK',
          result : event.charIndex,
          message : ''
        };
        break;
      default:
      }
      if (result != null) {
        sendResponse(result);
      }
    };

    for (var i = 0; i < chunks.length; i++) {
      if (options.srcId !== undefined) { // This is some goofy chrome.tts
        // thing. this property gets set on
        // call to the speak() api and resuse
        // of this object in subsequent calls
        // will fail if this prop is not
        // removed
        delete options.srcId
      }
      chrome.tts.speak(chunks[i], options);
    }
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.STOP = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.stop();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.PAUSE = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.pause();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.RESUME = function(request, sendResponse) {
  this.execute = function() {
    chrome.tts.resume();
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : "",
      message : ""
    });
  }
};

MessageHandler.STATUS = function(request, sendResponse) {
  this.execute = function() {
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : TTS.status,
      message : ""
    });
  }
};

// This is a no-op since we are a "kiosk mode" packaged app but preserving this
// for backwards compatability with the old chrome extension
MessageHandler.FULLSCREEN = function(request, sendResponse) {
  this.execute = function() {
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'No-op'
    };
    sendResponse(response);
  }
};

// Close the app
MessageHandler.CLOSE = function(request, sendResponse) {
  this.execute = function() {
    chrome.app.window.current().close();
  }
};

MessageHandler.CONNECT = function(request, sendResponse) {
	  this.execute = function() {


		  
		    if (!request.params)
		        return;
		    
		    let extensionIdArray = request.params;
		    console.log(extensionIdArray);
		    
		    promises = [];
	  		failedExtensionConnectionId = [];
		    for (let extensionId of extensionIdArray){
		    	promises.push(connectToExtension(extensionId));
		    }


		    let i = 0;
		    for(let cPromise of promises){

		    	cPromise.then(function(){
		    		i++;
		    		console.log("successfully connected to extension")
		    	}).catch(
        		// Log the rejection reason
       				(reason) => {
       					i++;
       					failedExtensionConnectionId.push(reason);
           				console.log('Unable to connect to  ('+reason+')');
       			});
		    }

		        var allPromisesRespondedInterval = setInterval(function() {
     			 if (i == promises.length) {
  						let message = "Succesfully connected to all extension";
		   				let status = "OK"

					   	if(failedExtensionConnectionId.length > 0) {
			      			message = "Unable to connect to extension";
			      			status = "FAIL";
			      		} else{
			      			failedExtensionConnectionId = extensionIdArray;
			      		}

		      			sendResponse({
						        command : request.command,
						        id : request.id,
						        params : request.params,
						        status : status,
						        result : failedExtensionConnectionId,
						        message : message
						 });
      				  clearInterval(allPromisesRespondedInterval);
      				}
    			}, 1000);
		    
	  }
};

var connectToExtension = function(extensionId) {
	  let port;
	  try {
	    port = chrome.runtime.connect(extensionId);
	  } catch (e) {
	    console.error('Could not connect to extension: ' + e.message);
	    return;
	  }
	  // Save port in map.
	  portMap[extensionId] = port;
	  port.onDisconnect.addListener(() => {
	    delete portMap[extensionId];
	  });

	  let initPromise = new Promise((resolve, reject) => {
	    port.onMessage.addListener(function(msg) {
	      // Perhaps check here to make sure |msg.code| exists.
	      console.log('Incoming from extension: ' + msg.name + ' -> ' + msg.code);
	      if (msg.name == 'ext_getInitScripts') {
	        initScripts.push({
	          name: 'initScripts-' + extensionId,
	          matches: ['<all_urls>'],
	          js: {code: msg.code}
	        });
	        resolve();
	      } else {
	       webviewcontainer.executeScript({code: msg.code});
	       resolve();
	      }
	    });
	    setTimeout(function() {
	         reject(extensionId);
	    }, 5000);
	  });

    // All connect ready extension needs to implement injectScript message and send back the script which needs to be executed in webview
    port.postMessage({request: 'injectScript'});

	  return initPromise;
};
	
// Store key value pairs. The input parameter is a object who's props will get
// stored
MessageHandler.STOREDATA = function(request, sendResponse) {
  this.execute = function() {
    chrome.storage.local.set(request.params);
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'Saved'
    };
    sendResponse(response);
  }
};

// Clear stored keys
MessageHandler.CLEARDATA = function(request, sendResponse) {
  this.execute = function() {
    chrome.storage.local.remove(request.params);
    var response = {
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'OK',
      result : JSON.stringify(request),
      message : 'Removed'
    };
    sendResponse(response);
  }
};

// Get Volume
MessageHandler.GETVOLUME = function(request, sendResponse) {
  this.execute = function() {
    if (!chrome.audio) { // chrome.audio is currently only supported on
      // chromeOS
      sendResponse({
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'FAILED',
        result : "",
        message : ""
      });
      return;
    }
    chrome.audio.getInfo(function(outputDevices, inputDevices) {
      var volumeObj = {};
      outputDevices.forEach(function(device) {
        if (device.isActive) {
          volumeObj.volume = device.volume;
          volumeObj.isMuted = device.isMuted;
        }
      });
      var response = {
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'OK',
        result : JSON.stringify(volumeObj),
        message : ''
      };
      sendResponse(response);
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

// Set Volume
MessageHandler.SETVOLUME = function(request, sendResponse) {
  this.execute = function() {
    if (!chrome.audio) { // chrome.audio is currently only supported on
      // chromeOS
      sendResponse({
        command : request.command,
        id : request.id,
        params : request.params,
        status : 'FAILED',
        result : "",
        message : ""
      });
      return;
    }
    chrome.audio.getInfo(function(outputDevices, inputDevices) {
      outputDevices.forEach(function(device) {
        if (device.isActive) {
          chrome.audio.setProperties(device.id, request.params, function() {
            var response = {
              command : request.command,
              id : request.id,
              params : request.params,
              status : 'OK',
              result : '',
              message : ''
            };
            sendResponse(response);
          });
        }
      });
    });
    sendResponse({
      command : request.command,
      id : request.id,
      params : request.params,
      status : 'PENDING',
      result : "",
      message : ""
    });
  }
};

var sendResponse = function(response) {
  console.log(response);
  webviewcontainer.contentWindow.postMessage({
    type : "CHROME RESPONSE",
    command : response.command,
    params : response.params,
    status : response.status,
    result : response.result,
    message : response.message
  }, "*");
}

window.addEventListener('load', function() {

    webviewcontainer = $('#AIRWebViewContainer');

    var manifest = chrome.runtime.getManifest();

    var uaSuffix = '';
    if (manifest.dev_version) {
        uaSuffix = ' (BETA)';
    }

    // Hijack the user agent to make sure that all requests to the server have our
    // CAISecureBrowser string in the UA
    webviewcontainer.setUserAgentOverride("Mozilla/5.0 (X11; CrOS aarch64 14989.85.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 CAISecureBrowser/" + manifest.version + uaSuffix);


  // When the TDS page is loaded, execute a script to notify the page that we
  // are running inside a chrome packaged app
  webviewcontainer.addEventListener("contentload", function(event) {
    webviewcontainer.executeScript({
      file : 'appWelcome.js'
    });
    
  });

  // allow requests for media so that verbal response items work
  webviewcontainer.addEventListener("permissionrequest", function(event) {
    if (event.permission === "media") {
      event.request.allow();
    }
  });


  var currentAppWindow = chrome.app.window.current();

  currentAppWindow.onBoundsChanged.addListener(function(){ 

    var currentWinBounds = currentAppWindow.getBounds();
    webviewcontainer.style.width = currentWinBounds.width + 'px';
    webviewcontainer.style.height = currentWinBounds.height + 'px';

  });

  // The background.js would have determined the bounds that our webview can
  // take up
  if (window.WIN_BOUNDS) {
    webviewcontainer.style.width = WIN_BOUNDS.width + 'px';
    webviewcontainer.style.height = WIN_BOUNDS.height + 'px';
  }


try {
		chrome.virtualKeyboard.restrictFeatures({
  			autoCompleteEnabled: false,
  			autoCorrectEnabled: false,
  			spellCheckEnabled: false,
  			voiceInputEnabled: false,
  			handwritingEnabled: false
		});
	}catch(ex){
	
	}

  // Disable chromevox and other accessibility features
  

  try {
    chrome.accessibilityFeatures.largeCursor.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.stickyKeys.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.highContrast.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.screenMagnifier.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.autoclick.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  } // chrome docs have this mis-cased. Not my typo
  try {
    chrome.accessibilityFeatures.virtualKeyboard.set({
      value : false,
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.animationPolicy.set({
      value : 'none',
      scope : 'regular'
    });
  } catch (ex) {
  }
  try {
    chrome.accessibilityFeatures.spokenFeedback.set({
      value: false,
      scope: 'regular'
    });
  } catch (ex) {
  }

  // If we are in Kiosk mode, let the webview go to our servers. Otherwise show
  // an error
  if (window.IS_KIOSK_SESSION) {
    chrome.storage.local.get('launchUrl', function(value) {
      var url = value.launchUrl || defaultUrl; // We are first checking local
      // storage if a new default has
      // been persisted by the
      // launchpad website (from a
      // prior launch)
      // Set webviewcontainer src attribute
      webviewcontainer.src = url;
    });
  } else {
    webviewcontainer.style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }

  function sendInitialMessage(e) {
    e.target.contentWindow.postMessage({
      type : "CHROME RESPONSE",
      command : 'APP WELCOME'
    }, '*');

//    e.target.contentWindow.postMessage({
//      type : "launchedData",
//      data : window.launchedData
//    }, '*');

  }

  // When the TDS page is loaded, send it an event so that it has a
  // handle to this window object (to communicate back to this page)
  webviewcontainer.addEventListener('loadstop', sendInitialMessage);
});

var moduleDidLoad = function() {
  common.hideModule();
}

console.log("Ready");
