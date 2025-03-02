use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{api::{self, management_canister::http_request::{
    HttpResponse, TransformArgs, TransformContext, HttpHeader, HttpMethod, CanisterHttpRequestArgument,
}}};
use ic_cdk_macros::{update, query};
use serde_bytes::ByteBuf;
use num_traits::cast::ToPrimitive;
use std::cell::RefCell;

// Global variable to store the JWT
thread_local! {
    static PINATA_JWT: RefCell<Option<String>> = RefCell::new(None);
}

#[derive(CandidType, Deserialize, Debug)]
pub struct IPFSProxyResult {
    content: ByteBuf,
    content_type: String,
    status_code: u16,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct IPFSProxyError {
    message: String,
    status_code: u16,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum IPFSProxyResponse {
    Ok(IPFSProxyResult),
    Err(IPFSProxyError),
}

/// Proxy a request to IPFS (Pinata) with authentication to bypass CORS
#[update]
pub async fn proxy_ipfs_content(cid: String) -> IPFSProxyResponse {
    // Build the URL for the Pinata gateway
    let gateway_domain = "salmon-worthy-hawk-798.mypinata.cloud";
    let url = format!("https://{}/ipfs/{}", gateway_domain, cid);
    
    // Get Pinata JWT from thread local storage
    let pinata_jwt = match PINATA_JWT.with(|jwt| jwt.borrow().clone()) {
        Some(jwt) => jwt,
        None => {
            return IPFSProxyResponse::Err(IPFSProxyError {
                message: "Pinata JWT not configured".to_string(),
                status_code: 500,
            })
        }
    };
    
    // Add authentication headers
    let request_headers = vec![
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", pinata_jwt),
        },
        HttpHeader {
            name: "Accept".to_string(),
            value: "*/*".to_string(),
        },
    ];
    
    // Create HTTP request
    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(10 * 1024 * 1024), // 10MB limit
        transform: Some(TransformContext::from_name(
            "transform_ipfs_response".to_string(), 
            vec![]
        )),
        headers: request_headers,
    };
    
    // Make HTTP request to Pinata
    match api::management_canister::http_request::http_request(request, 60_000_000_000).await {
        Ok((response,)) => {
            // Convert status to u32 for comparison
            let status_code = response.status.0.to_u32().unwrap_or(0);
            
            if status_code >= 200 && status_code < 300 {
                // Determine content type from response headers or default to binary
                let content_type = response.headers.iter()
                    .find(|h| h.name.to_lowercase() == "content-type")
                    .map(|h| h.value.clone())
                    .unwrap_or_else(|| "application/octet-stream".to_string());
                
                // Convert BigUint status code to u16
                let status_code = u16::try_from(response.status.0.to_u32().unwrap_or(0))
                    .unwrap_or(0);
                
                IPFSProxyResponse::Ok(IPFSProxyResult {
                    content: ByteBuf::from(response.body),
                    content_type,
                    status_code,
                })
            } else {
                // Convert BigUint status code to u16
                let status_code = u16::try_from(response.status.0.to_u32().unwrap_or(0))
                    .unwrap_or(0);
                
                // Handle error status codes
                IPFSProxyResponse::Err(IPFSProxyError {
                    message: format!("IPFS request failed with status: {}", response.status.0),
                    status_code,
                })
            }
        },
        Err((code, msg)) => {
            IPFSProxyResponse::Err(IPFSProxyError {
                message: format!("HTTP request error: {:?} - {}", code, msg),
                status_code: 500,
            })
        }
    }
}

/// Function to transform the IPFS response
fn transform_ipfs_response(args: TransformArgs) -> HttpResponse {
    // Pass through the response
    args.response
}

/// Get the Pinata JWT environment variable
#[query]
pub fn has_pinata_jwt_configured() -> bool {
    PINATA_JWT.with(|jwt| jwt.borrow().is_some())
}

/// Set the Pinata JWT environment variable (admin only)
#[update]
pub fn set_pinata_jwt(jwt: String, _caller: Principal) -> Result<(), String> {
    // In a real implementation, you'd check if caller is an admin
    // This is a simplified example
    let is_admin = true; // Replace with actual admin check
    
    if !is_admin {
        return Err("Only admins can set the Pinata JWT".to_string());
    }
    
    PINATA_JWT.with(|j| {
        *j.borrow_mut() = Some(jwt);
    });
    Ok(())
}
