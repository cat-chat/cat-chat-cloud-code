exports.findByEmail = function(email){
    var query = new Parse.Query("User");
    query.equalTo("email", email);
    query.equalTo("emailVerified", true);
    query.first({
        success : function(user){
            if (user){
                return user;
            }
            return;
        },
        error : function(error) {
          console.error("Failed to retrieve users with email: " + toEmail + ", error code:" + error.code + " : " + error.message);
        }
    });
}

exports.findByFacebookID = function(facebookID){
    var query = new Parse.Query("User");
    query.equalTo("facebookID", facebookID);
    query.first({
        success : function(user){
            if (user){
                return user;
            }
            return;
        },
        error : function(error) {
          console.error("Failed to retrieve users with email: " + toEmail + ", error code:" + error.code + " : " + error.message);
        }
    });
}
