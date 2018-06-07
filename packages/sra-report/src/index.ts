#!/usr/bin/env node
import { assert } from '@0xproject/assert';
import { logUtils } from '@0xproject/utils';
import chalk from 'chalk';
import * as _ from 'lodash';
import * as yargs from 'yargs';

import * as sraReportCollectionJSON from '../../postman_collections/sra_report.postman_collection.json';

import { postmanEnvironmentFactory } from './postman_environment_factory';
import { utils } from './utils';

const DEFAULT_NETWORK_ID = 1;
const networkNameToId: { [networkName: string]: number } = {
    mainnet: 1,
    ropsten: 3,
    rinkeby: 4,
    kovan: 42,
};
const SUPPORTED_NETWORK_IDS = [
    networkNameToId.mainnet,
    networkNameToId.ropsten,
    networkNameToId.rinkeby,
    networkNameToId.kovan,
];

// extract command line arguments
const args = yargs
    .option('endpoint-url', {
        alias: ['e'],
        describe: 'API endpoint url to test for standard relayer API compliance',
        type: 'string',
        demandOption: true,
    })
    .option('output', {
        alias: ['o', 'out'],
        describe: 'The relative path to write the report generated by the collection run, prints to console by default',
        type: 'string',
        normalize: true,
        demandOption: false,
    })
    .option('network-id', {
        alias: ['n'],
        describe: 'ID of the network that the API is serving orders from',
        type: 'number',
        default: DEFAULT_NETWORK_ID,
    })
    .option('environment', {
        alias: ['env'],
        describe: 'The relative path to a postman environment file for the collection run',
        type: 'string',
        normalize: true,
        demandOption: false,
    })
    .option('export-collection', {
        alias: ['ec'],
        describe: 'The relative path to write the postman collection file used by the collection run',
        type: 'string',
        normalize: true,
        demandOption: false,
    })
    .option('export-environment', {
        alias: ['ee'],
        describe: 'The relative path to write the postman environment file used by the collection run',
        type: 'string',
        normalize: true,
        demandOption: false,
    })
    .example(
        "$0 --endpoint-url 'http://api.example.com' --out 'path/to/report.json' --network-id 42 --environment 'path/to/custom/environment.json' --export-collection 'path/to/collection.json' --export-environment 'path/to/environment.json'",
        'Full usage example',
    ).argv;
// perform extra validation on command line arguments
try {
    assert.isWebUri('args', args.endpointUrl);
} catch (err) {
    logUtils.log(`${chalk.red(`Invalid url format:`)} ${args.endpointUrl}`);
    process.exit(1);
}
if (!_.includes(SUPPORTED_NETWORK_IDS, args.networkId)) {
    logUtils.log(`${chalk.red(`Unsupported network id:`)} ${args.networkId}`);
    logUtils.log(`${chalk.bold(`Supported network ids:`)} ${SUPPORTED_NETWORK_IDS}`);
    process.exit(1);
}
const mainAsync = async () => {
    const newmanReporterOptions = !_.isUndefined(args.output)
        ? {
              reporters: 'json',
              reporter: {
                  json: {
                      export: args.output,
                  },
              },
          }
        : {
              reporters: 'cli',
          };
    const environment = !_.isUndefined(args.environment)
        ? args.environment
        : await postmanEnvironmentFactory.createPostmanEnvironmentAsync(args.endpointUrl, args.networkId);
    const newmanRunOptions = {
        collection: sraReportCollectionJSON,
        environment,
        exportCollection: args.exportCollection,
        exportEnvironment: args.exportEnvironment,
        ...newmanReporterOptions,
    };
    await utils.newmanRunAsync(newmanRunOptions);
};
mainAsync().catch(logUtils.log);
