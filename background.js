var UserPool = [];

var FollowedPool = [];
var UnfollowedPool = [];
var AllFollowings = [];

var CollectJobs = [];
var CollectFollowingsJob;

var CurrentUser;

var FollowTimeMin = 20;
var FollowTimeMax = 60;

var UnfollowTimeMin = 30;
var UnfollowTimeMax = 60;

var StatusUpdateInterval = 1;
var CollectJobInterval = 40;
var CollectFollowingsJobInterval = 30;
var UserPoolLimit = 500;

var StartFollow = false;
var StartUnfollow = false;

var NextFollowTimeInSeconds = 0;
var LastUpdateFollowTimeSeconds = 0;

var NextUnfollowTimeInSeconds = 0;
var LastUpdateUnfollowTimeSeconds = 0;

var LastUpdateStatusTime = 0;
var LastUpdateCollectJobTime = 0;
var LastUpdateCollectFollowingsTime = 0;

var ComPortContent;
var ComPortIndex;

function CollectJob(userid, cursorkey)
{
	this.user_id = userid;
	this.cursor_key = cursorkey;
}

function User(username, user_id, full_name, user_pic_url, followed_time)
{
	this.username = username;
	this.user_id = user_id;
	this.full_name = full_name;
	this.user_pic_url = user_pic_url;
	this.followed_time = followed_time;
}

$(document).ready(function()
{
	// Update our loop every half second
	setInterval(UpdateLoop, 500);

	//chrome.storage.local.clear();
	LoadDatabase();
})

chrome.runtime.onConnect.addListener(function(port) 
{
  if(port.name == "instafollow213content")
  {
	ComPortContent = port;
	port.onDisconnect.addListener(function()
		{
			ComPortContent = null;
		});
  }
  else if(port.name == "instafollow213index")
  {
  	ComPortIndex = port;
	port.onDisconnect.addListener(function()
		{
			ComPortIndex = null;
		});  	
  }
  else
  	return;

  // Add a Listener for Message Passing
  port.onMessage.addListener(OnMessageReceive);
});

chrome.browserAction.onClicked.addListener(function(tab) {

	chrome.tabs.query({"url": "https://www.instagram.com/*"}, function(tabs)
	{
		if(tabs.length == 0)
			chrome.tabs.create({"url": "https://www.instagram.com/"});
		else
			chrome.tabs.reload(tabs[0].id);

	});

	chrome.tabs.query({"url": chrome.extension.getURL('index.html')}, function(tabs)
	{
		if(tabs.length == 0)
		    chrome.tabs.create({"url": chrome.extension.getURL('index.html'), "selected": true});
		else
			chrome.tabs.update(tabs[0].id, {"active": true});
	});
});

function OnMessageReceive(msg)
{
	console.log(msg);
	if(msg.Tag == "AddUsers")
	{
		AddUsersToDatabase(msg.Users);
	}
	else if(msg.Tag == "FollowedUser")
	{
		OnFollowedUser(msg.User);
	}
	else if(msg.Tag == "RequestFollowStatus")
	{
		SendFollowStatus(msg.Num);
	}
	else if(msg.Tag == "SetFollowValue")
	{
		StartFollow = msg.Value;
	}
	else if(msg.Tag == "SetUnfollowValue")
	{
		StartUnfollow = msg.Value;
	}
	else if(msg.Tag == "CurrentUserUpdate")
	{
		UpdateCurrentUser(msg.User);
	}
	else if(msg.Tag == "AddCollectJob")
	{
		AddCollectJob(msg.Job);
	}
	else if(msg.Tag == "CollectFollowings")
	{
		CollectFollowingsJob = msg.Job;
	}
	else if(msg.Tag == "RequestCollectJobStatus")
	{
		SendMessage("CollectJobStatus", "Status", IsCollectJobAvailableForUser(msg.user_id), ComPortContent);
	}
	else if(msg.Tag == "RemoveCollectJob")
	{
		RemoveCollectJobByUser(msg.user_id);
	}
	else if(msg.Tag == "UpdateFollowingsJob")
	{
		UpdateCollectFollowingsJob(msg.Job);	
	}
	else if(msg.Tag == "AddFollowings")
	{
		AddFollowings(msg.Users);
	}
	else if(msg.Tag == "UnfollowedUser")
	{
		OnUnfollowedUser(msg.User);
	}
}

