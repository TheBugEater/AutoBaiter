var CurrentUser;
var ComPort;

var DisplayFollowersNum = 10;

$(document).ready(function()
{
	$("#sidebar-home").click(function()
	{
		$(".content-wrapper").empty();
		$(".content-wrapper").load("InstaBaiter/home.html", function()
		{
			SendMessage("RequestFollowStatus", "Num", DisplayFollowersNum);

			$("#set-follow-check").click(function()
			{
				SetFollowValue($(this).is(':checked'));
			});

			$("#set-unfollow-check").click(function()
			{
				SetUnfollowValue($(this).is(':checked'));
			});
		});
	});

	$("#sidebar-settings").click(function()
	{
		$(".content-wrapper").empty();
		$(".content-wrapper").load("InstaBaiter/settings.html", function()
		{
			SendMessage("RequestSettings", "", "");

			$("#default-settings").click(function()
			{
				ResetSettings();
			});

			$("#save-settings").click(function()
			{
				SaveSettings();
			});
		});
	});

	$("#sidebar-home").click();
	CreateComPort();
})

function CreateComPort()
{
  ComPort = chrome.runtime.connect({name: "instafollow213index"});
  ComPort.onMessage.addListener(OnMessageReceive);

}

function SendMessage(tag, msgTag, msg)
{
    var sendObj = {"Tag": tag};
    sendObj[msgTag] = msg;
    ComPort.postMessage(sendObj);
}

function OnMessageReceive(msg)
{
	if(msg.Tag == "UserFollowComplete")
	{
		OnFollowedUser(msg.User);
	}
	else if(msg.Tag == "DispatchFollowStatus")
	{
		UpdateFollowStatus(msg.AllUsers);
	}
	else if(msg.Tag == "StatusUpdate")
	{
		UpdateStatus(msg.Status);
	}
	else if(msg.Tag == "UserUnfollowComplete")
	{
		OnUnfollowedUser(msg.User);
	}
	else if(msg.Tag == "Settings")
	{
		SetSettings(msg.Settings);
	}
}

function SetSettings(settings)
{
	$("#input-follow-time-min").val(settings.FollowSettings.TimeMin);
	$("#input-follow-time-max").val(settings.FollowSettings.TimeMax);
	$("#input-follow-error-time").val(settings.FollowSettings.ErrorTime);

	$("#input-unfollow-time-min").val(settings.UnfollowSettings.TimeMin);
	$("#input-unfollow-time-max").val(settings.UnfollowSettings.TimeMax);
	$("#input-unfollow-error-time").val(settings.UnfollowSettings.ErrorTime);

	$("#input-user-pool-num").val(settings.CollectFollowers.Pool);
	$("#input-user-collect-time").val(settings.CollectFollowers.Interval);
	$("#input-user-error-time").val(settings.CollectFollowers.ErrorTime);
	
	$("#input-following-pool-num").val(settings.CollectFollowings.Pool);
	$("#input-following-collect-time").val(settings.CollectFollowings.Interval);
	$("#input-following-error-time").val(settings.CollectFollowings.ErrorTime);
}

function SaveSettings()
{
	var settings = {};
	settings.FollowSettings = {};
	settings.UnfollowSettings = {};
	settings.CollectFollowers = {};
	settings.CollectFollowings = {};

	settings.FollowSettings.TimeMin = $("#input-follow-time-min").val();
	settings.FollowSettings.TimeMax = $("#input-follow-time-max").val();
	settings.FollowSettings.ErrorTime = $("#input-follow-error-time").val();;

	settings.UnfollowSettings.TimeMin = $("#input-unfollow-time-min").val();
	settings.UnfollowSettings.TimeMax = $("#input-unfollow-time-max").val();
	settings.UnfollowSettings.ErrorTime = $("#input-unfollow-error-time").val();

	settings.CollectFollowers.Pool = $("#input-user-pool-num").val();
	settings.CollectFollowers.Interval = $("#input-user-collect-time").val();
	settings.CollectFollowers.ErrorTime = $("#input-user-error-time").val();

	settings.CollectFollowings.Pool = $("#input-following-pool-num").val();
	settings.CollectFollowings.Interval = $("#input-following-collect-time").val();
	settings.CollectFollowings.ErrorTime = $("#input-following-error-time").val();

	SendMessage("UpdateSettings", "Settings", settings);
}

function ResetSettings()
{
	SendMessage("ResetSettings", "", "");
}

function SetFollowValue(value)
{
	SendMessage("SetFollowValue", "Value", value);
}

function SetUnfollowValue(value)
{
	SendMessage("SetUnfollowValue", "Value", value);
}

function UpdateStatus(status)
{
	$("#user-pool-num").text(status.UserPoolSize);
	$("#follow-pool-num").text(status.FollowedPoolSize);
	$("#unfollow-pool-num").text(status.UnfollowedPoolSize);
	if(status.CurrentUser)
	{
		CurrentUser = status.CurrentUser;
		$(".img-current-user").attr("src", status.CurrentUser.user_pic_url);
	}
	$("#set-follow-check").prop("checked", status.StartFollow);
	$("#set-unfollow-check").prop("checked", status.StartUnfollow);
}

function UpdateFollowStatus(AllUsers)
{
	var FollowedUsers = AllUsers.FollowedUsers;
	var UnfollowedUsers = AllUsers.UnfollowedUsers;

	for(var i=0; i < FollowedUsers.length; i++)
	{
		OnFollowedUser(FollowedUsers[i]);
	}

	for(var i=0; i < UnfollowedUsers.length; i++)
	{
		OnUnfollowedUser(UnfollowedUsers[i]);
	}
}

function OnFollowedUser(user)
{
	var userRow = "<tr><td><a href='https://www.instagram.com/" + user.username + "/'><img class='img-rounded' width='64' height='64' src='" + user.user_pic_url + "'/></a></td><td class='align-mid-vertical text-instafollow-td'>" + user.username + "</td><td class='text-instafollow-td align-mid-vertical'>" + user.full_name + "</td></tr>"

	var follow_block = $("#follow-block");
	var follow_table = $(follow_block).find("tbody");
	$(follow_table).prepend(userRow);

	var table_rows = $(follow_table).find("tr");
	var num_rows = table_rows.length;
	if(num_rows > DisplayFollowersNum)
	{
		var start_delete = num_rows - (num_rows - DisplayFollowersNum);
		$(table_rows).slice(start_delete).remove();
	}
}

function OnUnfollowedUser(user)
{
	var userRow = "<tr><td><a href='https://www.instagram.com/" + user.username + "/'><img class='img-rounded' width='64' height='64' src='" + user.user_pic_url + "'/></a></td><td class='align-mid-vertical text-instafollow-td'>" + user.username + "</td><td class='text-instafollow-td align-mid-vertical'>" + user.full_name + "</td></tr>"

	var unfollow_block = $("#unfollow-block");
	var unfollow_table = $(unfollow_block).find("tbody");
	$(unfollow_table).prepend(userRow);

	var table_rows = $(unfollow_table).find("tr");
	var num_rows = table_rows.length;
	if(num_rows > DisplayFollowersNum)
	{
		var start_delete = num_rows - (num_rows - DisplayFollowersNum);
		$(table_rows).slice(start_delete).remove();
	}

}