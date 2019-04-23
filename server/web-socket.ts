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

import { Server } from 'http';

import { Request } from 'express';
import * as WebSocket from 'ws';

import { OpenTDoc } from './open-tdoc';

// Exported Functions

export function initialize(server: Server) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', onConnection);
}

// Event Handlers

async function onConnection(ws: WebSocket, req: Request): Promise<void> {
  // try {
    console.log(`New socket connection to: ${req.url}`);
    const urlComponents = req.url.split('/');
    if (urlComponents.length!=3) { throw new Error("Unexpected path in socket connection URL."); }
    const userName = urlComponents[1];
    const notebookName = urlComponents[2];
    await OpenTDoc.connect(userName, notebookName, ws);
  // } catch(err) {
  //   console.error("Unexpected error handling web-socket connection event.");
  // }
}