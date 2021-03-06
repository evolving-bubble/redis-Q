'use strict';

const Sequelize = require('sequelize');

module.exports = {
    enums: {
        CONNECTION_TYPES: {
            NORMAL: 'NORMAL',
            CLUSTER: 'CLUSTER',
            SENTINEL: 'SENTINEL'
        },

        REDIS_CLIENT_STATES: {
            UNINITIALIZED: 'UNINITIALIZED',
            CONNECTED: 'CONNECTED',
            READY: 'READY',
            ERROR: 'ERROR',
            CLOSED: 'CLOSED',
            RECONNECTING: 'RECONNECTING',
            END: 'END'
        },

        FAMILY_TYPES: {
            IPv4: 4,
            IPv6: 6
        },

        DB_FIELDS_TYPE_TO_SEQUELIZE_FIELDS_TYPE: {
            TEXT: Sequelize.TEXT,
            FLOAT: Sequelize.FLOAT,
            DOUBLE: Sequelize.DOUBLE,
            DATETIME: Sequelize.DATE,
            BIGINT: Sequelize.BIGINT,
            DATE: Sequelize.DATEONLY,
            VARCHAR: Sequelize.STRING,
            INTEGER: Sequelize.INTEGER,
            DECIMAL: Sequelize.DECIMAL,
            TINYTEXT: Sequelize.TEXT('tiny'),
            UNSIGNED_INTEGER: Sequelize.INTEGER.UNSIGNED,
        },

        OPERATORS_TO_SEQUELIZE_OPERATORS: {
            eq: '$eq',
            or: '$or',
            and: '$and',
            gt: '$gt',
            gte: '$gte',
            lt: '$lt',
            lte: '$lte',
            ne: '$ne',
            in: '$in',
            notIn: '$notIn',
            between: '$between',
            notBetween: '$notBetween',
            like: '$like',
            notLike: '$notLike',
            iLike: '$iLike',
            notILike: '$notILike'
        }
    }
}