'use strict';

// Internal
const Libs = require('../lib');
const Config = require('../config');
const Helpers = require('../helpers');
const Constants = Config.constants;

const libUtils = new Libs.utils();

const STATUS_CODES = Helpers.statusCodes;
const CONNECTION_TYPES = Constants.enums.CONNECTION_TYPES;


class Job {

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

        // Create job options for redis client, 
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
            jobPrefix: options.jobPrefix
        };

        self.redis = new Libs.redis(redisPublisherOptions);
    }

    peek(jobId) {
        let self = this;

        return new Promise((resolve, reject) => {
            return self.redis.peekJob(jobId)
                .then((result) => {
                    console.log(result);
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    cancel(jobId) {
        let self = this;
        return new Promise((resolve, reject) => {
            return self.redis.cancelJob(jobId)
                .then((result) => {
                    console.log(result);
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    generateJSONReport(jobId) {
        let self = this;
        return new Promise((resolve, reject) => {
            return self.redis.generateJSONReport(jobId)
                .then((result) => {
                    console.log(result);
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    generateCSVReport(jobId) {
        let self = this;
        return new Promise((resolve, reject) => {
            return self.redis.generateJSONReport(jobId)
                .then((result) => {
                    if (!result || !result.length) {
                        return Promise.resolve([]);
                    }

                    let csvResult = libUtils.jsonToCsv(result);
                    return Promise.resolve(csvResult);
                })
                .then((result) => {
                    console.log(result);
                    resolve(result);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
}

module.exports = Job;

const job = new Job({
    redis: {
        connectionType: 'NORMAL',
        host: 'localhost',
        port: '6379',
    },
    jobPrefix: 'redisService1'
});

setTimeout(() => {
    job.generateCSVReport('6372bae0-14ed-4b0e-bd61-6775ff81f2e5');
    job.generateJSONReport('4ff188bd-5572-4455-bcac-f5c758e9f924');
    job.peek('4ff188bd-5572-4455-bcac-f5c758e9f924');
}, 1000);