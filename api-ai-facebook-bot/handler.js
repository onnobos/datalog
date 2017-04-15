'use strict';

console.log("handler.webhook");

const databasebotObj = require('./databasebot');

module.exports.webhook = (event, context, callback) => {

  console.log("Event:", JSON.stringify(event, null, 2));

  var body = JSON.parse(event.body);
  console.log("Body:", JSON.stringify(body, null, 2));

  // Get Original Facebook API request
  var originalRequest = body.originalRequest.data;
  var apiAiResult = body.result;

  // Connect Database

  var databasebot = new databasebotObj();
  databasebot.getSenderRecord(originalRequest.sender.id, OnGetSenderRecord);
 
  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });

  function getResponse(statuscode, body){

    var objBody = body;

    if( typeof objBody === 'object')
        objBody = JSON.stringify(body);
    return {
        statusCode: statuscode,
        body: objBody
    }

  }

  function OnGetSenderRecord(sendRecord){
    if(!sendRecord){
      const response = getResponse(500, { "status": { "code": 500, "errorType": "webhook call failed with %error Code% error"}});
      callback(null, response);
    } else {
      console.log("Connected to Table",sendRecord.Item,(sendRecord.Item != null));
      if(sendRecord.Item != null) {
        console.log("sendRecord.Item.amazonId", sendRecord.Item.amazonId);
        if(sendRecord.Item.amazonId != null) {
          console.log("amazonId found. Ready for receiving Activities");
          OnReplyMessage(sendRecord.Item);
        } else {
          console.log("amazonId not found. Ask for amazonId");
          if(apiAiResult.action == "input.addcustomerid"){
            OnReplyMessage(sendRecord.Item);
          } else {
            const response = getResponse(200, 
              { "speech": "I can't connect to Amazon Profile. What is your customer ID?", 
                "displayText": "I can't connect to Amazon Profile. What is your customer ID?",
                "source": "api-ai-facebook-bot"});
            callback(null, response);
          }
       }   
      } else {
        console.log("First Time Login",sendRecord,originalRequest.sender.id);
        databasebot.saveSenderId(originalRequest.sender.id, function(result){
          if(result) {
            console.log("First Time Login Saved in table");
            const response = getResponse(200, 
            { "speech": "Hello, to start adding activities or symptons you need to connect your Amazon Customer ID. You can find the customer ID in http://www.datalogdashboard.com",
              "displayText": "Hello, to start adding activities or symptons you need to connect your Amazon Customer ID. You can find the customer ID in http://www.datalogdashboard.com",
              "source": "api-ai-facebook-bot"});
            callback(null, response);
          } else {
            const response = getResponse(500,{"status": {"code": 501, "errorType": "webhook call failed with %error Code% error"}});
            callback(null, response);
          }         
        });
      }

    }
  }
  function OnReplyMessage(record){

    if(apiAiResult.action == "input.addcustomerid"){
      if(databasebot.isAmazonId(apiAiResult.parameters.customerId)) {
          databasebot.saveAmazonId(originalRequest.sender.id, apiAiResult.parameters.customerId, function(result){
            if(result){
              const response = getResponse(200,{"speech": apiAiResult.fulfillment.speech,"displayText": apiAiResult.fulfillment.speech,"source": "api-ai-facebook-bot"});
              callback(null, response);
            } else {
              const response = getResponse(500,{"status": {"code": 502, "errorType": "webhook call failed with %error Code% error"}});
              callback(null, response);
            }
          })
      } else {
        const response = getResponse(200,{"speech": "This is not a correct Amazon Customer Id. Please try again.","displayText": "This is not a correct Amazon Customer Id. Please try again.","source": "api-ai-facebook-bot"});
        callback(null, response);
      }   
    } else if(apiAiResult.action == "input.addactivity"){
      databasebot.insertActivity(record.amazonId, apiAiResult.parameters.ActivityType, apiAiResult.parameters.Activity, function(result){
        if(result){
          const response = getResponse(200,{"speech": apiAiResult.fulfillment.speech,"displayText": apiAiResult.fulfillment.speech,"source": "api-ai-facebook-bot"});
          callback(null, response);
        } else {
          const response = getResponse(500,{"status": {"code": 503, "errorType": "webhook call failed with %error Code% error"}});
          callback(null, response);
        }
      })
    } else if(apiAiResult.action == "input.welcome"){
        const response = getResponse(200,{"speech": apiAiResult.fulfillment.speech,"displayText": apiAiResult.fulfillment.speech,"source": "api-ai-facebook-bot"});
        callback(null, response);      
    }
  }

};
