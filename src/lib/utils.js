'use strict';

const Uuid = require('uuid');
const Helpers = require('../helpers');

const STATUS_CODES = Helpers.statusCodes;

class Utils {
    constructor() {

    }

    generateUniqueId() {
        return Uuid.v4();
    }

    genError(message, status, code) {
        let error = new Error(message || STATUS_CODES.INTERNAL_SERVER_ERROR.message);
        error.status = status || STATUS_CODES.INTERNAL_SERVER_ERROR.status;
        error.code = STATUS_CODES.INTERNAL_SERVER_ERROR.code;
        return error;
    }
}

module.exports = Utils;