console.log('Loading response module');

/*
 * response.js
 */

// Private
// for example var userCount = 0;

var languageStrings = {
    "en-GB": {
        "translation": {
            "GREETINGS" : "Hello, ",
            "SKILL_NAME" : "Activity Data Log",
            "EXAMPLE" : "add walking as an activity, record flying as an activity, record pain in right shoulder as outcome",
            "HELP_MESSAGE" : "You can log an activity or outcome and an activity type, or, you can say exit... What activity or outcome do you want log?",
            "HELP_REPROMPT" : "What activity or outcome do you want log?",
            "RESPONSE": "The {} {} has been captured.",
            "CONNECTED": "Everything is now setup. You're ready to use Data Log.",
            "OOPS": "Oops. I had a small malfunction",
            "OOPS_REPROMPT" : "Please try again?",
            "UNKNOWN_ACTIVITY_TYPE": "I don't understand the activity you tried to capture.",
            "EMTPY_ACTIVITY": "I didn't understand the {}.", 
            "STOP_MESSAGE" : "Goodbye!",
            "LINK_MESSAGE" : "to start using this skill, please use the companion app to authenticate on Amazon",
            "ERROR_LINK" : "I can't connect to Amazon Profile. What is your customer ID?",
            "UNLINK_MESSAGE" : "We have disconnected your Amazon account for DataLog Dashboard."
        }
    },
    "en-US": {
        "translation": {
            "GREETINGS" : "Hello, ",
            "SKILL_NAME" : "Activity Data Log",
            "EXAMPLE" : "add walking as an activity, record flying as an activity, record pain in right shoulder as outcome",
            "HELP_MESSAGE" : "You can log an activity or outcome and an activity type, or, you can say exit... What activity or outcome do you want log?",
            "HELP_REPROMPT" : "What activity or outcome do you want log?",
            "CONNECTED": "Everything is now setup. You're ready to use Data Log.",
            "RESPONSE": "The {} {} has been captured.",
            "OOPS": "Oops. I had a small malfunction",
            "OOPS_REPROMPT" : "Please try again?",
            "UNKNOWN_ACTIVITY_TYPE": "I don't understand the activity you tried to capture.",
            "EMTPY_ACTIVITY": "I didn't understand the {}.", 
            "STOP_MESSAGE" : "Goodbye!",
            "LINK_MESSAGE" : "to start using this skill, please use the companion app to authenticate on Amazon",
            "ERROR_LINK" : "I can't connect to Amazon Profile. What is your customer ID?",
            "UNLINK_MESSAGE" : "We have disconnected your Amazon account for DataLog Dashboard."
        }
    }
};

var activityTypesStrings = ['activity','outcome','symptom'];

// Public
module.exports = response;

const request = require('request');
const https = require('https');
const databasebotObj = require('./databasebot');


function response(n, context,senderId) {
	this._responses = languageStrings;
	this._activitytypesstrings = activityTypesStrings;
    this._PAGE_ACCESS_TOKEN = n;
    this._context = context;
    this._senderId = senderId;
    this._amazonId = null;
    this._databasebot = new databasebotObj();
    this._phase = 0;
};


response.prototype.connect = function(callback){
	console.log("Connect method");
	var self = this;
    this._databasebot.getSenderRecord(this._senderId, function(sendRecord){
	    if(!sendRecord){
	    	// First Time Login
    		console.log("Error Saving First Time Login");
    		callback(); 
	    } else {
	    	console.log("Connected to Table",sendRecord.Item,(sendRecord.Item != null));
	    	if(sendRecord.Item != null) {
	    		console.log("sendRecord.Item.amazonId", sendRecord.Item.amazonId);
	    		if(sendRecord.Item.amazonId != null) {
	    			console.log("amazonId found. Ready for receiving Activities");
	    			self._amazonId = sendRecord.Item.amazonId;
	    			self._phase = 2;
	    		} else {
	    			console.log("amazonId not found. Ask for amazonId");
		    		self._phase = 1;
	  	    	}
	  	    	callback();
	    	} else {
	    		console.log("First Time Login",sendRecord,self._senderId);
		    	self._databasebot.saveSenderId(self._senderId, function(result){
			    	if(result) {
			    		console.log("First Time Login Saved in table");
			    		self._phase = 1;
			    		callback(); 
			    	} else
			    	{
			    		console.log("Error Saving First Time Login");
			    		callback(); 
			    	}	    		
		    	});
	    	}
	    }
    });

}

