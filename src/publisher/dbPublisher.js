'use strict';

// 3rd Party
const Sequelize = require('sequelize');

// Internal
const Config = require('../config');
const Constants = Config.constants;
const Utils = require('../lib/utils');
const Helpers = require('../helpers');
const Publisher = require('./publisher');
const Scheduler = require('../scheduler/scheduler');

const libUtils = new Utils();

const Operators = Sequelize.Op;
const STATUS_CODES = Helpers.statusCodes;
const OPERATORS_MAP = Constants.enums.OPERATORS_TO_SEQUELIZE_OPERATORS;
const TYPE_MAP = Constants.enums.DB_FIELDS_TYPE_TO_SEQUELIZE_FIELDS_TYPE;
const SUPPORTED_TYPES = Object.keys(TYPE_MAP);

class DBPublisher extends Publisher {
    constructor(options) {
        super(options);
        let self = this;

        if (
            typeof options !== 'object' &&
            !options.jobName &&
            !options.schedulerTime
        ) {
            throw libUtils.genError(
                'Please provide proper options for redis connection',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        // Right now supporting only mysql, 
        // in future will add other supports
        if (
            !options.db &&
            !options.db.host &&
            !options.db.port &&
            !options.db.user &&
            !options.db.password &&
            !options.db.database &&
            !options.db.table &&
            !options.db.tableFields &&
            !options.db.searchOptions
        ) {
            throw libUtils.genError(
                'Please provide proper db options for connection to DB',
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        // Create db Client
        self.dbClient = new Sequelize(
            options.db.database,
            options.db.user,
            options.db.password,
            {
                host: options.db.host,
                dialect: 'mysql',
                pool: {
                    max: 1,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                define: {
                    timestamps: false
                }
            }
        );


        let genError = false;
        let tableOptions = {};
        options.db.tableFields.forEach((field) => {
            field.type = field.type.toUpperCase();
            if (!TYPE_MAP[field.type]) {
                genError = true;
            }
            tableOptions[field.key] = TYPE_MAP[field.type]
        });

        if (genError) {
            throw libUtils.genError(
                'Please provide proper db fields type, supported are: ' + SUPPORTED_TYPES,
                STATUS_CODES.PRECONDITION_FAILED.status,
                STATUS_CODES.PRECONDITION_FAILED.code
            );
        }

        console.info('Options created to schedule');
        self.table = self.dbClient.define(
            options.db.table,
            tableOptions
        )

        let schedulerOptions = {
            jobName: options.jobName,
            callback: self.exec.bind(self),
            schedulerTime: options.schedulerTime
        };
        self.scheduler = new Scheduler(schedulerOptions);

        let searchOptions = {
            where: {
                [OPERATORS_MAP.and]: {}
            },
            raw: true
        };

        // searchOptions format should be like
        // where should be a list of and and or, so that all combinations can be handled
        // [{
        //     key: column,
        //     operator: 'eq',
        //     value: value
        // }];
        options.db.searchOptions.forEach((element) => {
            if (!searchOptions.where[OPERATORS_MAP.and][element.key]) {
                searchOptions.where[OPERATORS_MAP.and][element.key] = {};
            }
            searchOptions.where[OPERATORS_MAP.and][element.key][OPERATORS_MAP[element.operator]] = element.value;
        });
        self.searchOptions = searchOptions;
    }

    exec() {
        let self = this;

        self.table.findAll(self.searchOptions)
            .then((result) => {
                if (!result || !result.length) {
                    console.info('No records found for given scheduled query');
                    return Promise.resolve();
                }

                console.log('Pushing result into redis');
                self.push(result);
                return Promise.resolve();
            })
            .catch((error) => {
                console.error(error);
            });
    }
}

// // Test
// const dBPublisher = new DBPublisher({
//     jobName: 'test-DBPublisher',
//     schedulerTime: '*/10 * * * * *', // Every 10 secs
//     db: {
//         host: 'localhost',
//         port: '3306',
//         user: 'root',
//         password: 'paytm@197',
//         database: 'wealthmgmt',
//         table: 'dg_buy_orders',
//         tableFields: [
//             {
//                 key: 'order_id',
//                 type: 'varchar'
//             },
//             {
//                 key: 'order_item_id',
//                 type: 'varchar'
//             },
//             {
//                 key: 'customer_id',
//                 type: 'varchar'
//             },
//         ],
//         searchOptions: [{
//             key: 'order_id',
//             operator: 'eq',
//             value: '4295046610'
//         }]
//     },
//     redis: {
//         host: 'localhost',
//         port: '6379',
//         connectionType: 'NORMAL'
//     }
// });
// dBPublisher.exec();