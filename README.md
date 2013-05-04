jquery-ajax-goodies v0.0.1 [![Build Status](https://travis-ci.org/fantactuka/jquery-ajax-goodies?branch=master)](https://travis-ci.org/fantactuka/jquery-ajax-goodies)
==================

Adding `cached` and `concurrency` options

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


