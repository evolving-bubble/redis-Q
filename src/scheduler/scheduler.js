'use strict';

// 3rd Party
const Schedule = require('node-schedule');

// Internal
const Libs = require('../lib');
const Helpers = require('../helpers');

// Global Objects and enums
const libUtils = new Libs.utils();
const ERROR_CODES = Helpers.statusCodes;


class JobScheduler {
    constructor(options) {
        let self = this;
        if (!options || typeof options !== 'object') {
            throw libUtils.genError(
                'Job scheduler options not provided or improper format',
                ERROR_CODES.PRECONDITION_FAILED.status,
                ERROR_CODES.PRECONDITION_FAILED.code
            );
        }

        if (!options.jobName || !options.callback || !options.schedulerTime) {
            throw libUtils.genError(
                'Mandatory parameters missing, required are (jobName, callback and schedulerTime)',
                ERROR_CODES.PRECONDITION_FAILED.status,
                ERROR_CODES.PRECONDITION_FAILED.code
            );
        }

        if (typeof options.callback !== 'function') {
            throw libUtils.genError(
                'Callback should be a function',
                ERROR_CODES.PRECONDITION_FAILED.status,
                ERROR_CODES.PRECONDITION_FAILED.code
            );
        }

        console.debug('Job:', options.jobName, 'is being scheduled for', options.schedulerTime);
        Schedule.scheduleJob(options.schedulerTime, () => {
            options.callback();
        });
    }
}

module.exports = JobScheduler;
