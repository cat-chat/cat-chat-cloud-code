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
			message.set("messageDate", request.object.get("messageData"));
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
	var messageHelper = require('cloud/messageHelpers.js');
	if (!messageHelper.isValidMessage(message, response)){
		return;
	}
	if (!messageHelper.configureMessage(message, response)){
		return;
	}
	response.success();
});

Parse.Cloud.afterSave(Parse.User, function(request, response){
	var user = request.object;

	var userEmail = user.getEmail;
	if(userEmail && user.get("emailVerified")){
		var query = new Parse.Query("PendingMessage");
		query.equalTo("toEmail", userEmail);
		query.each({
			callback : function(pendingMessage){

			}
		})
	}

});
