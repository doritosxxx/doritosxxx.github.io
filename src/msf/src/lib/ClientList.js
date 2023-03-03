"use strict";

var util = require("./util");
var types = util.types;

/**
 * A list of {@link Client|clients} accessible through {@link Channel#clients|channel.clients}.
 * This list is managed by the channel and automatically adds and removes clients as they connect and disconnect
 * @class ClientList
 * @extends Array
 * @hide-constructor
 */

function ClientList(channel){

    if(!types.isObject(channel))throw new TypeError('channel must be of type Channel');

    this.channel = channel;

    ClientList.super_.call(this);

}

util.inherits(ClientList, Array);

/**
 * A reference to your client
 *
 * @member {Client} ClientList#me
 * @readonly
 */
Object.defineProperty(ClientList.prototype, 'me', {
    get : function(){
        return this.getById(this.channel.clientId);
    }
});

/***
 * Clears the list
 * @protected
 */
ClientList.prototype.clear = function(){
    this.length = 0;
};

/***
 * Removes an client from the list
 * @protected
 */
ClientList.prototype.remove = function(item){
    var i = this.indexOf(item);
    if(i !== -1) {
        this.splice(i, 1);
        return item;
    }
    return null;
};


/**
 * Returns a client by id
 *
 * @param {String} id The client
 * @return {Client}
 *
 */
ClientList.prototype.getById = function(id){

    if(!types.isString(id) && !types.isNumber(id)) throw new TypeError('id must be a valid string or number');
    for(var i=0; i<this.length; i++){
        if(this[i].id === id) return this[i];
    }
    return null;
};


module.exports = ClientList;
