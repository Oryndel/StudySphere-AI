// --- 3. VIDEO FEED DISPLAY ---

const videosContainer = document.getElementById('videos-container');

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    // Use video.processedUrl or video.originalUrl from Firestore
    const videoHTML = `
        <h3>${video.title}</h3>
        <p>Creator: <strong>${video.creatorName || 'Unknown'}</strong></p>
        <video width="320" height="180" controls>
            <source src="${video.originalUrl || ''}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="interactions">
            <button class="like-button" data-video-id="${video.id}">
                👍 Like (${video.likes || 0})
            </button>
            <span> | Views: ${video.views || 0}</span>
        </div>
        <hr>
    `;
    card.innerHTML = videoHTML;
    return card;
}


// Real-time listener to fetch and display videos
function setupVideoFeedListener() {
    const videosRef = db.collection('videos').orderBy('createdAt', 'desc');

    videosRef.onSnapshot(snapshot => {
        videosContainer.innerHTML = ''; // Clear existing videos
        if (snapshot.empty) {
            videosContainer.innerHTML = '<p>No videos found. Be the first to upload!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const videoData = { id: doc.id, ...doc.data() };
            const card = createVideoCard(videoData);
            videosContainer.appendChild(card);
        });
        
        // After rendering, attach listeners to the new Like buttons
        attachLikeListeners();

    }, error => {
        console.error("Error setting up video feed listener:", error);
        document.getElementById('loading-message').textContent = 'Error loading videos.';
    });
}

// --- 4. LIKE FUNCTIONALITY (Connects to VERCEL) ---

function attachLikeListeners() {
    document.querySelectorAll('.like-button').forEach(button => {
        button.onclick = async (event) => {
            const videoId = event.currentTarget.dataset.videoId;
            
            // NOTE: Add user authentication checks here (e.g., if user is logged in)

            try {
                // Call the Vercel API endpoint
                const response = await fetch(`${VERCEL_API_BASE_URL}/api/likeVideo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId: videoId })
                });

                if (!response.ok) {
                    throw new Error('Backend failed to process the like.');
                }
                // Firestore listener handles the UI update, no manual update needed here
                console.log(`Liked video: ${videoId}`);

            } catch (error) {
                console.error("Error calling Vercel API for like:", error);
                alert("Failed to like video. See console for details.");
            }
        };
    });
}
