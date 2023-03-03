"use strict";

var util    = require("./util");
var logger  = util.logger;
var types   = util.types;
var props   = util.props;
var EventEmitter = require('./EventEmitter');
var Client = require('./Client');
var ClientList = require('./ClientList');

var EVENT_HEALTH_CHECK = '__ping';



/**
 * A Channel is a discreet connection where multiple clients can communicate
 * @class Channel
 * @extends EventEmitter
 *
 * @hide-constructor
 */
function Channel(service, uri){

    logger.debug('new Channel',arguments);

    /* Type checking */
    if(!types.isObject(service)) throw new TypeError('service must be of type Service');
    if(!types.isString(uri)) throw new TypeError('uri must be a valid string');

    /* Super Construction */
    Channel.super_.call(this);

    var self = this;
    var oServiceUrl = util.url.parse(service.uri);


    /***
     * The connected state of the channel (a backing variable to isConnected)
     * @protected
     */
    this.connected = false;

    /***
     * The id assigned to your client upon connection
     * @private
     */
    this.clientId = null;

    /***
     * The underlying web socket connection
     * @private
     */
    this.connection = null;
    
    /***
     * The Security Mode(normal or SSL)
     * 
     */	    
    this.securityMode = false;

    /***
     * A map of message handler still waiting for responses
     * @private
     */
    this.resultHandlers = {};

    /***
     * The url for the websocket to connect to
     * @private
     */
    this.connectionUrl = 'ws://' + oServiceUrl.host + oServiceUrl.pathname + 'channels/' + uri;

    /***
     * The time in milliseconds between pings if a connection timeout is defined
     * @private
     */
    this.pingTimeout = null;

    /***
     * The 'interval' reference set with setConnectionTimeout
     * @private
     */
    this.pingInterval = null;

    /**
     * The collection of clients currently connected to the channel
     *
     * @member {ClientList} Channel#clients
     * @readonly
     *
     */
    this.clients = new ClientList(this);

    /**
     * The connection status of the channel
     *
     * @member {Boolean} Channel#isConnected
     * @readonly
     *
     */
    Object.defineProperty(this, 'isConnected', {
        get : function(){
            return self.connected;
        }
    });


    /**
     * Sets the connection timeout. When set the channel will utilize a connection health check while connected.
     * If no pinging health check is not received within the given timeout the connection will close.
     * To stop the health check set the timeout to 0
     *
     * @member {Boolean} Channel#connectionTimeout
     *
     * @example
     * channel.connectionTimeout = 10000; // checks the connection every 10 seconds while connected
     * channel.connectionTimeout = 0; // stops the health check
     */
    Object.defineProperty(this, 'connectionTimeout', {
        set : function(timeout){
            logger.debug('updating connection timeout ',timeout);
            self.pingTimeout = timeout > 0 ? timeout : 0;
            // If we are already connected start the check
            if(this.isConnected) self.startHealthCheck();
        },
        get : function(){
            return self.pingTimeout;
        }
    });



    /* setup health check listeners */
    this.on('connect', this.startHealthCheck);
    this.on('disconnect', this.stopHealthCheck);


    /* configure access and enumeration of properties */
    props.readOnly(this, ['clients']);
    props.private(this, [
        'connected',
        'clientId',
        'connection',
        'resultHandlers',
        'connectionUrl',
        'connectCallback',
        'pingInterval',
        'pingTimeout',
        'lastPingReceived',
        'securityMode'
    ]);

}


util.inherits(Channel, EventEmitter);



/**
 * Connects to the channel
 *
 * @param {Object} attributes Any attributes you want to associate with the client (ie. {name:"FooBar"}
 * @param {Function} callback The success callback handler
 * @param {Error} callback.arg1 Any error that may have occurred
 * @param {Client} callback.arg2 The connecting client
 *
 * @example
 * channel.connect({name:'Wheezy'},function(err, client){
 *   if(err) return console.error('something went wrong : ', error.code, error.message);
 *   console.info(client.attributes.name+', you are now connected');
 * });
 */
