var ComPort;
var CurrentUser;

$(document).ready(function()
{
  CreateComPort();
  RetriveUserHeaders();
  CreateCollectFollowersButton();

  setInterval(UpdateStates, 2000);
 });

function getCookie(name) {
     var cookieValue = null;
     if (document.cookie && document.cookie != '') {
         var cookies = document.cookie.split(';');
         for (var i = 0; i < cookies.length; i++) {
             var cookie = jQuery.trim(cookies[i]);
         if (cookie.substring(0, name.length + 1) == (name + '=')) {
             cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
             break;
         }
     }
 }
 return cookieValue;
}

function UpdateStates()
{
  var collectDiv = $("#instabaiter-inject");
  var userPage = $("a[href$='/followers/']");
  if(userPage.length <= 0)
  {
    $(collectDiv).hide('slow');
    return;
  }

  var IsDisplayed = $(collectDiv).is(':visible');      
  if(IsDisplayed)
  {
    return;
  }

  GetCurrentPageUserData(function(userdata)
  {
    if(userdata)
    {
      SendMessage("RequestCollectJobStatus", "user_id", userdata.user_id);
    }
  });
}

/////////// Communication /////////////////////////////////
function CreateComPort()
{
  ComPort = chrome.runtime.connect({name: "instafollow213content"});
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
  if(msg.Tag == "FollowUser")
  {
    FollowUser(msg.User);
  }
  else if(msg.Tag == "DoCollectJob")
  {
    DoCollectJob(msg.Job);
  }
  else if(msg.Tag == "CollectJobStatus")
  {
    OnReceiveCollectJobStatus(msg.Status);
  }
  else if(msg.Tag == "DoCollectFollowings")
  {
    DoCollectFollowings(msg.Job);
  }
  else if(msg.Tag == "UnfollowUser")
  {
    UnfollowUser(msg.User);
  }
}
///////////////////////////////////////////////////////////

function OnReceiveCollectJobStatus(status)
{
  var collectDiv = $("#instabaiter-inject");
  $(collectDiv).show();

  var collectButton = $("#collect-followers-instafollow");
  if(status)
  {
    $(collectButton).attr("insta", "true");
    $(collectButton).text("Stop Grabbing Followers");
  }
  else
  {
    $(collectButton).attr("insta", "false");
    $(collectButton).text("Grab Followers");
  }

  $(collectButton).prop('disabled', false);
}

function CreateCollectFollowersButton()
{
  $("#instabaiter-inject").remove();
  $('body').append('<div id="instabaiter-inject" style="display:none;"><button class="btn insta-follow-btn-style" id="collect-followers-instafollow" insta="false" type="button"></button></div>'); 
  var collectButton = $("#collect-followers-instafollow");
  $(collectButton).click(OnClickCollectFollowers);
}

function OnClickCollectFollowers()
{
    GetCurrentPageUserData(function(userdata){

      var collectButton = $("#collect-followers-instafollow");
      $(collectButton).prop('disabled', true);
      if($(collectButton).attr("insta") == "false")
      {
        var CollectJob = {};
        CollectJob.user_id = userdata.user_id;
        CollectJob.cursor_key = null;
        CollectJob.user = userdata;

        SendMessage("AddCollectJob", "Job", CollectJob);
      }
      else
      {
        SendMessage("RemoveCollectJob", "user_id", userdata.user_id);
      }

      SendMessage("RequestCollectJobStatus", "user_id", userdata.user_id);
  });
}

function DoCollectJob(CollectJob)
{
   CollectUsersFrom(CollectJob, function(users) {

      if(users.length > 0)
      {
        SendMessage("AddUsers", "Users", users);
      }
    });
}
/// Functionalities

function RetriveUserHeaders()
{
  var CSRF = getCookie("csrftoken");
  CurrentUser = {"CSRF": CSRF};
  RetriveCurrentUserInfo();
}

