'use strict';

// 3rd Party
const Chalk = require('chalk');
const Promise = require('bluebird');

// Internal
const Base = require('./base');


/*
    Stop command
*/
class Stop extends Base {
    constructor() {
        super();
    }

    exec() {

    }
}

module.exports = new Stop();