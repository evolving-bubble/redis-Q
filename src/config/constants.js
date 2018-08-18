'use strict';

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

        PRIORITY: {
            P0: 'P0',
            P1: 'P1',
            P2: 'P2',
            P3: 'P3',
            P4: 'P4',
            P5: 'P5',
            P6: 'P6',
            P7: 'P7',
            P8: 'P8',
            P9: 'P9'
        },

        DEFAULT_PRIORITY: 'P5'
    }
}