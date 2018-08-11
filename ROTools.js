const client = require('cheerio-httpcli');
const rp = require('request-promise');

const TORIHIKI_URL = 'https://rotool.gungho.jp/torihiki/';
const SEARCH_URL = 'https://rotool.gungho.jp/torihiki/item_candidate.php';

exports.searchItem = (word) => {
    const search_options = {
        method:'POST', 
        headers : {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'Host':'rotool.gungho.jp',
            'Referer':'https://rotool.gungho.jp/torihiki/',
            'Connection' : 'keep-alive',
            'Pragma' : 'no-cache',
            'Cache-Control' : 'no-cache',
            'X-Requested-With': 'XMLHttpRequest'
        }, 
        uri:SEARCH_URL, 
        form:{item_name : word, page : '1'}
    };
    return rp(search_options)
        .then((result) => {
            return JSON.parse(result);
        });
};

/**
 *  
 */
exports.getTrihikiInfo = (world, options) => {
    return client.fetch(TORIHIKI_URL, {world : world, item : options.item_id})
        .then((result) => {
            if(result.$('.result_maxmin').find('.num').length==0){
                return {
                    found : false,
                    content : null
                }; 
            } else {
                return {
                    found : true,
                    content : {
                        midian : result.$('.result_maxmin').find('.num')[0].children[0].data,
                        max : result.$('.result_maxmin').find('.num')[1].children[0].data,
                        min : result.$('.result_maxmin').find('.num')[2].children[0].data
                    }
                };
            }
        });
};