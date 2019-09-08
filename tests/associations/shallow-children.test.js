'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('ShallowAndChildren', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.App = test.db.define('apps', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Task = test.db.define('tasks', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.User.hasMany(test.models.Task);
    test.models.App.hasMany(test.models.User);
    test.models.User.belongsTo(test.models.App);
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        test.resource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id'],
          associations: true
        });

   
        return Promise.all([
          test.models.User.create({ name: 'sumo' }),
          test.models.User.create({ name: 'ninja' }),
          test.models.Task.create({ name: 'eat' }),
          test.models.Task.create({ name: 'sleep' }),
          test.models.Task.create({ name: 'eat again' }),
          test.models.Task.create({ name: 'fight' })
        ]).spread(function(user, user2, task1, task2, task3, task4) {
          return Promise.all([
            user.setTasks([task1, task2, task3]),
            user2.setTasks([task4])
          ]);
        });
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  // TESTS
  describe('parent read', function() {

    it('should return associated data in same request with absent shallow flag', function (done) {
      request.get({
        url: test.baseUrl + '/users/1'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          "app": null,
          "app_id": null,
          "id": 1,
          "name": "sumo",
          "tasks": [
            {id: 1, name: 'eat', user_id: 1},
            {id: 2, name: 'sleep', user_id: 1},
            {id: 3, name: 'eat again', user_id: 1}
          ]
        });
        done();
      });
    });

    //WE TEST HERE THAT context.shallow = true results in NO CHILDREN being returned.
    it('should return shallow data only in same request with shallow flag TRUE', function (done) {
      test.resource.read.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/1'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          "app_id": null,
          "id": 1,
          "name": "sumo"
        });
        done();
      });
    });

    //here we're setting shallow equal to true, but also specifically requesting 
    //data for the tasks association via url query parameter ?children=tasks
    it('should return NAMED CHILDREN (?children=tasks) associated data in same request with shallow true', function (done) {
      test.resource.read.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });
      request.get({
        url: test.baseUrl + '/users/1?children=tasks'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          "app_id": null,
          "id": 1,
          "name": "sumo",
          "tasks": [
            {id: 1, name: 'eat', user_id: 1},
            {id: 2, name: 'sleep', user_id: 1},
            {id: 3, name: 'eat again', user_id: 1}
          ]
        });
        done();
      });
    });



  });

  describe('read', function() {

    it('deep leaf url should return associated data by url, despite shallow context', function(done) {

      test.resource.read.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/1/tasks/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({ id: 1, name: 'eat', user_id: 1 });
        done();
      });
    });

  });

  describe('list', function() {
    it('should return associated data by url, with no shallow flag present', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          { id: 1, name: 'eat', user_id: 1 },
          { id: 2, name: 'sleep', user_id: 1 },
          { id: 3, name: 'eat again', user_id: 1 }
        ]);

        done();
      });
    });

    it('should return associated deep leaf data by url, with with shallow flag = true', function(done) {

      test.resource.list.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/1/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          { id: 1, name: 'eat', user_id: 1 },
          { id: 2, name: 'sleep', user_id: 1 },
          { id: 3, name: 'eat again', user_id: 1 }
        ]);

        done();
      });
    });

    it('should return simple list without associated data, with with shallow flag = true', function(done) {

      test.resource.list.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          {   app_id: null, id: 1, name: "sumo" },
          {   app_id: null, id: 2, name: "ninja" },
        ]);

        done();
      });
    });
    it('should return simple list with associated data, with with shallow flag = true and children=tasks', function(done) {

      test.resource.list.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/?children=tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          {   app_id: null, id: 1, name: "sumo", tasks: [
            { id: 1, name: 'eat', user_id: 1 },
            { id: 3, name: 'eat again', user_id: 1 },
            { id: 2, name: 'sleep', user_id: 1 },
          ] },
          {   app_id: null, id: 2, name: "ninja", tasks: [
            { id: 4, name: 'fight', user_id: 2 },
          ]},
        ]);

        done();
      });
    });

    it('should return simple list with associated data, including null parent, with with shallow flag = true and children=tasks|app', function(done) {

      test.resource.list.fetch.before(function(req,res,context) { 
        context.shallow = true;
        return context.continue;
      });

      request.get({
        url: test.baseUrl + '/users/?children=tasks|app'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          {  app: null, app_id: null, id: 1, name: "sumo", tasks: [
            { id: 1, name: 'eat', user_id: 1 },
            { id: 3, name: 'eat again', user_id: 1 },
            { id: 2, name: 'sleep', user_id: 1 },
          ] },
          {  app: null,  app_id: null, id: 2, name: "ninja", tasks: [
            { id: 4, name: 'fight', user_id: 2 },
          ]},
        ]);

        done();
      });
    });


  });

});
