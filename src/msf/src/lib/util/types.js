"use strict";

module.exports = {

    isString : function(obj){
        return typeof obj === 'string';
    },

    isNull : function(obj){
        return obj === null;
    },

    isBoolean : function(obj){
        return typeof obj === 'boolean';
    },

    isNumber : function(obj){
        return typeof obj === 'number';
    },

    isObject : function(obj){
        return obj === Object(obj);
    },

    isArray : function(obj){
        return obj.constructor === Array;
    },

    isFunction : function(obj){
        return typeof obj === 'function';
    },

    isUndefined : function(obj){
        return typeof obj === 'undefined';
    }



};
