'use strict';

// 3rd Party
const Sequelize = require('sequelize');

// Internal
const Libs = require('../lib');
const Config = require('../config');
const Constants = Config.constants;
const Helpers = require('../helpers');
const Publisher = require('./publisher');
const Scheduler = require('../scheduler/scheduler');

const libUtils = new Libs.utils();

const Operators = Sequelize.Op;
const STATUS_CODES = Helpers.statusCodes;
const SUPPORTED_TYPES = Object.keys(TYPE_MAP);
const OPERATORS_MAP = Constants.enums.OPERATORS_TO_SEQUELIZE_OPERATORS;
const TYPE_MAP = Constants.enums.DB_FIELDS_TYPE_TO_SEQUELIZE_FIELDS_TYPE;

class DBPublisher extends Publisher {
    constructor(options) {
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
                }
            }
        );


        let genError = false;
        let tableOptions;
        options.db.tableFields.forEach((field) => {
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

        console.info('Options created to schedule are : ', tableOptions);
        self.table = Sequelize.define(
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
            where: {}
        };
        // searchOptionsFormat should be like
        // where should be a list of and and or, so that all combinations can be handled
        // [
        //     {
        //         and: [{
        //             key: column,
        //             operator: 'eq',
        //             value: value
        //         }],
        //         or: [{
        //             key: column,
        //             operator: 'between',
        //             value: [value1, value2]
        //         }]
        //     }
        // ];
        options.db.searchOptions.forEach((element) => {
            if (element.and) {
                element.and.forEach((searchField) => {
                    searchField.forEach((field) => {

                    })
                })
            }
        });
        self.searchOptions = searchOptions;
        super(options);
    }

    exec() {
        let self = this;

        self.table.findAll({

        })
    }
}