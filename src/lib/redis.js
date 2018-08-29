'use strict';

// 3rd Party Libraries
const IORedis = require('ioredis');
const Promise = require('bluebird');

// Internal
const Config = require('../config');
const Utils = require('../lib/utils');
const Helpers = require('../helpers');
const Constants = Config.constants;

// Global Objects,Functions and enums 
const libUtils = new Utils();

const STATUS_CODES = Helpers.statusCodes;
const FAMILY_TYPES = Constants.enums.FAMILY_TYPES;
const CONNECTION_TYPES = Constants.enums.CONNECTION_TYPES;
const REDIS_CLIENT_STATES = Constants.enums.REDIS_CLIENT_STATES;

const DEFAULT_LIST = 'redisQ';
const LIST_PREFIX = 'redisQ_';
const LIST_SUFFIXES = {
    INITIATED: '_initiated',
    PROCESSED: '_processed'
}

const singleHostRedisConnection = (options) => {
    if (!options || typeof options !== 'object') {
        throw libUtils.genError(
            'Connection options not provided or improper format',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    if (!options.host || !options.port) {
        throw libUtils.genError(
            'Host and port are mandatory for redis connection',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    let connectOptions = {
        host: options.host,
        port: options.port,
        family: options.family && FAMILY_TYPES[options.family] ? FAMILY_TYPES[options.family] : 4,
        db: Number(options.db) ? Number(options.db) : 0,
        retryStrategy: (times) => Math.min(times * 50, 5000),
        autoResendUnfulfilledCommands: false,
        enableReadyCheck: true,
        connectTimeout: 10000,
        enableOfflineQueue: true,
        autoResubscribe: true,
        reconnectOnError: (error) => {
            let targetErrors = ['READONLY'];
            let response = false;
            targetErrors.forEach((targetError) => {
                if (targetError.indexOf(error.message.slice(0, targetError.length)) > -1) {
                    response = true;
                }
            });
            return response;
        }
    }

    if (options.password && options.password.length > 0) {
        connectOptions.password = options.password;
    }

    return new IORedis(connectOptions);
}

const sentinelRedisConnection = (options) => {
    let genError = false;
    if (!options || typeof options !== 'object') {
        throw libUtils.genError(
            'Connection options not provided or improper format',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    if (!options.sentinels || !options.sentinels.length) {
        throw libUtils.genError(
            'Sentinel list mandatory for redis connection',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    options.sentinels.forEach((sentinel) => {
        if (!sentinel.host || !sentinel.port) {
            genError = true
        }
    });

    if (genError) {
        throw libUtils.genError(
            'Sentinel element should comprise of host and port',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    let connectOptions = {
        sentinels: options.sentinels,
        family: options.family && FAMILY_TYPES[options.family] ? FAMILY_TYPES[options.family] : 4,
        db: Number(options.db) ? Number(options.db) : 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        autoResendUnfulfilledCommands: false,
        enableReadyCheck: true,
        connectTimeout: 10000,
        enableOfflineQueue: true,
        autoResubscribe: true,
        reconnectOnError: (error) => {
            let targetErrors = ['READONLY'];
            if (targetErrors.indexOf(err.message.slice(0, targetError.length)) > -1) {
                return true;
            }
            return false;
        }
    }

    if (options.password && options.password.length > 0) {
        connectOptions.password = options.password;
    }

    return new IORedis(connectOptions);
}

const clusterRedisConnection = (options) => {
    if (!options || typeof options !== 'object') {
        throw libUtils.genError(
            'Connection options not provided or improper format',
            STATUS_CODES.PRECONDITION_FAILED.status,
            STATUS_CODES.PRECONDITION_FAILED.code
        );
    }

    let connectOptions = {
        clusterRetryStrategy: (times) => Math.min(times * 50, 5000),
        enableOfflineQueue: true,
        enableReadyCheck: true,
        scaleReads: 'all',
        maxRedirections: 16,
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 100,
        retryDelayOnTryAgain: 100,
        slotsRefreshTimeout: 1000,
        slotsRefreshInterval: 5000,
        redisOptions: {
            family: options.family && FAMILY_TYPES[options.family] ? FAMILY_TYPES[options.family] : 4,
            db: Number(options.db) ? Number(options.db) : 0,
            retryStrategy: (times) => Math.min(times * 50, 2000),
            autoResendUnfulfilledCommands: false,
            enableReadyCheck: true,
            connectTimeout: 10000,
            enableOfflineQueue: true,
            autoResubscribe: true,
            reconnectOnError: (error) => {
                let targetErrors = ['READONLY'];
                if (targetErrors.indexOf(err.message.slice(0, targetError.length)) > -1) {
                    return true;
                }
                return false;
            }
        }
    }

    if (options.password && options.password.length > 0) {
        connectOptions.redisOptions.password = options.password;
    }

    return new IORedis.Cluster(options.nodes, connectOptions);
}

const connectionTypeToRedisConnectionMap = {
    NORMAL: singleHostRedisConnection,
    CLUSTER: clusterRedisConnection,
    SENTINEL: sentinelRedisConnection
}

class Redis {
    constructor(options) {
        let self = this;
        self.listSuffix = '_redisQ';
        self.state = REDIS_CLIENT_STATES.UNINITIALIZED;

        self.connectionType = CONNECTION_TYPES[options.connectionType];

        if (!self.connectionType) {
            throw libUtils.genError(
                'Connection type not provided or supported, available are (NORMAL, SENTINEL, CLUSTER)',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        self.client = connectionTypeToRedisConnectionMap[self.connectionType](options.connectOptions);

        self.client.on('connect', () => {
            self.state = REDIS_CLIENT_STATES.CONNECTED;
            console.info('Redis entered state: ', self.state);
        });

        self.client.on('ready', () => {

            self.lists = [LIST_PREFIX + DEFAULT_LIST + self.listSuffix];

            self.client.keys('*')
                .then((result) => {
                    if (!result || !result.length) {
                        return Promise.resolve();
                    }

                    result.forEach((key) => {
                        key = key.split('_');
                        if (key[0] === LIST_PREFIX && key[2] === LIST_SUFFIXES.INITIATED) {
                            self.lists.push(key);
                        }
                    });

                    return Promise.resolve();
                })
                .then(() => {
                    self.state = REDIS_CLIENT_STATES.READY;
                    console.info('Redis entered state: ', self.state);
                })
                .catch((error) => {
                    return Promise.reject(error);
                });
        });

        self.client.on('error', () => {
            self.state = REDIS_CLIENT_STATES.ERROR;
            console.info('Redis entered state: ', self.state);
        });

        self.client.on('close', () => {
            self.state = REDIS_CLIENT_STATES.CLOSED;
            console.info('Redis entered state: ', self.state);
        });

        self.client.on('reconnecting', () => {
            self.state = REDIS_CLIENT_STATES.RECONNECTING;
            console.info('Redis entered state: ', self.state);
        });

        self.client.on('end', () => {
            self.state = REDIS_CLIENT_STATES.END;
            console.info('Redis entered state: ', self.state);
        });
    }

    push(options) {
        let self = this;

        if (self.state !== REDIS_CLIENT_STATES.READY) {
            return Promise.reject(libUtils.genError(
                'Redis client is not ready to process',
                STATUS_CODES.UNABLE_TO_PROCESS.status,
                STATUS_CODES.UNABLE_TO_PROCESS.code
            ));
        }

        let elements = options.elements;

        if (!elements) {
            return Promise.reject(libUtils.genError(
                'Provide list to push elements in redis',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            ));
        }

        if (typeof elements !== 'object' || !elements.length) {
            return Promise.reject(libUtils.genError(
                'Provide elements to push in form of list',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            ));
        }

        if (typeof elements !== 'object') {
            elements = [elements];
        }

        let jobId = libUtils.generateUniqueId();
        let currentIndex = 1;
        let totalElements = elements.length;

        // Add JobId, Stringify the values
        elements = elements.map((element) => {
            element.jobId = jobId;
            element.currentIndex = currentIndex;
            element.totalElements = totalElements;
            element.createdAt = new Date();
            currentIndex += 1;
            return JSON.stringify(element)
        });

        let listName = LIST_PREFIX + jobId + LIST_SUFFIXES.INITIATED;
        self.lists.push(listName);
        return self.client.rpush(listName, elements);
    }

    pop() {
        let self = this;

        if (self.state !== REDIS_CLIENT_STATES.READY) {
            return Promise.reject(libUtils.genError(
                'Redis client is not ready to process',
                STATUS_CODES.UNABLE_TO_PROCESS.status,
                STATUS_CODES.UNABLE_TO_PROCESS.code
            ));
        }

        let result;
        return new Promise((resolve, reject) => {
            return self.client.blpop(self.lists, 0)
                .then((element) => {

                    if (!element && !element.length) {
                        return Promise.resolve();
                    }

                    result = JSON.parse(element[1]);
                    let listName = LIST_PREFIX + result.jobId + LIST_SUFFIXES.PROCESSED;
                    return self.client.rpush(listName, [element]);
                })
                .then(() => {
                    return resolve(result)
                })
                .catch((error) => {
                    return reject(error);
                })
        });
    }

    isReady() {
        return this.state === REDIS_CLIENT_STATES.READY;
    }

    peekJob(jobId) {
        let self = this;

        if (self.state !== REDIS_CLIENT_STATES.READY) {
            return Promise.reject(libUtils.genError(
                'Redis client is not ready to process',
                STATUS_CODES.UNABLE_TO_PROCESS.status,
                STATUS_CODES.UNABLE_TO_PROCESS.code
            ));
        }

        let response = {};
        let processingJob = LIST_PREFIX + jobId + LIST_SUFFIXES.INITIATED;
        let processedJob = LIST_PREFIX + jobId + LIST_SUFFIXES.PROCESSED;
        return new Promise((resolve, reject) => {
            return self.client.lrange(processingJob, 0, 0)
                .then((result) => {
                    if (!result || !result.length) {
                        return self.client.lrange(processedJob, -1, -1);
                    }
                    return Promise.resolve(result);
                })
                .then((result) => {
                    if (!result || !result.length) {
                        response = {
                            jobId,
                            processed: {
                                current: undefined,
                                totalElements: undefined,
                                percentageCompleted: 0,
                                percentagePending: 100
                            },
                            status: STATUS_CODES.NO_JOB.status,
                            message: STATUS_CODES.NO_JOB.message,
                            code: STATUS_CODES.NO_JOB.code
                        }
                        return Promise.resolve();
                    }

                    result = result[0];
                    result = JSON.parse(result);
                    response = {
                        jobId,
                        processed: {
                            current: result.currentIndex,
                            totalElements: result.totalElements,
                            percentageCompleted: Number(((result.currentIndex / result.totalElements) * 100).toFixed(2)),
                            percentagePending: Number((100 - (result.currentIndex / result.totalElements * 100)).toFixed(2))
                        },
                        status: STATUS_CODES.SUCCESSFULLY_LISTED.status,
                        message: STATUS_CODES.SUCCESSFULLY_LISTED.message,
                        code: STATUS_CODES.SUCCESSFULLY_LISTED.code
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    return resolve(response);
                })
                .catch((error) => {
                    return reject(error);
                });
        });
    }

    cancelJob(jobId) {
        let self = this;

        if (self.state !== REDIS_CLIENT_STATES.READY) {
            return Promise.reject(libUtils.genError(
                'Redis client is not ready to process',
                STATUS_CODES.UNABLE_TO_PROCESS.status,
                STATUS_CODES.UNABLE_TO_PROCESS.code
            ));
        }

        let response = {};
        let cancelJob = LIST_PREFIX + jobId + LIST_SUFFIXES.INITIATED;
        let peekJob = LIST_PREFIX + jobId + LIST_SUFFIXES.PROCESSED;
        return new Promise((resolve, reject) => {
            return self.client.del(cancelJob)
                .then((result) => {
                    return self.client.lrange(peekJob, -1, -1);
                })
                .then((result) => {
                    if (!result || !result.length) {
                        response = {
                            jobId,
                            processed: {
                                lastProcessed: 0,
                                totalElements: undefined,
                                percentageCompleted: 0,
                                percentagePending: 100
                            },
                            status: STATUS_CODES.NO_JOB.status,
                            message: STATUS_CODES.NO_JOB.message,
                            code: STATUS_CODES.NO_JOB.code
                        };
                        return Promise.resolve();
                    }

                    result = result[0];
                    result = JSON.parse(result);
                    response = {
                        jobId,
                        processed: {
                            lastProcessed: result.currentIndex,
                            totalElements: result.totalElements,
                            percentageCompleted: Number(((result.currentIndex / result.totalElements) * 100).toFixed(2)),
                            percentagePending: Number(100 - Number(((result.currentIndex / result.totalElements) * 100).toFixed(2)))
                        },
                        status: STATUS_CODES.SUCCESSFULLY_CANCELLED.status,
                        message: STATUS_CODES.SUCCESSFULLY_CANCELLED.message,
                        code: STATUS_CODES.SUCCESSFULLY_CANCELLED.code
                    };
                    return Promise.resolve();
                })
                .then(() => {
                    return resolve(response);
                })
                .catch((error) => {
                    return reject(error);
                });
        });
    }
}

module.exports = Redis;

// const RedisC = new Redis({
//     connectionType: 'NORMAL',
//     connectOptions: {
//         host: 'localhost',
//         port: '6379',
//     }
// });
// setTimeout(() => {
//     console.log(RedisC.isReady());
//     console.log(RedisC.peekJob('5bad21b9-42c4-473b-b901-92e6cc4bfd92'));
//     console.log(RedisC.cancelJob('0f990f96-42d1-4e29-8355-4f42a60a3981'));
//     console.log(RedisC.pop());
// }, 2 * 1000);