response.prototype.isActivityType = function(activityType){
	console.log("isActivityType", activityType, this._activitytypesstrings);
	return (this._activitytypesstrings.indexOf(activityType) >= 0 ? true : false);
};

response.prototype.format = function(text){
	var i = 0, args = arguments;
	result = args[0];
	for(var arg in args){
		if(arg > 0){
	  		result = result.replace(/{}/,args[arg])
		}
	}
	return result;
}

response.prototype.isAmazonId = function(textMessage){
	// Example amzn1.account.AHVKPEREMWRENVMR6HUV5NVYPR3A
	console.log("isAmazonId", textMessage);
	var splitArr = textMessage.split(".");
	if(splitArr.length == 3 && splitArr[1] == 'account' && splitArr[0].substr(0,4) == 'amzn') 
		return true;
	else return false;
}

response.prototype.conversation = function(textMessage, callback){
	console.log("Method conversation");
	// Utterances
	// add {activity} as an {ActivityType}
	// add {activity} {ActivityType}
	// record {activity} as an {ActivityType}
	// save {activity} as an {ActivityType}

	var self=this;

	var lc_textMessage = textMessage.toLowerCase();
	var split_lc_textMessage_arr = lc_textMessage.split(" ");
	var split_textMessage_arr = textMessage.split(" ");
	var wordcount = split_textMessage_arr.length;

	console.log("TextMessage, Phase:", textMessage, self._phase);

	if(self._phase == 1) {
		console.log("Phase %s complete. Looking for correct Amazon ID", self._phase);
		if(self.isAmazonId(textMessage)) {
			console.log("The Amazon Custom ID %s is in the correct format.", textMessage);
			self._databasebot.saveAmazonId(self._senderId, textMessage, function(result){
				if(result) {
					this._phase = 2;
					var msg = self._responses["en-GB"]["translation"]["CONNECTED"] + self._responses["en-GB"]["translation"]["HELP_REPROMPT"]
					callback(msg); 
				} else {
					callback(self._responses["en-GB"]["translation"]["ERROR_LINK"]);
				}
			});
		} else {
			console.log("Amzon ID is not correct.")
			callback(self._responses["en-GB"]["translation"]["ERROR_LINK"]);
		}
	} else if(self._phase == 0) {
		var msg = self._responses["en-GB"]["translation"]["GREETINGS"] + self._responses["en-GB"]["translation"]["LINK_MESSAGE"];
		callback(msg);
	} else if(lc_textMessage == "disconnect"){
		self._databasebot.saveAmazonId(self._senderId, null, function(result){
			if(result) {
				this._phase = 1; 
				var msg = self._responses["en-GB"]["translation"]["UNLINK_MESSAGE"];
				callback(msg); 
			} else {
				var msg = self._responses["en-GB"]["translation"]["OOPS"] + ", " + self._responses["en-GB"]["translation"]["OOPS_REPROMPT"];
				callback(msg); 
			}
		});
	} else if(lc_textMessage.substr(0, 3).indexOf("add")>=0 || lc_textMessage.substr(0, 6).indexOf("record")>=0 || lc_textMessage.substr(0, 4).indexOf("save") >= 0) {
		var as_an_loc = lc_textMessage.indexOf("as an");
		if(as_an_loc >= 0) {
			// Check activity type in the last word and as an in middle
			if (this.isActivityType(split_lc_textMessage_arr[wordcount-1])) {
				var activity = textMessage.substr(split_textMessage_arr[0].length+1,(as_an_loc-split_textMessage_arr[0].length)+2);
				var activityType = split_textMessage_arr[wordcount-1];
				var result = this._responses["en-GB"]["translation"]["RESPONSE"];
				result = this.format(result,activity,activityType);
				self._databasebot.insertActivity(this._amazonId, activityType, activity, function(result_db){
					if(result_db) {callback(result);} else {callback(self._responses["en-GB"]["translation"]["ERROR_LINK"]) ;}
				});
			} else {
				// Wrong Utterance
				console.log("as an found, wrong activityType")
				callback(this._responses["en-GB"]["translation"]["UNKNOWN_ACTIVITY_TYPE"]);			
			}
		} else {
			// Check activity type in the last word
			if (this.isActivityType(split_lc_textMessage_arr[wordcount-1])) {
				var activityType = split_textMessage_arr[wordcount-1];
				var findposAT = textMessage.indexOf(activityType);
				var activity = textMessage.substr(split_textMessage_arr[0].length,findposAT-1);
				var result = this._responses["en-GB"]["translation"]["RESPONSE"];
				result = this.format(result,activity,activityType);
				self._databasebot.insertActivity(this._amazonId, activityType, activity, function(result_db){
					if(result_db) {callback(result);} else {callback(self._responses["en-GB"]["translation"]["ERROR_LINK"]) ;}
				});
			} else {
				// Wrong Utterance
				console.log("as an not found, wrong activityType")
				callback(this._responses["en-GB"]["translation"]["UNKNOWN_ACTIVITY_TYPE"]);			
			}

		}
	} else if(lc_textMessage.indexOf("hello") >= 0 || lc_textMessage.indexOf("hi") >= 0 || lc_textMessage.indexOf("howdy") >= 0) {
		var result = this._responses["en-GB"]["translation"]["GREETINGS"] + this._responses["en-GB"]["translation"]["HELP_REPROMPT"];
		callback(result);
	} else if (lc_textMessage.indexOf("help") >= 0){
		// Help message
		var result = this._responses["en-GB"]["translation"]["EXAMPLE"];			
		callback(result);
	} else {
		// Wrong Utterance
		var result = this._responses["en-GB"]["translation"]["OOPS"] + ", " + this._responses["en-GB"]["translation"]["OOPS_REPROMPT"];			
		console.log("result, can't find any match", result);
		callback(result);
	}


};

