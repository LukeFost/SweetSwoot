use ic_cdk::{query, update};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    tip_record::{TipRecord, TipRecordList}, 
    TIP_RECORDS, 
    VIDEOS, 
    USER_PROFILES,
    service::save_my_profile::get_address
};

/// Records a tip transaction for a video
#[update]
async fn record_tip(
    video_id: String,
    amount: u64,
    tx_hash: String
) -> Result<TipRecord, String> {
    // Verify the video exists
    let to_addr = VIDEOS.with(|videos| {
        let videos_map = videos.borrow();
        if !videos_map.contains_key(&video_id) {
            return Err("Video not found".to_string());
        }
        
        // Get the video's uploader principal
        let uploader_principal = videos_map.get(&video_id).unwrap().uploader_principal;
        
        // Look up the uploader's address from user profiles
        USER_PROFILES.with(|profiles| {
            profiles
                .borrow()
                .get(&uploader_principal.to_string())
                .map(|profile| profile.evm_address.clone())
                .ok_or("Video uploader has no profile with EVM address".to_string())
        })
    })?;
    
    // Get the tipper's address
    let from_addr = get_address().await?;
    
    // Generate timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();
    
    // Create tip record
    let tip = TipRecord {
        from_addr,
        to_addr,
        video_id: video_id.clone(),
        amount,
        tx_hash,
        timestamp,
    };
    
    // Store tip record
    TIP_RECORDS.with(|tips| {
        let mut tips_map = tips.borrow_mut();
        let tip_records = match tips_map.get(&video_id) {
            Some(record_list) => {
                let mut records = record_list.0.clone();
                records.push(tip.clone());
                TipRecordList(records)
            }
            None => TipRecordList(vec![tip.clone()]),
        };
        tips_map.insert(video_id, tip_records);
        Ok(tip)
    })
}

/// Gets tips for a specific video
#[query]
fn get_tips_for_video(video_id: String) -> Vec<TipRecord> {
    TIP_RECORDS.with(|tips| {
        tips.borrow()
            .get(&video_id)
            .map(|record_list| record_list.0.clone())
            .unwrap_or_default()
    })
}

/// Gets all tips sent by the calling user
#[query]
async fn get_my_sent_tips() -> Result<Vec<TipRecord>, String> {
    let my_addr = get_address().await?;
    
    Ok(TIP_RECORDS.with(|tips| {
        tips.borrow()
            .iter()
            .flat_map(|(_, record_list)| record_list.0.clone())
            .filter(|record| record.from_addr == my_addr)
            .collect()
    }))
}

/// Gets all tips received by the calling user
#[query]
async fn get_my_received_tips() -> Result<Vec<TipRecord>, String> {
    let my_addr = get_address().await?;
    
    Ok(TIP_RECORDS.with(|tips| {
        tips.borrow()
            .iter()
            .flat_map(|(_, record_list)| record_list.0.clone())
            .filter(|record| record.to_addr == my_addr)
            .collect()
    }))
}