function SendMessage(tag, msgTag, msg, port)
{
	if(port)
	{
		var sendObj = {"Tag": tag};
	    sendObj[msgTag] = msg;
	    port.postMessage(sendObj);
	}
}

///////////////////////////////////////////////////////////////
function RemoveCollectJobByUser(user_id)
{
	var index = -1;
	for(var i=0; i < CollectJobs.length; i++)
	{
		if(CollectJobs[i].user_id == user_id)
		{
			index = i;
			break;
		}

	}

	if(index >= 0)
		CollectJobs.splice(index, 1);

	SaveDatabase();
}

function IsCollectJobAvailableForUser(user_id)
{
	for(var i=0; i < CollectJobs.length; i++)
	{
		if(CollectJobs[i].user_id == user_id)
			return true;
	}

	return false;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function GetUserIndexByUserID(user_id)
{
	for(var i=0; i < UserPool.length; i++)
	{
		if(UserPool[i].user_id == user_id)
			return i;
	}

	return -1;
}

function GetFollowingsIndexByUserID(user_id)
{
	for(var i=0; i < AllFollowings.length; i++)
	{
		if(AllFollowings[i].user_id == user_id)
			return i;
	}

	return -1;
}

function GetCollectJobIndex(job)
{
	for(var i=0; i < CollectJobs.length; i++)
	{
		if(CollectJobs[i].user_id == job.user_id)
			return i;
	}

	return -1;
}

function IsNewUser(user)
{
	if(GetUserIndexByUserID(user.user_id) >= 0)
		return false;

	for(var i=0; i < FollowedPool.length; i++)
	{
		if(FollowedPool[i].user_id == user.user_id)
			return false;
	}

	for(var i=0; i < UnfollowedPool.length; i++)
	{
		if(UnfollowedPool[i].user_id == user.user_id)
			return false;
	}	

	return true;
}

///////////////////////////////////////////////////////////////

function SaveDatabase()
{
	var Database = {};
	Database.UserPool = JSON.stringify(UserPool);
	Database.FollowedPool = JSON.stringify(FollowedPool);
	Database.UnfollowedPool = JSON.stringify(UnfollowedPool);
	Database.CollectJobs = JSON.stringify(CollectJobs);
	Database.CollectFollowingsJob = JSON.stringify(CollectFollowingsJob);
	Database.AllFollowings = JSON.stringify(AllFollowings);

	chrome.storage.local.set({"InstaBaitDatabase": Database});
}

function LoadDatabase()
{
	chrome.storage.local.get("InstaBaitDatabase", function(result)
	{
		var Database = result.InstaBaitDatabase;
		if(Database)
		{
			UserPool = JSON.parse(Database.UserPool);
			FollowedPool = JSON.parse(Database.FollowedPool);
			UnfollowedPool = JSON.parse(Database.UnfollowedPool);
			CollectJobs = JSON.parse(Database.CollectJobs);
			CollectFollowingsJob = JSON.parse(Database.CollectFollowingsJob);
			AllFollowings = JSON.parse(Database.AllFollowings);
		}
	});
}

function AddFollowings(users)
{
	for(var i=0; i < users.length; i++)
	{
		AllFollowings.push(users[i]);
	}
	SaveDatabase();
}

function UpdateCollectFollowingsJob(job)
{
	CollectFollowingsJob = job;
}

function AddCollectJob(job)
{
	CollectJobs.push(job);
	SaveDatabase();
}

function SendFollowStatus(num)
{
	var AllUsers = {};
	AllUsers.FollowedUsers = {};
	AllUsers.UnfollowedUsers = {};

	if(FollowedPool.length > 0)
	{
		var SlicedUsers = FollowedPool.slice(Math.max(FollowedPool.length - num, 0));
		AllUsers.FollowedUsers = SlicedUsers;
	}

	if(UnfollowedPool.length > 0)
	{
		var SlicedUsers = UnfollowedPool.slice(Math.max(UnfollowedPool.length - num, 0));
		AllUsers.UnfollowedUsers = SlicedUsers;
	}

	SendMessage("DispatchFollowStatus", "AllUsers", AllUsers, ComPortIndex);
}

function AddUsersToDatabase(users)
{
	for(var i=0; i < users.length; i++)
	{
		var user = users[i];
		if(IsNewUser(user))
		{
			var addUser = new User(user.username, user.user_id, user.full_name, user.user_pic_url, 0);
			UserPool.push(addUser);
		}
	}
	SaveDatabase();
}

function FollowUser(user)
{
	SendMessage("FollowUser", "User", user, ComPortContent);
}

function UnfollowUser(user)
{
	SendMessage("UnfollowUser", "User", user, ComPortContent);
}

function OnFollowedUser(user)
{
	var index = GetUserIndexByUserID(user.user_id);
	var User = UserPool.splice(index, 1);
	if(User.length > 0)
	{
		User[0].followed_time = Date.now();
		FollowedPool.push(User[0]);
		SendMessage("UserFollowComplete", "User", User[0], ComPortIndex);
	}

	SaveDatabase();
}

function OnUnfollowedUser(user)
{
	UnfollowedPool.push(user);
	var index = GetFollowingsIndexByUserID(user.user_id);
	var User = AllFollowings.splice(index, 1);
	if(User.length > 0)
	{
		SendMessage("UserUnfollowComplete", "User", User[0], ComPortIndex);
	}

	SaveDatabase();
}

function UpdateCurrentUser(user)
{
	CurrentUser = user;
	if(!CollectFollowingsJob)
	{
		CollectFollowingsJob = {};
		CollectFollowingsJob.user_id = user.user_id;
		CollectFollowingsJob.cursor_key = null;
	}
}

function UpdateStatus(time)
{
	if(time - LastUpdateStatusTime < StatusUpdateInterval)
		return;

	if(ComPortIndex)
	{
		var value = {};
		value.StartFollow = StartFollow;
		value.StartUnfollow = StartUnfollow;
		value.UserPoolSize = UserPool.length;
		value.FollowedPoolSize = FollowedPool.length;
		value.UnfollowedPoolSize = UnfollowedPool.length;
		value.CurrentUser = CurrentUser;

		SendMessage("StatusUpdate", "Status", value, ComPortIndex);
		LastUpdateStatusTime = time;
	}
}

function UpdateCollectFollowings(time)
{
	if(time - LastUpdateCollectFollowingsTime < CollectFollowingsJobInterval)
		return;

	if(CollectFollowingsJob)
	{
		LastUpdateCollectFollowingsTime = time;
		SendMessage("DoCollectFollowings", "Job", CollectFollowingsJob, ComPortContent);
	}

}

function UpdateCollectJob(time)
{
	if(time - LastUpdateCollectJobTime < CollectJobInterval)
		return;

	if(CollectJobs.length >= 1 && UserPoolLimit > UserPool.length)
	{
		LastUpdateCollectJobTime = time;
		var index = GetCollectJobIndex(CollectJobs[getRandomInt(0, CollectJobs.length - 1)]);
		if(index >= 0)
		{
			var job = CollectJobs.splice(index, 1);
			SendMessage("DoCollectJob", "Job", job[0], ComPortContent);
		}
	}
}

function UpdateFollow(time)
{
	if(StartFollow)
	{
		var SecondsPassed = time - LastUpdateFollowTimeSeconds;
		if(NextFollowTimeInSeconds < SecondsPassed && UserPool.length > 0)
		{
			NextFollowTimeInSeconds = getRandomInt(FollowTimeMin, FollowTimeMax);
			LastUpdateFollowTimeSeconds = time;

			var RandFollow = getRandomInt(0, UserPool.length - 1);
			FollowUser(UserPool[RandFollow]);
		}

	}	
}

function UpdateUnfollow(time)
{
	if(StartUnfollow)
	{
		var SecondsPassed = time - LastUpdateUnfollowTimeSeconds;
		if(NextUnfollowTimeInSeconds < SecondsPassed && AllFollowings.length > 0)
		{
			NextUnfollowTimeInSeconds = getRandomInt(UnfollowTimeMin, UnfollowTimeMax);
			LastUpdateUnfollowTimeSeconds = time;

			var RandUnfollow = getRandomInt(0, AllFollowings.length - 1);
			UnfollowUser(AllFollowings[RandUnfollow]);
		}
	}		
}

function UpdateLoop()
{
	var CurrentTime = (new Date()).getTime() / 1000;

	UpdateStatus(CurrentTime);
	UpdateCollectJob(CurrentTime);
	UpdateCollectFollowings(CurrentTime);
	UpdateFollow(CurrentTime);
	UpdateUnfollow(CurrentTime);
}