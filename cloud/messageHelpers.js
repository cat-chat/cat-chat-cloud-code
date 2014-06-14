exports.isValidMessage = function(message){
    var toUser = message.get("toUser");
    var fromUser = message.get("fromUser");

    if (! toUser || ! fromUser){
        console.log("Messages need both a to and a from user.");
        return false;
    }
    if (! message.get("image")){
        console.log("Messages need a cat image");
        return false;
    }

    return true;
}

exports.configureMessage = function(message){
    if (message.isNew() && !message.get("messageDate")){
        message.set("messageDate", new Date(), {silent : true});
    }
    var acl = new Parse.ACL(null);
    acl.setReadAccess(message.get("toUser"), true);
    acl.setWriteAccess(message.get("toUser"), true);
    
    acl.setReadAccess(message.get("fromUser"), true);

    if (! message.setACL(acl, null)){
        return false;
    }
    return true;
}

exports.sendMessageToUser = function(user, params, fieldName, toUserFBIdOrEmail, response) {
    var CatImage = Parse.Object.extend("CatImage");
    var image = new CatImage();
    image.id = params.image;

    var User = Parse.Object.extend("User");
    var from = new User();
    from.id = params.fromUser;

    Parse.Cloud.useMasterKey();

    if (user) {
        var userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("objectId", user.id);

        var pushQuery = new Parse.Query(Parse.Installation);
        pushQuery.matchesQuery('user', userQuery);

        var Message = Parse.Object.extend("Message");

        var message = new Message();
        message.set("toUser", user);
        message.set("fromUser", from);
        message.set("image", image);
        message.set("messageData", params.messageData);
        message.save(null, {
            success: function (savedMessage) {
                console.log("Successfully added a message for " + user.id + " from " + params.fromUser);

                Parse.Push.send({
                        where: pushQuery,
                        data: {
                            alert: "New message on CatChat!",
                            sound: "default",
                            badge: "Increment"
                      }
                    },
                    { success: function() {
                        response.success("Successfully sent push notification");
                      }, error: function(err) {
                        response.success('Message queued, but failed to send push notification');
                      }
                    });
            },
            error: function (error) {
                response.error(error);
            }
        });
    } else {
        var PendingMessage = Parse.Object.extend("PendingMessage");

        var pm = new PendingMessage();
        pm.set(fieldName, toUserFBIdOrEmail);
        pm.set("fromUser", from);
        pm.set("image", image);
        pm.set("messageData", params.messageData);
        pm.save(null, {
            success: function (savedMessage) {
                if(fieldName == "toEmail") {
                    var constants = require('cloud/constants.js');

                    var Mailgun = require('mailgun');
                    Mailgun.initialize(constants.mailgunDomain, constants.mailgunAPIKey);

                    Mailgun.sendEmail({
                          to: toUserFBIdOrEmail,
                          from: "catchat@catchatapp.com",
                          subject: "Someone wants to chat to you on CatChat!",
                          text: "To read the messages you've been sent, sign up with this email address. \n\nWith <3 from CatChat"
                        }, {
                          success: function(httpResponse) {
                            console.log(httpResponse);
                          },
                          error: function(httpResponse) {
                            console.error(httpResponse);
                          }
                        });
                }
                response.success("Successfully added a pending message for " + toUserFBIdOrEmail + " from " + params.fromUser);
            },
            error: function (error) {
                response.error(error);
            }
        });
    }
}
