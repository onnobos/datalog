'use strict';

var AWS = require("aws-sdk");
var json2csv = require('json2csv');
var extend = require('node.extend');

console.log('Loading event');

var docClient = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName : "activities"
};

exports.handler = function(event, context, callback) {
    
    docClient.scan(params, onScan);

    var myData = {};

    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            callback(null, {"Error":"Unable Load"});  // ERROR with message
        } else {
            // print all the movies
            console.log("Scan succeeded.");
            /*
            var output = "'activityId','item.Activity','ActivityType','exceldatetime','item.unixdatetime'\r";
            data.Items.forEach(function(item) {
                console.log(item.exceldatetime);
                output += "'"+item.activityId+"','"+item.Activity+"','"
                    +item.ActivityType+"','"+item.exceldatetime+"','"+item.unixdatetime+"'\r";
            });
            */
            // continue scanning if we have more movies, because
            // scan can retrieve a maximum of 1MB of data
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            } else {
                var result="";
                try {
                  var fields = ['activityId','Activity','ActivityType','exceldatetime','unixdatetime'];
                  result = json2csv({ data: data.Items, fields: fields });
                } catch (err) {
                  // Errors are thrown for bad options, or if the data is empty and no fields are provided. 
                  // Be sure to provide fields if it is possible that your data array will be empty. 
                  console.error(err);
                }                
                callback(null,result);  // SUCCESS with message
            }
        }
    }

};
