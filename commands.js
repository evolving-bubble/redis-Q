#!/usr/bin/env node
'use strict';

const Program = require('commander');

const Commands = require('./src/commands');

Program
    .command('stop [name]')
    .description('Stop service')
    .action(Commands.stop.exec.bind(Commands.stop));

Program
    .command('start [name]')
    .option('-rh, --redis-host', 'Redis host IP')
    .option('-rp, --redis-port', 'Redis port')
    .description('Start service')
    .action(Commands.start.exec.bind(Commands.start));

Program
    .command('restart [name]')
    .description('Restart service')
    .action(Commands.restart.exec.bind(Commands.restarts));

Program
    .version('1.0.0', '-v, --version')
    .description('Redis Q Manager')
    .parse(process.argv);