exports.callDirectiveService = (handlerInput, speech) => {
  const { requestEnvelope } = handlerInput;
  const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();

  const directive = {
    header: {
      requestId: requestEnvelope.request.requestId
    },
    directive: {
      type: 'VoicePlayer.Speak',
      speech: speech
    }
  };
  return directiveServiceClient.enqueue(directive, requestEnvelope.context.System.apiEndpoint, requestEnvelope.context.System.apiAccessToken);
};

exports.isSupportsDisplay = (handlerInput) => {
  return handlerInput.requestEnvelope.context &&
        handlerInput.requestEnvelope.context.System &&
          handlerInput.requestEnvelope.context.System.device &&
            handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
              handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;
};

exports.isResolution = isResolution;

function isResolution(intentName) {
  return intentName.resolutions !== undefined
            && intentName.resolutions.resolutionsPerAuthority !== undefined
              && intentName.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH';
}

exports.getResolutionId = getResolutionId;
function getResolutionId(intentName) {
  return intentName.resolutions !== undefined
            && intentName.resolutions.resolutionsPerAuthority !== undefined && isResolution(intentName)
    ? intentName.resolutions.resolutionsPerAuthority[0].values[0].value.id : '';
}

exports.getResolutionName = getResolutionName;
function getResolutionName(intentName) {
  return intentName.resolutions !== undefined
            && intentName.resolutions.resolutionsPerAuthority !== undefined && isResolution(intentName)
    ? intentName.resolutions.resolutionsPerAuthority[0].values[0].value.name : '';
}

const sum = (arr, fn) => {
  if (fn) {
    return sum(arr.map(fn));
  }
  else {
    return arr.reduce(function(prev, current) {
      return prev+current;
    });
  }
};
exports.sum = sum;

const average = (arr, fn) => {
  return sum(arr, fn) / arr.length;
};
exports.average = average;

const max = (arr, fn) => {
  if (fn) {
    return max(arr.map(fn));
  }
  else {
    return Math.max(...arr);
  }
};
exports.max = max;

const min = (arr, fn) => {
  if (fn) {
    return min(arr.map(fn));
  }
  else {
    return Math.min(...arr);
  }
};
exports.min = min;

const median = (arr, fn) => {
  const half = (arr.length/2)|0;
  const temp = arr.sort(fn);

  if (temp.length%2) {
    return temp[half];
  }

  return ((temp[half-1] + temp[half])/2)|0;
};
exports.median = median;