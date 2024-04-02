chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create('main.html', {
    id : 'SecureTestBrowser',
    state : 'maximized'
  }, function(appWindow) {
    // propagate the launch mode to the webview

    appWindow.contentWindow.IS_KIOSK_SESSION = true;

    appWindow.contentWindow.launchedData = launchData;

    // propagate the current window bounds to the main page so that
    // we can set the webview's (contained in there) size properly to maximize
    // screen realestate
    appWindow.contentWindow.WIN_BOUNDS = appWindow.getBounds();
  });
});