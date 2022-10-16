'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    rest = require('../../lib'),
    test = require('../support');

describe('issue 66', function() {
  before(function() {
    test.models.Entry = test.db.define('Entry', { name: test.Sequelize.STRING }, { timestamps: false, });
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });

        test.entryResource = rest.resource({
          model: test.models.Entry,
          associations: true,
          attributes: ['name'],
          endpoints: ['/api/entries', '/api/entries/:name'],
          search: {
            operator: test.Sequelize.Op.substring, 
            param: 'substr', 
            attributes: ['name']
          },
        });

        return Promise.all([
          test.models.Entry.create({ name: 'testEntry' }),
        ]);
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  it('should search with substring', function(done) {
    request.get({
      url: test.baseUrl + '/api/entries?substr=ntr'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      expect(JSON.parse(response.body)[0].name).to.equal('testEntry');
      done();
    });
  });
});
