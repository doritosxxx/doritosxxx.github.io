"use strict";

var util = require("./util");
var EventEmitter = require('./EventEmitter');
var Service = require('./Service');
var Search = require('./Search');

// We will use a singleton for search so that we don't create multiple frames in the page
var search = null;


/**
 * The 'msf' module/object is the entry point for the API.
 * If including the library via script tag it will be a global object attached to the window
 * or the export of the module if using amd/commonjs (requirejs/browserify)
 *
 * @module msf
 *
 */


/*
 Can be used to debug if there is an issue
 msf.logger.level = 'error'|'warn'|'info'|'verbose'|'debug'|'silly'
 */
module.exports.logger  = util.logger;


/**
 * Searches the local network for compatible multiscreen services
 *
 * @param {Function} [callback] If a callback is passed the search is immediately started.
 * @param {Error} callback.err The callback handler
 * @param {Service[]} callback.result An array of {@link Service} instances found on the network
 * @returns {Search} A search instance (a singleton is used to reduce page resources)
 *
 * @example
 * msf.search(function(err, services){
 *   if(err) return console.error('something went wrong', err.message);
 *   console.log('found '+services.length+' services');
 * }
 *
 * // OR
 *
 * var search = msf.search();
 * search.on('found', function(service){
 *    console.log('found service '+service.name);
 * }
 * search.start();
 *
 */
module.exports.search = function(callback){

    // Create the single instance if we don't already have one
    if(!search) search = new Search();

    // If there is a callback defined, listen once for results and start the search
    if(callback) {
        search.once('found',function(services){
            callback(null, services);
        });

        // start on next tick to support search callbacks and events
        setTimeout(function(){ search.start(); },0);

    }

    return search;

};


/**
 * Retrieves a reference to the service running on the current device. This is typically only used on the 'host' device.
 *
 * @param {Function} callback The callback handler
 * @param {Error} callback.error
 * @param {Service} callback.service The service instance
 *
 * @example
 * msf.local(function(err, service){
 *   console.log('my service name is '+service.name);
 * }
 */
module.exports.local = function(callback){

    Service.getLocal(callback);

};

/**
 * Retrieves a service instance by it's uri
 *
 * @param {String} uri The uri of the service (http://host:port/api/v2/)
 * @param {Function} callback The callback handler
 * @param {Error} callback.error
 * @param {Service} callback.service The service instance
 *
 * @example
 * msf.remote('http://host:port/api/v2/',function(err, service){
 *   console.log('the service name is '+service.name);
 * }
 */
module.exports.remote = function(uri, callback){

    Service.getByURI(uri, callback);

};
