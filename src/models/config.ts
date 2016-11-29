/**
 * Configuration file
 * 
 * @export
 * @interface IConfig
 */
export interface IConfig {
  debugMode?: boolean;
  dbUrl: string;
  user: string;
  password: string;
  dbName: string;
  dbPort: number;
}
