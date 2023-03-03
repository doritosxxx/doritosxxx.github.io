"use strict";

var msf = require('./lib/msf');

msf.version = '{{version}}';

if (typeof module !== 'undefined' && module.exports) {
    module.exports = msf;
} else {
    window.msf = msf;
}

module.exports = msf;
