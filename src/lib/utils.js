'use strict';

const Uuid = require('uuid');
const Helpers = require('../helpers');

const ERROR_CODES = Helpers.statusCodes;

class Utils {
    constructor() {

    }

    generateUniqueId() {
        return Uuid.v4();
    }

    genError(message, status, code) {
        let error = new Error(message || ERROR_CODES.INTERNAL_SERVER_ERROR.message);
        error.status = status || ERROR_CODES.INTERNAL_SERVER_ERROR.status;
        error.code = ERROR_CODES.INTERNAL_SERVER_ERROR.code;
        return error;
    }
}

module.exports = Utils;