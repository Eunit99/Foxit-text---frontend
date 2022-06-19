const handler = require('serve-handler');
const pkg = require('../package.json');
const proxy = require('http-proxy-middleware');
const chalk = require('chalk');
const boxen = require('boxen');

const port = pkg.serve.port; 

const http = require('http');
const snapshotProxyHandler = proxy("/snapshot", pkg.serve.proxy);
const collaborationWebsocketProxyHandler = proxy('/collab-ws', pkg['collaboration-websocket']);
const collaborationSockjsProxyHandler = proxy('/collab', pkg['collaboration-sockjs']);

const server = http.createServer((req, res) => {
    return snapshotProxyHandler(req, res, () => {
        return collaborationWebsocketProxyHandler(req, res, () => {
            return collaborationSockjsProxyHandler(req, res, () => {
                return handler(req, res, {
                    public: process.cwd(),
                    renderSingle: true,
                    trailingSlash: true,
                    cleanUrls: false
                });
            })
        });
    });
});

server.on('upgrade', collaborationWebsocketProxyHandler.upgrade);
server.on('upgrade', collaborationSockjsProxyHandler.upgrade);

server.listen(port, () => {
    console.log(`${chalk.yellow('WebViewer SDK Demo Server is listening at')} ${chalk.blue.bold(port)}`);
    const details = server.address();

    let localAddress;

    if(typeof details === 'string') {
        localAddress = details;
    } else if(typeof details === 'object' && details.port) {
        const address = details.address === '::' ? 'localhost' : details.address;
        localAddress = `http://${address}:${details.port}/`;
    }
    if(localAddress) {
        console.log(boxen(`
${chalk.bold('Basic WebViewer Address')}: ${chalk.cyan(localAddress+'examples/PDFViewCtrl/basic_webViewer/')}

${chalk.bold('Complete WebViewer Address')}: ${chalk.cyan(localAddress+'examples/UIExtension/complete_webViewer/')}
        `, {
            borderColor: 'green',
            borderStyle: 'bold',
            padding: 1,
            margin: 1
        }));
    }
})