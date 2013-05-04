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
  /**
   * Extension storage. Exposed as public property to allow better testability and debugging
   * @type {Object}
   */
  var goodies = $.ajax.goodies = {
    cache: {},
    concurrents: {},
    version: '0.1.0'
  };

  /**
   * Creating key for passed request settings, using type, url and data
   * @param {Object} options
   * @return {String}
   */
  function createKey(options) {
    return [options.type, options.url, options.data].join(':').toLowerCase();
  }

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
      key: concurrency.key || createKey(options)
    };
  }

  /**
   * Ajax cache pre-filter. Adds `cached` option that allows permanent result caching if
   * value is true.
   *
   * Example:
   *    $.ajax({ url: 'test', cached: true });    // Will run actual request
   *    $.ajax({ url: 'test', cached: true });    // Returns cached jqXhr, and does not run request
   *
   * NOTE:
   * It stores succeeded jqXhr object. When we have cached result, we abort
   * new request and replace all properties/methods of current jqXhr with cached one. So
   * when this merged jqXhr object is returned — it already a resolved deferred object,
   * and adding any callbacks like .done, .fail, .always will be triggered immediately.
   */
  $.ajaxPrefilter(function(options, origOptions, jqXhr) {
    var key = createKey(options),
      cached = options.cached,
      cachedJqXhr = cached && goodies.cache[key];


    if (cachedJqXhr) {
      jqXhr.abort();

      // Replacing current jqXhr with cached one
      $.extend(jqXhr, cachedJqXhr);

      // Adding callbacks that was passed as standard jqXhr options
      jqXhr.then(options.success, options.error).always(options.complete);
    } else {
      if (cached) {
        jqXhr.success(function() {
          // Storing succeeded jqXhr object
          goodies.cache[key] = jqXhr;
        });
      }
    }
  });

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
