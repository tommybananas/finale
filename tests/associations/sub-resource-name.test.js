'use strict';

var expect = require('chai').expect,
    rest = require('../../lib'),
    test = require('../support');

describe('Associations(named sub-resources)', function() {
  describe('without using "as" to name an association', function() {
    it('should name the sub-resources according to the model name', function(done) {
      var Person = test.db.define('person', { name: { type: test.Sequelize.STRING } }, { underscored: true }),
          Course = test.db.define('course', { name: { type: test.Sequelize.STRING } }, { underscored: true });
      Course.hasMany(Person);
      Course.hasOne(Person);
      rest.initialize({
        app: test.app,
        sequelize: test.Sequelize
      });
      var resource = rest.resource({model: Course,
                                    endpoints: ['/courses', '/courses/:id'],
                                    associations: true});
      expect(resource).to.not.have.property('students');
      expect(resource).to.not.have.property('teacher');
      expect(resource).to.have.property('people');
      expect(resource).to.have.property('person');
      done();
    });
  });
  describe('using "as" to name an association', function() {
    it('should name the sub-resources using the name provided by "as"', function(done) {
      var Person = test.db.define('person', { name: { type: test.Sequelize.STRING } }, { underscored: true }),
          Course = test.db.define('course', { name: { type: test.Sequelize.STRING } }, { underscored: true });
      Course.hasMany(Person, { as: 'students' });
      Course.hasOne(Person, { as: 'teacher' });
      rest.initialize({
        app: test.app,
        sequelize: test.Sequelize
      });
      var resource = rest.resource({model: Course,
                                    endpoints: ['/courses', '/courses/:id'],
                                    associations: true});
      expect(resource).to.have.property('students');
      expect(resource).to.have.property('teacher');
      expect(resource).to.not.have.property('people');
      expect(resource).to.not.have.property('person');
      done();
    });
  });
});
