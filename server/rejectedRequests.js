// Track rejected teacher requests (especially for Google Sheets requests that can't be modified)
const { db } = require('./firebaseAdmin');

const REJECTED_COLLECTION = 'rejected_requests';

/**
 * Mark a request as rejected in Firestore
 * @param {string} requestId - The request ID (can be from Google Sheets or Firestore)
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Result object
 */
async function markAsRejected(requestId, reason = '') {
  console.log(`[RejectedRequests] markAsRejected called with requestId: ${requestId}`);
  
  try {
    if (!db) {
      console.error('[RejectedRequests] Firestore not initialized - db is null');
      return { ok: false, error: 'Firestore not initialized' };
    }
    
    console.log(`[RejectedRequests] Writing to collection: ${REJECTED_COLLECTION}, doc: ${requestId}`);
    
    await db.collection(REJECTED_COLLECTION).doc(requestId).set({
      requestId,
      rejectedAt: new Date().toISOString(),
      reason,
      source: requestId.startsWith('sheet_') ? 'google_sheets' : 'firestore'
    });
    
    console.log(`[RejectedRequests] ✅ Successfully marked ${requestId} as rejected`);
    return { ok: true, message: 'Request marked as rejected' };
  } catch (error) {
    console.error('[RejectedRequests] ❌ Error marking as rejected:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Check if a request is rejected
 * @param {string} requestId - The request ID
 * @returns {Promise<boolean>} True if rejected
 */
async function isRejected(requestId) {
  try {
    if (!db) return false;
    const doc = await db.collection(REJECTED_COLLECTION).doc(requestId).get();
    return doc.exists;
  } catch (error) {
    console.error('[RejectedRequests] Error checking rejected status:', error);
    return false;
  }
}

/**
 * Filter out rejected requests from a list
 * @param {Array} requests - Array of request objects with 'id' property
 * @returns {Promise<Array>} Filtered array without rejected requests
 */
async function filterRejected(requests) {
  try {
    if (!db) {
      console.warn('[RejectedRequests] Firestore not initialized, returning all requests');
      return requests;
    }
    
    const rejectedDocs = await db.collection(REJECTED_COLLECTION).get();
    const rejectedIds = new Set();
    
    rejectedDocs.forEach(doc => {
      rejectedIds.add(doc.id);
    });
    
    const filtered = requests.filter(req => !rejectedIds.has(req.id));
    
    console.log(`[RejectedRequests] Filtered ${requests.length - filtered.length} rejected requests out of ${requests.length} total`);
    return filtered;
  } catch (error) {
    console.error('[RejectedRequests] Error filtering rejected:', error);
    return requests; // Return all if error
  }
}

/**
 * Get all rejected requests
 * @returns {Promise<Array>} Array of rejected request IDs
 */
async function getRejectedRequests() {
  try {
    if (!db) return [];
    
    const snapshot = await db.collection(REJECTED_COLLECTION).get();
    
    const rejected = [];
    snapshot.forEach(doc => {
      rejected.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return rejected;
  } catch (error) {
    console.error('[RejectedRequests] Error getting rejected requests:', error);
    return [];
  }
}

module.exports = {
  markAsRejected,
  isRejected,
  filterRejected,
  getRejectedRequests
};
