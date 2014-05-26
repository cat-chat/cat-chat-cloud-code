exports.findByEmail = function(email, callback) {
    console.log("Looking for email: " + email);
    var query = new Parse.Query("User");
    query.equalTo("email", email);
    query.equalTo("emailVerified", true);
    query.first({
        success: function(user) {
            if(user) {
                console.log("Found user with email: " + email + " user " + user);
                callback(user);
            } else {
                console.log("No user for email: " + email);
                callback();
            }
        },
        error: function(error) {
            console.log("Failed whilst trying to find user with email: " + email);
            callback(error);
        }
    });
};

exports.findByFacebookID = function(facebookID, callback){
    console.log("Looking for fb user: " + facebookID);

    var query = new Parse.Query("User");
    query.equalTo("facebookID", facebookID);
    query.equalTo("emailVerified", true);
    query.first({
        success : function(user){
            if (user){
                console.log("Found user with facebookID: " + facebookID + " user");
                callback(user);
            } else {
                console.log("Failed to find user with facebookID: " + facebookID);
                callback();
            }
        },
        error : function(error) {
          console.error("Failed to retrieve users with facebookID: " + facebookID + ", error code:" + error.code + " : " + error.message);
        }
    });
}
