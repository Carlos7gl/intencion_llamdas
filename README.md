# Call Intent Analyzer

This Node.js application uses Express.js to read call identifiers from a JSON file, fetch their transcriptions from a (mock) REST API, and then use the OpenAI API to determine the client's intent from each transcription.

## Prerequisites

*   Node.js (v14 or later recommended)
*   npm (usually comes with Node.js)
*   An OpenAI API Key (if you want to use the actual OpenAI service)

## Setup

1.  **Clone the repository (if applicable) or download the files.**
2.  **Navigate to the project directory:**
    ```bash
    cd path/to/call-intent-analyzer
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Configure Environment Variables (Optional but Recommended):**
    Create a `.env` file in the root of the project to store your OpenAI API Key. You can use a package like `dotenv` to load these variables automatically, or set them in your environment.

    Example `.env` file:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    If you don't use a `.env` file or environment variables, you'll need to replace the placeholder `'YOUR_OPENAI_API_KEY'` directly in `app.js` (not recommended for production).

    The application currently uses a placeholder for the transcription API: `https://jsonplaceholder.typicode.com/posts/:id`.

## Running the Application

1.  **Start the server:**
    ```bash
    npm start
    ```
    Or directly using node:
    ```bash
    node app.js
    ```
    The server will start on port 3000 by default (or the port specified by the `PORT` environment variable).

2.  **Trigger call processing:**
    Make a POST request to the `/process-calls` endpoint. You can use tools like `curl` or Postman.
    ```bash
    curl -X POST http://localhost:3000/process-calls
    ```

## Input File

The application reads call identifiers from `call_ids.json`. Make sure this file exists in the root directory and has the following format:

```json
{
  "callIds": [
    "call_12345",
    "call_67890",
    "call_abcde"
  ]
}
```

## How it Works

1.  The `/process-calls` endpoint is triggered.
2.  `call_ids.json` is read to get a list of call identifiers.
3.  For each call ID:
    *   `getTranscription(callId)`: Makes a GET request to `https://jsonplaceholder.typicode.com/posts/:id` (using a number extracted from `callId` or '1' as `:id`). The `title` field of the response is used as the mock transcription.
    *   `getIntent(transcription)`: Sends the transcription to the OpenAI API (`gpt-3.5-turbo` model by default) with a prompt to determine the customer's intent.
4.  The results (call ID, transcription, intent) for all calls are returned as a JSON response.

## Placeholders & Customization

*   **Transcription API:** The `getTranscription` function currently uses `https://jsonplaceholder.typicode.com`. You'll need to modify this function to point to your actual transcription API and handle its specific request/response format.
*   **OpenAI API Key:** Ensure your `OPENAI_API_KEY` is correctly set up either as an environment variable or by replacing the placeholder in `app.js`.
*   **OpenAI Prompt & Model:** The prompt and model (`gpt-3.5-turbo`) used in `getIntent` can be customized to better suit your needs.
```
