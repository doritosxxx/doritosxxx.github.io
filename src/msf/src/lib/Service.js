"use strict";

var util = require("./util");
var props = util.props;
var Application = require('./Application');
var Channel = require('./Channel');


/**
 * A Service instance represents the multiscreen service running on the remote device, such as a SmartTV
 *
 * @class Service
 * @hide-constructor
 *
 */

function Service(description){

    /**
     * The id of the service
     *
     * @member {String} Service#id
     * @readonly
     */
    this.id = description.id;

    /**
     * The name of the service (Living Room TV)
     *
     * @member {String} Service#name
     * @readonly
     */
    this.name = description.name;

    /**
     * The version of the service (x.x.x)
     *
     * @member {String} Service#version
     * @readonly
     */
    this.version = description.version;

    /**
     * The type of the service (Samsung SmartTV)
     *
     * @member {String} Service#type
     * @readonly
     */
    this.type = description.type;

    /**
     * The uri of the service (http://<ip>:<port>/api/v2/)
     *
     * @member {String} Service#uri
     * @readonly
     */
    this.uri = description.uri;

    /**
     * A hash of additional information about the device the service is running on
     *
     * @member {String} Service#device
     * @readonly
     */
    this.device = description.device;

    props.readOnly(this,['id','name','version','type','uri','device']);

}

/**
 * Creates {@link Application} instances belonging to that service
 *
 * @param {String} id An installed application id or url of the web application
 * @param {String} channelUri The URI of the channel to connect to.
 * @returns {Application}
 *
 * @example
 var application = service.application('http://mydomain/myapp/', 'com.mydomain.myapp');
 */
Service.prototype.application = function(id, channelUri){

    return new Application(this, id, channelUri);

};

/**
 * creates a channel of the service ('mychannel')
 *
 * @param {String} uri The uri of the Channel
 * @returns {Channel}
 *
 * @example
 var channel = service.channel('com.mydomain.myapp');
 */
Service.prototype.channel = function(uri){

    return new Channel(this, uri);

};


/***
 * Retrieves a reference to the service running on the current device
 * (public api should use msf.local)
 *
 * @protected
 *
 * @param {Function} callback The callback handler
 * @param {Error} callback.err The callback handler
 * @param {Service} callback.service The service instance
 *
 */
Service.getLocal = function(callback){

    Service.getByURI('http://127.0.0.1:8001/api/v2/', callback);

};

/***
 * Retrieves a service instance by it's uri
 * (public api should use msf.remote)
 *
 * @protected
 *
 * @param {String} uri The uri of the service (http://<ip>:<port>/api/v2/)
 * @param {Function} callback The callback handler
 * @param {Error} callback.err The callback handler
 * @param {Service} callback.service The service instance
 *
 */
Service.getByURI = function(uri, callback){

    var oReq = new XMLHttpRequest();
    oReq.timeout = 5000;
    oReq.ontimeout = function(){callback();};
    oReq.onload = function() {

        if(this.status === 200){
            try{
                var result = JSON.parse(this.responseText);
                callback(null, new Service(result));
            }catch(e){  callback(e); }
        }else{
            callback();
        }
    };
    oReq.open("get", uri, true);
    oReq.send();

};


module.exports = Service;
