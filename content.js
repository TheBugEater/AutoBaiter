var ComPort;
var CurrentUser;

var LastUsername = "";
var SharedData = null;

var UserTag = "._7UhW9";

$(document).ready(function()
{
  CreateComPort();
  RetriveUserHeaders();
  CreateCollectFollowersButton();
  InjectSharedDataExtracter();

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

function getSharedData()
{
  var sendObj = {"Tag": "SharedData"};
  sendObj["SharedData"] = window._sharedData;
  window.postMessage(sendObj,"*");
}

function InjectSharedDataExtracter()
{
  $('body').append(`<script>(` + getSharedData + `)();</script>`);
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

  // Username tag
  var thisPageUser = $(UserTag).text();

  var IsDisplayed = $(collectDiv).is(':visible');      
  if(IsDisplayed && thisPageUser == LastUsername)
  {
    return;
  }

  $(collectDiv).hide();
  GetCurrentPageUserData(thisPageUser, function(userdata)
  {
    if(userdata)
    {
      LastUsername = thisPageUser;
      SendMessage("RequestCollectJobStatus", "user_id", userdata.user_id);
    }
  });
}

/////////// Communication /////////////////////////////////
function CreateComPort()
{
  ComPort = chrome.runtime.connect({name: "instafollow213content"});
  ComPort.onMessage.addListener(OnMessageReceive);

  window.addEventListener("message", function(event) 
  {
    // We only accept messages from ourselves
    if (event.source != window)
      return;

    if (event.data.Tag && (event.data.Tag == "SharedData")) 
    {
      SharedData = event.data.SharedData;
    }
  }, false);
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
  else if(msg.Tag == "DoCollectMediaFromTag")
  {
    DoCollectMediaFromTag(msg.MediaTag);
  }
  else if(msg.Tag == "DoLikeMedia")
  {
    DoLikeMedia(msg.Media);
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
    var thisPageUser = $(UserTag).text();
    GetCurrentPageUserData(thisPageUser, function(userdata){

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

function DoLikeMedia(Media)
{
    LikeMedia(Media);
}

function DoCollectMediaFromTag(MediaTag)
{
   CollectMediaFromTag(MediaTag, function(Medias) {

      if(Medias.length > 0)
      {
        SendMessage("AddMedia", "Medias", Medias);
      }
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
  var user_id = getCookie("ds_user_id");
  CurrentUser = {"CSRF": CSRF};
  
  RetriveCurrentUserInfo(user_id);
}

function LikeMedia(media)
{
  $.ajax({
    method: "POST",
    url: "https://www.instagram.com/web/likes/" + media.media_id + "/like/",
    beforeSend: function (xhr) {
      xhr.setRequestHeader("x-csrftoken", CurrentUser.CSRF);
      xhr.setRequestHeader("x-instagram-ajax", "1");
    },
    error: function (request, status, error) {
        var Error = {};
        Error.String = "MediaLiked";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(msg){
    SendMessage("LikedMedia", "Media", media);
  });
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

function CollectMediaFromTag(tagData, callback)
{
  var variables = {};
  variables.tag_name = tagData.tag_name;
  variables.show_ranked = false;
  if(tagData.cursor_key)
  {
    variables.first = 20;
    variables.after = tagData.cursor_key;
  }
  else
  {
    variables.first = 20;
  }
  var collectUrl = "https://www.instagram.com/graphql/query/?query_hash=f92f56d47dc7a55b606908374b43a314&variables=" + JSON.stringify(variables);
  $.ajax({
    url: collectUrl,
    method: "GET",
    error: function (request, status, error) {
        var Error = {};
        Error.String = "CollectMediaFromTagError";
        Error.Request = request;
        Error.Status = status;
        Error.AjaxError = error;
        Error.ExtraData = tagData.tag_name;

        SendMessage("Error", "Error", Error);
    }
  })
  .done(function(dataobj)
  {
    var MediaPool = [];
    for(var i=0; i < dataobj.data.hashtag.edge_hashtag_to_media.edges.length; i++)
    {
      var media = dataobj.data.hashtag.edge_hashtag_to_media.edges[i].node;
      if(media.edge_liked_by.count < 50)
      {
        var info = {};
        info.media_src = media.thumbnail_src;
        info.media_id = media.id;
        info.is_video = media.is_video;
        info.shortcode = media.shortcode; 
        info.shortcode = media.shortcode; 
        var captions = media.edge_media_to_caption.edges;
        if(captions.length > 0)
        {
          info.caption = captions[0].node.text;
        }

        MediaPool.push(info);
      }
    }

    var CollectMediaJob = {};
    CollectMediaJob.tag_name = tagData.tag_name;
    if(dataobj.data.hashtag.edge_hashtag_to_media.page_info.has_next_page)
    {
      CollectMediaJob.cursor_key = dataobj.data.hashtag.edge_hashtag_to_media.page_info.end_cursor;
      CollectMediaJob.eof = false;
    }
    else
    {
      CollectMediaJob.cursor_key = null;
      CollectMediaJob.eof = true;
    }
    SendMessage("UpdateCollectMediaJob", "Job", CollectMediaJob); 

    callback(MediaPool);
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

function GetCurrentPageUserData(currentPageUser, callback)
{
  if(SharedData)
  {
    for(var i=0; i < SharedData.entry_data.ProfilePage.length; i++)
    {
        var user = SharedData.entry_data.ProfilePage[i].graphql.user;
        if(user && user.username == currentPageUser)
        {
          var UserData = {"username": user.username, "user_id": user.id, "full_name": user.full_name, "user_pic_url": user.profile_pic_url};
          callback(UserData);
          return;
        }
    }  
  }
  callback(null);
}

function RetriveCurrentUserInfo(user_id)
{
  var variables = {};
  variables.user_id = user_id;
  variables.include_reel = true

  var userurl = "https://www.instagram.com/graphql/query/?query_hash=50c4cc299a5ed4c38421f66dbbf0e3d0&variables=" + JSON.stringify(variables);

  $.ajax({
    url: userurl,
    method: "GET",
  })
  .done(function(response)
  {
    if(response.data.user.reel.user)
    {
      var user = response.data.user.reel.user;
      CurrentUser.user_id = user.id;
      CurrentUser.user_pic_url = user.profile_pic_url;
      CurrentUser.username = user.username;
      SendMessage("CurrentUserUpdate", "User", CurrentUser);
    }
    else
    {
      SendMessage("CurrentUserUpdate", "User", null);
    }
    
  }); 
}
