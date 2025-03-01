export const idlFactory = ({ IDL }) => {
  const VideoId = IDL.Text;
  const Title = IDL.Text;
  const Tag = IDL.Text;
  const StorageRef = IDL.Text;
  const Principal = IDL.Principal;
  const VideoMetadata = IDL.Record({
    'title' : IDL.Text,
    'uploader_principal' : Principal,
    'storage_ref' : IDL.Opt(StorageRef),
    'tags' : IDL.Vec(Tag),
    'timestamp' : IDL.Nat64,
    'video_id' : IDL.Text,
  });
  const VideoMetadataResponse = IDL.Variant({
    'Ok' : VideoMetadata,
    'Err' : IDL.Text,
  });
  const EmptyResponse = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const Comment = IDL.Record({
    'commenter_principal' : Principal,
    'text' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'video_id' : IDL.Text,
  });
  const UserProfile = IDL.Record({
    'evm_address' : IDL.Text,
    'avatar_url' : IDL.Text,
    'name' : IDL.Text,
  });
  const GetMyProfileResponse = IDL.Variant({
    'Ok' : UserProfile,
    'Err' : IDL.Text,
  });
  const TipRecord = IDL.Record({
    'from_addr' : IDL.Text,
    'to_addr' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'tx_hash' : IDL.Text,
    'amount' : IDL.Nat64,
    'video_id' : IDL.Text,
  });
  const WatchEvent = IDL.Record({
    'user_principal' : Principal,
    'watch_duration_sec' : IDL.Nat32,
    'completed' : IDL.Bool,
    'liked' : IDL.Bool,
    'timestamp' : IDL.Nat64,
    'video_id' : IDL.Text,
  });
  const VideoAnalytics = IDL.Record({
    'total_likes' : IDL.Nat64,
    'total_unique_viewers' : IDL.Nat64,
    'total_views' : IDL.Nat64,
    'avg_watch_duration' : IDL.Nat64,
    'total_completions' : IDL.Nat64,
  });
  const VideoAnalyticsResponse = IDL.Variant({
    'Ok' : VideoAnalytics,
    'Err' : IDL.Text,
  });
  const ListProfilesResponse = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Text, UserProfile)),
    'Err' : IDL.Text,
  });
  const Text = IDL.Text;
  const CommentResponse = IDL.Variant({ 'Ok' : Comment, 'Err' : IDL.Text });
  const TxHash = IDL.Text;
  const TipRecordResponse = IDL.Variant({ 'Ok' : TipRecord, 'Err' : IDL.Text });
  const Name = IDL.Text;
  const AvatarUrl = IDL.Text;
  const SaveMyProfileResponse = IDL.Variant({
    'Ok' : UserProfile,
    'Err' : IDL.Text,
  });
  return IDL.Service({
    'create_video_metadata' : IDL.Func(
        [VideoId, Title, IDL.Vec(Tag), IDL.Opt(StorageRef)],
        [VideoMetadataResponse],
        [],
      ),
    'delete_comment' : IDL.Func([VideoId, IDL.Nat64], [EmptyResponse], []),
    'delete_video' : IDL.Func([VideoId], [EmptyResponse], []),
    'follow_user' : IDL.Func([Principal], [EmptyResponse], []),
    'get_comments' : IDL.Func([VideoId], [IDL.Vec(Comment)], ['query']),
    'get_followers' : IDL.Func([Principal], [IDL.Vec(Principal)], ['query']),
    'get_following' : IDL.Func([Principal], [IDL.Vec(Principal)], ['query']),
    'get_my_comments' : IDL.Func([], [IDL.Vec(Comment)], ['query']),
    'get_my_profile' : IDL.Func([], [GetMyProfileResponse], ['query']),
    'get_my_received_tips' : IDL.Func([], [IDL.Vec(TipRecord)], ['query']),
    'get_my_sent_tips' : IDL.Func([], [IDL.Vec(TipRecord)], ['query']),
    'get_my_watch_events' : IDL.Func([], [IDL.Vec(WatchEvent)], ['query']),
    'get_tips_for_video' : IDL.Func([VideoId], [IDL.Vec(TipRecord)], ['query']),
    'get_video_analytics' : IDL.Func(
        [VideoId],
        [VideoAnalyticsResponse],
        ['query'],
      ),
    'get_video_metadata' : IDL.Func(
        [VideoId],
        [VideoMetadataResponse],
        ['query'],
      ),
    'get_watch_events' : IDL.Func([VideoId], [IDL.Vec(WatchEvent)], ['query']),
    'is_following' : IDL.Func([Principal, Principal], [IDL.Bool], ['query']),
    'list_all_videos' : IDL.Func([], [IDL.Vec(VideoMetadata)], ['query']),
    'list_profiles' : IDL.Func([], [ListProfilesResponse], ['query']),
    'list_videos_by_tag' : IDL.Func([Tag], [IDL.Vec(VideoMetadata)], ['query']),
    'list_videos_by_uploader' : IDL.Func(
        [Principal],
        [IDL.Vec(VideoMetadata)],
        ['query'],
      ),
    'log_watch_event' : IDL.Func(
        [VideoId, IDL.Nat32, IDL.Bool, IDL.Bool],
        [EmptyResponse],
        [],
      ),
    'post_comment' : IDL.Func([VideoId, Text], [CommentResponse], []),
    'record_tip' : IDL.Func(
        [VideoId, IDL.Nat64, TxHash],
        [TipRecordResponse],
        [],
      ),
    'save_my_profile' : IDL.Func(
        [Name, AvatarUrl],
        [SaveMyProfileResponse],
        [],
      ),
    'search_videos' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)],
        [IDL.Vec(VideoMetadata)],
        ['query'],
      ),
    'search_videos_by_tags' : IDL.Func(
        [IDL.Vec(IDL.Text), IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)],
        [IDL.Vec(VideoMetadata)],
        ['query'],
      ),
    'unfollow_user' : IDL.Func([Principal], [EmptyResponse], []),
    'update_video_metadata' : IDL.Func(
        [VideoId, IDL.Opt(Title), IDL.Opt(IDL.Vec(Tag)), IDL.Opt(StorageRef)],
        [VideoMetadataResponse],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
