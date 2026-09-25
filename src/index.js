
'use strict';

module.exports = {
  ...require('./league'),
  ...require('./identity'),
  ...require('./membership'),
  ...require('./metrics'),
  ...require('./validate-snapshot'),
  ...require('./pipeline'),
  ...require('./canonical'),
  ...require('./persistence'),
  ...require('./source-adapter')
};
