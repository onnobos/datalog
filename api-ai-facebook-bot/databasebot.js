console.log('Loading databasebot module');

/*
 * response.js
 */

// Private
// for example var userCount = 0;

var AWS = require('aws-sdk');
var moment = require('moment');

const uuidV4 = require('uuid/v4');
const TBACTVITIES = 'activities';
const TBDLFACEBOOK = 'DLfacebook';

// Public
module.exports = databasebot;

function databasebot() {
    this._docClient = new AWS.DynamoDB.DocumentClient();
};


databasebot.prototype.isAmazonId = function(AmazonCustomerId){
	// Example amzn1.account.AHVKPEREMWRENVMR6HUV5NVYPR3A
	console.log("isAmazonId", AmazonCustomerId);
	var splitArr = AmazonCustomerId.split(".");
	if(splitArr.length == 3 && splitArr[1] == 'account' && splitArr[0].substr(0,4) == 'amzn') 
		return true;
	else return false;
}

databasebot.prototype.getSenderRecord = function(senderId, callback){
	console.log("getSenderRecord", senderId);
	var params = {
	    TableName: TBDLFACEBOOK,
	    Key:{
	        "senderId": senderId,
	    }
	};

	this._docClient.get(params, function(err, data) {
	    if (err) {
	        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
	        callback(false);
	    } else {
	        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
	        callback(data);
	    }
	});
};

databasebot.prototype.saveSenderId = function(senderId, callback){
	console.log("saveSenderId", senderId);
	var params = {
	    TableName:TBDLFACEBOOK,
	    Item:{
	        "senderId": senderId,
	        "amazonId" : null
	    }
	};

	this._docClient.put(params, function(err, data) {
	    if (err) {
	        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
	        callback(false);
	    } else {
	        console.log("Added item:", JSON.stringify(data, null, 2));
	        callback(true);
	    }
	});

}

databasebot.prototype.saveAmazonId = function(senderId, amazonId, callback){
	console.log("saveAmazonId", senderId, amazonId);
	var params = {
	    TableName:TBDLFACEBOOK,
	    Key:{
	        "senderId": senderId
	    },
	    UpdateExpression: "set amazonId = :r",
	    ExpressionAttributeValues:{
	        ":r":amazonId
	    },
	    ReturnValues:"UPDATED_NEW"
	};


	this._docClient.update(params, function(err, data) {
	    if (err) {
	        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
	        callback(false);
	    } else {
	        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
	        callback(true);
	    }
	});

}

databasebot.prototype.insertActivity = function(amazonId, activityType, activity, callback){
	console.log("insertActivity", amazonId, activityType, activity);

    var uuid1 = uuidV4();
    var userId = amazonId;
    var unixdatetime = moment().unix();
    var exceldatetime = moment().toISOString();


    var params = {
        "TableName": TBACTVITIES,
        "Item": {
              "activityId": uuid1,
              "Activity": activity,
              "ActivityType": activityType,
              "exceldatetime": exceldatetime,
              "unixdatetime": unixdatetime.toString(),
              "userId": userId
        }
    }

    this._docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            callback(false);
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
            callback(true);
        }
    });
}