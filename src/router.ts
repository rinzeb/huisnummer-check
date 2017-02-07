import * as fs from 'fs';
import * as path from 'path';
import * as XRegExp from 'xregexp';
import * as Chokidar from 'chokidar';
import * as pd from 'pretty-data';
import * as pg from 'pg';
import * as _ from 'underscore';
import * as async from 'async';
import * as xlsx from 'xlsx';

import {
  IConfig
} from './models/config';
import {
  ICommandLineOptions
} from './cli';
import {
  IAddress
} from './models/address';

const config: IConfig = require(path.join(process.cwd(), 'config.json')),
  log = console.log.bind(console),
  log_error = console.error.bind(console),
  prettyXml = pd.pd,
  now = new Date();

export class Router {
  private pg: any;
  private pgPool: pg.Pool;
  private pgConfig: pg.Config;

  private debugMode: boolean;
  private regex: RegExp;

  constructor(private options: ICommandLineOptions) {
    if (config.hasOwnProperty('debugMode')) this.debugMode = config.debugMode;
    let user = (config.hasOwnProperty('user')) ? config.user : 'user';
    let password = (config.hasOwnProperty('password')) ? config.password : 'password';
    let dbName = (config.hasOwnProperty('dbName')) ? config.dbName : 'bag';
    let dbPort = (config.hasOwnProperty('dbPort')) ? config.dbPort : 5432;
    let dbUrl = (config.hasOwnProperty('dbUrl')) ? config.dbUrl : 'localhost';

    this.pgConfig = {
      host: dbUrl,
      user: user, //env var: PGUSER 
      database: dbName, //env var: PGDATABASE 
      password: password, //env var: PGPASSWORD 
      port: dbPort //env var: PGPORT 
    };

    // log(`pgConfig: ${JSON.stringify(this.pgConfig, null, 2)}`);

    this.pg = require('pg');
    this.pgPool = new pg.Pool(config);

    this.pgPool.on('error', (err, client) => {
      console.error('idle client error', err.message, err.stack)
    });

    this.startProcessing();
  }

  private pgQuery(pc6: string, nr: number, cb: Function) {
    if (!pc6 || !nr) {
      cb();
      return;
    }
    this.pg.connect(this.pgConfig, (err, client, done) => {
      if (err) {
        log(`${err}`);
        done();
        cb();
        return;
      }
      client.query(`SELECT DISTINCT ON (verblijfsobject.identificatie) '${pc6}-${nr}' AS invoer, openbareruimtenaam, huisnummer, huisletter, huisnummertoevoeging, postcode,
woonplaatsnaam, pandstatus, pand.identificatie as pandid, verblijfsobject.identificatie as vboid, pand.documentdatum, pand.bouwjaar
FROM bagactueel.verblijfsobjectpand, bagactueel.verblijfsobject, bagactueel.pand, bagactueel.adres
WHERE adres.postcode='${pc6}' AND adres.huisnummer=${nr} AND adres.adresseerbaarobject = verblijfsobject.identificatie AND adres.adresseerbaarobject = verblijfsobjectpand.identificatie 
AND verblijfsobjectpand.gerelateerdpand = pand.identificatie
ORDER BY verblijfsobject.identificatie, documentdatum DESC LIMIT ${this.options.maxAddresses}`, (err, result) => {
        done();
        if (err) {
          log(`${err}`);
          cb();
        } else {
          cb(result.rows);
        }
      });
    });
  }

  private startProcessing() {
    let file = this.options.file;
    log(`Processing ${file}`);
    let extension = path.extname(file);
    fs.stat(file, (err, stats: fs.Stats) => {
      if (err || !stats || !stats.isFile()) {
        log(`Not a valid file`);
      } else {
        if (extension.indexOf('xls') >= 0) {
          this.processXLS(file, (exitCode) => {
            process.exit(exitCode);
          });
        } else {
          this.processCSV(file, (exitCode) => {
            process.exit(exitCode);
          });
        }
      }
    });
  }

