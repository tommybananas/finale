'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Resource(pagination)', function() {
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
      }
    }, {
      underscored: true,
      timestamps: false
    });
  });

  [
    {
      name: 'with default pagination',
      configuration: {}
    },
    {
      name: 'without pagination',
      configuration: {
        pagination: false
      }
    }
  ].forEach(function(suite) {

    describe('list ' + suite.name, function() {

      before(function() {
        return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
          .then(function() {
            rest.initialize({ app: test.app, sequelize: test.Sequelize });
            rest.resource(_.extend(suite.configuration, {
              model: test.models.User,
              endpoints: ['/users', '/users/:id']
            }));

            test.userlist = [
              { username: 'arthur', email: 'arthur@gmail.com' },
              { username: 'james', email: 'james@gmail.com' },
              { username: 'henry', email: 'henry@gmail.com' },
              { username: 'william', email: 'william@gmail.com' },
              { username: 'edward', email: 'edward@gmail.com' }
            ];

            return test.models.User.bulkCreate(test.userlist);
          });
      });

      after(function() {
        return test.clearDatabase()
          .then(function() { test.closeServer(); });
      });

      it('should list records with no criteria', function(done) {
        request.get({ url: test.baseUrl + '/users' }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
          expect(records).to.eql(test.userlist);

          if (!_.has(suite.configuration, 'pagination') || !!suite.configuration.pagination)
            expect(response.headers['content-range']).to.equal('items 0-4/5');
          else
            expect(response.headers['content-range']).to.not.exist;

          done();
        });
      });

    });

  });
});

describe('Resource(pagination with associated models)', function() {
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
      }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Hobby = test.db.define('hobby', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: test.Sequelize.STRING }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Profile = test.db.define('profile', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nickname: { type: test.Sequelize.STRING }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.User.hasOne(test.models.Profile, {
      as: 'profile',
    });
    test.models.User.belongsToMany(test.models.Hobby, {
      as: 'hobbies',
      through: 'user_hobbies',
      timestamps: false
    });
    test.models.Hobby.belongsToMany(test.models.User, {
      as: 'users',
      through: 'user_hobbies',
      timestamps: false
    });

    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });
        const userResource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id'],
          include: [
            {
              model: test.models.Hobby,
              as: 'hobbies',
            },
            {
              model: test.models.Profile,
              attributes: ['nickname'],
              as: 'profile',
            },
          ],
          sort: {
            attributes: ['profile.nickname', 'username'],
          }
        });

        userResource.list.fetch.before(function(req, res, context) {
          context.options = {
            subQuery: false
          };
          return context.continue;
        });

        test.userlist = [
          { username: 'arthur', email: 'arthur@gmail.com' },
          { username: 'james', email: 'james@gmail.com' },
          { username: 'henry', email: 'henry@gmail.com' },
          { username: 'william', email: 'william@gmail.com' },
          { username: 'edward', email: 'edward@gmail.com' }
        ];

        test.hobbylist = [
          { name: 'reading' },
          { name: 'bowling' },
          { name: 'running' },
          { name: 'swimming' },
          { name: 'coding' }
        ];
        
        test.profilelist = [
          { nickname: 'X' },
          { nickname: 'Z' },
          { nickname: 'C' },
          { nickname: 'B' },
          { nickname: 'A' }
        ];

        return Promise.all([
          test.models.User.bulkCreate(test.userlist),
          test.models.Hobby.bulkCreate(test.hobbylist),
          test.models.Profile.bulkCreate(test.profilelist)
        ]).then(function(){
          return Promise.all([
            test.models.User.findAll(),
            test.models.Hobby.findAll(),
            test.models.Profile.findAll()
          ]).then(function(results){
            const users = results[0];
            const hobbies = results[1];
            const profiles = results[2];
            return Promise.all(
              users.map((u, i) => u.setProfile(profiles[i]))
            ).then(function(){
              return Promise.all(
                users.map((u, i) => u.setHobbies(hobbies))
              );
            });
          });
        });

      });
  });

  after(function() {
    return test.clearDatabase()
      .then(function() { test.closeServer(); });
  });

  it('should list records with associated models', function(done) {
    request.get({ url: test.baseUrl + '/users' }, function(err, response, body) {
      expect(response.statusCode).to.equal(200);
      var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
      records.forEach(r => {
        expect(r.profile.nickname).to.be.a('string');
      });
      expect(response.headers['content-range']).to.equal('items 0-4/5');
      done();
    });
  });

  it('should list the correct number of records when sorting by a nested field', function(done) {
    request.get({ url: test.baseUrl + '/users?sort=profile.nickname' }, function(err, response, body) {
      expect(response.statusCode).to.equal(200);
      //var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
      expect(response.headers['content-range']).to.equal('items 0-4/5');
      done();
    });
  });
});
