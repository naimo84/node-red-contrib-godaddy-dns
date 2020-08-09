

module.exports = function (RED: any) {
    function config(config) {
        RED.nodes.createNode(this, config);

        this.config = this;
        this.key=config.key;
        this.secret=config.secret;
    }

  

    RED.nodes.registerType("godaddy-config", config);
}