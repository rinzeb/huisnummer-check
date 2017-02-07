import { Server } from './server';

const commandLineArgs = require('command-line-args');

export interface ICommandLineOptions {
  /**
   * Input file (default is `input.csv`)
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  file: string;
  /**
   * Help
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  help: string;
  /**
   * pc6
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  pc6: string;
  /**
   * nr
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  nr: string;
  /**
   * toevoeging
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  toevoeging: string;
  /**
   * separator
   * 
   * @type {number}
   * @memberOf ICommandLineOptions
   */
  maxAddresses: number;
  /**
   * separator
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  separator: string;
  /**
   * outDir
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  outDir: string;
  /**
   * charset
   * 
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  charset: string;
}

export class CommandLineInterface {
  static optionDefinitions = [
    { name: 'help', alias: '?', type: Boolean, multiple: false, typeLabel: '[underline]{Help}', description: 'Display help information.' },
    {
      name: 'file', alias: 'f', type: String, multiple: false, typeLabel: '[underline]{Input file}',
      description: 'Input file to process. Default file is input.csv.'
    },
    {
      name: 'pc6', alias: 'p', type: String, multiple: false, typeLabel: '[underline]{PC6 header}',
      description: 'Header of the input file that contains PC6'
    },
    {
      name: 'nr', alias: 'n', type: String, multiple: false, typeLabel: '[underline]{Huisnummer header}',
      description: 'Header of the input file that contains huisnummer'
    },
    {
      name: 'toevoeging', alias: 't', type: String, multiple: false, typeLabel: '[underline]{Huisnummer toevoeging header}',
      description: 'Header of the input file that contains huisnrtoevoeging'
    },
    {
      name: 'maxAddresses', alias: 'm', type: Number, multiple: false, typeLabel: '[underline]{Maximum number of addresses}',
      description: 'Maximum number of addresses to return. E.g., addresses 1a, 1b, ... , 1z might exist. Use -m 1 to return only one address (Default: 99)'
    },
    {
      name: 'separator', alias: 's', type: String, multiple: false, typeLabel: '[underline]{separator character}',
      description: 'separator character used in the input file (default: ",")'
    },
    {
      name: 'outDir', alias: 'o', type: String, multiple: false, typeLabel: '[underline]{output directory}',
      description: 'output directory (default: "./outputdata")'
    },
    {
      name: 'charset', alias: 'e', type: String, multiple: false, typeLabel: '[underline]{charset}',
      description: 'charset used in input and output files (default: "latin1")'
    }
  ];

  static sections = [{
    header: 'Huisnummer check',
    content: 'Huisnummer check.\nExample command: \n`    node dist/run.js --file=input.xlsx --separator=";" --pc6="Postcode" --nr="Huisnummer"'
  }, {
    header: 'Options',
    optionList: CommandLineInterface.optionDefinitions
  }, {
    header: 'Extracting time from the filename',
    content: ``
  }];
}

let options: ICommandLineOptions = commandLineArgs(CommandLineInterface.optionDefinitions);

if (options.help) {
  const getUsage = require('command-line-usage');
  const usage = getUsage(CommandLineInterface.sections);
  console.log(usage);
  process.exit(0);
}

if (!options || typeof options !== 'object') options = <ICommandLineOptions>{};
if (!options.separator || typeof options.separator !== 'string') options.separator  = ',';
if (!options.outDir || typeof options.outDir !== 'string') options.outDir  = 'outputdata';
if (!options.charset || typeof options.charset !== 'string') options.charset  = 'latin1';
if (!options.maxAddresses || typeof options.maxAddresses !== 'number') options.maxAddresses  = 99;

const server = new Server(options);
