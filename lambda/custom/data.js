const request = require('sync-request');
const vm = require('vm');
const url = 'http://unitrix.net/data/items.js';
const res = request('GET', url);
if(res.statusCode === 200) {
  const data = res.getBody('utf8');
  vm.runInThisContext(data); // gItemsを読み込む
} else {
  throw Error('FailToAccessUnitrix');
}
exports.Items = gItems;
