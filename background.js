var UserPool = [];

var FollowedPool = [];
var UnfollowedPool = [];
var AllFollowings = [];
var Whitelist = [];

var CollectJobs = [];
var CollectFollowingsJob = {};

var CurrentUser;

var IsWhitelistFollowings = false;

// Time Ranges and Intervals
var FollowSettings = {};
var UnfollowSettings = {};
var CollectFollowers = {};
var CollectFollowings = {};

var UnfollowAfterDays = 1;

var StartFollow = false;
var StartUnfollow = false;

// Temp Time Values
var FollowTime;
var UnfollowTime;
var CollectUsersTime;
var CollectFollowingsTime;
var StatusUpdateTime;
var CheckFollowTime;

var LastUpdateTime = 0;
var StatusUpdateInterval = 1;
var CheckFollowPoolInterval = 300;

var IsUserLoggedIn = false;

var AllContentPorts = [];
var ComPortContent;
var ComPortIndex;

function TempTimeValues(Time, ErrorTime)
{
	this.Time = Time;
	this.ErrorTime = ErrorTime;
}

function SettingsTimeRanges(TimeMin, TimeMax, ErrorTime)
{
	this.TimeMin = TimeMin;
	this.TimeMax = TimeMax;
	this.ErrorTime = ErrorTime;
}

function SettingsCollects(Pool, Interval, ErrorTime)
{
	this.Pool = Pool;
	this.Interval = Interval;
	this.ErrorTime = ErrorTime;
}

function CollectJob(userid, cursorkey, eof, user)
{
	this.user_id = userid;
	this.cursor_key = cursorkey;
	this.eof = eof;
	this.user = user;
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
	SetDefaultSettings();
	SetTempSettings();
	
})

function SetTempSettings()
{
	FollowTime = new TempTimeValues(0, 0);
	UnfollowTime = new TempTimeValues(0, 0);
	CollectUsersTime = new TempTimeValues(0, 0);
	CollectFollowingsTime = new TempTimeValues(0, 0);
	StatusUpdateTime = new TempTimeValues(0, 0);
	CheckFollowTime = new TempTimeValues(0, 0);

	LastUpdateTime = (new Date()).getTime() / 1000;
}

function SetDefaultSettings()
{
	FollowSettings = new SettingsTimeRanges(40, 60, 200);
	UnfollowSettings = new SettingsTimeRanges(40, 60, 200);

	CollectFollowers = new SettingsCollects(1000, 60, 200);
	CollectFollowings = new SettingsCollects(1000, 60, 200);

	UnfollowAfterDays = 1;
}

