'use strict';

const Uuid = require('uuid');
const Promise = require('bluebird');
const Helpers = require('../helpers');

const STATUS_CODES = Helpers.statusCodes;

const escapeCsv = (key) => {
    if (!key) {
        return ('');
    }

    return ('' + key.replace(/"/g, '').replace(/,/g, ' ').replace(/\n/g, " ").replace(/\r/g, " ") + '');
}

class Utils {
    constructor() {

    }

    isPromise(object) {
        return object().then !== undefined;
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

    jsonToCsv(jsonData) {
        let keys1 = Object.keys(jsonData[0]);
        let keys2 = Object.keys(jsonData[jsonData.length - 1]);
        let keys = keys1.concat(keys2);
        keys = keys.sort();
        keys = new Set(keys);
        keys = [...keys];
        let csvData = [keys.join(",")];
        jsonData.forEach(function (row) {
            let csvRow = [];
            keys.forEach(function (key) {
                if (typeof row[key] === 'string') {
                    csvRow.push("" + escapeCsv(row[key]) + "");
                } else {
                    csvRow.push(row[key]);
                }
            });
            csvData.push(csvRow.join(","));
        });
        csvData = csvData.join("\n");
        return csvData;
    }
}

module.exports = Utils;