response.prototype.respond = function(recipientId,textMessage, imageUrl) {
		console.log("Method respond:", textMessage);
	    var messageData = {};
	    var self = this;
	    messageData.recipient = {id:recipientId};

	    if(imageUrl !== null && textMessage !== null)
	    { 
	        //Use generic template to send a text and image
	        messageData.message =  {
	            attachment : {
	                type : "template",
	                payload : {
	                        template_type : "generic",
	                        elements : [{
	                            title : textMessage,
	                            image_url : imageUrl,
	                            subtitle : textMessage
	                        }]
	                    }
	                }
	            };
	    }
	    else
	    { 
	        if (imageUrl !== null){
	            //Send a picture
	            
	            messageData.message = {
	                attachment : {
	                    type : "image",
	                    payload : {
	                        url : imageUrl
	                    }
	                }
	            };
	        }
	        else
	        {
	            //send a text message
	             messageData.message = {
	                 text : textMessage
	             };
	        }
	    }
	    request({
		    uri: 'https://graph.facebook.com/v2.6/me/messages',
		    qs: { access_token: this._PAGE_ACCESS_TOKEN },
		    method: 'POST',
		    json: messageData

		  }, function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		      var recipientId = body.recipient_id;
		      var messageId = body.message_id;

		      if (messageId) {
		        console.log("Message %s delivered to recipient %s", 
		          messageId, recipientId);
		      } else {
		      console.log("Message sent to recipient %s", 
		        recipientId);
		      }
		    } else {
		      console.error(response.error);
		      console.log("Facebook Request failed    : " + JSON.stringify(response));
		      console.log("Message Data that was sent : " + JSON.stringify(messageData));
		    }
	        var responsesucceed = {
	            statusCode: response.statusCode,
	            headers: {},
	            body: ""
	        }    

	        self._context.succeed(responsesucceed);
	  });  
};