function FollowUser(user)
{
  $.ajax({
    method: "POST",
    url: "https://www.instagram.com/web/friendships/" + user.user_id + "/follow/",
    beforeSend: function (xhr) {
      xhr.setRequestHeader("x-csrftoken", CurrentUser.CSRF);
      xhr.setRequestHeader("x-instagram-ajax", "1");
    },
    error: function (request, status, error) {
        var Error = {};
        Error.String = "FollowError";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;
        Error.ExtraData = user;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(msg){
    SendMessage("FollowedUser", "User", user);
  });
}

function UnfollowUser(user)
{
  $.ajax({
    method: "POST",
    url: "https://www.instagram.com/web/friendships/" + user.user_id + "/unfollow/",
    beforeSend: function (xhr) {
      xhr.setRequestHeader("x-csrftoken", CurrentUser.CSRF);
      xhr.setRequestHeader("x-instagram-ajax", "1");
    },
    error: function (request, status, error) {
        var Error = {};
        Error.String = "UnfollowError";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;
        Error.ExtraData = user;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(msg){
    SendMessage("UnfollowedUser", "User", user);
  });
}

function DoCollectFollowings(CollectJob)
{
  CollectFollowings(CollectJob.user_id, CollectJob.cursor_key, function(users)
  {
    if(users && users.length > 0)
    {
      SendMessage("AddFollowings", "Users", users);
    }
  });
}

function CollectFollowings(current_user_id, cursor_key, callback)
{
  var variables = {};
  variables.id = current_user_id;
  if(cursor_key)
  {
    variables.first = "20";
    variables.after = cursor_key;
  }
  else
  {
    variables.first = "100";
  }
  var userurl = "https://www.instagram.com/graphql/query/?query_id=17874545323001329&variables=" + JSON.stringify(variables);

  $.ajax({
    url: userurl,
    method: "GET",
    error: function (request, status, error) {
        var Error = {};
        Error.String = "CollectFollowingError";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;
        Error.ExtraData = current_user_id;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(dataobj)
  {
    var ExtractedUsers = [];
    for(var i=0; i < dataobj.data.user.edge_follow.edges.length; i++)
    {
      user = dataobj.data.user.edge_follow.edges[i];
      var UserData = {"username": user.node.username, "user_id": user.node.id, "full_name": user.node.full_name, "user_pic_url": user.node.profile_pic_url};
      ExtractedUsers.push(UserData);
    }

    var CollectJob = {};
    CollectJob.user_id = current_user_id;
    if(dataobj.data.user.edge_follow.page_info.has_next_page)
    {
      CollectJob.cursor_key = dataobj.data.user.edge_follow.page_info.end_cursor;
      CollectJob.eof = false;
    }
    else
    {
      CollectJob.cursor_key = null;
      CollectJob.eof = true;
    }
    SendMessage("UpdateFollowingsJob", "Job", CollectJob); 

    callback(ExtractedUsers);
  });

}

function CollectUsersFrom(job, callback)
{
  var variables = {};
  variables.id = job.user_id;
  if(job.cursor_key)
  {
    variables.first = "20";
    variables.after = job.cursor_key;
  }
  else
  {
    variables.first = "20";
  }
  var userurl = "https://www.instagram.com/graphql/query/?query_id=17851374694183129&variables=" + JSON.stringify(variables);

  $.ajax({
    url: userurl,
    method: "GET",
    error: function (request, status, error) {
        var Error = {};
        Error.String = "CollectFollowersError";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;
        Error.ExtraData = job.user_id;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(dataobj)
  {
    var ExtractedUsers = [];
    for(var i=0; i < dataobj.data.user.edge_followed_by.edges.length; i++)
    {
      user = dataobj.data.user.edge_followed_by.edges[i];
      // Only add those who are not followed by this user
      if(user.node.followed_by_viewer == false && user.node.requested_by_viewer == false && CurrentUser.user_id != user.node.id)
      {
        var UserData = {"username": user.node.username, "user_id": user.node.id, "full_name": user.node.full_name, "user_pic_url": user.node.profile_pic_url};
        ExtractedUsers.push(UserData);
      }
    }

    if(dataobj.data.user.edge_followed_by.page_info.has_next_page)
    {
      var CollectJob = {};
      CollectJob.user_id = job.user_id; 
      CollectJob.cursor_key = dataobj.data.user.edge_followed_by.page_info.end_cursor; 
      CollectJob.eof = false;
      SendMessage("ModifyCollectJobCursor", "Job", CollectJob);
    }
    else
    {
      //Remove Job
      SendMessage("RemoveCollectJob", "user_id", job.user_id);
    }

    callback(ExtractedUsers);
  });
}

function GetCurrentPageUserData(callback)
{
  $.ajax({
    method: "GET",
    url: window.location.href + "?__a=1"
  })
  .done(function(data) 
  {
    if(data.user && data.user.username)
    {
      var UserData = {"username": data.user.username, "user_id": data.user.id, "full_name": data.user.full_name, "user_pic_url": data.user.profile_pic_url};
      callback(UserData);
    }
    else
    {
      callback(null);
    }
  });
}

function RetriveCurrentUserInfo()
{
  $.ajax({
    method: "GET",
    url: "https://www.instagram.com/?__a=1"
  })
  .done(function(data) 
  {
    CurrentUser.user_id = data.graphql.user.id;
    CurrentUser.user_pic_url = data.graphql.user.profile_pic_url;
    CurrentUser.username = data.graphql.user.username;
    SendMessage("CurrentUserUpdate", "User", CurrentUser);
  }); 
}

