const express = require('express');
const fs = require('fs').promises;
const axios = require('axios');
const OpenAI = require('openai'); // Added OpenAI

const app = express();

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // Optional: specify views directory, default is 'views'

const port = process.env.PORT || 3000;

// Initialize OpenAI client
// IMPORTANT: Replace 'YOUR_OPENAI_API_KEY' with your actual key or use environment variables.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY', // Use environment variable or placeholder
});

app.use(express.json());

app.get('/', (req, res) => {
  res.render('status', {
    title: 'Call Intent Analyzer Status',
    currentTime: new Date().toLocaleString()
  });
});

const getTranscription = async (callId) => {
  console.log(`Fetching transcription for ${callId} from Ringover...`);

  const ringoverApiKey = process.env.RINGOVER_API_KEY;
  if (!ringoverApiKey) {
    console.warn('RINGOVER_API_KEY is not set. Cannot fetch transcription from Ringover.');
    return `Failed to fetch transcription for ${callId}: RINGOVER_API_KEY not configured.`;
  }

  try {
    const response = await axios.get(`https://public-api.ringover.com/v2/transcriptions/${callId}`, {
      headers: {
        'Authorization': `Bearer ${ringoverApiKey}`
      }
    });

    // Assuming the response data has a field like 'transcription_text' or similar
    // This might need adjustment based on the actual API response structure
    const transcription = response.data && response.data.transcription_text ? response.data.transcription_text : `No transcription content found for ${callId} in Ringover response.`;

    console.log(`Transcription for ${callId} from Ringover: "${transcription.substring(0, 50)}..."`);
    return transcription;
  } catch (error) {
    console.error(`Error fetching transcription for ${callId} from Ringover:`, error.message);
    if (error.response) {
      console.error('Ringover API Error Response:', error.response.status, error.response.data);
      return `Failed to fetch transcription for ${callId} from Ringover. Status: ${error.response.status}`;
    }
    return `Failed to fetch transcription for ${callId} from Ringover.`;
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