Channel.prototype.connect = function(attributes, callback){

    logger.debug('channel.connect',arguments);
    if(this.isConnected) return console.warn('Channel is already connected.');

    if(types.isFunction(attributes) && !callback){
        callback = attributes;
        attributes = {};
    }else{
        attributes = attributes || {};
    }

    // Validate arguments and connection state
    if(!types.isObject(attributes))throw new TypeError('attributes must be a valid object');
    if(callback && !types.isFunction(callback))throw new TypeError('callback must be a valid function');


    // Store the callback
    this.connectCallback = callback;

    // TODO : Need to merge query string just in case the connection url already has a query (although it shouldn't)

    var u = " ";
    if(this.securityMode){
    	//console.log('securityMode true,');
    	u = this.connectionUrl.replace("ws","wss").replace("8001","8002");
    }else{
    	//console.log('securityMode false');
    	u = this.connectionUrl;
    }
    
    u = u + '?' + util.queryString.stringify(attributes);
    //console.log('securityMode ='+this.securityMode+"URI="+u);

    // Clean up any old connections
    if(this.connection){
        this.connection.onopen = null;
        this.connection.onerror = null;
        this.connection.onclose = null;
        this.connection.onmessage = null;
    }

    // Connect the websocket and add our listeners
    this.connection = new WebSocket(u);
    this.connection.binaryType = "arraybuffer";
    this.connection.onopen = this._onSocketOpen.bind(this);
    this.connection.onerror = this._onSocketError.bind(this);
    this.connection.onclose = this._onSocketClose.bind(this);
    this.connection.onmessage = this._onSocketMessage.bind(this);
};


/**
 * set to the security mode
 *
 * @param {flag} true is SSL enabled
 *
 */
Channel.prototype.setSecurityMode = function(flag){
	this.securityMode = flag;
};

/**
 * Disconnects from the channel
 *
 * @param {Function} callback The success callback handler
 * @param {Error} callback.error Any error that may have occurred
 * @param {Client} callback.client The disconnecting client
 *
 * @example
 * channel.disconnect(function(err, client){
 *   if(err) return console.error('something went wrong : ', error.code, error.message);
 *   console.info(client.attributes.name+', you are now disconnected');
 * });
 */
Channel.prototype.disconnect = function(callback){

    logger.debug('channel.disconnect',arguments);
    if(!this.isConnected) console.warn("channel is already disconnected");

    this.connection.close();
    var self = this;
    setTimeout(function(){
        if(callback) callback(null, self);
    },0);

};

/**
 * Publish an event message to the specified target or targets.
 * Targets can be in the for of a clients id, an array of client ids or one of the special message target strings (ie. "all" or "host"}
 *
 * @param {String} event The name of the event to emit
 * @param {any} [message] Any data associated with the event
 * @param {String|Array} [target='broadcast'] The target recipient(s) of the message
 * @param {Blob|ArrayBuffer} [payload] Any binary data to send with the message
 *
 * @example
 * channel.publish('myCustomEventName',{custom:'data'});
 */
Channel.prototype.publish = function(event, message, target, payload){

    logger.silly('channel.publish',arguments);
    if(!this.isConnected) return console.warn('Channel is not connected.');

    target = target || 'broadcast';
    message = message || null;


    if(!types.isString(event))throw new TypeError('event must be a valid string');
    if(!(types.isString(target) || types.isArray(target))) throw new TypeError('targets must be a valid string or array');

    this.invoke('ms.channel.emit',{
        event   : event,
        data    : message,
        to      : target
    }, null, true, payload);

};




/*
 Packs messages with payloads into binary message
 */
Channel.packMessage = function(oMsg, payload){

    logger.debug('channel.packMessage',arguments);

    // convert js object to string
    var msg = JSON.stringify(oMsg);

    // get byte length of the string
    var msgByteLength = new Blob([msg]).size;

    // create 2 byte header which contains the length of the string (json) message
    var hBuff = new ArrayBuffer(2);
    var hView = new DataView(hBuff);
    hView.setUint16(0,msgByteLength);

    // binary packed message and payload
    return new Blob([hBuff, msg, payload]);

};

/*
 Unpacks binary messages
 */
