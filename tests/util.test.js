'use strict';

var util = require('../lib/util');
var expect = require('chai').expect;

describe('Util', function () {
  describe('keys()', function() {
    it("should return a simple object's keys", function () {
      expect(util.keys({some: 'value'})).to.deep.equal(['some']);
      expect(util.keys({some: 'value', an: 'other value'})).to.deep.equal(['some', 'an']);
    });
    
    it("should return an object's symbol keys", function () {
      var obj = {};
      var symbol = Symbol('a_symbol');
      obj[symbol] = 'a value';
      expect(util.keys(obj)).to.deep.equal([symbol]);
    });
    
    it("should mix string and symbol keys", function () {
      var obj = {some: 'value'};
      var symbol = Symbol('a_symbol');
      obj[symbol] = 'a value';
      expect(util.keys(obj)).to.deep.equal(['some', symbol]);
    });
  });
});
