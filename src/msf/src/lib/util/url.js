"use strict";
var queryString = require('./querystring');

var url = {

    isValid : function(u){

        var pattern = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
        return u.match(pattern) ? true : false;
    },

    parse : function(u){

        var oUrl = {};
        var parser = document.createElement('a');
        parser.href = u; // "http://example.com:3000/pathname/?search=test#hash";

        oUrl.href = parser.href; // => "http://ip:port/path/page?query=string#hash"
        oUrl.protocol = parser.protocol; // => "http:"
        oUrl.hostname = parser.hostname; // => "example.com"
        oUrl.port = parser.port;     // => "3000"
        oUrl.pathname = parser.pathname; // => "/pathname/"
        oUrl.search = parser.search;   // => "?search=test"
        oUrl.hash = parser.hash;     // => "#hash"
        oUrl.host = parser.host;     // => "example.com:3000"
        oUrl.queryString = queryString.parse(parser.search);

        return oUrl;
    }


};

module.exports = url;