Channel.unpackMessage = function(buffer){

    logger.debug('channel.unpackMessage',arguments);

    var json = '';
    var view = new DataView(buffer);
    var msgByteLen = view.getUint16(0);

    for (var i = 0; i < msgByteLen; i++) {
        json += String.fromCharCode(view.getUint8(i+2));
    }

    var payload = buffer.slice(2+msgByteLen);
    var message = JSON.parse(json);

    return {payload : payload, message : message};

};



/***
 * Invokes and RPC method on the server
 *
 * @protected
 *
 * @param {String} method The name of the method to invoke
 * @param {Object} params Named params to pass to the method
 * @param {Function} [callback] The success callback handler
 * @param {Error} callback.error Any error that may have occurred
 * @param {Boolean} callback.success
 * @param {Boolean} [isNotification=false] If true the message will have no id and no response handler will be stored
 * @param {ArrayBuffer|Blob} [payload] Any binary data to send along with the message
 *
 */
Channel.prototype.invoke = function(method, params, callback, isNotification, payload){

    logger.debug('channel.invoke',arguments);

    if(!types.isString(method))throw new TypeError('method must be a valid string');

    params = params || {};

    var msg = {
        method  : method,
        params  : params
    };

    if(callback && !isNotification){
        msg.id = Date.now();
        this.resultHandlers[msg.id] = callback;
    }

    if(payload){
        msg = Channel.packMessage(msg,payload);
    }else{
        msg = JSON.stringify(msg);
    }

    this.connection.send(msg);
};

/**
 * Fired when a channel makes a connection
 *
 * @event Channel#connect
 * @param {Client} client - Your client
 * @example
 * channel.on('connect',function(client){
 *  console.log('You are now connected');
 * });
 */
Channel.prototype._onConnect = function(data) {

    logger.silly('channel._onConnect');

    this.connected = true;

    // Store my id
    this.clientId = data.id;

    // Store the current connected client
    data.clients.forEach(function(clientInfo){

        // Create a client and add to our list
        var client = new Client(clientInfo.id, clientInfo.attributes, clientInfo.isHost);
        this.clients.push(client);

    },this);

    // call the connect callback if present and reset
    if(this.connectCallback) {
        logger.debug('channel.connect->callback',this.clients.me);
        this.connectCallback(null, this.clients.me);
        this.connectCallback = null;
    }


    logger.debug('channel.emit("connect")',this.clients.me);
    this.emit('connect',this.clients.me);

};


/**
 * Fired when a channel disconnects
 *
 * @event Channel#disconnect
 * @param {Client} client - Your client
 * @example
 * channel.on('disconnect',function(client){
 *  console.log('You are now disconnected');
 * });
 */
Channel.prototype._onDisconnect = function(data) {
    logger.silly('channel._onDisconnect');

    if(this.connected){
        var client = this.clients.me;
        this.clients.clear();

        logger.debug('channel.emit("disconnect")',client);
        this.emit('disconnect',client);
    }
    this.connected = false;


};


/**
 * Fired when a peer client channel makes a connection
 *
 * @event Channel#clientConnect
 * @param {Client} client - The client that connected
 * @example
 * channel.on('clientConnect',function(client){
 *  console.log(client.id + 'is now connected');
 * });
 */
Channel.prototype._onClientConnect = function(data) {
    logger.silly('channel._onClientConnect');

    var client = new Client(data.id, data.attributes, data.isHost);
    this.clients.push(client);

    logger.debug('channel.emit("clientConnect")',client);
    this.emit('clientConnect',client);
};

/**
 * Fired when a peer client disconnects
 *
 * @event Channel#clientDisconnect
 * @param {Client} client - The client that connected
 * @example
 * channel.on('clientDisconnect',function(client){
 *  console.log(client.id + 'has disconnected');
 * });
 */
Channel.prototype._onClientDisconnect = function(data) {
    logger.silly('channel._onClientDisconnect');

    var client = this.clients.getById(data.id);
    if(client) this.clients.remove(client);
    else {
        logger.warn('client '+data.id+' could not be found, so it was not removed from the client list');
        client = new Client(data.id, data.attributes, data.isHost);
    }


    logger.debug('channel.emit("clientDisconnect")',client);
    this.emit('clientDisconnect',client);

};

