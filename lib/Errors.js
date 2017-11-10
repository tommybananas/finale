'use strict';

var util = require('util');

var FinaleError = function(status, message, errors, cause) {
  this.name = 'FinaleError';
  this.message = message || 'FinaleError';
  this.errors = errors || [];
  this.status = status || 500;
  this.cause = cause;
  Error.captureStackTrace(this, this.constructor);
};
util.inherits(FinaleError, Error);

var BadRequestError = function(message, errors, cause) {
  FinaleError.call(this, 400, message || 'Bad Request', errors, cause);
  this.name = 'BadRequestError';
};
util.inherits(BadRequestError, FinaleError);

var ForbiddenError = function(message, errors, cause) {
  FinaleError.call(this, 403, message || 'Forbidden', errors, cause);
  this.name = 'ForbiddenError';
};
util.inherits(ForbiddenError, FinaleError);

var NotFoundError = function(message, errors, cause) {
  FinaleError.call(this, 404, message || 'Not Found', errors, cause);
  this.name = 'NotFoundError';
};
util.inherits(NotFoundError, FinaleError);

var RequestCompleted = function() {
  Error.call(this);
  this.name = 'RequestCompleted';
};
util.inherits(RequestCompleted, Error);

module.exports = {
    NotFoundError: NotFoundError,
    BadRequestError: BadRequestError,
    FinaleError: FinaleError,
    ForbiddenError: ForbiddenError,
    RequestCompleted: RequestCompleted
};