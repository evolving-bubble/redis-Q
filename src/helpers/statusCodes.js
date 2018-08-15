'use strict';

module.exports = {

    // Client Error Codes
    PRECONDITION_FAILED: {
        message: 'Missing mandatory parameters',
        status: 412,
        code: 'PRECONDITION_FAILED'
    },


    // Server Error Codes
    INTERNAL_SERVER_ERROR: {
        message: 'Unexpected error occured, please report',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR'
    },

}