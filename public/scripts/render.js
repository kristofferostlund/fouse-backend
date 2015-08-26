'use strict'

var _render = {
  /*
  Creates and return an html element.
  @param {String} tagName
  @param {HTMLAnchorElement} innerHtml
  @param {String} className
  @param {String} id
  @return {HTMLAnchorElement}
  */
  createElement: function(tagName, innerHtml, attribs) {
    var node = document.createElement(tagName);
    node.insertAdjacentHTML('afterbegin', innerHtml);
    if (!attribs) { return node; }
    
    if (!!attribs.className) { node.className = attribs.className; }
    if (!!attribs.id) { node.id = attribs.id; }
    if (!!attribs.href) {
      node.href = attribs.href;
      node.target = '_blank';
      }
    if (!!attribs.clickIdentifier) {
      node.className = [node.className, attribs.clickIdentifier].join(' ');
    }
    return node;
  },
  /*
  Clears children of an HTML element.
  @param {}
  */
  removeChildren: function clearChildren(element) {
    if (!element.hasChildNodes()) return element;
    
    element.removeChild(element.lastChild);
    clearChildren(element);
  }
};