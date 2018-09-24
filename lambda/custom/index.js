const ROTools = require('./ROTools');
const AskUtil = require('./ask-util');
const Alexa = require('ask-sdk');
const MyAskCommon = require('./my-ask-common');

const HELP_MESSAGE = 'サーバーと調べたいアイテム名を言うことで最近の取引価格を調べることが出来ます。'
+ 'また、アイテム名のみ発言した場合は前回と同じサーバーで調べます。'
+ 'また、サーバーを変えたい場合は、サーバーを変更したい、と言ってください。';

const GetPersistenceRequestInterceptor = {
  process(handlerInput) {
    return new Promise((resolve, reject) => {
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      if(attributes.serverId === undefined) {
        handlerInput.attributesManager.getPersistentAttributes()
          .then((att) => {
            handlerInput.attributesManager.setSessionAttributes(att);
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        resolve();
      }
    });
  }
};
// サーバーが連携された場合はDBへ登録
const ServerRegistRequestInterceptor = {
  async process(handlerInput) {
    return await new Promise((resolve, reject) => {
      const request = handlerInput.requestEnvelope.request;

      if(request.type === 'LaunchRequest' || request.type === 'SessionEndedRequest'
               || request.intent.slots === undefined || request.intent.slots.ServerName === undefined)
        resolve();
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      const ServerName = request.intent.slots.ServerName;

      if(!AskUtil.isResolution(ServerName)
                || AskUtil.getResolutionName(ServerName) === attributes.serverName
                   || request.dialogState !=='COMPLETED') {
        resolve();
      } else {
        const registObj = {
          'serverId' : AskUtil.getResolutionId(ServerName),
          'serverName' : AskUtil.getResolutionName(ServerName)
        };
        AskUtil.callDirectiveService(handlerInput, 'サーバーを' + registObj.serverName + 'で登録します。');
        handlerInput.attributesManager.setPersistentAttributes(registObj);
        handlerInput.attributesManager.savePersistentAttributes()
          .then(() => {
            handlerInput.attributesManager.setSessionAttributes(registObj);
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('R Oのアイテム取引価格を調べます。サーバー、もしくはアイテム名を教えてください。')
      .reprompt('サーバー、もしくはアイテム名を教えてください。')
      .getResponse();
  }
};

// ハンドラー定義

const SessionEndHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    handlerInput.attributesManager.setPersistentAttributes(attributes);
    handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak('R O取引価格を終了します。')
      .getResponse();
  }
};

/*
 * サーバー、アイテムをヒアリングして価格調査
 */
const ItemSearchProgressHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'ItemSearchIntent'
                        && request.dialogState !=='COMPLETED';
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;
    if( request.intent.slots.ServerName.value === undefined && attributes['serverId'] === undefined) {
      //TODO: addDelegateDirectiveにintentをセットすることでコンパクトにできそう
      return handlerInput.responseBuilder
        .speak('検索するサーバーを教えてください。')
        .addElicitSlotDirective('ServerName')
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .addDelegateDirective()
        .getResponse();
    }
  }
};

const ItemSearchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'ItemSearchIntent'
                        && request.dialogState ==='COMPLETED';
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let attributes = handlerInput.attributesManager.getSessionAttributes();

    // intercepterでセットされてるはず。セットされてない場合はバグ
    if(!attributes.serverId) {
      throw Error('NoServerError');
    }

    // アイテム解析失敗
    if(!AskUtil.isResolution(request.intent.slots.ItemName)) {
      throw Error('NoItemError');
    }

    const word = AskUtil.getResolutionName(request.intent.slots.ItemName);

    // リクエスト前に発言できる分を発言
    AskUtil.callDirectiveService(handlerInput, attributes['serverName'] + 'での');

    let answer = '';
    let searchResult = null;
    let response = null;
    await ROTools.searchItemToUnitrix(word).then(result=> {
      // 基本的にアイテムが見つからないことはあり得ない
      searchResult = result;
      AskUtil.callDirectiveService(handlerInput, searchResult[0].n+'の');
      //TODO:アイテム候補が複数ある場合の処理
      return ROTools.getPriceData(attributes['serverId'], searchResult[0].c, searchResult[0].g);
    }).then(result=> {
      if(!result.found) {
        response = handlerInput.responseBuilder
          .speak('取引は現在無いみたいです。検索を続ける場合はアイテム名を教えてください。')
          .reprompt('アイテム名を教えてください。')
          .getResponse();
        return;
      }
      answer = '価格は、最安値が' + convertPriceUnit(result.content.min) +'ゼニー、'
                   + '中央値が' + convertPriceUnit(result.content.median) +'ゼニー、'
                   + '最高値が' + convertPriceUnit(result.content.max) +'ゼニーです。';

      //let primaryText = null;
      // if (AskUtil.isSupportsDisplay(handlerInput)) {
      //   console.log('display in');
      //   primaryText = new Alexa.RichTextContentHelper()
      //     .withPrimaryText(
      //       '<font size="4">' + searchResult[1].item_name + '<br/><br/>'
      //                       + '最安値：' + result.content.min + '<br/>'
      //                       + '中央値：' + result.content.median + '<br/>'
      //                       + '最高値：' + result.content.max
      //                       + '</font>'
      //     )
      //     .getTextContent();

      //   handlerInput.responseBuilder.addRenderTemplateDirective({
      //     type: 'BodyTemplate2',
      //     token: 'string',
      //     backButton: 'HIDDEN',
      //     title: attributes['serverName'],
      //     textContent: primaryText,
      //   });

      // }
      response = handlerInput.responseBuilder
        .speak(answer)
        .withSimpleCard(`最安値：${result.content.min}\n中央値：${result.content.median}\n最高値：${result.content.max}`)
        .getResponse();
    });

    // 取得後に返却
    return response;
  }
};

/*
*サーバー変更のリクエスト受信時
*/
const ServerRegistProgressHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'ServerRegistIntent'
                        && request.dialogState !=='COMPLETED';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addDelegateDirective()
      .getResponse();
  }
};

const ServerRegistHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'ServerRegistIntent'
                        && request.dialogState ==='COMPLETED';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('登録しました。続けて検索する場合はアイテム名を教えてください。')
      .reprompt('アイテム名を教えてください。')
      .getResponse();
  }
};

const FeedbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'FeedbackIntent';
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    if(request.intent.slots !== undefined) {
      console.log('FeedBack: 発話=' + request.intent.slots.ItemName.value + ', 詳細=' + JSON.stringify((request.intent.slots.ItemName)));
    }

    return handlerInput.responseBuilder
      .speak('うまく聞き取れなくてごめんなさい！開発者に精度を上げるよう伝えておきます。他に検索したいアイテムがある場合はアイテム名を教えてください。')
      .reprompt('アイテム名を教えてください。')
      .getResponse();
  }
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE + 'アイテム名を教えてください。')
      .reprompt('アイテム名を教えてください。')
      .getResponse();
  }
};

const StopHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
                    && (request.intent.name === 'AMAZON.CancelIntent'
                        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    handlerInput.attributesManager.setPersistentAttributes(attributes);
    handlerInput.attributesManager.savePersistentAttributes();
    return handlerInput.responseBuilder
      .speak('R O取引価格を終了します。ありがとうございました。')
      .getResponse();
  }
};

/*
*エラーハンドラー
*アイテム名が解析できなかった時
*/
const NoItemErrorHandler = {
  canHandle(handlerInput, error) {
    return error.message === 'NoItemError';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(handlerInput.requestEnvelope.request.intent.slots.ItemName.value + 'というアイテムが見つかりません。検索を続ける場合はアイテム名を教えてください。')
      .reprompt('アイテム名を教えてください。')
      .getResponse();
  }
};

const NoServerHandler = {
  canHandle(handlerInput, error) {
    return error.message === 'NoServerError';
  },
  handle(handlerInput) {
    // このエラーに入ったらバグ
    console.log('NoServerError called');
    console.log(JSON.stringify(handlerInput));
    return handlerInput.responseBuilder
      .speak(handlerInput.requestEnvelope.request.intent.slots.ServerName.value + 'というサーバーが見つかりません。サーバーを教えてください。')
      .reprompt('サーバーを教えてください。')
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SessionEndHandler,
    ItemSearchProgressHandler,
    ItemSearchHandler,
    ServerRegistProgressHandler,
    ServerRegistHandler,
    FeedbackHandler,
    HelpHandler,
    StopHandler)
  .addErrorHandlers(
    NoItemErrorHandler,
    NoServerHandler,
    MyAskCommon.FaitalErrorHandler
  )
  .addRequestInterceptors(
    MyAskCommon.DebugRequestInterceptor,
    GetPersistenceRequestInterceptor,
    ServerRegistRequestInterceptor)
  .addResponseInterceptors(MyAskCommon.DebugResponseInterceptor)
  .withTableName('ROPriceSkillTable')
  .withAutoCreateTable(false)
  .lambda();

function convertPriceUnit(price) {
  const num = price.split(',').join('');
  if(num/1000/1000/1000 >= 1) {
    return parseInt(num/1000/1000/1000) + 'ギガ';
  } else if (num/1000/1000 >= 1){
    return parseInt(num/1000/1000) + 'メガ';
  } else if (num/1000 >= 1){
    return parseInt(num/1000) + 'キロ';
  } else {
    return num;
  }
}
// function convertItemName(name) {
//     // スロット、精錬値、エンチャント
// }