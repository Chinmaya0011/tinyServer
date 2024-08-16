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

app.use(express.json());
app.use(cors());

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define a URL model
const UrlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: String,
  userName: String,
  linkType: String,
});

const Url = mongoose.model('Url', UrlSchema);

// Create a new shortened URL
app.post('/shorten', async (req, res) => {
  const { originalUrl, userName, linkType } = req.body;
  if (!originalUrl || !userName || !linkType) {
    return res.status(400).send('Original URL, username, and link type are required');
  }

  const shortUrl = `${userName}-${linkType}-${shortid.generate()}`;
  const newUrl = new Url({ originalUrl, shortUrl, userName, linkType });
  await newUrl.save();

  res.json({ shortUrl: `http://localhost:${port}/${shortUrl}` });
});

// Redirect from short URL to original URL
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const url = await Url.findOne({ shortUrl });

  if (!url) {
    return res.status(404).send('URL not found');
  }

  res.redirect(url.originalUrl);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