  private processXLS(file: string, cb: Function) {
    let workbook: xlsx.IWorkBook = xlsx.readFile(file);
    let sheetNames = workbook.SheetNames;
    log(`Processing ${sheetNames.length} sheets`);
    async.eachSeries(sheetNames, ((sheetName: string, callback: Function) => {
      log(`------------------------------------------------`);
      log(`Processing sheet ${sheetName}...`);
      let sheet: xlsx.IWorkSheet = workbook.Sheets[sheetName];
      let csvContent = xlsx.utils.sheet_to_csv(sheet, {
        FS: ';',
        RS: '\n'
      });
      this.processData(csvContent, (results) => {
        this.writeResults(results, sheetName, () => {
          log(`------------------------------------------------`);
          callback();
        });
      });
    }),
    (err) => {
      console.log(`Finished ${file}.`);
      cb(0);
    });
  }

  private processCSV(file: string, cb: Function) {
    fs.readFile(file, this.options.charset, (err, data) => {
      if (!err && data) {
        this.processData(data, (results) => {
          this.writeResults(results, 'output', () => {
            console.log(`Finished ${file}.`);
            cb(0);
          });
        });
      } else {
        log(`Error reading file`);
        cb(1);
      }
    });
  }

  private writeResults(results: any[], fileName: string, cb: Function) {
    if (!results) {
      cb();
      return;
    }
    fs.stat(this.options.outDir, (err, stats: fs.Stats) => {
      if (err || !stats || !stats.isDirectory()) {
        log(`Not a valid directory. Creating ${this.options.outDir}`);
        fs.mkdirSync(this.options.outDir);
      }
      let file = `${path.join(this.options.outDir, fileName)}.csv`;
      log(`Writing ${results.length} results to ${file}...`);
      let content = results.join('\r\n');

      fs.writeFile(file, content, {
        encoding: this.options.charset
      }, (err) => {
        if (err) log(`Error writing file: ${err.message}`);
        cb();
      });
    });
  }

  private processData(data: string, cb: Function) {
    let rows = data.split('\r\n');
    if (rows.length < 2) {
      rows = data.split('\n');
    }
    log(`Data: ${rows.length} rows`);
    let headerRow = rows.splice(0, 1).pop();
    let headers = headerRow.split(this.options.separator);
    _.map(headers, (h) => {
      return h.trim();
    });
    let nrRow = headers.indexOf(this.options.nr);
    let pc6Row = headers.indexOf(this.options.pc6);

    log(`Housenumber: ${this.options.nr} - ${nrRow}`);
    log(`Postcode: ${this.options.pc6} - ${pc6Row}`);

    if (nrRow < 0 || pc6Row < 0) {
      log(`Error: no valid address input (nr or PC6)`);
      cb();
      return;
    }

    let results: string[] = [];
    let rowsProcessed: number = 0;
    let rowsFailed: number = 0;
    let rowsNotFound: number = 0;

    async.eachLimit(rows, 10, (row: string, callback) => {
      // log(`Processing row ${row}`);
      let cols = row.split(this.options.separator);
      _.map(cols, (c) => {
        return c.trim();
      });
      if (cols.length <= Math.max(nrRow, pc6Row)) {
        log(`Warning: too few columns: ${JSON.stringify(cols)}`);
        rowsFailed += 1;
        callback();
      } else {
        this.pgQuery(cols[pc6Row], +cols[nrRow], (res) => {
          if (res && res.length > 0) {
            if (results.length === 0) {
              results.push(_.keys(res[0]).join(';'));
            }
            _.each(res, (result: Object) => {
              results.push(_.values(result).join(';'));
            });
          } else {
            rowsNotFound += 1;
          }
          rowsProcessed += 1;
          if (rowsProcessed % 1000 === 0) log(`Processed ${rowsProcessed}/${rows.length} \t (${rowsNotFound} not found, \t ${rowsFailed} skipped)`);
          // https://blog.jcoglan.com/2010/08/30/the-potentially-asynchronous-loop/
          setTimeout(() => {
            callback();
          }, 0);
        });
      }
    }, (err) => {
      // if any of the file processing produced an error, err would equal that error
      if (err) {
        log(`Error: ${err}`);
        cb();
      } else {
        log(`${rowsProcessed} rows have been processed successfully. ${rowsNotFound} addresses were not found, ${rowsFailed} datarows were invalid.`);
        cb(results);
      }
    });
  }

  /**
   * Close producer, optionally writing a last ScenarioUpdate message (e.g. when watching a folder).
   * 
   * @memberOf Router
   */
  close() {
    process.exit();
  }
}
