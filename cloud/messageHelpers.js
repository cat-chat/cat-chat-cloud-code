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
    acl.setReadAccess(message.get("fromUser"), true);

    if (! message.setACL(acl, null)){
        return false;
    }
    return true;
}