/***
 * Fired when the host has connected and is ready to accept messages
 * @deprecated since version 2.0.18 (please use the connect event)
 *
 * @event Channel#ready
 */
Channel.prototype._onReady = function(data){

    logger.debug('channel.emit("ready")');
    this.emit('ready');
};

Channel.prototype._onUserEvent = function(msg){

    var client = this.clients.getById(msg.from);
    var event = msg.event;
    var data  = msg.data;
    var payload = msg.payload;

    logger.debug('channel.emit("'+event+'")',data, client, payload);
    this.emit(event, data, client, payload);
};

Channel.prototype._onSocketOpen = function() {
    logger.silly('channel._onSocketOpen');
    var methodsWeb = {
        method : "ms.webapplication.start",
        params : {
            url : this.id
        }
    };
    
    var methodsApp = {
        method : "ms.application.start",
        params : {
            id : this.id
        }
    };
    
    if(this.type === 'webapplication')
        this.connection.send(JSON.stringify(methodsWeb));
    else
        this.connection.send(JSON.stringify(methodsApp));
};

Channel.prototype._onSocketClose = function() {
    logger.silly('channel._onSocketClose');
    this._onDisconnect();
};

Channel.prototype._onSocketError = function(e) {
    logger.silly('channel._onSocketError',e);
    this.emit('error', new Error("WebSocket error"));
};


Channel.prototype._onSocketMessage = function(msg){

    logger.silly('channel._onSocketMessage',msg);

    // Serialize the message
    try{
        if(typeof msg.data === "string"){
            msg = JSON.parse(msg.data);
        }else{
            var unpacked = Channel.unpackMessage(msg.data);
            msg = unpacked.message;
            msg.payload = unpacked.payload;
        }
    } catch (e) {
        logger.warn('unable to parse message', msg);
        return;
    }

    // RPC Response?
    if(msg.id && (msg.result || msg.error)){

        if(!this.resultHandlers[msg.id]){
            logger.warn('unable to find result handler for result message ', msg);
            return;
        }

        this.resultHandlers[msg.id](msg.error,msg.result);

    }
    // Event?
    else if (msg.event){

        switch(msg.event){

            case 'ms.channel.connect' :
                this._onConnect(msg.data);
                break;

            case 'ms.channel.clientConnect' :
                this._onClientConnect(msg.data);
                break;

            case 'ms.channel.clientDisconnect' :
                this._onClientDisconnect(msg.data);
                break;

            case 'ms.channel.ready' :
                this._onReady(msg.data);
                break;

            default :
                this._onUserEvent(msg);
                break;
        }
    }
    // Unrecognized
    else{
        logger.warn('unrecognized message type', msg);
    }

};

Channel.prototype.startHealthCheck = function(){

    // stop any previous health checking
    this.stopHealthCheck();

    if(this.pingTimeout > 0){

        var lastReceivedPing = null;

        this.on(EVENT_HEALTH_CHECK, function(sent){
            lastReceivedPing = Date.now();
            logger.debug('ping trip : ',lastReceivedPing - sent);
            logger.debug('updated last ping time : ',lastReceivedPing);
        });

        var checkAndPing = function(){

            var now = Date.now();
            if(!lastReceivedPing) lastReceivedPing = now;

            if(now - lastReceivedPing < this.pingTimeout){
                logger.debug('sending ping');

                this.publish(EVENT_HEALTH_CHECK, now, this.clients.me.id);
            }else{
                logger.debug('ping timed, out closing connection');
                this.stopHealthCheck();
                if(this.connection){
                    this.connection.close();
                    // forcing disconnect
                    this._onDisconnect();
                }
            }
        }.bind(this);

        // start the timer
        this.pingInterval = setInterval(checkAndPing,this.pingTimeout);
    }



};

Channel.prototype.stopHealthCheck = function(){
    clearInterval(this.pingInterval);
    this.removeAllListeners(EVENT_HEALTH_CHECK);
};


module.exports = Channel;
