const Koa = require('koa');
const Router = require('koa-router');
const requireDir = require('require-dir');
const chalk = require('chalk')
const app = new Koa()

const router = Router()

const views = requireDir('./view');

for(const name in views) {
    const view = views[name];
    const path = view.path || '/' +name;
    let methods = view.method || 'get';
    if(typeof view.handler !== 'function') {
        throw new Error('handler is not defined :' + path)
    }
    if(!Array.isArray(methods)) {
        methods = [methods];
    }
    methods.forEach(method => {
        console.log(`[router] ${chalk.green(method)} ${chalk.underline.blue(path)}`);
        if(view.middleware) {
            router[method].call(router, path, view.middleware, view.handler);
        } else {
            router[method].call(router, path, view.handler);
        }
    });
}

app.use(router.routes());
app.use(router.allowedMethods());

let port = 3002;
const pindex = process.argv.indexOf('-p');
if(pindex > -1) {
    const portarg = process.argv[pindex+1];
    const nport = Number(portarg);
    if(!isNaN(nport)) {
        port = nport;
    }
}

app.listen(port, () => {
    console.log(`${chalk.yellow('WebViewer SDK Snapshot Server is listening at')} ${chalk.blue.bold(port)}`)
});