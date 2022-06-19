const fs = require('fs');
const Router = require('koa-router');
const Koa = require('koa');
const koaBody = require('koa-body');
const { uniqueId } = require('./common');
const sockjs = require('sockjs');
const Session = require('./session');

/**
 * @type {Object.<string,Session>}
 */
const sessions = {}
/**
 * 
 * @param {Router} router
 */
exports.initHttpServer = (router) => {
    router.post('/collab/share', koaBody({
        multipart: true
    }), ctx => {
        const body = ctx.request.body;
        const files = ctx.request.files;
        const openFileParams = JSON.parse(body['open-file-params'].trim());
        const shareId = uniqueId('x?????d-X');

        sessions[shareId] = new Session(shareId, openFileParams, files.file);
        // create new share id
        ctx.body = JSON.stringify({
            shareId
        });
        ctx.headers['Content-Type'] = 'application/json';
    })
    router.get('/collab/data/:shareId/:version', (ctx) => {
        const { shareId, version } = ctx.params;

        const session = sessions[shareId];
        if(session) {
            ctx.body = JSON.stringify(session.getDataSince(version));
        } else {
            ctx.body = JSON.stringify([]);
        }
        ctx.headers['Content-Type'] = 'application/json';
    });
    router.get('/collab/session/:shareId', ctx => {
        const shareId = ctx.params.shareId;
        const session = sessions[shareId];
        if(session) {
            const params = session.getOpenFileParams();
            try {
                ctx.append('session-info', encodeURIComponent(JSON.stringify({
                    shareId,
                    openFileParams: params
                })));
            } catch (error) {
                console.info(params);
                console.error(error);
            }
            ctx.status = 200;
            if(params.type === 'from-file') {
                const file = session.getFile();
                if(file) {
                    ctx.append('Content-Length', file.size);
                    ctx.body = fs.createReadStream(file.path);
                }
                return;
            }
        } else {
            ctx.append('session-info', 'null');
            ctx.status = 404;
        }
    });
};

/**
 * 
 * @param {Koa} app 
 * @param {sockjs.Server} sockjs 
 */
exports.initSockjsServer = (app, sockjs) => {
    sockjs.on('connection', conn => {
        const query = conn.url.slice(conn.url.indexOf('?')+1);
        const shareId = getQueryParameter(query, 'shareId');
        if(!(shareId in sessions)) {
            sessions[shareId] = new Session(shareId);
        }
        const session = sessions[shareId];
        const remove = session.appendConnection(conn);
        console.log('New client :' + shareId);
        conn.on('close', () => {
            remove();
            console.log('Client offline: ' + shareId);
            if(session.connections.length === 0) {
                // keep session alive for 5 minutes, after 5 minute, the session will be destroyed automatically. 
                const minutes = 5;
                session.destroyAfter(1000 * 60 * minutes).then(() => {
                    delete sessions[shareId];
                    console.log('The session "' + shareId + '" is destroyed for all clients are offline for most then '+minutes+' minutes!');
                });
            }
        });
        conn.on('data', data => {
            session.cancelToDestroy();
            try {
                if(data === String.fromCharCode(0x09)) {
                    conn.write(String.fromCharCode(0xa));
                    return;
                }
                session.broadcast(conn, data);
            } catch (error) {
                console.error(error);
            }
        });
    });
}
function getQueryParameter(query, name) {
    var reg = /([^=&]+)\=([^&=]+)/g
    while(true) {
        var result = reg.exec(query);
        if(!result) {
            break;
        }
        if(result[1] === name) {
            return result[2];
        }
    }
}
