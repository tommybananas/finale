'use strict';

var util = require('util'),
    Base = require('./base'),
    _ = require('lodash'),
    errors = require('../Errors'),
    getKeys = require('../util').keys;

var List = function(args) {
  List.super_.call(this, args);
};

util.inherits(List, Base);

List.prototype.action = 'list';
List.prototype.method = 'get';
List.prototype.plurality = 'plural';

List.prototype._safeishParse = function(value, type, sequelize) {

  if (sequelize) {
    if (type instanceof sequelize.STRING || type instanceof sequelize.CHAR || type instanceof sequelize.TEXT) {
      if (!isNaN(value)) {
        return value;
      }
    } else if (type instanceof sequelize.INTEGER || type instanceof sequelize.BIGINT) {

    }
  }

  try {
    return JSON.parse(value);
  } catch(err) {
    return value;
  }
};

List.prototype.fetch = function(req, res, context) {
  var self = this,
      model = this.model,
      options = context.options || {},
      criteria = context.criteria || {},
      // clone the resource's default includes so we can modify them only for this request
      include = _.cloneDeepWith(this.include, value => {
        // ...but don't clone Sequelize models
        if (value.prototype && value.prototype.toString().includes('SequelizeInstance:'))
          return value;
      }),
      includeAttributes = this.includeAttributes,
      Sequelize = this.resource.sequelize,
      defaultCount = 100,
      count = +context.count || +req.query.count || defaultCount,
      offset = +context.offset || +req.query.offset || 0;

  var stringOperators = [
    Sequelize.Op.like, Sequelize.Op.iLike, Sequelize.Op.notLike, Sequelize.Op.notILike,
  ];

  // only look up attributes we care about
  options.attributes = options.attributes || this.resource.attributes;

  // account for offset and count
  offset += context.page * count || req.query.page * count || 0;
  if (count < 0) count = defaultCount;

  options.offset = offset;
  options.limit = count;
  if (!this.resource.pagination)
    delete options.limit;

  if (context.include && context.include.length) {
    include = include.concat(context.include);
  }
  if (include.length) {
    options.include = include;
  }


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
  


  var searchParams = this.resource.search.length ? this.resource.search : [this.resource.search];
  searchParams.forEach(function(searchData) {
    var searchParam = searchData.param;
    if (_.has(req.query, searchParam)) {
      var search = [];
      var searchOperator = searchData.operator || Sequelize.Op.like;
      var searchOverride = searchData.override || undefined;
      var searchAttributes =
        searchData.attributes || getKeys(model.rawAttributes);
      searchAttributes.forEach(function(attr) {
        if(stringOperators.indexOf(searchOperator) !== -1 && attr.indexOf('.') === -1){
          var attrType = model.rawAttributes[attr].type;
          if (!(attrType instanceof Sequelize.STRING) &&
              !(attrType instanceof Sequelize.TEXT)) {
            // NOTE: Sequelize has added basic validation on types, so we can't get
            //       away with blind comparisons anymore. The feature is up for
            //       debate so this may be changed in the future
            return;
          }
        }

        var item = {};
        var query = {};
        var searchString;
        if (searchOperator !== Sequelize.Op.like) {
          searchString = req.query[searchParam];
        } else {
          searchString = '%' + req.query[searchParam] + '%';
        }
        if(searchOverride === "STARTS_WITH"){
          searchString = req.query[searchParam] + '%';
          searchOperator = Sequelize.Op.like;
        }
        query[searchOperator] = searchString;
        item[attr] = query;
        search.push(item);
      });
      
      if (getKeys(criteria).length)
        criteria = Sequelize.and(criteria, Sequelize.or.apply(null, search));
      else
        criteria = Sequelize.or.apply(null, search);
    }
  });

  var sortParam = this.resource.sort.param;
  if (_.has(req.query, sortParam) || _.has(this.resource.sort, 'default')) {
    var order = [];
    var columnNames = [];
    var sortQuery = req.query[sortParam] || this.resource.sort.default || '';
    var sortColumns = sortQuery.split(',');
    sortColumns.forEach(function(sortColumn) {
      var desc = sortColumn.indexOf('-') === 0;
      var direction = desc ? 'DESC' : 'ASC';
      var actualName = desc ? sortColumn.substring(1) : sortColumn;
      columnNames.push(actualName);

      // If the column lookup has a '.' then assume we're sorting by an included associated model.
      // 
      // It would be better to search the resource.include and find the correct
      // sequelize model class to use the recommended format e.g.
      // order: [
      //    [{ model: models.NestedModel, as: 'NestedModel' }, 'nestedField', 'asc'],
      //    ['primaryField', 'asc'],
      // ]
      //
      // This also may require "context.options = {subQuery: false}" if you use a
      // belongsToMany association
      //
      // but as a quick solution we can use a Sequelize.literal
      var lookupName = actualName.indexOf('.') > -1 ? Sequelize.literal(actualName) : actualName;
      order.push([lookupName, direction]);
    });
    var allowedColumns = this.resource.sort.attributes || getKeys(model.rawAttributes);
    var disallowedColumns = _.difference(columnNames, allowedColumns);
    if (disallowedColumns.length) {
      throw new errors.BadRequestError('Sorting not allowed on given attributes', disallowedColumns);
    }

    if (order.length)
      options.order = order;
  }

  // all other query parameters are passed to search
  var extraSearchCriteria = _.reduce(req.query, function(result, value, key) {
    if (_.has(model.rawAttributes, key)) result[key] = self._safeishParse(value, model.rawAttributes[key].type, Sequelize);
    return result;
  }, {});

  if (getKeys(extraSearchCriteria).length)
    criteria = _.assign(criteria, extraSearchCriteria);
  
  // look for search parameters that reference properties on included models
  getKeys(req.query).forEach(key => {
    const path = key.split(".");
    let includes = options.include;
    let currentModel = model;
    while (path.length > 1) {
      const alias = path.shift();
      const prop = path[0];
      let include = includes.find(i => i === alias || i.as === alias); // jshint ignore:line
      if (typeof include === "string") {
        // replace simple include definition with model-as syntax
        const association = currentModel.associations[alias];
        include = {
          model: association.target,
          as: association.options.as
        };
        includes.splice(includes.indexOf(alias), 1, include);
      }
      if (
        !include || 
        (path.length > 1 && !include.include) ||
        (path.length === 1 && !include.model && !_.has(include.model.rawAttributes, prop))
      ) return;
      currentModel = include.model;
      includes = include.include;
      if (path.length === 1) {        
        include.where = { [prop]: req.query[key] };
      }
    }
  });

  // do the actual lookup
  if (getKeys(criteria).length)
    options.where = criteria;

  if (req.query.scope) {
    model = model.scope(req.query.scope);
  }

  //bug fix: Previously, counts with includes are higher than actual number of instances returned.
  //Adding distinct true as an option is the recommended fix from sequelize: https://github.com/sequelize/sequelize/issues/4042
  if(options.include && options.include.length > 0){
    options.distinct = true;
  }
 
  // the result from findAndCountAll using options.group has contains an array for result.count
  // If we are grouping handle this in two queries.
  if(options.group){
    return model
      .findAll(options)
      .then(function(result) {
        context.instance = result;
        var start = offset;
        var end = start + result.length - 1;
        end = end === -1 ? 0 : end;

        if (self.resource.associationOptions.removeForeignKeys) {
          _.each(context.instance, function(instance) {
            _.each(includeAttributes, function(attr) {
              delete instance[attr];
              delete instance.dataValues[attr];
            });
          });
        }

        return model
          .count({where: options.where})
          .then(function(result) {
            if (!!self.resource.pagination){
              res.header('Content-Range', 'items ' + [[start, end].join('-'), result].join('/'));
            }
            return context.continue;
          });
      });
  }
  
  
  return model
    .findAndCountAll(options)
    .then(function(result) {
      context.instance = result.rows;
      var start = offset;
      var end = start + result.rows.length - 1;
      end = end === -1 ? 0 : end;

      if (self.resource.associationOptions.removeForeignKeys) {
        _.each(context.instance, function(instance) {
          _.each(includeAttributes, function(attr) {
            delete instance[attr];
            delete instance.dataValues[attr];
          });
        });
      }

      if (!!self.resource.pagination)
        res.header('Content-Range', 'items ' + [[start, end].join('-'), result.count].join('/'));

      return context.continue;
    });
};

module.exports = List;
