import * as fs from 'fs';
import * as path from 'path';
import * as XRegExp from 'xregexp';
import * as Chokidar from 'chokidar';
import * as pd from 'pretty-data';
import * as pg from 'pg';
import * as _ from 'underscore';
import * as async from 'async';

import {
  IConfig
} from './models/config';
// import { IKafkaMessage } from './models/kafka_message';
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

    log(`pgConfig: ${JSON.stringify(this.pgConfig, null, 2)}`);

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
    // to run a query we can acquire a client from the pool, 
    // run a query on the client, and then return the client to the pool 
    // this.pgPool.query(`SELECT ST_X(ST_Transform(geopunt, 4326)) as lon, ST_Y(ST_Transform(geopunt, 4326)) as lat FROM bagactueel.adres WHERE adres.postcode='${pc6}' AND adres.huisnummer=${nr}`, (err, result) => {
    //   if (err) {
    //     log(`${err}`);
    //     cb();
    //   } else {
    //     cb(result.rows);
    //   }
    // });
    this.pg.connect(this.pgConfig, (err, client, done) => {
      if (err) {
        log(`${err}`);
        done();
        cb();
        return;
      }
      client.query(`SELECT DISTINCT ON (verblijfsobject.identificatie) '${pc6}-${nr}' AS invoer, openbareruimtenaam, huisnummer, huisletter, huisnummertoevoeging, postcode,
woonplaatsnaam, pandstatus, pand.identificatie as pandid, verblijfsobject.identificatie as vboid, pand.documentdatum
FROM bagactueel.verblijfsobjectpand, bagactueel.verblijfsobject, bagactueel.pand, bagactueel.adres
WHERE adres.postcode='${pc6}' AND adres.huisnummer=${nr} AND adres.adresseerbaarobject = verblijfsobject.identificatie AND adres.adresseerbaarobject = verblijfsobjectpand.identificatie 
AND verblijfsobjectpand.gerelateerdpand = pand.identificatie
ORDER BY verblijfsobject.identificatie, documentdatum DESC`, (err, result) => {
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
    fs.stat(file, (err, stats: fs.Stats) => {
      if (err || !stats || !stats.isFile()) {
        log(`Not a valid file`);
      } else {
        fs.readFile(file, 'utf8', (err, data) => {
          if (!err && data) {
            this.processData(data);
          } else {
            log(`Error reading file`);
          }
        });
      }
    });
  }

  private processData(data: string) {
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

    if (!nrRow || !pc6Row) {
      log(`Error: no valid address input (nr or PC6)`);
      return;
    }

    rows = rows.splice(0, 35999);

    let results: string[] = [];
    let rowsProcessed: number = 0;
    let rowsFailed: number = 0;

    async.eachLimit(rows, 10, (row: string, callback) => {
      // log(`Processing row ${row}`);
      let cols = row.split(this.options.separator);
      _.map(cols, (c) => {
        return c.trim();
      });
      if (cols.length <= Math.max(nrRow, pc6Row)) {
        log(`Error: too few columns`);
        callback('Too few columns');
      } else {
        this.pgQuery(cols[pc6Row], +cols[nrRow], (res) => {
          if (res && res.length > 0) {
            if (results.length === 0) {
              results.push(_.keys(res[0]).join(';'));
            }
            _.each(res, (result: Object) => { 
              results.push(_.values(result).join(';'));
            });
          }
          rowsProcessed += 1;
          if (rowsProcessed % 1000 === 0) log(`Processed ${rowsProcessed}/${rows.length} \t (${rowsFailed} skipped)`);
          callback();
        });
      }
    }, (err) => {
      // if any of the file processing produced an error, err would equal that error
      if (err) {
        log(`Error: ${err}`);
      } else {
        log(`${rowsProcessed} rows have been processed successfully. ${rowsFailed} failed.`);
        fs.writeFileSync('output.csv', results.join('\r\n'), {encoding: 'utf-8'});
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