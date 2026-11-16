// Test-only preload. Never import from application startup.
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
import mongoose from 'mongoose';

const deny = () => { throw new Error('PHASE1_ISOLATION: network/database access forbidden'); };
net.Socket.prototype.connect = deny;
net.Server.prototype.listen = deny;
tls.connect = deny;
dgram.Socket.prototype.send = deny;
dgram.Socket.prototype.connect = deny;
for (const key of ['lookup', 'resolve', 'resolveSrv']) {
  dns[key] = deny;
  dns.promises[key] = deny;
}
mongoose.connect = deny;
mongoose.createConnection = deny;
mongoose.Connection.prototype.openUri = deny;
mongoose.set('bufferCommands', false);
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
syncBuiltinESMExports();
globalThis.phase1Isolation = true;
