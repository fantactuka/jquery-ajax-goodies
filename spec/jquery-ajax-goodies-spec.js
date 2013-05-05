describe('Ajax pre-filters', function() {

  var spy,
    send,
    goodies = $.ajax.goodies,
    Ajax = jasmine.Ajax,
    ajax = function(options, response) {
      var xhr = $.ajax($.extend({
        url: '/test'
      }, options));

      if (response !== false) {
        respond(response);
      }

      return xhr;
    },
    respond = function(response) {
      Ajax.mostRecentCall.response(response || { status: status || 200, responseText: 'OK' });
    };

  beforeEach(function() {
    // Reset concurrency and data cache
    goodies.cache = {};
    goodies.concurrents = {};

    // Mocking ajax and send method
    Ajax.useMock();
    spy = jasmine.createSpy('spy');
    send = spyOn(Ajax.XMLHttpRequest.prototype, 'send').andCallThrough();
  });

  describe('`cached` option', function() {
    it('sends regular request if not cached yet', function() {
      ajax({ cached: true });
      expect(send).toHaveBeenCalled();
    });

    it('sends regular request if no `cached` passed', function() {
      ajax();
      ajax();
      expect(send.callCount).toEqual(2);
    });

    it('does not send request if already cached', function() {
      ajax({ cached: true });
      ajax({ cached: true });

      expect(send.callCount).toEqual(1);
    });

    it('runs all callbacks when using cached result', function() {
      var error = jasmine.createSpy('error');

      ajax({ cached: true });
      ajax({
        cached: true,
        error: error,
        success: spy,
        complete: spy
      }).done(spy).success(spy)
        .fail(error).error(error)
        .always(spy).complete(spy);

      expect(spy.callCount).toEqual(6);
      expect(error).not.toHaveBeenCalled();
    });

    describe('as function', function() {
      var spy;

      beforeEach(function() {
        spy = jasmine.createSpy('fn');
      });

      it('enables cache if returns true', function() {
        spy.andReturn(true);
        ajax({ cached: spy });
        ajax({ cached: spy });

        expect(send.callCount).toEqual(1);
      });

      it('disables cache if returns false', function() {
        spy.andReturn(false);
        ajax({ cached: spy });
        ajax({ cached: spy });

        expect(send.callCount).toEqual(2);
      });
    });

    var withMockDate = function(value, fn) {
      var original = window.Date;
      window.Date = function() {
        return new original(value);
      };

      fn();

      window.Date = original;
    };

    describe('as date', function() {
      it('enables cache if good enough', function() {
        var date = new Date('02/02/2013');

        withMockDate('01/01/2013', function() {
          ajax({ cached: date });
          ajax({ cached: date });
          expect(send.callCount).toEqual(1);
        });
      });

      it('disables cache if too old', function() {
        var date = new Date('12/12/2012');

        withMockDate('01/01/2013', function() {
          ajax({ cached: date });
          ajax({ cached: date });
          expect(send.callCount).toEqual(2);
        });
      });
    });

    describe('as ttl stamp', function() {
      it('enables cache if good enough', function() {
        var stamp = -10000;

        withMockDate('01/01/2013', function() {
          ajax({ cached: stamp });
          ajax({ cached: stamp });
          expect(send.callCount).toEqual(1);
        });
      });

      it('disables cache if too old', function() {
        var stamp = 10000;

        withMockDate('01/01/2013', function() {
          ajax({ cached: stamp });
          ajax({ cached: stamp });
          expect(send.callCount).toEqual(2);
        });
      });
    });
  });

  describe('`concurrency` option', function() {
    it('sends regular request if no concurrents', function() {
      ajax();
      expect(send).toHaveBeenCalled();
    });

    it('aborts previous request if `suppress` passed', function() {
      var xhr = ajax({ concurrency: 'suppress' }, false);
      ajax({ concurrency: 'suppress' }, false);

      expect(xhr.readyState).toEqual(0);
    });

    it('aborts current request if `abort` passed', function() {
      ajax({ concurrency: 'abort' }, false);
      var xhr = ajax({ concurrency: 'abort' }, false);

      expect(xhr.readyState).toEqual(0);
    });

    it('runs regular requests if no concurrents', function() {
      expect(ajax({ concurrency: 'abort' }).readyState).toEqual(4);
      expect(ajax({ concurrency: 'abort' }).readyState).toEqual(4);
    });

    it('allows saving concurrency by key', function() {
      var xhr = ajax({ concurrency: { key: 'search', type: 'abort' }}, false);
      expect(goodies.concurrents.search).toEqual(xhr);
    });

    it('saves concurrency by method + url + data', function() {
      var xhr = ajax({ concurrency: 'abort', data: { a: 1 } }, false);
      expect(goodies.concurrents['get:/test:a=1']).toEqual(xhr);
    });

    it('throws error for invalid concurrency type', function() {
      expect(function() {
        ajax({ concurrency: 'wrong' }, false);
        ajax({ concurrency: 'wrong' }, false);
      }).toThrow('Unsupported $.ajax.concurrents type: wrong');
    });
  });
});
