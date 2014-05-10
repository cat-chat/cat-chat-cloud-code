Parse.Cloud.afterSave("PendingMessage", function(request) {
	var toEmail = request.object.get("toEmail");

  	query = new Parse.Query("User");
  	query.equalTo("email", toEmail);
  	query.equalTo("emailVerified", true);
  	query.first({
      success: function(user) {
        if (user) {
			var Message = Parse.Object.extend("Message");

			var message = new Message();
			message.set("toUser", user);
			message.set("fromUser", request.object.get("fromUser"));
			message.set("image", request.object.get("image"));
			message.save();

			// could do this in beforeSave instead, but then we have to return error when a User exists

			request.object.destroy({
			  success: function(pendingmsg) {
			    console.log("Successfully deleted PendingMessage after ");
			  },
			  error: function(pendingmsg, error) {
			    console.error("Failed to delete PendingMessage after saving it as a Message, error code:" + error.code + " : " + error.message);
			  }
			});
    	}
    },
    error: function(error) {
      console.error("Failed to retrieve users with email: " + toEmail + ", error code:" + error.code + " : " + error.message);
    }
  });
});

Parse.Cloud.beforeSave("Message", function(request, response){
	var message = request.object;

	var toUser = message.get("toUser");
	var fromUser = message.get("fromUser");

	if (! toUser || ! fromUser){
		response.error("Messages need both a to and a from user.");
		return;
	}
	if (! message.get("image")){
		response.error("Messages need a cat image");
		return;
	}

	if (message.isNew()){
		message.set("messageDate", Date(), {silent : true});
	}
	var acl = new Parse.ACL(null);
	acl.setReadAccess(toUser, true);
	acl.setReadAccess(fromUser, true);

	if (message.setACL(acl, null)){
		response.success();
	}
	else{
		response.error("error setting ACL");
	}
});
