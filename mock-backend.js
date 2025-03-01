import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 55662;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Sample data
let videos = [
  {
    video_id: "video1",
    uploader_principal: "2vxsx-fae",
    tags: ["funny", "short"],
    title: "Big Buck Bunny",
    storage_ref: ["livepeer:dev-pb-1"],
    timestamp: BigInt(Date.now() - 1000000).toString()
  },
  {
    video_id: "video2",
    uploader_principal: "2vxsx-fae",
    tags: ["music", "dance"],
    title: "Elephant's Dream",
    storage_ref: ["livepeer:dev-pb-2"],
    timestamp: BigInt(Date.now() - 2000000).toString()
  },
  {
    video_id: "video3",
    uploader_principal: "2vxsx-fae",
    tags: ["tutorial", "tech"],
    title: "Sintel",
    storage_ref: ["livepeer:dev-pb-3"],
    timestamp: BigInt(Date.now() - 3000000).toString()
  },
  {
    video_id: "video4",
    uploader_principal: "2vxsx-fae",
    tags: ["nature", "documentary"],
    title: "Tears of Steel",
    storage_ref: ["livepeer:dev-pb-4"],
    timestamp: BigInt(Date.now() - 4000000).toString()
  }
];

// Routes
app.get('/', (req, res) => {
  res.send('Mock IC Backend Server');
});

// List all videos
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// Get video by ID
app.get('/api/videos/:id', (req, res) => {
  const video = videos.find(v => v.video_id === req.params.id);
  if (video) {
    res.json({ Ok: video });
  } else {
    res.json({ Err: "Video not found" });
  }
});

// Create video
app.post('/api/videos', (req, res) => {
  const { title, tags, storage_ref } = req.body;
  const video_id = uuidv4();
  
  const newVideo = {
    video_id,
    uploader_principal: "2vxsx-fae",
    tags: tags || [],
    title: title || "Untitled Video",
    storage_ref: storage_ref ? [storage_ref] : ["livepeer:dev-pb-" + Date.now()],
    timestamp: BigInt(Date.now()).toString()
  };
  
  videos.push(newVideo);
  res.json({ Ok: newVideo });
});

// List videos by tag
app.get('/api/videos/tag/:tag', (req, res) => {
  const filteredVideos = videos.filter(v => v.tags.includes(req.params.tag));
  res.json(filteredVideos);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock backend server running at http://localhost:${PORT}`);
});