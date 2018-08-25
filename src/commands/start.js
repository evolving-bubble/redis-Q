'use strict';

// 3rd Party
const Chalk = require('chalk');
const Promise = require('bluebird');

// Internal
const Base = require('./base');


/*
    Start command
*/
class Start extends Base {
    constructor() {
        super();
    }

    exec(name, options) {
        console.log(name, options);
        console.log(options['redisHost']);
        console.log(options['redisPort']);
    }
}

module.exports = new Start();