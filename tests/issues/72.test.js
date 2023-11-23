'use strict';

var Promise = require('bluebird'),
  request = require('request'),
  expect = require('chai').expect,
  _ = require('lodash'),
  rest = require('../../lib'),
  test = require('../support');

describe('issue - object excludes as object on update ', function () {
  before(function () {
    test.models.AncientGod = test.db.define('AncientGod', {
      name: test.Sequelize.STRING,
      nickname: test.Sequelize.STRING,
      special_power: test.Sequelize.STRING
    }, {timestamps: false});
    test.models.Activity = test.db.define('Activity', {
      title: test.Sequelize.STRING,
      description: test.Sequelize.STRING
    }, {timestamps: false});
    test.models.AncientGod.hasMany(test.models.Activity, {onDelete: 'cascade', hooks: true});
    test.models.Activity.belongsTo(test.models.AncientGod);
  });

  beforeEach(function () {
    return Promise.all([test.initializeDatabase(), test.initializeServer()])
      .then(function () {
        rest.initialize({app: test.app, sequelize: test.Sequelize});

        return Promise.all([
            test.models.AncientGod.create({name: 'Thor', special_power: 'Lightning Strike', nickname: 'Thunderman'}),
            test.models.Activity.create({title: 'Run 19 miles', description: 'in 5 hours'}),
            test.models.Activity.create({title: 'pullups', description: 'do 10 pullups'})
          ])
          .spread(function (user, act1, act2) {
            return Promise.all([
              user.setActivities([act1, act2]),
              act1.setAncientGod(user),
              act1.setAncientGod(user)
            ]);
          });
      });
  });

  afterEach(function () {
    return test.clearDatabase()
      .then(function () {
        return test.closeServer();
      });
  });

  it('should work backward-compatible', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: ['special_power', 'nickname'],
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.get({
      url: test.baseUrl + '/api/ancientgods'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', description: 'in 5 hours', AncientGodId: 1},
          {id: 2, title: 'pullups', description: 'do 10 pullups', AncientGodId: 1},
        ],
        id: 1,
        name: 'Thor'
      }]);

      done();
    });
  });

  it('should work on excluded.own - object', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {own: ['special_power', 'nickname']},
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.get({
      url: test.baseUrl + '/api/ancientgods'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', description: 'in 5 hours', AncientGodId: 1},
          {id: 2, title: 'pullups', description: 'do 10 pullups', AncientGodId: 1},
        ],
        id: 1,
        name: 'Thor'
      }]);

      done();
    });
  });

  it('should work on excludedAssociations', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.get({
      url: test.baseUrl + '/api/ancientgods'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ],
        id: 1, name: 'Thor', special_power: 'Lightning Strike', nickname: 'Thunderman'
      }]);

      done();
    });
  });

  it('should work on excludedAssociations AND own parameters', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        own: ['name', 'special_power'],
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.get({
      url: test.baseUrl + '/api/ancientgods'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ],
        id: 1, nickname: 'Thunderman'
      }]);

      done();
    });
  });
  it('should work update with exclude array (CHECK)', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: ['special_power', 'nickname'],
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.put({
      url: test.baseUrl + '/api/ancientgods/1',
      json: {name:'Odin'}
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql({ id: 1,
        name: 'Odin',
        Activities:
          [
            { id: 1,
              title: 'Run 19 miles',
              description: 'in 5 hours',
              AncientGodId: 1 },
            { id: 2,
              title: 'pullups',
              description: 'do 10 pullups',
              AncientGodId: 1 }
         ] 
      });

      done();
    });
  });
  it('should work on excludedAssociations AND own parameters as object (CHECK)', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        own: ['nickname', 'special_power'],
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.put({
      url: test.baseUrl + '/api/ancientgods/1',
      json: {name:'Odan'}
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql({
        Activities: [
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ],
        id: 1, name: 'Odan'
      });

      done();
    });
  });
  it('should exclude update', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        own: ['nickname', 'special_power'],
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });
    request.put({
      url: test.baseUrl + '/api/ancientgods/1',
      json: {nickname:'lightboy'}
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql({
        Activities: [
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ],
        id: 1, name: 'Thor'
      });
      done();
    });
  });

  it('should exclude nested get', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        own: ['nickname', 'special_power'],
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });

    request.get({
      url: test.baseUrl + '/api/ancientgods/1/activities',
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql([
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ]);
      done();
    });
  });


  it('should exclude nested get as association array', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: {
        Activities:{
          excludeAttributes: ['description']
        }
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });

    request.get({
      url: test.baseUrl + '/api/ancientgods/1/activities',
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql([
          {id: 1, title: 'Run 19 miles', AncientGodId: 1},
          {id: 2, title: 'pullups', AncientGodId: 1},
        ]);
      done();
    });
  });

  it('should exclude individual nested get', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: true,
      excludeAttributes: {
        own: ['nickname', 'special_power'],
        Activities: ['description']
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });

    request.get({
      url: test.baseUrl + '/api/ancientgods/1/activities/2',
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql(
          {id: 2, title: 'pullups', AncientGodId: 1}
      );
      done();
    });
  });


  it('should exclude individual nested get as association array', function (done) {
    test.uResource = rest.resource({
      model: test.models.AncientGod,
      associations: {
        Activities:{
          excludeAttributes: ['description']
        }
      },
      endpoints: ['/api/ancientgods', '/api/ancientgods/:id']
    });

    request.get({
      url: test.baseUrl + '/api/ancientgods/1/activities/1',
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      //console.log(result);
      expect(result).to.eql(
          {id: 1, title: 'Run 19 miles', AncientGodId: 1}
      );
      done();
    });
  });
});
