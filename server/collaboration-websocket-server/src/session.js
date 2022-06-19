module.exports = class Session {
    constructor(shareId, openFileParams, file) {
        this.shareId = shareId;
        this.version = 0;
        this.datas = [];
        this.connections = [];
        this.openFileParams = openFileParams;
        this.file = file;
    }
    getFile() {
        return this.file;
    }
    getOpenFileParams() {
        return this.openFileParams;
    }
    appendConnection(conn) {
        this.connections.push(conn);
        return () => {
            const index = this.connections.indexOf(conn);
            if(index > -1) {
                this.connections.splice(index, 1);
            }
        };
    }
    appendData(json) {
        const data = JSON.parse(json);
        this.version ++ ;
        data.version = this.version;
        this.datas.push(data);
        return data;
    }
    getVersion() {
        return this.version;
    }
    getDataSince(fromVersion = 0) {
        const index = this.datas.findIndex(it => it.version > fromVersion);
        if(index === -1) {
            return [];
        }
        return this.datas.slice(index);
    }
    includeConnection(conn) {
        return this.connections.indexOf(conn) > -1;
    }
    /**
     * 
     * @param {WebSocket} by 
     * @param {any} json 
     */
    broadcast(by, json) {
        const data = this.appendData(json);
        const broadcastData = JSON.stringify(data);
        this.connections.forEach(it => {
            if(it === by) {
                return;
            }
            try {
                it.send(broadcastData);
            } catch (error) {
                console.error(error);
            }
        });
    }
    destroy() {
        if (this.file) {
            const file = this.file;
            require('fs').unlinkSync(file.path);
        }
    }
    destroyAfter(time) {
        this.cancelToDestroy();
        return new Promise(resolve => {
            this.timmerId = setTimeout(() => {
                this.destroy();
                resolve();
            }, time || 1000 * 60)
        });
    }
    cancelToDestroy() {
        clearTimeout(this.timmerId);
    }
}