import { Router } from './router';
import { ICommandLineOptions } from './cli';

export class Server {
  private router: Router;

  constructor(options?: ICommandLineOptions) {
    this.router = new Router(options);

    process.on('SIGINT', () => {
      this.router.close();
    });

  }
}
