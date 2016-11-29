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
   * @type {string}
   * @memberOf ICommandLineOptions
   */
  separator: string;
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
      name: 'separator', alias: 's', type: String, multiple: false, typeLabel: '[underline]{separator character}',
      description: 'separator character used in the input file (default: ",")'
    }
  ];

  static sections = [{
    header: 'Huisnummer check',
    content: 'Huisnummer check.'
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
  process.exit(1);
}

if (!options || typeof options !== 'object') options = <ICommandLineOptions>{};
if (!options.separator || typeof options.separator !== 'string') options.separator  = ',';

const server = new Server(options);
