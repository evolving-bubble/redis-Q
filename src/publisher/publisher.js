'use strict';

// Internal
const Libs = require('../lib');

class Publisher {
    constructor(options) {
        let self = this;
        self.redis = new Libs.redis(options);
    }

    
}