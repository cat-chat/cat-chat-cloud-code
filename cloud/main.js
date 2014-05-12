Parse.Cloud.define("sendMessage", function (request, response) {
    var params = request.params;
    if (!params.toEmail && !params.toFacebook) {
        response.error("Message needs either toEmail or toFacebook");
        return;
    }
    if (!params.image) {
        response.error("Message needs an image");
        return;
    }
    var userFinder = require('cloud/userFinder.js');
    if (params.toEmail) {
        userFinder.findByEmail(params.toEmail, function (user) {

            var CatImage = Parse.Object.extend("CatImage");
            var image = new CatImage();
            image.id = params.image;

            var User = Parse.Object.extend("User");
            var from = new User();
            from.id = params.fromUser;

            Parse.Cloud.useMasterKey();

            if (user) {
                var Message = Parse.Object.extend("Message");

                var message = new Message();
                message.set("toUser", user);
                message.set("fromUser", from);
                message.set("image", image);
                message.set("messageData", params.messageData);
                message.save(null, {
                    success: function (savedMessage) {
                        console.log("win");
                        response.success("Successfully added a message for " + user + " from " + params.fromUser);
                    },
                    error: function (error) {
                        console.log("fail");
                        response.error(error);
                    }
                });
            } else {
                var PendingMessage = Parse.Object.extend("PendingMessage");

                var message = new PendingMessage();
                message.set("toEmail", params.toEmail);
                message.set("fromUser", from);
                message.set("image", image);
                message.set("messageData", params.messageData);
                message.save(null, {
                    success: function (savedMessage) {
                        response.success("Successfully added a pending message for " + user + " from " + params.fromUser);
                    },
                    error: function (error) {
                        response.error(error);
                    }
                });
            }
        });
    } else {
        //   toUser = userFinder.findByFacebookID(params.toFacebook);
        response.error("Lookup by facebook id not implemented yet");
    }
});

Parse.Cloud.beforeSave("Message", function (request, response) {
    var message = request.object;
    var messageHelper = require('cloud/messageHelpers.js');
    if (!messageHelper.isValidMessage(message, response)) {
        response.error("Message not valid");
        return;
    }
    if (!messageHelper.configureMessage(message, response)) {
        response.error("Error configuring message");
        return;
    }
    response.success();
});

Parse.Cloud.beforeSave("PendingMessage", function (request, response) {
    var message = request.object;
    var acl = new Parse.ACL(null);
    acl.setReadAccess(message.get("fromUser"), true);
    if (!message.setACL(acl, null)) {
        response.error("error setting ACL");
        return;
    }
    response.success();
});

Parse.Cloud.beforeSave(Parse.User, function (request, response) {
    var user = request.object;
    var authData, facebookID;
    authData = user.get("authData");
    if (authData) {
        facebookID = authData.facebook.id;
    }
    if (facebookID) {
        user.set("facebookID", facebookID, null);
    }
    response.success();
});

// Parse.Cloud.afterSave(Parse.User, function (request, response) {
//     var user = request.object;

//     var userEmail = user.getEmail;
//     if (userEmail && user.get("emailVerified")) {
//         var query = new Parse.Query("PendingMessage");
//         query.equalTo("toEmail", userEmail);
//         query.each({
//             callback: function (pendingMessage) {

//             }
//         })
//     }
// });