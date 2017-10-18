'use strict';

function keys(obj) {
  var symbolKeys = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(obj) : [];
  return Object.keys(obj).concat(symbolKeys);
}

module.exports = {
  keys: keys
};
