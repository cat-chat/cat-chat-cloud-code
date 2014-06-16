Parse.Cloud.define("sendMessage", function (request, response) {
    var params = request.params;
    var messageHelper = require('cloud/messageHelpers.js');
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
            messageHelper.sendMessageToUser(user, params, "toEmail", params.toEmail, response);
        });
    } else {
        userFinder.findByFacebookID(params.toFacebook, function (user) {
            messageHelper.sendMessageToUser(user, params, "toFacebook", params.toFacebook, response);
        });
    }
});

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
                    user.set("email", "uhoh@catchatapp.com");
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
    if (!messageHelper.isValidMessage(message)) {
        response.error("Message not valid");
        return;
    }
    if (!messageHelper.configureMessage(message)) {
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

Parse.Cloud.afterSave(Parse.User, function (request) {
    // we need admin rights to see all pending messages to know if this updated user can see them
    Parse.Cloud.useMasterKey();

    var user = request.object;
    var email = user.get("email");

    // move messages from PendingMessage to Messages if the user has been sent messages before having signed up
    if(user.get("email")) {
        var PendingMessage = Parse.Object.extend("PendingMessage");
        var query = new Parse.Query(PendingMessage);
        query.equalTo("toEmail", email);
        query.find({
          success: function(pendingMessages) {
            if(pendingMessages.length > 0) {
                var acl = new Parse.ACL(null);
                acl.setWriteAccess(user, true);

                var Message = Parse.Object.extend("Message");

                var messages = [];
                for (var i = 0; i < pendingMessages.length; i++) {
                    var pendingMsg = pendingMessages[i];

                    messages[i] = new Message();
                    messages[i].set("toUser", user);
                    messages[i].set("fromUser", pendingMsg.get("fromUser"));
                    messages[i].set("image", pendingMsg.get("image"));
                    messages[i].set("messageData", pendingMsg.get("messageData"));
                    messages[i].setACL(acl, null);
                }

                console.log("Moving " + messages.length + " pending messages into messages");

                Parse.Object.saveAll(messages, {
                    success: function(list) {
                        console.log("Successfully moved users pending mesages to message table");

                        Parse.Object.destroyAll(pendingMessages);
                    },
                    error: function(error) {
                        console.log("Error: " + error.code + " " + error.message);
                    },
                });
              }
          },
          error: function(error) {
                console.log("Error: " + error.code + " " + error.message);
          }
        });
    }
});
