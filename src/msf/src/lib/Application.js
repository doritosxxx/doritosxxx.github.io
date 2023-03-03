"use strict";

var util    = require("./util");
var logger  = util.logger;
var types   = util.types;
var props   = util.props;
var Channel = require('./Channel');


var TYPE_APP = 'applications';
var TYPE_WEB_APP = 'webapplication';


/**
 * An Application represents an application on the remote device.
 * Use the class to control various aspects of the application such launching the app or getting information
 *
 * @class Application
 * @extends Channel
 *
 * @param {Service} service the underlying service
 * @param {String} id can be an installed app id or url for a webapp
 * @param {String} channelURI a unique channel id (com.myapp.mychannel)
 *
 * @hide-constructor
 */

function Application(service, id, channelURI){

    /* Type checking */
    if(!types.isObject(service)) throw new TypeError('service must be of type Service');
    if(!types.isString(id)) throw new TypeError('id must be a valid string');
    if(!types.isString(channelURI)) throw new TypeError('channelId must be a valid string');

    /***
     * The type of application (web application or installable app)
     * @member {String} Application#type
     * @private
     */
    this.type = id.match(/(file:\/\/|http(s)?:\/\/)/gmi) ? TYPE_WEB_APP : TYPE_APP;

    /* Super Constructor */
    Application.super_.call(this, service, channelURI);


    /**
     * The id of the application (this can be a url or installed application id)
     * @member {String} Application#id
     * @readonly
     */
    this.id = id;


    /***
     * The underlying of the application
     * @member {String} Application#service
     * @private
     */
    this.service = service;


    /*
    Listen for clientDisconnect events and disconnect if host disconnects
    */
    this.on('clientDisconnect', function(client){
        if(client.isHost) this.disconnect();
    }.bind(this));

    /*
     Turn off emitting the connect event from super as the application will provide its own
    */
    this.disableEvent('connect');


    props.readOnly(this,'id');
    props.private(this,'type','service');

}

util.inherits(Application, Channel);



/**
 * Starts and connects to the application on the remote device. Similar to the Channel 'connect' method but
 * within an Application the 'connect' callback and event will be only be called when the remote application has
 * launched and is ready to receive messages.
 *
 * @param {Object} attributes Any attributes to attach to your client
 * @param {Function} callback The callback handler
 * @param {Error} callback.error Any error that may have occurred during the connection or application startup
 * @param {Client} callback.client Your client object
 *
 * @example
 * app.connect({displayName:'Wheezy'},function(err, client){
 *   if(err) return console.error('something went wrong : ', error.code, error.message);
 *   console.info('You are now connected');
 * });
 */
Application.prototype.connect = function(attributes, callback){

    if(!types.isObject(attributes)) throw new TypeError('attributes must be a valid object');
    if(!types.isFunction(callback)) throw new TypeError('callback must be a valid function');

    /*
     This gets a little tricky because in an app instance we dont want connect to fire until the remote device is connected.
     We also want to start the remote application and provide any errors from the launch
     so we need to block the connect event from Channel, start the app, wait for the host to connect, have ready event (deprecated) trigger connect event.
     */


       // Call connect on the super
       Channel.prototype.connect.call(this, attributes, function(err, client){

           if(err) return callback(err);

           // Set the connected flag to false until ready event fires
           this.connected = false;

           // Create a once listener for the ready event that will make the final callback and fire the connect event
           var readyHandler = function(){

               // Set the connected property
               this.connected = true;

               // call the connect callback
               if(callback) {
                   logger.debug('application.connect->callback', null, client);
                   callback(null, client);
               }

               // enable the connect event, fire it, disable it again
               logger.debug('application.emit("connect")', client);
               this.enableEvent('connect');
               this.emit('connect',client);
               this.disableEvent('connect');

           }.bind(this);

           // Listen once for the ready event
           this.once('ready',readyHandler);

       }.bind(this));

};

/**
 * Disconnects your client from the remote application.
 * If the first argument is an optional param and can be used close the remote application
 * The stop/exit command is only sent if you are the last connected client
 *
 * @param {Boolean} [exitOnRemote=true] Issues a stop/exit on the remote application before disconnecting
 * @param {Function} [callback] The callback handler
 * @param {Error} callback.error Any error that may have occurred during the connection or application startup
 * @param {Client} callback.client Your client object
 *
 * @example
 * app.disconnect(function(err){
 *     if(err) return console.error('something went wrong');
 *     console.info('You are now disconnected');
 * });
 */
Application.prototype.disconnect = function(exitOnRemote, callback){

    if(types.isFunction(exitOnRemote)){
        callback = exitOnRemote;
        exitOnRemote = true;
    }

    if(types.isUndefined(exitOnRemote)) exitOnRemote = true;


    if(exitOnRemote) {

        var stopCallback = function(err){
            // still disconnect even if there was an error
            Channel.prototype.disconnect.call(this, callback);
        }.bind(this);

        if(this.type === 'webapplication'){
            this.invoke('ms.webapplication.stop', { url : this.id }, stopCallback);
        }else{
            this.invoke('ms.application.stop', { id : this.id }, stopCallback);
        }

    }else{
        Channel.prototype.disconnect.call(this, callback);
    }

};

/**
 * Installs the application on the remote device.
 *
 * @param {Function} callback The callback handler
 * @param {Function} callback.err The callback handler
 *
 * @example
 *  app.connect({name:'Jason'}, function(err, client){
 *    if(err.code === 404){
 *      var install = confirm('Would you like to install the MyApp on your TV?');
 *      if(install){
 *         app.install(function(err){
 *            alert('Please follow the prompts on your TV to install the application');
 *         });
 *     }
 *   }
 *  });
 */
Application.prototype.install = function(callback){

    if(this.type === TYPE_WEB_APP) return callback(new Error('web application cannot be installed'));

    var e;
    var req = new XMLHttpRequest();
    req.timeout = 10000;

    req.ontimeout = function(){
        e = new Error('Request Timeout');
        e.code = 408;
        callback(e);
    };

    req.onload = function() {
        if(this.status === 200){
            callback(null, true);
        }
        else {
            e = new Error(this.statusText);
            e.code = this.status;
            callback(e);
        }
    };

    req.open("put", this.service.uri + 'applications/'+this.id, true);
    req.send();

};


/***
 * Starts the application on the remote device.
 *
 * @private
 *
 * @param {Function} callback The callback handler
 * @param {Function} callback.err The callback handler
 *
 */
Application.prototype.start = function(callback){

    var e;

    var req = new XMLHttpRequest();
    req.timeout = 10000;

    req.ontimeout = function(){
        e = new Error('Request Timeout');
        e.code = 408;
        callback(e);
    };

    req.onload = function() {
        if(this.status === 200){
            callback(null, true);
        }
        else {
            e = new Error(this.statusText);
            e.code = this.status;
            callback(e);
        }
    };

    if(this.type === TYPE_WEB_APP){
        req.open("post", this.service.uri + 'webapplication/', true);
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        req.send(JSON.stringify({url:this.id}));
    }else{
        req.open("post", this.service.uri + 'applications/'+this.id, true);
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        req.send(JSON.stringify({}));
    }


};



module.exports = Application;
