const getRawBody = require('raw-body');
const cache = require('../cache');

exports.method = 'post';
exports.path = '/snapshot/upload';
let id = Date.now();

exports.handler = ctx => {
    return getRawBody(ctx.req).then(buffer => {
        console.info(buffer.byteLength, buffer.byteOffset);
        const fileid = (id++).toString(16);
        cache.set(fileid, {
            type: 'image/png',
            buffer: buffer
        });
        ctx.type = 'text/plain';
        ctx.body = `/snapshot/image/${fileid}`;
        console.info('upload image', fileid);
    });
};