'use strict';

// 3rd Party
const Shell = require('shelljs');
const Promise = require('bluebird');


/*
    Start command
*/
class Base {
    constructor() {

    }

    run(command) {
        return new Promise((resolve, reject) => {
            return Shell.exec(command, {
                silent: true,
                async: true,
                encoding: 'utf8'
            }, (code, stdout, stderr) => {
                if (stderr) {
                    return reject(stderr);
                }

                return resolve({
                    code,
                    stdout
                });
            });
        });
    }
}

module.exports = Base;