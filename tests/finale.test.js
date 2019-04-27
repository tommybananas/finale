'use strict';

var Sequelize = require('sequelize'),
    finale = require('../lib'),
    expect = require('chai').expect;

describe('Finale', function() {
  it('should throw an exception when initialized without arguments', function(done) {
    expect(finale.initialize).to.throw('please specify an app');
    done();
  });

  it('should throw an exception when initialized without a sequelize instance', function(done) {
    expect(finale.initialize.bind(finale, {
      app: {}
    })).to.throw('please specify a sequelize instance');
    done();
  });

  it('should throw an exception when initialized with an invalid sequelize instance', function(done) {
    expect(finale.initialize.bind(finale, {
      app: {},
      sequelize: {},
    })).to.throw('invalid sequelize instance');
    done();
  });

  it('should throw an exception with an invalid updateMethod', function(done) {
    expect(finale.initialize.bind(finale, {
      app: {},
      sequelize: {version: 0, STRING:0, TEXT:0, and: 0, or: 0},
      updateMethod: 'dogs'
    })).to.throw('updateMethod must be one of PUT, POST, or PATCH');
    done();
  });

  it('should allow the user to pass in a sequelize instance rather than prototype', function() {
    var db = new Sequelize('main', null, null, {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: (process.env.SEQ_LOG ? console.log : false),
      operatorsAliases: false
    });

    finale.initialize({
      app: {},
      sequelize: db
    });

    // required sequelize parameters for the list searching
    expect(finale.sequelize.STRING).to.exist;
    expect(finale.sequelize.TEXT).to.exist;
    expect(finale.sequelize.and).to.exist;
    expect(finale.sequelize.or).to.exist;
  });
});
