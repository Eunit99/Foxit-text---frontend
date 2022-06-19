const fs = require('fs');
const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const Websocket = require('ws');
const { uniqueId } = require('./common');
const Session = require('./session');

const HEART_BEAT_FROM_CLIENT = '\t';
const HEART_BEAT_FROM_SERVER = '\n';

/**
 * @type {Object.<string,Session>}
 */
const sessions = {}
/**
 * 
 * @param {Router} router
 */
exports.initHttpServer = (router) => {
    router.post('/collab-ws/share', koaBody({
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
    });
    /**
     * @param {Koa.} ctx
     */
    router.get('/collab-ws/data/:shareId/:version', (ctx) => {
        const { shareId, version } = ctx.params;
        console.info(shareId, version);
        const session = sessions[shareId];
        if(session) {
            ctx.body = JSON.stringify(session.getDataSince(version));
        } else {
            ctx.body = JSON.stringify([]);
        }
        ctx.headers['Content-Type'] = 'application/json';
    });
    router.get('/collab-ws/session/:shareId', ctx => {
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
 * @param {Websocket.Server} websocket 
 */
exports.initWebsocketServer = (websocket) => {
    websocket.on('connection', (socket, req) => {
        const qindex = req.url ? req.url.indexOf('?') : -1;
        const path = qindex === -1 ? req.url : req.url.slice(0, qindex);
        if(path !== '/collab-ws/ws' && path !== '/collab-ws/ws/') {
            socket.close(1010);
            return;
        } 
        const query = req.url.slice(qindex+1);
        const reg = /([^=&]+)\=([^&=]+)/g
        let shareId;
        while(true) {
            const [,key,value] = reg.exec(query) || [];
            if(!key) {
                break;
            }
            if(key === 'shareId') {
                shareId = value;
                break;
            }
        }
        if(!shareId) {
            socket.close(1010,'shareId is required!');
            return;
        }
        if(!(shareId in sessions)) {
            sessions[shareId] = new Session(shareId);
        }
        const session = sessions[shareId];
        const remove = session.appendConnection(socket);
        socket.on('close', () => {
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
        socket.on('message', data => {
            session.cancelToDestroy();
            if(data === HEART_BEAT_FROM_CLIENT) {
                try {
                    socket.write(HEART_BEAT_FROM_SERVER);
                }catch(e) {
                    console.error(e);
                }
            }
            try {
                session.broadcast(socket, data);
            } catch (error) {
                console.error(error);
            }
        });
    });
};