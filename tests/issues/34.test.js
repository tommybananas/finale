'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    // _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('issue 34', function() {
  let deletedInstance = null;

  before(function() {
    test.models.Entry = test.db.define('Entry', { name: test.Sequelize.STRING }, { timestamps: false, });
  });

  beforeEach(function() {
    deletedInstance = null;
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });

        test.entryResource = rest.resource({
          model: test.models.Entry,
          associations: true,
          attributes: ['name'],
          endpoints: ['/api/entry', '/api/entry/:name']
        });

        test.entryResource.use({
          delete: { write: { after: (req, res, context) => {
            deletedInstance = context.deletedInstance;
            return context.continue;
          }}}
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

  it('should set deletedInstance', function(done) {
    request.delete({
      url: test.baseUrl + '/api/entry/testEntry'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      expect(deletedInstance).to.be.an('object');
      done();
    });
  });
});
