const request = require('sync-request');
const vm = require('vm');
const AskUtil = require('./ask-util');
const Data = require('./data');

const base_url = 'http://unitrix.net';
const serverList = new Map([
  ['1', 'sigrun'],
  ['2','alvitr'],
  ['3','vali'],
  ['4','trudr'],
  ['5','radgrid'],
  ['6','olrun'],
  ['7','gimle'],
  ['8','hervor'],
  ['9','idavoll'],
  ['10','frigg'],
  ['11','mimir'],
  ['12','lif'],
  ['13','breidablik']
]);

const searchItemToUnitrix = (word) => {
  return Data.Items.filter((a) => {
    return a.n.includes(word);
  });
};
console.log(searchItemToUnitrix('村正'));
exports.searchItemToUnitrix = searchItemToUnitrix;

const getPriceData = (server, itemId, gId) => {
  const serverName = serverList.get(server);
  const res = request('GET', `${base_url}/data/${serverName}-${gId}.js`);
  if(res.statusCode === 200) {
    const data = res.getBody('utf8');
    vm.runInThisContext(data); // gSellRecordsを読み込む
  } else {
    throw Error('FailToAccessUnitrix');
  }

  const sellData = gSellRecords.filter((a) => {
    return a.c === itemId;
  });
  const priceAry = [];
  if(sellData.length==0){
    return {
      result : false,
      content : {
        url : `${base_url}/?c=${itemId}`
      }
    };
  }

  for(let i=0;i<sellData.length;i++) {
    priceAry.push(sellData[i].p);
  }

  return {
    result : true,
    content : {
      median : AskUtil.median(priceAry)|0,
      max : AskUtil.max(priceAry)|0,
      min : AskUtil.min(priceAry)|0,
      url : `${base_url}/?c=${itemId}`
    }
  };
};
console.log(getPriceData('13', 18802, '68'));
exports.getPriceData = getPriceData;