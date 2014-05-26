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
            sendMessageToUser(user, params, "toEmail", params.toEmail, response);
        });
    } else {
        userFinder.findByFacebookID(params.toFacebook, function (user) {
            sendMessageToUser(user, params, "toFacebook", params.toFacebook, response);
        });
    }
});

function sendMessageToUser(user, params, fieldName, toUserFBIdOrEmail, response) {
    var CatImage = Parse.Object.extend("CatImage");
    var image = new CatImage();
    image.id = params.image;

    var User = Parse.Object.extend("User");
    var from = new User();
    from.id = params.fromUser;

    Parse.Cloud.useMasterKey();

    if (user) {
        var userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("id", user.id);

        var Message = Parse.Object.extend("Message");

        var message = new Message();
        message.set("toUser", user);
        message.set("fromUser", from);
        message.set("image", image);
        message.set("messageData", params.messageData);
        message.save(null, {
            success: function (savedMessage) {
                response.success("Successfully added a message for " + user.id + " from " + params.fromUser);
                Parse.Push.send({
                        where: userQuery,
                        data: {
                            alert: "New message on CatChat!"
                      }
                    },
                    { success: function() {
                        console.log("Successfully sent push notification");
                      }, error: function(err) {
                        console.log(err);
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
                response.success("Successfully added a pending message for " + toUserFBIdOrEmail + " from " + params.fromUser);
            },
            error: function (error) {
                response.error(error);
            }
        });
    }
}

Parse.Cloud.define("resendVerificationEmail", function (request, response) {
    var params = request.params;
    if(params.userid) {
        var query = new Parse.Query("User");
        query.get(params.userid, {
            success: function(user) {
                if(user) {
                    Parse.Cloud.useMasterKey();
                    // it seems the best way to resend email verification is to set the email field again
                    // https://parse.com/questions/it-would-be-nice-to-allow-users-to-request-another-email-to-verify-their-email-address
                    // https://parse.com/questions/resending-an-activation-email-to-a-user-thats-not-authenticated

                    // TODO: find a better way because this is freaking ridiculous
                    // to reset the email, we have to set it to something else, then set it back :<
                    // https://www.parse.com/questions/re-verification-of-email-address-re-sending-email-from-parse
                    user.set("email", "catchat@example.com");
                    user.save(null, {
                      success: function(savedUser) {
                            savedUser.set("email", user.get('username'));
                            savedUser.save(null, {
                                  success: function(u) {
                                        response.success('Email verification sent');
                                  },
                                  error: function(u, error) {
                                        response.error("Failed to save email on user with id " + params.userid);
                                  }
                                });
                      },
                      error: function(savedUser, error) {
                        response.error("Failed to save email on user with id " + params.userid);
                      }
                    });
                } else {
                    response.error("Failed to lookup user with id " + params.userid);
                }
            },
            error: function(error) {
                response.error("Failed to find user with id " + params.userid);
            }
        });
    } else {
        response.error('Cannot resend verification email to user when no user provided. Expected field userid');
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
        Parse.Cloud.useMasterKey();
        user.set("facebookID", facebookID, null);
    }
    response.success();
});
