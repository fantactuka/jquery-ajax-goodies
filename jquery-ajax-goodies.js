/**
 * jQuery.ajax.goodies
 *
 * Adding `cached` and `concurrency` options that allows more flexible requests
 * management with local caching and concurrents aborting/suppressing
 *
 * @author Maksim Horbachevsky
 */

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    factory(window.jQuery);
  }
})(function($) {

  var goodies = $.ajax.goodies = {
    version: '0.2.1'
  };

  goodies.cached = {
    setAdapter: function(adapter) {
      each('setItem getItem removeItem', function(method) {
        if (!adapter[method]) {
          throwError('Method "{method}" is not implemented in adapter', { method: method })
        }
      });

      this._adapter = adapter;
    },

    getAdapter: function() {
      return this._adapter || throwError('Adapter does not defined');
    }
  };

  goodies.cached.setAdapter({
    storage: {},

    setItem: function(key, value) {
      this.storage[key] = value;
    },

    getItem: function(key) {
      return this.storage[key];
    },

    removeItem: function(key) {
      delete this.storage[key];
    }
  });

  function getRelevantData(cachedData, relevance) {
    var data = cachedData.data,
      stamp = cachedData.stamp,
      valid;

    switch (typeof relevance) {
      case 'boolean':
        valid = relevance;
        break;
      case 'function':
        valid = !!relevance(data, stamp);
        break;
      case 'object':
        valid = now() < +relevance;
        break;
      case 'number':
        valid = stamp > now() - relevance;
        break;
      default:
        throw 'Invalid `cached` option value. Expected Number, Boolean, Function or Date, but got ' + relevance;
    }

    return valid ? data : null;
  }

  function flattenXhr(jqXhr, response) {
    return {
      response: response,
      responseText: jqXhr.responseText,
      responseXML: jqXhr.responseXML,
      readyState: jqXhr.readyState,
      status: jqXhr.status,
      statusText: jqXhr.statusText,
      responseHeaders: jqXhr.getAllResponseHeaders()
    }
  }

  function unflattenXhr(options) {
    var deferred = $.Deferred(),
      mockXhr = {},
      headersObject,
      headersString = options.responseHeaders,
      headersRegExp = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg;

    // These helpers have no affect on request when it's done, so just noop-ing it
    each('setRequestHeader overrideMimeType statusCode abort', function(helper) {
      mockXhr[helper] = $.noop;
    });

    // Copy all plain properties
    each('responseText responseXML readyState status statusText', function(property) {
      mockXhr[property] = options[property];
    });

    // Mock all headers string getter
    mockXhr.getAllResponseHeaders = function() {
      return headersString;
    };

    // Mock single header getter
    mockXhr.getResponseHeader = function(key) {
      var match;

      if (!headersObject) {
        headersObject = {};
        while ((match = headersRegExp.exec(headersString))) {
          headersObject[match[1].toLowerCase()] = match[2];
        }
      }

      match = headersObject[key.toLowerCase()];
      return match || null;
    };

    // Resolving deferred with cached response and status text
    deferred.resolve(options.response, options.statusText).promise(mockXhr);

    // Aliases for ajax promise
    mockXhr.success = mockXhr.done;
    mockXhr.error = mockXhr.fail;
    mockXhr.complete = mockXhr.always;

    return mockXhr;
  }

  function now() {
    return +new Date();
  }

  function each(string, fn) {
    $.each(string.split(' '), function(i, item) {
      fn(item);
    });
  }

  function throwError(message, values) {
    values = values || {};
    message = message.replace(/\{([^{}]+)\}/g, function(match, name) {
      return values[name];
    });

    throw new Error('$.ajax.goodies: ' + message);
  }

  /**
   * Creating key for passed request settings, using type, url and data
   * @param {Object} options
   * @return {String}
   */
  function buildRequestKey(options) {
    return [options.type, options.url, options.data].join(':').toLowerCase();
  }

  /**
   * Ajax cache pre-filter. Adds `cached` option that allows permanent result caching if
   * value is true.
   *
   *
   *
   * Example:
   *    $.ajax({ url: 'test', cached: true });    // Will run actual request
   *    $.ajax({ url: 'test', cached: true });    // Returns cached jqXhr, and does not run request
   *
   *
   *
   * How it works:
   * It stores succeeded jqXhr object. When we have cached result, we abort
   * new request and replace all properties/methods of current jqXhr with cached one. So
   * when this merged jqXhr object is returned — it already a resolved deferred object,
   * and adding any callbacks like .done, .fail, .always will be triggered immediately.
   */
  $.ajaxPrefilter(function(options, origOptions, jqXhr) {
    if (!options.cached) {
      return;
    }

    var requestKey = buildRequestKey(options),
      adapter = goodies.cached.getAdapter(),
      cachedItem = adapter.getItem(requestKey),
      relevantData = cachedItem && getRelevantData(cachedItem, options.cached);

    if (relevantData) {

      // Aborting current request
      jqXhr.abort();

      // Replacing current jqXhr with mocked
      var xhr = unflattenXhr(relevantData);
      $.extend(jqXhr, xhr);

      // Adding callbacks that was passed as standard jqXhr options
      jqXhr.then(options.success, options.error).always(options.complete);
    } else {

      // If any data was cached but no longer relevant
      if (cachedItem) {
        adapter.removeItem(requestKey);
      }

      // Caching response data
      jqXhr.success(function(response) {
        adapter.setItem(requestKey, {
          data: flattenXhr(jqXhr, response),
          stamp: now()
        });
      });
    }
  });

  /**
   * Stores concurrent request in local cache and delete it when request
   * completed (whether with error or success)
   * @param {String} key
   * @param {XMLHttpRequest} jqXhr - jquery xhr deferred
   */
  function storeConcurrent(key, jqXhr) {
    goodies.concurrents[key] = jqXhr;
    jqXhr.always(function() {
      delete goodies.concurrents[key];
    });
  }

  /**
   * Parsing concurrency option into object with predefined key and type, or return
   * null if concurrency is not configured
   * @param {Object} options
   * @return {Object|null}
   */
  function parseConcurrency(options) {
    var concurrency = options.concurrency;

    return concurrency && {
      type: (typeof concurrency === 'string') ? concurrency : concurrency.type,
      key: concurrency.key || buildRequestKey(options)
    };
  }

  /**
   * Ajax concurrency pre-filter. Adds `concurrency` option that allows to manage
   * concurrent requests.
   *
   * Example:
   *    $.ajax({ url: 'test', concurrency: 'suppress' });
   *    $.ajax({ url: 'test', concurrency: 'suppress' }); // If previous request is not finished yet, will abort it
   *
   *    $.ajax({ url: 'test', concurrency: 'abort' });
   *    $.ajax({ url: 'test', concurrency: 'abort' }); // If previous request is not finished yet, will abort new one
   *
   * Concurrent requests are stored by request key, that is built from method (get, post), url and data (get params),
   * but it also possible to define own key for cases when request should manage concurrents, but might use
   * different data. E.g. when requesting for search or suggestions.
   *
   *    $.ajax({ url: 'search', data: {q: 'a'}, concurrency: { key: 'search', type: 'suppress' } });
   *    $.ajax({ url: 'search', data: {q: 'b'}, concurrency: { key: 'search', type: 'suppress' } });
   *
   * In example above requests would be concurrent event though they have a different set of data, since
   * we specified concurrency key.
   */
  $.ajaxPrefilter(function(options, origOptions, jqXhr) {
    var key,
      concurrent,
      concurrency = parseConcurrency(options);

    if (!concurrency) {
      return;
    }

    key = concurrency.key;
    concurrent = goodies.concurrents[key];

    if (concurrent) {
      switch (concurrency.type) {
        case 'suppress':
          concurrent.abort();
          storeConcurrent(key, jqXhr);
          break;

        case 'abort':
          jqXhr.abort();
          break;

        default:
          throw 'Unsupported $.ajax.concurrents type: ' + concurrency.type;
      }
    } else {
      storeConcurrent(key, jqXhr);
    }
  });
});
