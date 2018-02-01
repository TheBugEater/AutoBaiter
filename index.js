var CurrentUser;
var ComPort;

var DisplayFollowersNum = 10;

$(document).ready(function()
{
	$("#overlay").show();
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

			$(document).on('click', '.remove-user-collect', function(){
				RemoveCollectJobUser(this);
			});

			$("#set-unfollow-check").click(function()
			{
				SetUnfollowValue($(this).is(':checked'));
			});

			SetActiveSidebarItem("#sidebar-home");
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

			$(document).on('change', '#import-file-input', function(event){
				ImportDatabase(event);
			});

			$("#import-database").click(function()
			{
				$("#import-file-input").click();
			});
			
			$("#export-database").click(function()
			{
				SendMessage("ExportDatabase", "", "");
			});

			$("#reset-all").click(function()
			{
				SendMessage("ResetAll", "", "");
			});

			SetActiveSidebarItem("#sidebar-settings");
		});
	});

	$("#sidebar-whitelist").click(function()
	{
		$(".content-wrapper").empty();
		$(".content-wrapper").load("InstaBaiter/whitelist.html", function()
		{
			SendMessage("RequestWhitelistStatus", "", "");

			$('#AddUserToWhitelistModal').insertAfter($('body'));

			SendMessage("RequestWhitelist", "", "");
			$("#whitelist-followings").click(function()
			{
				WhitelistFollowings();
			});

			$(document).on('click', '.remove-user-whitelist', function(){
				RemoveWhitelistedUser(this);
			});

			$(document).on('click', '.add-whitelist-user', function(){
				AddUserToWhitelist(this);
			});

			$("#user-search").keyup(function()
			{
				FilterWhitelistSearch(this);
			});

			$("#whitelist-user").click(function()
			{
				$("#add-user-results").empty();
				$("#add-user-search").val("");
				$("#AddUserToWhitelistModal").modal('show');
			});

			$("#add-user-search").keyup(function()
			{
				NewWhitelistUserSearch(this);
			});

			SetActiveSidebarItem("#sidebar-whitelist");
		});
	});

	$("#sidebar-help").click(function()
	{
		$(".content-wrapper").empty();
		$(".content-wrapper").load("InstaBaiter/help.html", function()
		{
			SetActiveSidebarItem("#sidebar-help");
		});
	});

	$("#sidebar-home").click();
	CreateComPort();
})

function SetActiveSidebarItem(sidebar_id)
{
	$("#sidebar-home").addClass("sidebar-item");
	$("#sidebar-whitelist").addClass("sidebar-item");
	$("#sidebar-settings").addClass("sidebar-item");
	$("#sidebar-help").addClass("sidebar-item");

	$("#sidebar-home").removeClass("sidebar-item-active");
	$("#sidebar-whitelist").removeClass("sidebar-item-active");
	$("#sidebar-settings").removeClass("sidebar-item-active");
	$("#sidebar-help").removeClass("sidebar-item-active");

	$(sidebar_id).removeClass("sidebar-item");
	$(sidebar_id).addClass("sidebar-item-active");
}

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
	else if(msg.Tag == "AddedWhitelistUsers")
	{
		ClearWhitelistTable();
		AddedWhitelistUsers(msg.Users);
	}
	else if(msg.Tag == "UpdatedWhitelistUsers")
	{
		AddedWhitelistUsers(msg.Users);
	}
	else if(msg.Tag == "UserLoggedIn")
	{
		SendMessage("RequestFollowStatus", "Num", DisplayFollowersNum);
		$("#overlay").hide();
	}
	else if(msg.Tag == "UserLoggedOut")
	{
		$("#overlay").show();
	}
	else if(msg.Tag == "ReceiveFilteredFollowings")
	{
		ProcessFilteredFollowings(msg.Users);
	}
	else if(msg.Tag == "ReceiveWhitelistStatus")
	{
		SetWhitelistStatus(msg.Status);
	}
}

