(function() {

  console.log('ajax added');

  /**
   * Slightly modified pivotal's helper (http://github.com/pivotal/jasmine-ajax)
   * to allow more flexible mocking and expectations checking
   */
  var extend = Object.extend || jQuery.extend;

  function MockXMLHttpRequest() {
    extend(this, {
      requestHeaders: {},
      readyState: 0,
      status: null,
      responseText: null
    });

    return this;
  }

  extend(MockXMLHttpRequest.prototype, {
    send: function(data) {
      this.params = data;
      this.readyState = 2;
    },

    open: function() {
      this.method = arguments[0];
      this.url = arguments[1];
      this.username = arguments[3];
      this.password = arguments[4];
      this.readyState = 1;
    },

    setRequestHeader: function(header, value) {
      this.requestHeaders[header] = value;
    },

    abort: function() {
      this.readyState = 0;
    },

    onload: function() {
    },

    onreadystatechange: function(isTimeout) {
    },

    response: function(response) {
      this.status = response.status;
      this.responseText = response.responseText || "";
      this.readyState = 4;
      this.responseHeaders = response.responseHeaders ||
      {"Content-type": response.contentType || "application/json" };

      this.onload();
      this.onreadystatechange();
    },

    responseTimeout: function() {
      this.readyState = 4;
      jasmine.Clock.tick(jQuery.ajaxSettings.timeout || 30000);
      this.onreadystatechange('timeout');
    },

    data: function() {
      var data = {};
      if (typeof this.params !== 'string') return data;
      var params = this.params.split('&');

      for (var i = 0; i < params.length; ++i) {
        var kv = params[i].replace(/\+/g, ' ').split('=');
        var key = decodeURIComponent(kv[0]);
        data[key] = data[key] || [];
        data[key].push(decodeURIComponent(kv[1]));
        data[key].sort();
      }
      return data;
    },

    getResponseHeader: function(name) {
      return this.responseHeaders[name];
    },

    getAllResponseHeaders: function() {
      var responseHeaders = [];
      for (var i in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(i)) {
          responseHeaders.push(i + ': ' + this.responseHeaders[i]);
        }
      }
      return responseHeaders.join('\r\n');
    }
  });

  var Ajax = jasmine.Ajax = {

    isInstalled: function() {
      return jasmine.Ajax.installed === true;
    },

    useMock: function() {
      if (!Ajax.isInstalled()) {
        var spec = jasmine.getEnv().currentSpec;
        spec.after(Ajax.uninstallMock);

        Ajax.installMock();
      }
    },

    assertInstalled: function() {
      if (!Ajax.isInstalled()) {
        throw new Error("Mock ajax is not installed, use jasmine.Ajax.useMock()");
      }
    },

    installMock: function() {
      if (typeof jQuery != 'undefined') {
        Ajax.installJquery();
      } else {
        throw new Error("jasmine.Ajax currently only supports jQuery");
      }
      Ajax.installed = true;
    },

    installJquery: function() {
      Ajax.mode = 'jQuery';
      Ajax.real = jQuery.ajaxSettings.xhr;
      jQuery.ajaxSettings.xhr = Ajax.jQueryMock;

    },

    uninstallMock: function() {
      Ajax.assertInstalled();
      if (Ajax.mode == 'jQuery') {
        jQuery.ajaxSettings.xhr = Ajax.real;
      }
      Ajax.reset();
    },

    reset: function() {
      Ajax.installed = false;
      Ajax.mode = null;
      Ajax.real = null;
    },

    jQueryMock: function() {
      var newXhr = new MockXMLHttpRequest();
      Ajax.calls.push(newXhr);
      Ajax.mostRecentCall = newXhr;
      return newXhr;
    },

    calls: [],
    mostRecentCall: null,
    XMLHttpRequest: MockXMLHttpRequest,
    installed: false,
    mode: null
  };
})();