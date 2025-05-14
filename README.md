# Auto call summarize with WhisperX and OpenAI API

A Node.js API server that transcribes audio files using WhisperX and generates conversation summaries through Grok AI.

## Features

- Upload audio file for transcription
- Process audio using WhisperX with speaker diarization
- Summarize conversations using OpenAI Compatible API
  

## Prerequisites

- Node.js 14+
- [WhisperX](https://github.com/m-bain/whisperX) installed and accessible from command line
- Hugging Face token for WhisperX
- Openai API(or compatible LLM API) access

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/whisperx-api.git
cd whisperx-api
```

2. Install dependencies:
```
npm install
```

## Configuration

Before running the server, update the following configuration in the code:

- Set your OpenAI compatible API endpoint and key
- Set Huggingface Token for transcribe
- Customize WhisperX parameters if needed

## Usage

1. Start the server:
```
npm start
```

2. Send a POST request to `/transcribe` endpoint with an audio file:
```
curl -X POST -F "file=@your_call_recording.mp3" http://localhost:3000/transcribe
```

3. (Optional) Can be used with android app Tasker, then fully automate call record summarization.

## API Endpoints

### POST /transcribe

**Description:** Uploads an audio file, transcribes it using WhisperX, and generates a summary using OpenAI API.

**Request:**
- Content-Type: `multipart/form-data`
- Form field: `file` (audio file)

**Response:**
```
{
  "success": true,
  "filename": "meeting.mp3",
  "transcription": "SPEAKER_00: Hello, my name is...",
  "summary": "In this conversation, (A) discusses project details with his colleague (B)..."
}
```

## How It Works

1. The server receives an audio file through the `/transcribe` endpoint
2. The file is temporarily stored in the `uploads` directory
3. WhisperX processes the audio file with Korean language setting and speaker diarization
4. The resulting transcription is read from the generated text file
5. The transcription is sent to OpenAI API for summarization
6. Both the transcription and summary are returned in the API response
7. Temporary files are cleaned up afterward

## Development

- To modify the WhisperX parameters, update the command string in the `exec` function call
- To customize the summarization prompt, modify the system message in the `summarizeWithLLM` function


