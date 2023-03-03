"use strict";

var util = require("./util");
var types = util.types;


/**
 * A representation of an individual device or user connected to a channel.
 * Clients can have user defined attributes that are readable by all other clients.
 * @class Client
 *
 * @hide-constructor
 *
 */
function Client(id, attributes, isHost, connectTime){

    if(!types.isString(id)) throw new TypeError('id must be a valid string');
    if(attributes && !types.isObject(attributes)) throw new TypeError('attributes must be a valid object');

    /**
     * The id of the client
     *
     * @name id
     * @memberOf Client.prototype
     * @type {String}
     * @readonly
     *
     */
    this.id = id;

    /**
     * A map of attributes passed by the client when connecting
     *
     * @name attributes
     * @memberOf Client.prototype
     * @type {Object}
     * @readonly
     *
     */
    this.attributes = attributes || {};

    /**
     * Flag for determining if the client is the host
     *
     * @name isHost
     * @memberOf Client.prototype
     * @type {Boolean}
     * @readonly
     *
     */
    this.isHost = isHost;

    /**
     * The time which the client connected in epoch milliseconds
     *
     * @name connectTime
     * @memberOf Client.prototype
     * @type {Number}
     * @readonly
     *
     */
    this.connectTime = connectTime || Date.now();

    Object.freeze(this.attributes);
    Object.freeze(this);

}

module.exports = Client;
