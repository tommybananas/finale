'use strict';

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base'),
    ReadController = require('./read'),
    getKeys = require('../util').keys;

var Update = function(args) {
  if (args.resource.updateMethod)
    this.method = args.resource.updateMethod;
  Update.super_.call(this, args);
};

util.inherits(Update, Base);

Update.prototype.action = 'update';
Update.prototype.method = 'put';
Update.prototype.plurality = 'singular';

Update.prototype.fetch = ReadController.prototype.fetch;

Update.prototype.write = function(req, res, context) {
  var instance = context.instance;
  context.attributes = _.defaults(context.attributes, req.body);

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  var self = this;

  // check associated data
  if (this.include && this.include.length) {
    _.values(self.resource.associationsInfo).forEach(function(association) {
      if (context.attributes.hasOwnProperty(association.as)) {
        var attr = context.attributes[association.as];

        if (_.isObject(attr) && attr.hasOwnProperty(association.primaryKey)) {
          context.attributes[association.identifier] = attr[association.primaryKey];
        } else if(context.attributes.hasOwnProperty(association.as) && attr === null) {
          context.attributes[association.identifier] = null;
        }
      }
    });
  }

  instance.setAttributes(context.attributes);

  // check if reload is needed
  var reloadAfter = self.resource.reloadInstances &&
    getKeys(self.resource.associationsInfo).some(function(attr) {
      return instance._changed.hasOwnProperty(attr);
    });

  return instance
    .save({
      transaction: context.transaction
    })
    .then(function(instance) {
      if (reloadAfter) {
        var reloadOptions = {};
        if (Array.isArray(self.include) && self.include.length)
          reloadOptions.include=self.include;
        if (!!self.resource.excludeAttributes)
          reloadOptions.attributes = {exclude: self.resource.excludeAttributes };
        if (context.transaction)
          reloadOptions.transaction = context.transaction;
        return instance.reload(reloadOptions);
      } else {
        return instance;
      }
    }).then(function (instance) { 
      if (!!self.resource.excludeAttributes) {
        self.resource.excludeAttributes.forEach(function(attr) {
          delete instance.dataValues[attr];
        });
      }
      return instance;
    })
    .then(function(instance) {
      if (self.resource.associationOptions.removeForeignKeys) {
        _.values(self.resource.associationsInfo).forEach(function(info) {
          delete instance.dataValues[info.identifier];
        });
      }

      context.instance = instance;
      return context.continue;
    });
};

module.exports = Update;
