
import { Red, Node } from 'node-red';
import request = require('request-promise');

async function getCurrentIp() {
    return request('https://api.ipify.org/')
}

async function updateRecords(ip, config) {
    let recordDefaults = {
        type: 'A',
        data: ip,
        ttl: 60 * 10 // 10 minutes (minimum allowed)
    }

    let records = config.records
    // if records is a single object or string wrap it into an array
    if (records.constructor !== Array) {
        records = [records]
    }
    records = records.map((record) => {
        // if current record is a single string
        // wrap it in array
        if (typeof record === 'string') {
            record = { name: record }
        }
        return Object.assign({}, recordDefaults, record)
    })

    return Promise.all(
        records.map((record) => {
            let domain = config.domain
            if (typeof (record.domain) !== 'undefined') {
                domain = record.domain
                delete record.domain
            }
            let options = {
                method: 'PUT',
                url: `https://api.godaddy.com/v1/domains/${domain}/records/${record.type}/${record.name.replace('@', '%40')}`,
                headers: {
                    'authorization': `sso-key ${config.apiKey}:${config.secret}`,
                    'content-type': 'application/json'
                },
                body: [record],
                json: true
            }
            return request(options)
        })
    )
}


module.exports = function (RED: Red) {
    function godaddyNode(config: any) {
        RED.nodes.createNode(this, config);

        let configNode = RED.nodes.getNode(config.confignode);
        if (!configNode) {
            this.error("Config is missing!")
            return;
        }
        let node = this;
        node.config = configNode;
        node.items = config.items;

        node.on('input', async function (msg, send, done) {
            done = done || function (text, msg) { if (text) { return node.error(text, msg); } return null; };
            send = send || function (...args) { node.send.apply(node, args); };
            try {
                const outMsg = RED.util.cloneMessage(msg);
                await getDns(node, outMsg);
            } catch (e) {
                node.error(e);
            }
        });
    }


    async function getDns(node, outMsg) {
        try {
            let currentIp = await getCurrentIp();
            let lastIp:String = await node.context().get('lastIp');
            if (!lastIp ||  lastIp != currentIp) {
                let items = node.items;
                if (outMsg.payload) {
                    if (outMsg.payload.newIp) {
                        currentIp = outMsg.payload.newIp;
                    }
                    if (outMsg.payload.entries) {
                        items = outMsg.payload.entries;
                    }
                }
                for (let item of items) {
                    await updateRecords(currentIp, {
                        "apiKey": node.config.key,
                        "secret": node.config.secret,
                        "domain": item.domain,
                        "records": [
                            { "type": item.type, "name": item.name, "ttl": parseInt(item.ttl) }
                        ]
                    });
                    node.debug(`[${new Date()}] Successfully updated DNS records to ip ${currentIp}`);
                }
                node.context().set('lastIp', currentIp);
                outMsg.dnsUpdate = true;
            } else {
                outMsg.dnsUpdate = false;
            }
            outMsg.currentIp = currentIp;
            node.send(outMsg);
        }
        catch (err) {
            if (err && err.message !== 'Nothing to update') {
                node.error(`[${new Date()}] ${err}`)
            }
            outMsg.dnsUpdate = false;
            node.send(outMsg);
        };

    }
    RED.nodes.registerType("godaddy-node", godaddyNode);
}