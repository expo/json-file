'use strict';

module.exports = {
  process(src, filename) {
    require('instapromise');
    return src;
  },
};
