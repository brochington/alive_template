define([], function(){
	var ns = {},
		topics = {},
		uid = 0;

	ns.addToTopics = function(){
		topics[topicName] = [];

		if(callback){callback();};
	};

	ns.publish = function(topicName, passedArgs) {
		var subscribers = topics[topicName];

		if(topics[topicName]){
			for(var i = 0,l = topics[topicName].length; i<l; i++){
				subscribers[i].functionToCall(passedArgs);
			}
		}
	}

	ns.subscribe = function(topicName, functionToCall){
		var token = ++uid;

		if(!topics[topicName]){ns.addToTopics(topicName)};

		topics[topicName].push({
			token: token,
			functionToCall: functionToCall,
			name: topicName
		});

		return token;
	};

	ns.getTopics = function(){
		return topics;
	};

	ns.updateSubscribers = function(){

	};

	return ns;
});