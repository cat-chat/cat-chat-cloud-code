Parse.Cloud.afterSave("PendingMessage", function(request) {
	var toEmail = request.object.get("toEmail");

  	var query = new Parse.Query("User");
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


Parse.Cloud.define("sendMessage", function(request, response){
	var params = request.params;
	if (! params.toEmail && ! params.toFacebook){
		response.error("Message needs either toEmail or toFacebook");
		return;
	}
	if (! params.image){
		response.error("Message needs an image");
		return;
	}
	var userFinder = require('cloud/userFinder.js');
	var toUser;
	if (params.toEmail){
		toUser = userFinder.findByEmail(params.toEmail);
	}else{
		toUser = userFinder.findByFacebookID(params.toFacebook);
	}
	if (toUser){
		var Message = Parse.Object.extend("Message");

		var message = new Message();
		message.set("toUser", toUser);
		message.set("fromUser", request.user);
		message.set("image", params.image);
		message.set("messageData", params.messageData);
		message.save(null, {useMasterKey : true,
		error : function(error){
			console.error(error.message);
		}});
	}else{

	}
	response.success();
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

Parse.Cloud.beforeSave("PendingMessage", function(request, response){
	var message = request.object;
	var acl = new Parse.ACL(null);
	acl.setReadAccess(message.get("fromUser"), true);
	if (! message.setACL(acl, null)){
		response.error("error setting ACL");
		return;
	}
	response.success();
});

Parse.Cloud.beforeSave(Parse.User, function(request, response){
	var user = request.object;
	var authData, facebookID;
	authData = user.get("authData");
	if (authData){
		facebookID = authData.facebook.id;
	}
	if (facebookID){
		user.set("facebookID", facebookID, null);
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
