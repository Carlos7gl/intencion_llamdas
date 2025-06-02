const express = require('express');
const fs = require('fs').promises;
const axios = require('axios');
const OpenAI = require('openai'); // Added OpenAI

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI client
// IMPORTANT: Replace 'YOUR_OPENAI_API_KEY' with your actual key or use environment variables.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY', // Use environment variable or placeholder
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Call Intent Analyzer is running!');
});

const getTranscription = async (callId) => {
  console.log(`Fetching transcription for ${callId}...`);
  try {
    const match = callId.match(/\d+/);
    const postId = match ? match[0] : '1';
    const response = await axios.get(`https://jsonplaceholder.typicode.com/posts/${postId}`);
    const transcription = response.data && response.data.title ? response.data.title : `No transcription found for ${callId}.`;
    console.log(`Transcription for ${callId}: "${transcription}"`);
    return transcription;
  } catch (error) {
    console.error(`Error fetching transcription for ${callId}:`, error.message);
    return `Failed to fetch transcription for ${callId}.`;
  }
};

const getIntent = async (transcription) => {
  console.log(`Getting intent for transcription: "${transcription.substring(0, 50)}..."`);
  if (transcription.startsWith('Failed to fetch transcription')) {
    return 'Could not determine intent due to transcription failure.';
  }
  try {
    const prompt = `Analyze the following call transcription and identify the primary intent of the customer. Summarize the intent in a few words. Transcription: "${transcription}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert in analyzing call center transcriptions to find customer intent." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 50,
    });

    const intent = completion.choices[0]?.message?.content?.trim() || 'No intent identified.';
    console.log(`Intent for "${transcription.substring(0, 30)}...": ${intent}`);
    return intent;
  } catch (error) {
    console.error('Error getting intent from OpenAI:', error.message);
    if (error.response && error.response.data) {
      console.error('OpenAI API Error Details:', error.response.data);
    }
    return 'Failed to get intent from OpenAI.';
  }
};

app.post('/process-calls', async (req, res) => {
  try {
    // Check for placeholder API key before processing
    if (openai.apiKey === 'YOUR_OPENAI_API_KEY') {
        console.warn('OpenAI API key is using a placeholder. Please configure it for actual intent analysis.');
        // Optionally, you could prevent processing or return a specific message
        // For now, we'll proceed but the OpenAI call will likely fail or be restricted.
    }

    const data = await fs.readFile('call_ids.json', 'utf8');
    const { callIds } = JSON.parse(data);

    if (!callIds || !Array.isArray(callIds)) {
      return res.status(400).json({ message: 'Invalid format in call_ids.json. Expected an object with a "callIds" array.' });
    }

    console.log('Processing call IDs:', callIds);
    const results = [];

    for (const callId of callIds) {
      const transcription = await getTranscription(callId);
      const intent = await getIntent(transcription);
      results.push({ callId, transcription, intent });
      // console.log(`Processed ${callId}: Intent - ${intent}`); // Logged within getIntent now
    }

    res.json({ message: 'Successfully processed all calls.', results });

  } catch (error) {
    console.error('Error processing calls:', error);
    if (error.code === 'ENOENT') {
      return res.status(500).json({ message: 'Error: call_ids.json not found.' });
    }
    res.status(500).json({ message: 'Error processing calls.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
