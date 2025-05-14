const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// ------------------------------------------------------------------------------------------
//                                     user settings
// ------------------------------------------------------------------------------------------

// PORT Setting
const PORT = 3000;

// OPENAI API Setting
const OPENAI_API_URL = 'https://api.openai.com/v1/'; // set API BASE URL
const OPENAI_API_KEY = 'sk-';
const model = 'gpt-4o-mini'; // set model

// HUGGINGFACE Setting
const HUGGINGFACE_TOKEN = '';

// WhisperX Setting
// supported language codes can be found here at line 39~. https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py
const LANGUAGE = null // set language code if needed


// ------------------------------------------------------------------------------------------
//                                         code
// ------------------------------------------------------------------------------------------

// OPENAI API를 사용하여 요약하는 함수
async function summarizeWithLLM(transcription) {
  try {
    const response = await axios.post(OPENAI_API_URL + 'chat/completions', {
      model,
      messages: [
        {
          role: 'system',
          content: 'SPEAKER_00과 SPEAKER_01의 대화야. SPEAKER_00을 A라 하고, SPEAKER_01을 B라 하여 이 대화를 간략히 요약해줘. 만약 대화 안에서 이름이나 관계성이 유추 가능할 경우, A와 B 대신 그 이름과 관계성을 사용하여 요약해줘. 요약문은 존대를 사용하지 않고 간결하고 정보 전달에 특화된 사무적인 어투로 작성할 것. 요약은 주어진 텍스트와 같은 언어로 작성해줘.'
        },
        {
          role: 'user',
          content: transcription
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OPENAI API error:', error);
    return 'summarization error';
  }
}

// 업로드 디렉토리 설정
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 일부 클라이언트에서 파일명이 Latin1으로 전송되는 것 같아서, 파일명이 latin1로 인코딩되었는지 확인 후 조건부 변환
    if (isLatin1Encoded(file.originalname)) {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    }

    cb(null, file.originalname);
  }
});

// Latin1으로 인코딩된 문자열인지 검사하는 함수
function isLatin1Encoded(str) {
  // UTF-8로 디코딩했을 때 원래 문자열과 다른지 확인
  const decoded = Buffer.from(str, 'latin1').toString('utf8');
  const reEncoded = Buffer.from(decoded, 'utf8').toString('latin1');
  
  // 한글 등 멀티바이트 문자가 포함된 경우 체크
  return str !== decoded && str === reEncoded;
}

const upload = multer({ storage });

// 녹음 파일 업로드 및 처리 API
app.post('/transcribe', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file not uploaded' });
  }

  const fileName = path.parse(req.file.originalname).name;
  const fileNameExt = req.file.originalname;
  const outputFile = `${fileName}.txt`;
  const outputPath = path.join(uploadDir, outputFile);

  // WhisperX 명령 실행
  const command = `cd ${uploadDir} && whisperx "${fileNameExt}" --model large-v3-turbo --diarize ${LANGUAGE ? "--language " + LANGUAGE : " "} --hf_token ${HUGGINGFACE_TOKEN}`;
  
  console.log(`execute command: ${command}`);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`execute error: ${error.message}`);
      return res.status(500).json({ error: 'transcribe error' });
    }
    
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    
    console.log(`stdout: ${stdout}`);
    
    // 생성된 텍스트 파일 확인 및 읽기
    fs.access(outputPath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`file not exists: ${outputPath}`);
        return res.status(404).json({ error: 'cannot find txt file' });
      }
      
      // 텍스트 파일 읽기
      fs.readFile(outputPath, 'utf8', async (err, data) => {
        if (err) {
          console.error(`file read error: ${err.message}`);
          return res.status(500).json({ error: 'error reading txt file' });
        }

        const summary = await summarizeWithLLM(data);

        // uploads 폴더 내용 비우기
        fs.rm('uploads', { recursive: true, force: true }, (err) => {
          if (err) {
            console.error('failed to delete uploads folder:', err);
            return;
          }
          
          // 폴더 다시 생성
          fs.mkdir('uploads', (err) => {
            if (err) {
              console.error('failed to recreate uploads folder:', err);
              return;
            }
            console.log('uploads folder cleared!');
          });
        });
        
        // 성공적으로 처리된 결과 반환
        res.json({
          success: true,
          filename_rec: req.file.originalname,
          filename_txt: outputFile,
          summary,
          full: data
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
