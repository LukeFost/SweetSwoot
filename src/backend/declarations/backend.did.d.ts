import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AvatarUrl = string;
export interface Comment {
  'commenter_principal' : Principal,
  'text' : string,
  'timestamp' : bigint,
  'video_id' : string,
}
export type CommentResponse = { 'Ok' : Comment } |
  { 'Err' : string };
export type EmptyResponse = { 'Ok' : null } |
  { 'Err' : string };
export type GetMyProfileResponse = { 'Ok' : UserProfile } |
  { 'Err' : string };
export interface IPFSProxyError { 'message' : string, 'status_code' : number }
export type IPFSProxyResponse = { 'Ok' : IPFSProxyResult } |
  { 'Err' : IPFSProxyError };
export interface IPFSProxyResult {
  'content' : Uint8Array | number[],
  'content_type' : string,
  'status_code' : number,
}
export type ListProfilesResponse = { 'Ok' : Array<[string, UserProfile]> } |
  { 'Err' : string };
export type Name = string;
export type Principal = Principal;
export type SaveMyProfileResponse = { 'Ok' : UserProfile } |
  { 'Err' : string };
export type StorageRef = string;
export type Tag = string;
export type Text = string;
export interface TipRecord {
  'from_addr' : string,
  'to_addr' : string,
  'timestamp' : bigint,
  'tx_hash' : string,
  'amount' : bigint,
  'video_id' : string,
}
export type TipRecordResponse = { 'Ok' : TipRecord } |
  { 'Err' : string };
export type Title = string;
export type TxHash = string;
export interface UserProfile {
  'evm_address' : string,
  'avatar_url' : string,
  'name' : string,
}
export interface VideoAnalytics {
  'total_likes' : bigint,
  'total_unique_viewers' : bigint,
  'total_views' : bigint,
  'avg_watch_duration' : bigint,
  'total_completions' : bigint,
}
export type VideoAnalyticsResponse = { 'Ok' : VideoAnalytics } |
  { 'Err' : string };
export type VideoId = string;
export interface VideoMetadata {
  'title' : string,
  'uploader_principal' : Principal,
  'storage_ref' : [] | [StorageRef],
  'tags' : Array<Tag>,
  'timestamp' : bigint,
  'video_id' : string,
}
export type VideoMetadataResponse = { 'Ok' : VideoMetadata } |
  { 'Err' : string };
export interface WatchEvent {
  'user_principal' : Principal,
  'watch_duration_sec' : number,
  'completed' : boolean,
  'liked' : boolean,
  'timestamp' : bigint,
  'video_id' : string,
}
export interface _SERVICE {
  'create_video_metadata' : ActorMethod<
    [VideoId, Title, Array<Tag>, [] | [StorageRef]],
    VideoMetadataResponse
  >,
  'delete_comment' : ActorMethod<[VideoId, bigint], EmptyResponse>,
  'delete_video' : ActorMethod<[VideoId], EmptyResponse>,
  'follow_user' : ActorMethod<[Principal], EmptyResponse>,
  'get_comments' : ActorMethod<[VideoId], Array<Comment>>,
  'get_followers' : ActorMethod<[Principal], Array<Principal>>,
  'get_following' : ActorMethod<[Principal], Array<Principal>>,
  'get_my_comments' : ActorMethod<[], Array<Comment>>,
  'get_my_profile' : ActorMethod<[], GetMyProfileResponse>,
  'get_my_received_tips' : ActorMethod<[], Array<TipRecord>>,
  'get_my_sent_tips' : ActorMethod<[], Array<TipRecord>>,
  'get_my_watch_events' : ActorMethod<[], Array<WatchEvent>>,
  'get_tips_for_video' : ActorMethod<[VideoId], Array<TipRecord>>,
  'get_video_analytics' : ActorMethod<[VideoId], VideoAnalyticsResponse>,
  'get_video_metadata' : ActorMethod<[VideoId], VideoMetadataResponse>,
  'get_watch_events' : ActorMethod<[VideoId], Array<WatchEvent>>,
  'has_pinata_jwt_configured' : ActorMethod<[], boolean>,
  'is_following' : ActorMethod<[Principal, Principal], boolean>,
  'list_all_videos' : ActorMethod<[], Array<VideoMetadata>>,
  'list_profiles' : ActorMethod<[], ListProfilesResponse>,
  'list_videos_by_tag' : ActorMethod<[Tag], Array<VideoMetadata>>,
  'list_videos_by_uploader' : ActorMethod<[Principal], Array<VideoMetadata>>,
  'log_watch_event' : ActorMethod<
    [VideoId, number, boolean, boolean],
    EmptyResponse
  >,
  'post_comment' : ActorMethod<[VideoId, Text], CommentResponse>,
  'proxy_ipfs_content' : ActorMethod<[string], IPFSProxyResponse>,
  'record_tip' : ActorMethod<[VideoId, bigint, TxHash], TipRecordResponse>,
  'save_my_profile' : ActorMethod<[Name, AvatarUrl], SaveMyProfileResponse>,
  'search_videos' : ActorMethod<
    [string, [] | [number], [] | [number]],
    Array<VideoMetadata>
  >,
  'search_videos_by_tags' : ActorMethod<
    [Array<string>, [] | [number], [] | [number]],
    Array<VideoMetadata>
  >,
  'set_pinata_jwt' : ActorMethod<
    [string, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'unfollow_user' : ActorMethod<[Principal], EmptyResponse>,
  'update_video_metadata' : ActorMethod<
    [VideoId, [] | [Title], [] | [Array<Tag>], [] | [StorageRef]],
    VideoMetadataResponse
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
