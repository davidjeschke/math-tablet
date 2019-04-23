/*
Math Tablet
Copyright (C) 2019 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Requirements

import { createServer } from 'http';
import { join } from 'path';

import * as  createError from 'http-errors';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as morgan from 'morgan';
import { middleware as stylusMiddleware } from 'stylus';

import { initialize as initializeMathematicaCas } from './mathematica-cas';
import { initialize as initializeMathJsCas } from './mathjs-cas';
import { initialize as initializeMathStepsCas } from './math-steps-cas';

import { router as apiRouter } from './routes/api';
import { router as indexRouter } from './routes/index';
import { initialize as initializeWebSockets } from './web-socket';

// Helper Functions

function normalizePort(val: string): string|number|boolean {
  var port = parseInt(val, 10);
  if (isNaN(port)) { /* named pipe */ return val; }
  if (port >= 0) { /* port number */ return port; }
  return false;
}

// Application Entry Point

async function main() {

  await Promise.all([
    initializeMathematicaCas(),
    initializeMathJsCas(),
    initializeMathStepsCas(),
  ]);

  const app: express.Express = express();

  // view engine setup
  app.set('views', join(__dirname, 'views'));
  app.set('view engine', 'pug');

  app.use(morgan('dev'));

  app.get('/stylesheets/myscript.min.css', (_req: express.Request, res: express.Response)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.css`));
  app.get('/javascripts/myscript.min.js', (_req: express.Request, res: express.Response)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.js`));
  app.get('/javascripts/myscript.min.js.map', (_req: express.Request, res: express.Response)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.js.map`));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(stylusMiddleware(join(__dirname, 'public')));
  app.use(express.static(join(__dirname, 'public')));

  app.use('/', indexRouter);
  app.use('/api', apiRouter);

  // catch 404 and forward to error handler
  app.use(function(_req: express.Request, _res: express.Response, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err: any, req: express.Request, res: express.Response, _next: express.NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const server = createServer(app);
  server.listen(port);

  server.on('error', (error: Error)=>{
    if ((<any>error).syscall !== 'listen') { throw error; }
    var bind = (typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port);
    switch ((<any>error).code) {
      case 'EACCES':
        console.error(`ERROR: ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`ERROR: ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.on('listening', ()=>{
    const addr = server.address();
    const bind = (typeof addr === 'string' ? `pipe ${addr}` : `port ${addr && addr.port}`);
    console.log('Listening on ' + bind);
  });

  initializeWebSockets(server);
}

main().then(
  ()=>{ console.log("Main promise resolved."); },
  (err)=>{ console.error(`Error initializing app: ${err.message}`); },
);