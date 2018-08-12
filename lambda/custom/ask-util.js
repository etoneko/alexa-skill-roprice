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