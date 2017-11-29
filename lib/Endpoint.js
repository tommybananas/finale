'use strict';

var Endpoint = function(endpoint) {
  this.string = endpoint;
  this.attributes = endpoint
    .split('/')
    .filter(function(c) { return ~c.indexOf(':') && ~~c.indexOf(':unused'); })
    .map(function(c) { return (c.indexOf('(') > -1 ? c.substring(1, c.indexOf('(')) : c.substring(1)); });
};

module.exports = Endpoint;