chrome.runtime.onConnect.addListener(function(port) 
{
  if(port.name == "instafollow213content")
  {
	ComPortContent = port;
	AllContentPorts.push(ComPortContent);
	port.onDisconnect.addListener(function()
		{
			for(var i=0; i < AllContentPorts.length; i++)
			{
				if(AllContentPorts[i] == port)
				{
					AllContentPorts.splice(i, 1);
					break;
				}
			}

			if(AllContentPorts.length == 0)
			{
				ComPortContent = null;
				UserLoggedOut();
			}
			else
			{
				ComPortContent = AllContentPorts[0];
			}
		});

	port.onMessage.addListener(function(msg)
		{
			ComPortContent = port;
			OnMessageReceive(msg);
		});
  }
  else if(port.name == "instafollow213index")
  {
  	ComPortIndex = port;

	// Add a Listener for Message Passing
	port.onMessage.addListener(OnMessageReceive);

	port.onDisconnect.addListener(function()
		{
			ComPortIndex = null;
		});  	
  }
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
	else if(msg.Tag == "RequestCollectJobStatus")
	{
		SendMessage("CollectJobStatus", "Status", IsCollectJobAvailableForUser(msg.user_id), ComPortContent);
	}
	else if(msg.Tag == "ModifyCollectJobCursor")
	{
		ModifyCollectJobCursor(msg.Job);
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
	else if(msg.Tag == "RequestSettings")
	{
		SendSettings();
	}
	else if(msg.Tag == "UpdateSettings")
	{
		UpdateSettings(msg.Settings);
	}
	else if(msg.Tag == "ResetSettings")
	{
		ResetSettings();
	}
	else if(msg.Tag == "WhitelistFollowings")
	{
		WhitelistFollowings(msg.Start);
	}
	else if(msg.Tag == "RequestWhitelist")
	{
		SendMessage("AddedWhitelistUsers", "Users", Whitelist, ComPortIndex);
	}
	else if(msg.Tag == "RemoveWhitelistUser")
	{
		RemoveWhitelistUser(msg.user_id);
		SendMessage("AddedWhitelistUsers", "Users", Whitelist, ComPortIndex);
	}
	else if(msg.Tag == "AddUserToWhitelist")
	{
		AddUserToWhitelist(msg.user_id);
	}
	else if(msg.Tag == "RequestFilteredFollowings")
	{
		RequestFilteredFollowings(msg.Request);
	}
	else if(msg.Tag == "RequestWhitelistStatus")
	{
		SendWhitelistStatus();
	}
	else if(msg.Tag == "ImportDatabase")
	{
		ImportDatabase(msg.Database);
	}
	else if(msg.Tag == "ExportDatabase")
	{
		ExportDatabase();
	}
	else if(msg.Tag == "ResetAll")
	{
		ResetAll();
	}
	else if(msg.Tag == "Error")
	{
		HandleErrors(msg.Error);
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

function IsAlreadyUnfollowed(user_id)
{
	for(var i=0; i < UnfollowedPool.length; i++)
	{
		if(UnfollowedPool[i].user_id == user_id)
			return true;
	}

	return false;
}

function DeleteUserIdInUserPool(user_id)
{
	for(var i = UserPool.length -1; i >= 0; i--)
	{
		if(UserPool[i].user_id == user_id)
			UserPool.splice(i, 1);
	}
}

function DeleteUserIdInFollowings(user_id)
{
	for(var i = AllFollowings.length -1; i >= 0; i--)
	{
		if(AllFollowings[i].user_id == user_id)
			AllFollowings.splice(i, 1);
	}
}

function DeleteUserIdInFollowedPool(user_id)
{
	for(var i = FollowedPool.length -1; i >= 0; i--)
	{
		if(FollowedPool[i].user_id == user_id)
			FollowedPool.splice(i, 1);
	}
}

function GetUserFromFollowedPool(user_id)
{
	for(var i = FollowedPool.length -1; i >= 0; i--)
	{
		if(FollowedPool[i].user_id == user_id)
			return FollowedPool[i];
	}
}

function GetUserFromFollowings(user_id)
{
	for(var i = AllFollowings.length -1; i >= 0; i--)
	{
		if(AllFollowings[i].user_id == user_id)
			return AllFollowings[i];
	}
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

function IsUserInWhitelist(user_id)
{
	for(var i=0; i < Whitelist.length; i++)
	{
		if(Whitelist[i].user_id == user_id)
			return true;
	}

	return false;
}

function RemoveWhitelistUser(user_id)
{
	for(var i=0; i < Whitelist.length; i++)
	{
		if(Whitelist[i].user_id == user_id)
		{
			var user = Whitelist.splice(i, 1);
			if(GetFollowingsIndexByUserID(user[0].user_id) == -1)
				AllFollowings.push(user[0]);

			break;
		}
	}
}

function IsInAppFollowedList(user)
{
	for(var i=0; i < FollowedPool.length; i++)
	{
		if(FollowedPool[i].user_id == user.user_id)
			return true;
	}
	return false;
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

function HandleErrors(error)
{
	if(error.String == "FollowError")
	{
		FollowTime.Time = FollowSettings.ErrorTime;
		DeleteUserIdInUserPool(error.ExtraData.user_id);
	}
	else if(error.String  == "UnfollowError")
	{
		UnfollowTime.Time = UnfollowSettings.ErrorTime;
		DeleteUserIdInFollowings(error.ExtraData.user_id);
	}
	else if(error.String == "CollectFollowingError")
	{
		CollectFollowingsTime.Time = CollectFollowings.ErrorTime;
	}
	else if(error.String == "CollectFollowersError")
	{
		CollectUsersTime.Time = CollectFollowers.ErrorTime;
	}

	SaveDatabase();
}

function SetMinMax(value, min, max)
{
	return Math.min(Math.max(value, min), max);
}
///////////////////////////////////////////////////////////////

function ExportDatabase()
{
	chrome.storage.local.get("InstaBaitDatabase", function(result)
	{
		var InstaBaitDatabase = result.InstaBaitDatabase;
		if(!InstaBaitDatabase)
			InstaBaitDatabase = [];

		var File = {};
		File.Tag = "InstaBaiterExportedFile";
		File.Content = InstaBaitDatabase;

		var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(File))));
		chrome.downloads.download({
	    url: url,
	    filename: "InstaBaiterDatabase.json",
	    saveAs: true
	    });
	});
}

function ImportDatabase(database)
{
	var File = JSON.parse(database);
	if(File.Tag == "InstaBaiterExportedFile")
	{
		chrome.storage.local.set({"InstaBaitDatabase": File.Content}, function()
		{
			LoadDatabase();
			SendSettings();
			alert("Loaded Database Successfully!");
		});
	}
}

function ResetAll()
{
	UserPool = [];
	FollowedPool = [];
	UnfollowedPool = [];
	CollectJobs = [];
	CollectFollowingsJob = {};
	AllFollowings = [];

	// Should we clear Whitelist ?
	SaveDatabase();
}

function SaveDatabase()
{
	if(!CurrentUser)
		return;

	var Database = {};
	Database.UserPool = JSON.stringify(UserPool);
	Database.FollowedPool = JSON.stringify(FollowedPool);
	Database.UnfollowedPool = JSON.stringify(UnfollowedPool);
	Database.CollectJobs = JSON.stringify(CollectJobs);
	Database.CollectFollowingsJob = JSON.stringify(CollectFollowingsJob);
	Database.AllFollowings = JSON.stringify(AllFollowings);
	Database.Whitelist = JSON.stringify(Whitelist);

	var Settings = {};
	Settings.FollowSettings = FollowSettings;
	Settings.UnfollowSettings = UnfollowSettings;
	Settings.CollectFollowers = CollectFollowers;
	Settings.CollectFollowings = CollectFollowings;
	Settings.UnfollowAfterDays = UnfollowAfterDays;

	Database.Settings = JSON.stringify(Settings);


	chrome.storage.local.get("InstaBaitDatabase", function(result)
	{
		var InstaBaitDatabase = result.InstaBaitDatabase;
		if(!InstaBaitDatabase)
			InstaBaitDatabase = [];

		var IsNew = true;
		for(var i = 0; i < InstaBaitDatabase.length; i++)
		{
			if(InstaBaitDatabase[i].user_id == CurrentUser.user_id)
			{
				InstaBaitDatabase[i].database = Database;
				IsNew = false;
				break;
			}
		}

		if(IsNew)
		{
			var JSONDatabase = {};
			JSONDatabase.user_id = CurrentUser.user_id;
			JSONDatabase.database = Database;
			InstaBaitDatabase.push(JSONDatabase);
		}

		chrome.storage.local.set({"InstaBaitDatabase": InstaBaitDatabase});
	});

}

function LoadDatabase()
{
	chrome.storage.local.get("InstaBaitDatabase", function(result)
	{
		var InstaBaitDatabase = result.InstaBaitDatabase;
		if(!InstaBaitDatabase)
			InstaBaitDatabase = [];

		var Database = null;
		for(var i = 0; i < InstaBaitDatabase.length; i++)
		{
			if(InstaBaitDatabase[i].user_id == CurrentUser.user_id)
			{
				Database = InstaBaitDatabase[i].database;
				break;
			}
		}

		if(Database)
		{
			UserPool = JSON.parse(Database.UserPool);
			FollowedPool = JSON.parse(Database.FollowedPool);
			UnfollowedPool = JSON.parse(Database.UnfollowedPool);
			CollectJobs = JSON.parse(Database.CollectJobs);
			CollectFollowingsJob = JSON.parse(Database.CollectFollowingsJob);
			AllFollowings = JSON.parse(Database.AllFollowings);
			Whitelist = JSON.parse(Database.Whitelist);

			var Settings = JSON.parse(Database.Settings);
			FollowSettings = Settings.FollowSettings;
			UnfollowSettings = Settings.UnfollowSettings;
			CollectFollowers = Settings.CollectFollowers;
			CollectFollowings = Settings.CollectFollowings;
			UnfollowAfterDays = Settings.UnfollowAfterDays;

			if(CollectFollowingsJob.eof)
			{
				CollectFollowingsJob.eof = false;
				CollectFollowingsJob.cursor_key = null;
			}
		}
		else
		{
			UserPool = [];
			FollowedPool = [];
			UnfollowedPool = [];
			CollectJobs = [];
			AllFollowings = [];
			Whitelist = [];

			CollectFollowingsJob = {};
			CollectFollowingsJob.user_id = CurrentUser.user_id;
			CollectFollowingsJob.cursor_key = null;
			CollectFollowingsJob.eof = false;

			SetDefaultSettings();
		}
	});
}

function ClampSettingsValue()
{
	FollowSettings.TimeMin = SetMinMax(FollowSettings.TimeMin, 20, 100);
	FollowSettings.TimeMax = SetMinMax(FollowSettings.TimeMax, 30, 1000);
	FollowSettings.ErrorTime = SetMinMax(FollowSettings.ErrorTime, 100, 1000);

	UnfollowSettings.TimeMin = SetMinMax(UnfollowSettings.TimeMin, 20, 100);
	UnfollowSettings.TimeMax = SetMinMax(UnfollowSettings.TimeMax, 30, 1000);
	UnfollowSettings.ErrorTime = SetMinMax(UnfollowSettings.ErrorTime, 100, 1000);

	CollectFollowers.Pool = SetMinMax(CollectFollowers.Pool, 100, 10000);
	CollectFollowers.Interval = SetMinMax(CollectFollowers.Interval, 30, 200);
	CollectFollowers.ErrorTime = SetMinMax(CollectFollowers.ErrorTime, 100, 1000);

	CollectFollowings.Pool = SetMinMax(CollectFollowings.Pool, 100, 10000);
	CollectFollowings.Interval = SetMinMax(CollectFollowings.Interval, 30, 200);
	CollectFollowings.ErrorTime = SetMinMax(CollectFollowings.ErrorTime, 100, 1000);

	UnfollowAfterDays = SetMinMax(UnfollowAfterDays, 0, 100);
}

function ResetSettings()
{
	SetDefaultSettings();
	SaveDatabase();
	SendSettings();
}

function UpdateSettings(settings)
{
	FollowSettings = settings.FollowSettings;
	UnfollowSettings = settings.UnfollowSettings;
	CollectFollowers = settings.CollectFollowers;
	CollectFollowings = settings.CollectFollowings;
	UnfollowAfterDays = settings.UnfollowAfterDays;

	ClampSettingsValue();
	SaveDatabase();
	SendSettings();
}

function SendSettings()
{
	var Settings = {};
	Settings.FollowSettings = FollowSettings;
	Settings.UnfollowSettings = UnfollowSettings;
	Settings.CollectFollowers = CollectFollowers;
	Settings.CollectFollowings = CollectFollowings;
	Settings.UnfollowAfterDays = UnfollowAfterDays;

	SendMessage("Settings", "Settings", Settings, ComPortIndex);
}

function RequestFilteredFollowings(request)
{
	var FilterList = [];

	if(request.Text != "")
	{
		for(var i=0; i < AllFollowings.length; i++)
		{
			if(FilterList.length >= request.Count)
			{
				break;
			}

			var User = AllFollowings[i];
			if(User.username.toLowerCase().indexOf(request.Text)  == 0 || User.full_name.toLowerCase().indexOf(request.Text)  == 0)
			{
				FilterList.push(User);
			}
		}

		for(var i=0; i < FollowedPool.length; i++)
		{
			if(FilterList.length >= request.Count)
			{
				break;
			}

			var User = FollowedPool[i];
			if(User.username.toLowerCase().indexOf(request.Text)  == 0 || User.full_name.toLowerCase().indexOf(request.Text)  == 0)
			{
				FilterList.push(User);
			}
		}
	}

	SendMessage("ReceiveFilteredFollowings", "Users", FilterList, ComPortIndex);
}

function SendWhitelistStatus()
{
	var Status = {};
	Status.Enabled = IsWhitelistFollowings;
	SendMessage("ReceiveWhitelistStatus", "Status", Status, ComPortIndex);
}

function AddFollowings(users)
{
	if(IsWhitelistFollowings)
	{
		AddWhitelistUsers(users);
		if(CollectFollowingsJob && CollectFollowingsJob.eof)
		{
			IsWhitelistFollowings = false;
			SendWhitelistStatus();
		}
		return;
	}

	for(var i=0; i < users.length; i++)
	{
		var user = users[i];

		// Dont add whitelisted users
		if(IsUserInWhitelist(user.user_id))
			continue;

		// Don't allow to add Followed Users from the app, They'll be added automatically
		if(IsInAppFollowedList(user))
			continue;

		// Dont allow duplicates
		var index = GetFollowingsIndexByUserID(user.user_id);
		if(index == -1)
			AllFollowings.push(users[i]);
	}
	SaveDatabase();
}

function WhitelistFollowings(start)
{
	if(start)
	{

		IsWhitelistFollowings = true;
		CollectFollowingsJob = {};
		CollectFollowingsJob.eof = false;
		CollectFollowingsJob.cursor_key = null;
	
		for(var i=0; i < AllFollowings.length; i++)
		{
			var user = AllFollowings[i];
			// If User is already in whitelist don't duplicate
			if(!IsUserInWhitelist(user.user_id))
				Whitelist.push(user);
		}

		AllFollowings.length = 0;
		SendMessage("AddedWhitelistUsers", "Users", Whitelist, ComPortIndex);
	}
	else
	{
		IsWhitelistFollowings = false;
	}
	SendWhitelistStatus();

	SaveDatabase();
}

function AddWhitelistUsers(users)
{
	for(var i=0; i < users.length; i++)
	{
		var user = users[i];
		DeleteUserIdInFollowings(user.user_id);

		if(!IsUserInWhitelist(user.user_id))
			Whitelist.push(user);
	}

	SendMessage("UpdatedWhitelistUsers", "Users", users, ComPortIndex);
	SaveDatabase();
}

function AddUserToWhitelist(user_id)
{
	var User = GetUserFromFollowings(user_id);
	if(!User)
	{
		User = GetUserFromFollowedPool(user_id);
	}

	DeleteUserIdInFollowings(user_id);
	DeleteUserIdInFollowedPool(user_id);

	if(!IsUserInWhitelist(user_id))
			Whitelist.push(User);

	SendMessage("AddedWhitelistUsers", "Users", Whitelist, ComPortIndex);

	SaveDatabase();
}

function UpdateCollectFollowingsJob(job)
{
	CollectFollowingsJob = job;
}

function ModifyCollectJobCursor(job)
{
	for(var i=0; i < CollectJobs.length; i++)
	{
		if(CollectJobs[i].user_id == job.user_id)
		{
			CollectJobs[i].cursor_key = job.cursor_key;
			break;
		}
	}
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
	if(IsUserInWhitelist(user.user_id))
	{
		DeleteUserIdInFollowings(user.user_id);
		return;
	}

	if(IsAlreadyUnfollowed(user.user_id))
	{
		DeleteUserIdInFollowings(user.user_id);
		return;
	}

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

function UserLoggedOut()
{
	SendMessage("UserLoggedOut", "User", CurrentUser, ComPortIndex);	
	CurrentUser = null;
	IsUserLoggedIn = false;
}

function UpdateCurrentUser(user)
{
	if(!user)
	{
		if(CurrentUser)
		{
			UserLoggedOut();
		}
		return;
	}

	// Don't login the same user twice
	if(CurrentUser)
	{
		if(user.user_id == CurrentUser.user_id)
			return;
	}
	
	CurrentUser = user;
	IsUserLoggedIn = true;

	SendMessage("UserLoggedIn", "User", user, ComPortIndex);	

	LoadDatabase();
}

function UpdateStatus(seconds)
{
	StatusUpdateTime.Time -= seconds;
	if(StatusUpdateTime.Time < 0 && ComPortIndex)
	{
		StatusUpdateTime.Time = StatusUpdateInterval;

		var value = {};
		value.StartFollow = StartFollow;
		value.StartUnfollow = StartUnfollow;
		value.UserPoolSize = UserPool.length;
		value.FollowedPoolSize = FollowedPool.length;
		value.UnfollowedPoolSize = UnfollowedPool.length;
		value.CurrentUser = CurrentUser;
		value.CollectJobs = CollectJobs;

		SendMessage("StatusUpdate", "Status", value, ComPortIndex);
	}
}

function UpdateCollectFollowings(seconds)
{
	if(!CollectFollowingsJob)
		return;

	CollectFollowingsTime.Time -= seconds;
	if(!CollectFollowingsJob.eof && CollectFollowingsTime.Time < 0 && CollectFollowingsJob && ((CollectFollowings.Pool > AllFollowings.length) || IsWhitelistFollowings))
	{
		CollectFollowingsTime.Time = CollectFollowings.Interval;
		SendMessage("DoCollectFollowings", "Job", CollectFollowingsJob, ComPortContent);
	}

}

function UpdateCollectJob(seconds)
{
	CollectUsersTime.Time -= seconds;
	if(CollectUsersTime.Time < 0 && CollectJobs.length > 0 && CollectFollowers.Pool > UserPool.length)
	{
		CollectUsersTime.Time = CollectFollowers.Interval;
		var index = GetCollectJobIndex(CollectJobs[getRandomInt(0, CollectJobs.length - 1)]);
		if(index >= 0)
		{
			var job = CollectJobs.slice(index);
			SendMessage("DoCollectJob", "Job", job[0], ComPortContent);
		}
	}
}

function UpdateFollow(seconds)
{
	if(StartFollow)
	{
		FollowTime.Time -= seconds;
		if(FollowTime.Time < 0 && UserPool.length > 0)
		{
			FollowTime.Time = getRandomInt(FollowSettings.TimeMin, FollowSettings.TimeMax);

			var RandFollow = getRandomInt(0, UserPool.length - 1);
			FollowUser(UserPool[RandFollow]);
		}

	}	
}

function UpdateUnfollow(seconds)
{
	if(StartUnfollow)
	{
		UnfollowTime.Time -= seconds;
		if(UnfollowTime.Time < 0 && AllFollowings.length > 0)
		{
			UnfollowTime.Time = getRandomInt(UnfollowSettings.TimeMin, UnfollowSettings.TimeMax);

			var RandUnfollow = getRandomInt(0, AllFollowings.length - 1);
			UnfollowUser(AllFollowings[RandUnfollow]);
		}
	}		
}

function CheckFollowPool(seconds)
{
	CheckFollowTime.Time -= seconds;
	if(CheckFollowTime.Time > 0)
	{
		return;
	}

	CheckFollowTime.Time = CheckFollowPoolInterval;
	var oneDay = 24*60*60*1000; 
	var CurrentTime = (new Date()).getTime();
	for(var i=FollowedPool.length - 1; i >= 0; i--)
	{
		var DiffDays = Math.round(Math.abs((CurrentTime - FollowedPool[i].followed_time)/(oneDay)));
		if(DiffDays >= UnfollowAfterDays)
		{
			var user = FollowedPool.splice(i, 1);
			if(user.length > 0)
				AllFollowings.push(user[0]);
		}
	}	
}

function UpdateLoop()
{
	if(!IsUserLoggedIn)
		return;

	var CurrentTime = (new Date()).getTime() / 1000;
	var SecondsPassed = CurrentTime - LastUpdateTime;
	LastUpdateTime = CurrentTime;

	UpdateStatus(SecondsPassed);
	UpdateCollectJob(SecondsPassed);
	UpdateCollectFollowings(SecondsPassed);
	UpdateFollow(SecondsPassed);
	UpdateUnfollow(SecondsPassed);

	CheckFollowPool(SecondsPassed);
}