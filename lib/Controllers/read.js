'use strict';

var util = require('util'),
    Base = require('./base'),
    errors = require('../Errors'),
    getKeys = require('../util').keys;

var Read = function(args) {
  Read.super_.call(this, args);
};

util.inherits(Read, Base);

Read.prototype.action = 'read';
Read.prototype.method = 'get';
Read.prototype.plurality = 'singular';

Read.prototype.fetch = function(req, res, context) {
  var model = this.model,
      endpoint = this.endpoint,
      options = context.options || {},
      criteria = context.criteria || {},
      include = this.include,
      includeAttributes = this.includeAttributes || [];

  // only look up attributes we care about
  options.attributes = options.attributes || this.resource.attributes;

  // remove params that are already accounted for in criteria
  getKeys(criteria).forEach(function(attr) { delete req.params[attr]; });
  endpoint.attributes.forEach(function(attribute) {
    if (attribute in req.params) criteria[attribute] = req.params[attribute];
  });

  if (getKeys(criteria).length) {
    options.where = criteria;
  }

  if (context.include && context.include.length) {
    include = include.concat(context.include);
  }


  if (include.length) options.include = include;


  //if shallow flag exists and is true, only "include" children that are in the 
  //optional "children" query param, and that were in our whitelist of potential includes
  if(context.shallow){
    let child_raw = req.query.children;
    if(!child_raw) {
      //if shallow, and no children requested, include none.
      delete options.include;
    } else {
      let children = child_raw.split("|");
      let cleaned_include = [];
      for(let i=0;i<options.include.length;i++) {
        let include = options.include[i];
        if(include.as && children.indexOf(include.as) !== -1)
        {
          cleaned_include.push(include);
        }
        else{
          //not a match, don't include.
        }
      }
      options.include = cleaned_include;
    }
  }


  if (this.resource.associationOptions.removeForeignKeys) {
    options.attributes = options.attributes.filter(function(attr) {
      return includeAttributes.indexOf(attr) === -1;
    });
  }

  if (req.query.scope) {
    model = model.scope(req.query.scope);
  }

  return model
    .findOne(options)
    .then(function(instance) {
      if (!instance) {
        throw new errors.NotFoundError();
      }

      context.instance = instance;
      return context.continue;
    });
};

module.exports = Read;
