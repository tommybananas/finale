'use strict';

function keys(obj) {
  if (typeof Reflect === 'object') {
    return Reflect.ownKeys(obj);
  }
  else {
    var getOwnExists = typeof Object.getOwnPropertySymbols === 'function' && typeof Object.getOwnPropertyNames === 'function';
    return getOwnExists ? Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj)) : Object.keys(obj);
  }
}

module.exports = {
  keys: keys
};
