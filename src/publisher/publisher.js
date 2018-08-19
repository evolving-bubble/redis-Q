'use strict';

// Internal
const Libs = require('../lib');
const Config = require('../config');
const Helpers = require('../helpers');
const Constants = Config.constants;

const libUtils = new Libs.utils();

const STATUS_CODES = Helpers.statusCodes;
const CONNECTION_TYPES = Constants.enums.CONNECTION_TYPES;


class Publisher {
    constructor(options) {
        let self = this;

        if (
            (!options.redis && !options.redis.host && !options.redis.port && options.redis.connectionType !== CONNECTION_TYPES.NORMAL) ||
            (!options.redis && !options.redis.sentinels && options.redis.connectionType !== CONNECTION_TYPES.SENTINEL) ||
            (!options.redis && !options.redis.nodes && options.redis.connectionType !== CONNECTION_TYPES.CLUSTER)
        ) {
            throw libUtils.genError(
                'Please provide proper options for redis connection',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        // Create publisher options for redis client, 
        // nodes if cluster,
        // sentinels if sentinel, 
        // host,port if single redis
        let redisPublisherOptions = {
            host: options.redis.host,
            port: options.redis.port,
            sentinels: options.redis.sentinels,
            connectionType: options.redis.connectionType,
            nodes: options.redis.nodes
        };

        self.redis = new Libs.redis(redisPublisherOptions);

    }

    push(elements, priority) {
        console.debug('Publisher pushing message: ', elements, ' with priority: ', priority);
        self.redis.client.push({
            elements,
            priority
        });
    }

}