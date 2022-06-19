const Koa = require('koa');
const Router = require('koa-router');
const sockjs = require('sockjs');
const chalk = require('chalk');
const { initHttpServer } = require('./impl');
const { initSockjsServer } = require('./impl');

const app = new Koa();
const router = new Router();


initHttpServer(router);

let port = 9112;
const pindex = process.argv.indexOf('-p');
if(pindex > -1) {
    const portarg = process.argv[pindex+1];
    const nport = Number(portarg);
    if(!isNaN(nport)) {
        port = nport;
    }
}
app.use(router.routes());
app.use(router.allowedMethods());

const sockjsServer = sockjs.createServer();

initSockjsServer(app, sockjsServer);

var server = app.listen(port, ()=> {
    console.log(`${chalk.yellow('Collaboration sockjs server is listening at')} ${chalk.blue.bold(port)}`)
});
sockjsServer.installHandlers(server, {
    prefix: '/collab/ws'
});

