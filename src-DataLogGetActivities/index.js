'use strict';

var AWS = require("aws-sdk");

var docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context, callback) {

    var responseCode = 200;
    var customerid = '';
    var httpMethod = '';
    console.log("request: " + JSON.stringify(event));

    var headers = { "Access-Control-Allow-Origin" : "*", 
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Access-Control-Allow-Origin,Access-Control-Allow-Headers,Access-Control-Allow-Methods, customerid"};

    if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
        if (event.queryStringParameters.name !== undefined && event.queryStringParameters.name !== null && event.queryStringParameters.name !== "") {
            console.log("Received name: " + event.queryStringParameters.name);
            name = event.queryStringParameters.name;
        }
       
        if (event.queryStringParameters.httpStatus !== undefined && event.queryStringParameters.httpStatus !== null && event.queryStringParameters.httpStatus !== "") {
            console.log("Received http status: " + event.queryStringParameters.httpStatus);
            responseCode = event.queryStringParameters.httpStatus;
        }
    }

    if (event.headers !== null && event.headers !== undefined) {
        if (event.headers.customerid !== undefined && event.headers.customerid !== null && event.headers.customerid !== "") {
            console.log("Received customerid: " + event.headers.customerid);
            customerid = event.headers.customerid;
        }
    }    

    if (event.httpMethod !== undefined && event.httpMethod !== null) {
        console.log("Received httpMethod: " + event.httpMethod);
        httpMethod = event.httpMethod;
    }


    if(httpMethod == 'GET'){
        var params = {
            TableName : "activities",
            FilterExpression: "#usr = :user",
            ExpressionAttributeNames:{
                "#usr": "userId"
            },
            ExpressionAttributeValues: {
                ":user": customerid // "amzn1.account.AH6JHOTTNZTWOKIMZZZF3XHKTDBA"
            }
        };
        
        docClient.scan(params, onScan);
    } else if(httpMethod == 'DELETE'){
        if (customerid != "") {
            var params = {
                TableName : "activities",
                FilterExpression: "#usr = :user",
                ExpressionAttributeNames:{
                    "#usr": "userId"
                },
                ExpressionAttributeValues: {
                    ":user": customerid // "amzn1.account.AH6JHOTTNZTWOKIMZZZF3XHKTDBA"
                }
            };
            
            docClient.scan(params, onDelete);
        } else {

            responseCode = 400;

            var responseBody = {
                message: "customerid is empty."
            };
            var response = {
                statusCode: responseCode,
                headers: headers,
                body: JSON.stringify(responseBody)
            };
            console.log("response: " + JSON.stringify(response))
            context.succeed(response);

        }
    }


    var items = []

    function onScan(err, result) {
        console.log("Scanning");
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            // here's the object we need to return

            responseCode = 400;

            var responseBody = {
                message: JSON.stringify(err, null, 2),
            };
            var response = {
                statusCode: responseCode,
                headers: headers,
                body: JSON.stringify(responseBody)
            };
            console.log("response: " + JSON.stringify(response))
            context.succeed(response);

        } else {
            // print all the movies
            console.log("Scan succeeded.");
            // scan can retrieve a maximum of 1MB of data

            items = items.concat(result.Items);

            if(result.LastEvaluatedKey) {

                params.ExclusiveStartKey = result.LastEvaluatedKey;
                onScan(callback);              
            } else {

                var response = {
                    statusCode: responseCode,
                    headers: headers,
                    body: JSON.stringify(items)
                };
                console.log("response: " + JSON.stringify(response))
                context.succeed(response);

            }
        }
    }

    function onDelete(err, result) {
        console.log("Scanning & Deleting");
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            // here's the object we need to return

            responseCode = 400;

            var responseBody = {
                message: JSON.stringify(err, null, 2),
            };
            var response = {
                statusCode: responseCode,
                headers: headers,
                body: JSON.stringify(responseBody)
            };
            console.log("response: " + JSON.stringify(response))
            context.succeed(response);

        } else {
            // print all the movies
            console.log("Scan succeeded.");
            // scan can retrieve a maximum of 1MB of data

            if(result.LastEvaluatedKey) {

                params.ExclusiveStartKey = result.LastEvaluatedKey;
                onScan(callback);              
            } else {

                result.Items.forEach(function(obj,i){
                    console.log(i);
                    console.log(obj);

                    var params = {
                        TableName: "activities",
                        Key: buildKey(obj),
                        ReturnValues: 'ALL_OLD', // optional (NONE | ALL_OLD)
                        ReturnConsumedCapacity: 'NONE', // optional (NONE | TOTAL | INDEXES)
                        ReturnItemCollectionMetrics: 'NONE', // optional (NONE | SIZE)
                    };

                    docClient.delete(params, function(err, data) {
                        if (err) {

                            console.error("Unable to delete from the table. Error JSON:", JSON.stringify(err, null, 2));
                            responseCode = 400;

                            var responseBody = {
                                message: JSON.stringify(err, null, 2),
                            };
                            var response = {
                                statusCode: responseCode,
                                headers: headers,
                                body: JSON.stringify(responseBody)
                            };
                            context.succeed(response);
                            return true;
                        }
                        else console.error("Deletion from the table was succesfull. Error JSON:", JSON.stringify(data, null, 2));
                    });

                });

                var response = {
                    statusCode: responseCode,
                    headers: headers,
                    body: "Deletion completion"
                };
                console.log("response: " + JSON.stringify(response))
                context.succeed(response);

            }
        }
    }

    function buildKey(obj){
        var key = {};
        var hashKey = "activityId";
        var rangeKey = null;
        key[hashKey] = obj[hashKey]
        if(rangeKey){
            key[rangeKey] = obj[rangeKey];
        }
        
        return key;
    }


};
