jquery-ajax-goodies v0.1.1 [![Build Status](https://travis-ci.org/fantactuka/jquery-ajax-goodies.png?branch=master)](https://travis-ci.org/fantactuka/jquery-ajax-goodies)
==================

Adding `cached` and `concurrency` options for better requests managing.

# Installation
Just copy [jquery-ajax-goodies.js](https://raw.github.com/fantactuka/jquery-ajax-goodies/master/jquery-ajax-goodies.js)

# Usage
## Concurrency 

Adds `concurrency` option that allows to manage concurrent requests.

Example:

```js
$.ajax({ url: '/test', concurrency: 'suppress' });
$.ajax({ url: '/test', concurrency: 'suppress' }); // If previous request is not finished yet, will abort it

$.ajax({ url: '/test', concurrency: 'abort' });
$.ajax({ url: '/test', concurrency: 'abort' }); // If previous request is not finished yet, will abort new one
```

Concurrent requests are stored by request key, that is built from method (get, post), url and data (get params),
but it also possible to define own key for cases when request should manage concurrents, but might use
different data. E.g. when requesting for search or suggestions.

```js
$.ajax({ url: '/search', data: {q: 'a'}, concurrency: { key: 'search', type: 'suppress' } });
$.ajax({ url: '/search', data: {q: 'b'}, concurrency: { key: 'search', type: 'suppress' } });
```

In example above requests would be concurrent event though they have a different set of data, since
we specified concurrency key. 

## Cached

Adds `cached` option that allows permanent result caching if value is true.

Example:
```js
$.ajax({ url: 'test', cached: true });    // Will run actual request
$.ajax({ url: 'test', cached: true });    // Returns cached jqXhr, and does not run request
```

Alternatives:
```js
// Cache will be valid during next 10000 ms
$.ajax({ 
  url: 'test', 
  cached: 10000 
}); 

// Cache will be valid due date
$.ajax({ 
  url: 'test', 
  cached: new Date('01/01/2014') 
}); 

// Cache will be valid if function returns non-falsy value.
// `cachedValue` is { stamp: <Date>, jqXhr: <jqXhr> } object
$.ajax({ 
  url: 'test', 
  cached: function(cache) {
    ....
    return result;
  } 
}); 
```

**NOTE**
Currently it only supports permanent cache during page-lifecycle without
TTL or local-storage functionality.

It stores succeeded jqXhr object. When we have cached result, we abort
new request and replace all properties/methods of current jqXhr with cached one. So
when this merged jqXhr object is returned — it already a resolved deferred object,
and adding any callbacks like .done, .fail, .always will be triggered immediately.
