'use strict';
console.log('Loading function');
const request = require('request');
const https = require('https');
var responseObj = require('./response');

var PAGE_ACCESS_TOKEN;
var MESSENGER_VALIDATION_TOKEN;
 
exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    MESSENGER_VALIDATION_TOKEN = event.stageVariables.MESSENGER_VALIDATION_TOKEN || "swordfish";
    PAGE_ACCESS_TOKEN          = event.stageVariables.PAGE_ACCESS_TOKEN ;

    console.log("MESSENGER_VALIDATION_TOKEN", MESSENGER_VALIDATION_TOKEN);

    var responseCode = 200;
    var method = event.httpMethod;
    var body = JSON.parse(event.body);
    var response = "";

    var queryparams = event.queryStringParameters;
    console.log("method",method);
    console.log("body",body);
    if(method === "GET")
    {
        if(queryparams['hub.mode'] === 'subscribe' && queryparams['hub.verify_token'] === MESSENGER_VALIDATION_TOKEN){
          response = queryparams['hub.challenge'];
        }
        else{
          response ="Incorrect verify token"
        }

        var responsesucceed = {
            statusCode: responseCode,
            headers: {},
            body: response
        }    

        console.log(responsesucceed)

        context.succeed(responsesucceed);
    }
    else
    {
        if(method === "POST")
        {

            var messageEntries = body.entry;
            for(var entryIndex in messageEntries)
            {
                var messageEntry = messageEntries[entryIndex].messaging;
                for(var messageIndex in messageEntry)
                {
                    var message = messageEntry[messageIndex];
                    if(message.message !== undefined  && message.message["is_echo"] !== true )
                    {
                        console.log("Received Message:", message);
                        var response = new responseObj(PAGE_ACCESS_TOKEN, context,message.sender.id);
                        response.connect(function(){
                            response.conversation(message.message.text, function(reply){
                                console.log("send message '%s' to %s", reply, message.sender.id);
                                response.respond(message.sender.id, reply, null);
                            });
                        });
                    } else  {
                        var responsesucceed = {
                            statusCode: 200,
                            headers: {},
                            body: ""
                        }    
                        context.succeed(responsesucceed);                        
                    }
                }
            }
        }

    }

}