const LRU = require('lru-cache');

module.exports = new LRU({
    max: 500,
    length: (n, key) => n.length,
    maxAge: 1000 * 60 * 60 * 2
});