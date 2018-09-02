'use strict';

// Internal
const Libs = require('../lib');
const Config = require('../config');
const Helpers = require('../helpers');
const Constants = Config.constants;

const libUtils = new Libs.utils();

const STATUS_CODES = Helpers.statusCodes;
const CONNECTION_TYPES = Constants.enums.CONNECTION_TYPES;

const resetFunctionTimer = (resetFunction, resetFunctionTimeOut) => {
    setTimeout(() => {
        resetFunction();
    }, resetFunctionTimeOut);
}

class Subscriber {

    constructor(options) {
        let self = this;

        if (!(
            (options.redis && options.redis.host && options.redis.port && options.redis.connectionType === CONNECTION_TYPES.NORMAL) ||
            (options.redis && options.redis.sentinels && options.redis.connectionType === CONNECTION_TYPES.SENTINEL) ||
            (options.redis && options.redis.nodes && options.redis.connectionType === CONNECTION_TYPES.CLUSTER)
        )) {
            throw libUtils.genError(
                'Please provide proper options for redis connection',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        if (!options.callback ||
            typeof options.callback !== 'function' ||
            !libUtils.isPromise(options.callback)
        ) {
            throw libUtils.genError(
                'Please provide callback (promise) to process for every element of job',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        self.callback = options.callback;
        self.callbackTimeOut = options.callbackTimeOut || 2 * 1000;

        // Create publisher options for redis client, 
        // nodes if cluster,
        // sentinels if sentinel, 
        // host,port if single redis
        let redisPublisherOptions = {
            connectionType: options.redis.connectionType,
            connectOptions: {
                host: options.redis.host,
                port: options.redis.port,
                nodes: options.redis.nodes,
                sentinels: options.redis.sentinels
            },
            servicePrefix: options.servicePrefix
        };

        self.redis = new Libs.redis(redisPublisherOptions);
    }

    process() {
        let self = this;

        if (self.redis.isReady()) {
            let elementToProcess;
            self.redis.pop()
                .then((element) => {
                    if (!element) {
                        console.log('No element to process');
                        return Promise.resolve();
                    }

                    elementToProcess = element;

                    if (!elementToProcess) {
                        return Promise.resolve();
                    }
                    return self.callback(element);
                })
                .then((result) => {

                    if (!elementToProcess) {
                        return Promise.resolve();
                    }
                    elementToProcess.jobStatus = 'SUCCESS';

                    if (result && Object.keys(result).length) {
                        Object.keys(result).forEach((key) => {
                            elementToProcess[key] = result[key];
                        });
                    }

                    let listName = self.redis.servicePrefix + self.redis.LIST_PREFIX + elementToProcess.jobId + self.redis.LIST_SUFFIXES.PROCESSED;
                    return self.redis.rpush(listName, JSON.stringify(elementToProcess));
                })
                .then((result) => {
                    resetFunctionTimer(self.process.bind(self), self.callbackTimeOut);
                    return Promise.resolve();
                })
                .catch((error) => {

                    return Promise.resolve()
                        .then(() => {
                            elementToProcess.jobStatus = 'FAILURE';
                            let listName = self.redis.servicePrefix + self.redis.LIST_PREFIX + elementToProcess.jobId + self.redis.LIST_SUFFIXES.PROCESSED;
                            return self.redis.rpush(listName, JSON.stringify(elementToProcess));
                        })
                        .then(() => {
                            resetFunctionTimer(self.process.bind(self), self.callbackTimeOut);
                            return Promise.resolve();
                        })
                        .catch((error) => {
                            resetFunctionTimer(self.process.bind(self), self.callbackTimeOut);
                            return Promise.resolve();
                        });
                });
        } else {
            console.warn('Consumer redis is not ready, retrying');
            resetFunctionTimer(self.process.bind(self), self.callbackTimeOut);
        }
    }

}

module.exports = Subscriber;

// const subscriber = new Subscriber({
//     redis: {
//         connectionType: 'NORMAL',
//         host: 'localhost',
//         port: '6379',
//     },
//     servicePrefix: 'redisService',
//     callback: (message) => {
//         return new Promise((resolve, reject) => {
//             Promise.resolve()
//                 .then(() => {
//                     return resolve();
//                 })
//                 .catch((error) => {
//                     return reject(error);
//                 });
//         })
//     },
//     callbackTimeOut: 2 * 1000
// });
// subscriber.process();
