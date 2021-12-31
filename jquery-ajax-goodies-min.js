! function(e) { "function" == typeof define && define.amd ? define(["jquery"], e) : "object" == typeof exports ? module.exports = e(require("jquery")) : e(window.jQuery) }(function(e) {
    var t = e.ajax.goodies = { version: "0.3.2", concurrents: {} };

    function r(e, t) { return { response: t, responseText: e.responseText, responseXML: e.responseXML, readyState: e.readyState, status: e.status, statusText: e.statusText, responseHeaders: e.getAllResponseHeaders() } }

    function n() { return +new Date }

    function o(t, r) { e.each(t.split(" "), function(e, t) { r(t) }) }

    function s(e, t) { throw t = t || {}, e = e.replace(/\{([^{}]+)\}/g, function(e, r) { return t[r] }), new Error("$.ajax.goodies: " + e) }

    function a(e) { return [e.type, e.url, e.data].join(":").toLowerCase() }

    function c(e, r) { t.concurrents[e] = r, r.always(function() { delete t.concurrents[e] }) }
    t.cached = { setAdapter: function(e) { o("setItem getItem removeItem", function(t) { e[t] || s('Method "{method}" is not implemented in adapter', { method: t }) }), this._adapter = e }, getAdapter: function() { return this._adapter || s("Adapter does not defined") } }, t.cached.setAdapter({ storage: {}, setItem: function(e, t) { this.storage[e] = t }, getItem: function(e) { return this.storage[e] }, removeItem: function(e) { delete this.storage[e] } }), e.ajaxPrefilter(function(s, c, u) {
        if (s.cached) {
            var i = a(s),
                d = t.cached.getAdapter(),
                f = d.getItem(i),
                p = f && function(e, t) {
                    var r, o = e.data,
                        s = e.stamp;
                    switch (typeof t) {
                        case "boolean":
                            r = t;
                            break;
                        case "function":
                            r = !!t(o, s);
                            break;
                        case "object":
                            r = n() < +t;
                            break;
                        case "number":
                            r = s > n() - t;
                            break;
                        default:
                            throw "Invalid `cached` option value. Expected Number, Boolean, Function or Date, but got " + t
                    }
                    return r ? o : null
                }(f, s.cached);
            if (p) {
                u.abort();
                var l = function(t) {
                    var r, n = e.Deferred(),
                        s = {},
                        a = t.responseHeaders,
                        c = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm;
                    return o("setRequestHeader overrideMimeType statusCode abort", function(t) { s[t] = e.noop }), o("responseText responseXML readyState status statusText", function(e) { s[e] = t[e] }), s.getAllResponseHeaders = function() { return a }, s.getResponseHeader = function(e) {
                        var t;
                        if (!r)
                            for (r = {}; t = c.exec(a);) r[t[1].toLowerCase()] = t[2];
                        return (t = r[e.toLowerCase()]) || null
                    }, n.resolve(t.response, t.statusText).promise(s), s.success = s.done, s.error = s.fail, s.complete = s.always, s
                }(p);
                e.extend(u, l), u.then(s.success, s.error).always(s.complete)
            } else f && d.removeItem(i), console.log(u), u.done(function(e) { d.setItem(i, { data: r(u, e), stamp: n() }) })
        }
    }), e.ajaxPrefilter(function(e, r, n) {
        var o, s, u = function(e) { var t = e.concurrency; return t && { type: "string" == typeof t ? t : t.type, key: t.key || a(e) } }(e);
        if (u)
            if (o = u.key, s = t.concurrents[o]) switch (u.type) {
                case "suppress":
                    s.abort(), c(o, n);
                    break;
                case "abort":
                    n.abort();
                    break;
                default:
                    throw "Unsupported $.ajax.concurrents type: " + u.type
            } else c(o, n)
    })
});