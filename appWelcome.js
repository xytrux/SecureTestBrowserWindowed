// Add a class to reflect this is a secure chrome app
(function(domNode, classToAdd) {
  if ((domNode.className).indexOf(classToAdd) < 0) {
    domNode.className += (" " + classToAdd);
  }
})(document.body, "browser_airsecurebrowser");