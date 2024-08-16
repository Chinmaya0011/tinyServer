// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');

const app = express();

// Use the environment variables for configuration
const port = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000'; // Default to localhost if BASE_URL is not set

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define a URL model
const UrlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: String,
  userName: String,
  linkType: String,
  clickCount: { type: Number, default: 0 },
  clicks: [{ ip: String, timestamp: Date }],
});

const Url = mongoose.model('Url', UrlSchema);

// Optionally, define a Click model for separate tracking
const ClickSchema = new mongoose.Schema({
  shortUrl: String,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const Click = mongoose.model('Click', ClickSchema);

// Create a new shortened URL
app.post('/shorten', async (req, res) => {
  const { originalUrl, userName, linkType } = req.body;
  if (!originalUrl || !userName || !linkType) {
    return res.status(400).send('Original URL, username, and link type are required');
  }

  const shortUrl = `${userName}-${linkType}-${shortid.generate()}`;
  const newUrl = new Url({ originalUrl, shortUrl, userName, linkType });
  await newUrl.save();

  res.json({ shortUrl: `${baseUrl}/${shortUrl}` }); // Updated URL
});

// Redirect from short URL to original URL
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // Get the user's IP address
  const url = await Url.findOne({ shortUrl });

  if (!url) {
    return res.status(404).send('URL not found');
  }

  // Record the click
  url.clickCount += 1;
  url.clicks.push({ ip, timestamp: new Date() });
  await url.save();

  // Optionally, store click data separately
  const newClick = new Click({ shortUrl, ip });
  await newClick.save();

  res.redirect(url.originalUrl);
});

// Endpoint to view click statistics for a specific shortened URL
app.get('/stats/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const url = await Url.findOne({ shortUrl });

  if (!url) {
    return res.status(404).send('URL not found');
  }

  res.json({
    shortUrl: url.shortUrl,
    originalUrl: url.originalUrl,
    clickCount: url.clickCount,
    clicks: url.clicks // or return only necessary fields
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at ${baseUrl}`);
});
