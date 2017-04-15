'use strict';
var Alexa = require("alexa-sdk");
var AWS = require("aws-sdk");
var uuid = require('node-uuid');
var moment = require('moment');


var APP_ID = 'amzn1.ask.skill.3342fb32-c56a-4fcc-bc2e-2722ca885300'; //'amzn1.echo-sdk-ams.app.your-skill-id';

var docClient = new AWS.DynamoDB.DocumentClient();

var languageStrings = {
    "en-GB": {
        "translation": {
            "SKILL_NAME" : "Activity Data Log",
            "HELP_MESSAGE" : "You can log an activity or outcome and an activity type, or, you can say exit... What activity or outcome do you want log?",
            "HELP_REPROMPT" : "What activity or outcome do you want log?",
            "RESPONSE": "The %s %s has been captured.",
            "OOPS": "Oops. I had a small malfunction",
            "OOPS_REPROMPT" : "Please try again?",
            "UNKNOWN_ACTIVITY_TYPE": "I don't understand the activity you tried to capture.",
            "STOP_MESSAGE" : "Goodbye!",
            "LINK_MESSAGE" : "to start using this skill, please use the companion app to authenticate on Amazon",
            "ERROR_LINK" : "Hello, I can't connect to Amazon Profile Service right now, try again later"
        }
    },
    "en-US": {
        "translation": {
            "SKILL_NAME" : "Activity Data Log",
            "HELP_MESSAGE" : "You can log an activity or outcome and an activity type, or, you can say exit... What activity or outcome do you want log?",
            "HELP_REPROMPT" : "What activity or outcome do you want log?",
            "RESPONSE": "The %s %s has been captured.",
            "OOPS": "Oops. I had a small malfunction",
            "OOPS_REPROMPT" : "Please try again?",
            "UNKNOWN_ACTIVITY_TYPE": "I don't understand the activity you tried to capture.",
            "EMTPY_ACTIVITY": "I didn't understand the %s.", 
            "STOP_MESSAGE" : "Goodbye!",
            "LINK_MESSAGE" : "to start using this skill, please use the companion app to authenticate on Amazon",
            "ERROR_LINK" : "Hello, I can't connect to Amazon Profile Service right now, try again later"
        }
    }
};

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech'])
    },
    'RecordIntent': function () {
        // Create speech output

        var self = this;

        //if no amazon token, return a LinkAccount card
        if (self.event.session.user.accessToken == undefined) {
            self.emit(':tellWithLinkAccountCard', self.t("LINK_MESSAGE"));
            return;
        }
        
        var speechOutput;

        var activityTypeSlot = this.event.request.intent.slots.ActivityType;
        var activityType;

        // Read activty and actitvity type        

        if (activityTypeSlot && activityTypeSlot.value) {
            activityType = activityTypeSlot.value.toLowerCase();
        }

        var activitySlot = this.event.request.intent.slots.Activity;
        var activity;

        if (activitySlot && activitySlot.value) {
            activity = activitySlot.value.toLowerCase();
        }

        // Check Types of Activities
        if(activityType != 'activity' && activityType != 'outcome' && activityType != 'symptom') {
            console.error("Unknown Activity Type: ", activityType);
            self.emit(':ask', self.t("UNKNOWN_ACTIVITY_TYPE"), self.t("HELP_REPROMPT"))
        } else if(activity == ''){
            console.error("Actitvity is empty");
            self.emit(':ask', self.t("EMTPY_ACTIVITY",activityType), self.t("HELP_REPROMPT"))
        } else {

            // Get the User Profile of Linked User
            var request = require('request');
            var amznProfileURL = 'https://api.amazon.com/user/profile?access_token=';

            amznProfileURL += self.event.session.user.accessToken;

            request(amznProfileURL, function(error, response, body) {


                if (response.statusCode == 200) {
                    var uuid1 = self.event.request.requestId;

                    var profile = JSON.parse(body);
                    var userId = profile.user_id;
                    var unixdatetime = moment().unix();
                    var exceldatetime = moment().toISOString()

                    var params = {
                        "TableName": "activities",
                        "Item": {
                              "activityId": uuid1,
                              "Activity": activity,
                              "ActivityType": activityType,
                              "exceldatetime": exceldatetime,
                              "unixdatetime": unixdatetime.toString(),
                              "userId": userId
                        }
                    }

                    docClient.put(params, function(err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                            self.emit(':ask', self.t("OOPS"), self.t("OOPS_REPROMPT"))
                        } else {
                            console.log("Added item:", JSON.stringify(data, null, 2));
                            speechOutput = self.t("RESPONSE", activityType, activity);
                            self.emit(':tell', speechOutput);
                        }
                    });

                } else {

                    // Can't get the profile of linked user
                    self.emit(':tell', self.t("ERROR_LINK"));

                }

            });

        }

    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = this.t("HELP_MESSAGE");
        var reprompt = this.t("HELP_REPROMPT");
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.CancelIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest':function () {
        this.emit(':tell', this.t("STOP_MESSAGE"));
    },    
    'Unhandled': function () {
        var speechOutput = this.t("HELP_MESSAGE");
        var reprompt = this.t("HELP_REPROMPT");
        this.emit(':ask', speechOutput, reprompt);
    }
}