var CurrentUser;
var ComPort;

$(document).ready(function()
{
	$("#sidebar-home").click(function()
	{
		$(".content-wrapper").empty();
		$(".content-wrapper").load("InstaBaiter/home.html", function()
		{
			SendMessage("RequestFollowStatus", "Num", 5);

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
		});
	});

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
	var userRow = "<tr><td><img class='img-rounded' width='64' height='64' src='" + user.user_pic_url + "'/></td><td class='align-mid-vertical text-instafollow-td'>" + user.username + "</td><td class='text-instafollow-td align-mid-vertical'>" + user.full_name + "</td></tr>"

	var follow_block = $("#follow-block");
	var follow_table = $(follow_block).find("tbody");
	$(follow_table).append(userRow);

	var table_rows = $(follow_table).find("tr");
	if(table_rows.length > 5)
	{
		var rowsToDelete = table_rows.length - 5;
		$(table_rows).slice(0, rowsToDelete).remove();
	}
}

function OnUnfollowedUser(user)
{
	var userRow = "<tr><td><img class='img-rounded' width='64' height='64' src='" + user.user_pic_url + "'/></td><td class='align-mid-vertical text-instafollow-td'>" + user.username + "</td><td class='text-instafollow-td align-mid-vertical'>" + user.full_name + "</td></tr>"

	var unfollow_block = $("#unfollow-block");
	var unfollow_table = $(unfollow_block).find("tbody");
	$(unfollow_table).append(userRow);

	var table_rows = $(unfollow_table).find("tr");
	if(table_rows.length > 5)
	{
		var rowsToDelete = table_rows.length - 5;
		$(table_rows).slice(0, rowsToDelete).remove();
	}
}