'use strict';

module.exports = {

    // Success Codes

    OK: {
        message: 'Successfully processed',
        status: 200,
        code: 'OK'
    },

    SUCCESSFULLY_LISTED: {
        message: 'Successfully listed job data',
        status: 200,
        code: 'SUCCESSFULLY_LISTED'
    },

    SUCCESSFULLY_CANCELLED: {
        message: 'Successfully cancelled job data',
        status: 200,
        code: 'SUCCESSFULLY_CANCELLEd'
    },

    // Client Error Codes
    PRECONDITION_FAILED: {
        message: 'Missing mandatory parameters',
        status: 412,
        code: 'PRECONDITION_FAILED'
    },

    NO_JOB: {
        message: 'No such job exists',
        status: 422,
        code: 'NO_JOB'
    },

    UNABLE_TO_PROCESS: {
        message: 'Unable to process',
        status: 422,
        code: 'UNABLE_TO_PROCESS'
    },

    // Server Error Codes
    INTERNAL_SERVER_ERROR: {
        message: 'Unexpected error occured, please report',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR'
    },

}