
import { Red, Node } from 'node-red';
import dns = require("godaddy-dns");

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
            let currentIp = await dns.getCurrentIp();
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
                await dns.updateRecords(currentIp, {
                    "apiKey": node.config.key,
                    "secret": node.config.secret,
                    "domain": item.domain,
                    "records": [
                        { "type": item.type, "name": item.name, "ttl": parseInt(item.ttl) }
                    ]
                });
                node.debug(`[${new Date()}] Successfully updated DNS records to ip ${currentIp}`);
            }

            outMsg.currentIp = currentIp;
            outMsg.dnsUpdate = true;
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