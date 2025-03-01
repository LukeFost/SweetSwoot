mod declarations;
mod service;
mod user_profile;
mod video_metadata;
mod watch_event;
mod tip_record;
mod comment;
mod follow_relationship;

use candid::Principal;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;
use user_profile::UserProfile;
use video_metadata::VideoMetadata;
use watch_event::WatchEventList;
use tip_record::TipRecordList;
use comment::CommentList;
use follow_relationship::{FollowRelationship, FollowRelationshipList};

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USER_PROFILES: RefCell<StableBTreeMap<String, UserProfile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
        )
    );

    static VIDEOS: RefCell<StableBTreeMap<String, VideoMetadata, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))),
        )
    );

    static WATCH_LOG: RefCell<StableBTreeMap<String, WatchEventList, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))),
        )
    );

    static TIP_RECORDS: RefCell<StableBTreeMap<String, TipRecordList, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))),
        )
    );

    static COMMENTS: RefCell<StableBTreeMap<String, CommentList, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))),
        )
    );

    static FOLLOW_RELATIONSHIPS: RefCell<StableBTreeMap<String, FollowRelationshipList, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5))),
        )
    );
}

// Search API
#[ic_cdk::query]
fn search_videos(
    query: String,
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    service::search::search_videos(query, limit, offset)
}

#[ic_cdk::query]
fn search_videos_by_tags(
    tags: Vec<String>,
    limit: Option<u32>,
    offset: Option<u32>
) -> Vec<VideoMetadata> {
    service::search::search_videos_by_tags(tags, limit, offset)
}
