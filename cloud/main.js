Parse.Cloud.afterSave("PendingMessage", function(request) {
	var toEmail = request.object.get("toEmail");

  	query = new Parse.Query("User");
  	query.equalTo("email", toEmail);
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