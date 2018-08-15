'use strict';

// 3rd Party Libraries
const IORedis = require('ioredis');

// Internal
const Libs = require('../lib');
const Helpers = require('../helpers');

// Global Objects and enums
const libUtils = new Libs.utils();
const ERROR_CODES = Helpers.statusCodes;

const FAMILY_TYPE = {
    IPv4: 4,
    IPv6: 6
}

const REDIS_CLIENT_STATES = {
    CONNECTED: 'CONNECTED',
    READY: 'READY',
    ERROR: 'ERROR',
    CLOSED: 'CLOSED',
    RECONNECTING: 'RECONNECTING',
    END: 'END'
}

const CONNECTION_TYPES = {
    NORMAL: 'NORMAL',
    CLUSTER: 'CLUSTER',
    SENTINEL: 'SENTINEL'
}

const normalRedisConnection = (options) => {

    if (!options || typeof options !== 'object') {
        throw libUtils.genError(
            'Connection options not provided or improper format',
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
        );
    }

    if (!options.host || !options.port) {
        throw libUtils.genError(
            'Host and port are mandatory for redis connection',
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
        );
    }

    let connectOptions = {
        host: options.host,
        port: options.port,
        family: options.family && FAMILY_TYPE[options.family] ? FAMILY_TYPE[options.family] : 4,
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
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
        );
    }

    if (!options.sentinels || !options.sentinels.length) {
        throw libUtils.genError(
            'Sentinel list mandatory for redis connection',
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
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
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
        );
    }

    let connectOptions = {
        sentinels: options.sentinels,
        family: options.family && FAMILY_TYPE[options.family] ? FAMILY_TYPE[options.family] : 4,
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
            ERROR_CODES.PRECONDITION_FAILED.status,
            ERROR_CODES.PRECONDITION_FAILED.code
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
            family: options.family && FAMILY_TYPE[options.family] ? FAMILY_TYPE[options.family] : 4,
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
    NORMAL: normalRedisConnection,
    CLUSTER: clusterRedisConnection,
    SENTINEL: sentinelRedisConnection
}

class Redis {
    constructor(options) {
        let self = this;
        self.state = 'false';
        self.connectionType = CONNECTION_TYPES[options.connectionType];

        if (!self.connectionType) {
            throw libUtils.genError(
                'Connection type not provided or supported, available are (NORMAL, SENTINEL, CLUSTER)',
                ERROR_CODES.PRECONDITION_FAILED.status,
                ERROR_CODES.PRECONDITION_FAILED.code
            );
        }

        self.redisClient = connectionTypeToRedisConnectionMap[self.connectionType](options.connectOptions);

        self.redisClient.on('connect', () => {
            self.state = REDIS_CLIENT_STATES.CONNECTED;
            console.info('Redis entered state: ', self.state);
        });

        self.redisClient.on('ready', () => {
            self.state = REDIS_CLIENT_STATES.READY;
            console.info('Redis entered state: ', self.state);
        });

        self.redisClient.on('error', () => {
            self.state = REDIS_CLIENT_STATES.ERROR;
            console.info('Redis entered state: ', self.state);
        });

        self.redisClient.on('close', () => {
            self.state = REDIS_CLIENT_STATES.CLOSED;
            console.info('Redis entered state: ', self.state);
        });

        self.redisClient.on('reconnecting', () => {
            self.state = REDIS_CLIENT_STATES.RECONNECTING;
            console.info('Redis entered state: ', self.state);
        });

        self.redisClient.on('end', () => {
            self.state = REDIS_CLIENT_STATES.END;
            console.info('Redis entered state: ', self.state);
        });
    }

    isReady() {
        let self = this;
        if (self.state === REDIS_CLIENT_STATES.READY) {
            return true;
        }

        return false;
    }
}

module.exports = Redis;
