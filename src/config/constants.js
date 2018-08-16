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
            P0: '00',
            P1: '01',
            P2: '02',
            P3: '03',
            P4: '04',
            P5: '05',
            P6: '06',
            P7: '07',
            P8: '08',
            P9: '09',
            P10: '10',
        },

        DEFAULT_PRIORITY: 'P5'
    }
}