function ImportDatabase(event)
{
	var file = event.target.files[0];
	if(file)
	{
		var fileReader = new FileReader();
		fileReader.onload = function(event)
		{
			var content = event.target.result;
			SendMessage("ImportDatabase", "Database", content);
		}
		fileReader.readAsText(file);
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

	$("#input-unfollow-days").val(settings.UnfollowAfterDays);
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

	settings.UnfollowAfterDays = $("#input-unfollow-days").val();

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

function WhitelistFollowings()
{
	$("#whitelist-followings").button("loading");
	SendMessage("WhitelistFollowings", "", "");
}

function SetWhitelistStatus(status)
{
	if(status.Enabled)
		$("#whitelist-followings").button("loading");
	else
		$("#whitelist-followings").button("reset");
}

function RemoveWhitelistedUser(button)
{
	var user_id = $(button).attr("user_id");
	$(button).closest("tr").remove();

	SendMessage("RemoveWhitelistUser", "user_id", user_id);
}

function RemoveCollectJobUser(button)
{
	var user_id = $(button).attr("user_id");
	$(button).closest("tr").remove();

	SendMessage("RemoveCollectJob", "user_id", user_id);
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

	UpdateCollectJobStatus(status.CollectJobs);
}

function NewWhitelistUserSearch(input)
{
	var text = $(input).val().toLowerCase();
	var Request = {};
	Request.Text = text;
	Request.Count = 20;
	SendMessage("RequestFilteredFollowings", "Request", Request);
}

function FilterWhitelistSearch(input)
{
	var text = $(input).val().toLowerCase();
	var whitelist_block = $("#whitelisted-users");
	$(whitelist_block).find("tr").each(function()
	{
		if($(this).text().toLowerCase().indexOf(text) < 0 && text != "")
		{
			$(this).hide();
		}
		else
		{
			$(this).show();
		}
	});
}

function ClearWhitelistTable()
{
	$("#whitelisted-users").empty();
}

function AddUserToWhitelist(input)
{
	var user_id = $(input).attr("user_id");
	$(input).closest("li").remove();
	
	SendMessage("AddUserToWhitelist", "user_id", user_id);
}

function ProcessFilteredFollowings(users)
{
	var filter_users_block = $("#add-user-results");
	filter_users_block.empty();
	for(var i=0; i<users.length; i++)
	{
		var user = users[i];
		var userRow = `
			<li class="add-whitelist-user" user_id=`+ user.user_id + `>
			<div class="row">
			<div class="col-md-2"><a href='https://www.instagram.com/` + user.username + `/' target='_blank'><img class='img-rounded' width='64' height='64' src='` + user.user_pic_url + `'/></a></div>
			<div class='col-md-5 align-mid-vertical text-instafollow-td'>` + user.username + `</div><div class='col-md-5 text-instafollow-td align-mid-vertical'>` + user.full_name + `</div>
			</div>
			</li>
			`;

		$(filter_users_block).append(userRow);
	}
}

function AddedWhitelistUsers(users)
{
	var whitelist_block = $("#whitelisted-users");
	for(var i = 0; i < users.length; i++)
	{
		var user = users[i];
		var userRow = `
		<tr>
		<td><a href='https://www.instagram.com/` + user.username + `/' target='_blank'><img class='img-rounded' width='64' height='64' src='` + user.user_pic_url + `'/></a></td>
		<td class='align-mid-vertical text-instafollow-td'>` + user.username + `</td><td class='text-instafollow-td align-mid-vertical'>` + user.full_name + `</td>
		<td style="vertical-align: middle;">
        <button class="btn-danger remove-user-whitelist" user_id=`+ user.user_id +`><span class="glyphicon glyphicon-remove"></span></button></td>
		</tr>
		`;
		$(whitelist_block).prepend(userRow);
	}

	FilterWhitelistSearch($("#user-search"));
}

function UpdateCollectJobStatus(Jobs)
{
	var collect_block = $("#collect-users-block");
	var collect_table = $(collect_block).find("tbody");
	$(collect_table).empty();
	for(var i = 0; i < Jobs.length; i++)
	{
		var user = Jobs[i].user;
		var userRow = `
		<tr>
		<td><a href='https://www.instagram.com/` + user.username + `/' target='_blank'><img class='img-rounded' width='64' height='64' src='` + user.user_pic_url + `'/></a></td>
		<td class='align-mid-vertical text-instafollow-td'>` + user.username + `</td><td class='text-instafollow-td align-mid-vertical'>` + user.full_name + `</td>
		<td style="vertical-align: middle;">
        <button class="btn-danger remove-user-collect" user_id=`+ user.user_id +`><span class="glyphicon glyphicon-remove"></span></button></td>
		</tr>
		`;
		$(collect_table).prepend(userRow);
	}
}

function UpdateFollowStatus(AllUsers)
{
	var FollowedUsers = AllUsers.FollowedUsers;
	var UnfollowedUsers = AllUsers.UnfollowedUsers;

	var follow_block = $("#follow-block");
	var follow_table = $(follow_block).find("tbody");
	$(follow_table).empty()

	var unfollow_block = $("#unfollow-block");
	var unfollow_table = $(unfollow_block).find("tbody");
	$(unfollow_table).empty();

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
	var userRow = `
		<tr>
		<td><a href='https://www.instagram.com/` + user.username + `/' target='_blank'><img class='img-rounded' width='64' height='64' src='` + user.user_pic_url + `'/></a></td>
		<td class='align-mid-vertical text-instafollow-td'>` + user.username + `</td><td class='text-instafollow-td align-mid-vertical'>` + user.full_name + `</td>
		</tr>
	`;

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
	var userRow = `
		<tr>
		<td><a href='https://www.instagram.com/` + user.username + `/' target='_blank'><img class='img-rounded' width='64' height='64' src='` + user.user_pic_url + `'/></a></td>
		<td class='align-mid-vertical text-instafollow-td'>` + user.username + `</td><td class='text-instafollow-td align-mid-vertical'>` + user.full_name + `</td>
		</tr>
	`;

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