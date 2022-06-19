// const websockify = require('koa-websocket');
const Websocket = require('ws');
const Koa = require('koa');
const Router = require('koa-router');

const chalk = require('chalk');
const { initHttpServer, initWebsocketServer } = require('./impl');

const app = new Koa();
const router = new Router();

initHttpServer(router);

let port = 9111;
const pindex = process.argv.indexOf('-p');
if(pindex > -1) {
    const portarg = process.argv[pindex+1];
    const nport = Number(portarg);
    if(!isNaN(nport)) {
        port = nport;
    }
}

const server = app.listen(port, () => {
    console.log(`${chalk.yellow('Collaboration websocket server is listening at')} ${chalk.blue.bold(port)}`)
});

const websocket = new Websocket.Server({
    server
});

app.use(router.routes());
app.use(router.allowedMethods());

initWebsocketServer(websocket);