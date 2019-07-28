// build time tests for wsjt plugin
// see http://mochajs.org/

(function() {
  const wsjt = require('../client/wsjt'),
        expect = require('expect.js');

  describe('wsjt plugin', () => {
    describe('expand', () => {
      it('can make itallic', () => {
        var result = wsjt.expand('hello *world*');
        return expect(result).to.be('hello <i>world</i>');
      });
    });
  });

}).call(this);
