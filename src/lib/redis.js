'use strict';

// 3rd Party Libraries
const IORedis = require('ioredis');
const Promise = require('bluebird');

// Internal
const Libs = require('../lib');
const Config = require('../config');
const Helpers = require('../helpers');
const Constants = Config.constants;

// Global Objects,Functions and enums 
const libUtils = new Libs.utils();

const STATUS_CODES = Helpers.statusCodes;
const PRIORITY = Constants.enums.PRIORITY;
const ALLOWED_PRIORITIES = Object.keys(PRIORITY);
const FAMILY_TYPES = Constants.enums.FAMILY_TYPES;
const DEFAULT_PRIORITY = Constants.enums.PRIORITY.P5;
const CONNECTION_TYPES = Constants.enums.CONNECTION_TYPES;
const REDIS_CLIENT_STATES = Constants.enums.REDIS_CLIENT_STATES;

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
        self.lists = Object.keys(PRIORITY).forEach((priority) => {
            return PRIORITY[priority] + self.listSuffix;
        });
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
            self.state = REDIS_CLIENT_STATES.READY;
            console.info('Redis entered state: ', self.state);
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
        let priority = options.priority;
        let elements = options.elements;

        if (!list) {
            return Promise.reject(libUtils.genError(
                'Provide list to push an element',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            ));
        }

        if (!elements) {
            return Promise.reject(libUtils.genError(
                'Provide elements to push in form of list',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            ));
        }

        if (!priority) {
            priority = PRIORITY[DEFAULT_PRIORITY];
        }

        if (ALLOWED_PRIORITIES.indexOf(priority) < 0) {
            return Promise.reject(libUtils.genError(
                'Given priority is not supported (Supported from P0 to P9)',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            ));
        }

        if (typeof elements !== 'object') {
            elements = [elements];
        }

        let listName = priority + this.listSuffix;
        return self.client.rpush(listName, elements);
    }

    pop() {
        return self.client.blpop(lists, 0);
    }

}

module.exports = Redis;
