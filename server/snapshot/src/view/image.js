const cache = require('../cache');
exports.path = '/snapshot/image/:fileid'
exports.handler = async (ctx) => {
    const file = cache.get(ctx.params.fileid);
    if(!file) {
        ctx.type = 'image/svg';
        ctx.body = '<svg></svg>';
        return;
    }
    ctx.type = file.type;
    ctx.body = file.buffer;
    console.log('get image', ctx.params.fileid);
}