'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('CreateAddToChildren', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: {
        type: test.Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: test.Sequelize.STRING,
        unique: { msg: 'must be unique' },
        validate: { isEmail: true }
      },
      fav_color: {
        type: test.Sequelize.STRING,
        allowNull: true
      }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Note = test.db.define('notes', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      note: { type: test.Sequelize.STRING },
      app_version: { type: test.Sequelize.STRING, allowNull: true }
    }, {
      underscored: true,
      timestamps: false,
    });

    test.models.User.hasMany(test.models.Note);


  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });
        test.userResource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id'],
          associations: true,
          reloadInstances: true
        });
        test.noteResource = rest.resource({
          model: test.models.Note,
          endpoints: ['/notes', '/notes/:id'],
          associations: true,
          reloadInstances: true
        });        
      
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { test.closeServer(); });
  });

  // TESTS


  describe('create context.attributes functionality', function() {
    it('should create a record with null fav_color', function(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' }
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        expect(body.fav_color).to.eql(null);
        done();
      });
    });

    it('should create a record with context.attributes fav_color of blue', function(done) {

      test.userResource.create.write.before(function(req,res,context) { 
        context.attributes = {
					fav_color :  "blue"
				};
        return context.continue;
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' }
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        expect(body.fav_color).to.eql("blue");
        done();
      });
    });

    it('should create a record with context.attributes fav_color of blue, overriding request body', function(done) {

      test.userResource.create.write.before(function(req,res,context) { 
        context.attributes = {
					fav_color :  "blue"
				};
        return context.continue;
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com', fav_color:"red"}
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        expect(body.fav_color).to.eql("blue");
        done();
      });
    });

  });

  
  describe('create add_to_children', function() {
    it('A should create a record with null app_version on fun_note children', function(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' , notes: [
          {note:"my first note"}
        ]}
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);

        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.fav_color).to.eql(null);
        expect(result.notes.length).to.eql(1);
        expect(result.notes[0].app_version).to.eql(null);
        done();

      });
    });

    it('B should create a record with specific add_to_children value on children', function(done) {
      test.userResource.create.write.before(function(req,res,context) { 
        context.add_to_children = {
					app_version :  "1.1.2"
        };
        return context.continue;
      });
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' , notes: [
          {note:"my first note"}
        ]}
      }, function(error, response, body) {

        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        var result = _.isObject(body) ? body : JSON.parse(body);

        expect(result.fav_color).to.eql(null);
        expect(result.notes.length).to.eql(1);
        expect(result.notes[0].app_version).to.eql("1.1.2");
        done();
      });
    });


    it('C should create a record with specific add_to_children value on children, overriding request', function(done) {
      test.userResource.create.write.before(function(req,res,context) { 
        context.add_to_children = {
					app_version :  "1.1.2"
				};
        return context.continue;
      });
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' , notes: [
          {note:"my first note", app_version: "0.2.4"}
        ]}
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        var result = _.isObject(body) ? body : JSON.parse(body);

        expect(result.fav_color).to.eql(null);
        expect(result.notes.length).to.eql(1);
        expect(result.notes[0].app_version).to.eql("1.1.2");
        done();
      });
    });


   



  });
 
  describe('update add_to_children', function() {

    it('Create add_to_children null should stay null, on Update should respect add_to_children', function(done) {
      test.userResource.update.write.before(function(req,res,context) { 
        context.add_to_children = {
					app_version :  "1.1.2"
        };
        return context.continue;
      });
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' , notes: [
          {note:"my first note"}
        ]}
      }, function(error, response, body) {

        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        var result = _.isObject(body) ? body : JSON.parse(body);

        expect(result.fav_color).to.eql(null);
        expect(result.notes.length).to.eql(1);
        expect(result.notes[0].app_version).to.eql(null);
        var userData = {username: 'arthur', email: 'arthur@gmail.com' , notes: [
          {note:"my first note updated"}
        ]};
        request.put({
          url: test.baseUrl + '/users/1',
          json: userData

        }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var result = _.isObject(body) ? body : JSON.parse(body);
          expect(result.notes.length).to.eql(1);
          expect(result.notes[0].app_version).to.eql("1.1.2");
          done();
        });

      
      });
    });


  });
 

  

});
