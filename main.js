const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { generateObject } = require('ai')
const { z } = require('zod')
const { openai } = require('@ai-sdk/openai');
const generateMatchedAudioSegments = require("./generateMatchedAudioSegments");
require("dotenv").config();

let win;

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      {
        name: "videos",
        extensions: ["mp4"],
      },
    ],
  });
  if (!canceled) {
    return filePaths[0];
  }
}


async function generateSummarization(event, content) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini-2024-07-18'),
    apiKey: process.env.OPENAI_API_KEY,
    schema: z.object({
      summary: z.string(),
    }),
    prompt: 'Summarize the following text (this is transcript of a video, and summarize it like the summary shall tell what is overall video about with the details): ' + content,
  });
  return {
    summary: object.summary || '',
  }
}

async function generateTranslation(event, filePath) {
  // console.log(filePath);
  // file:///C:/Users/Pushkar/Downloads/Snapinsta.app_video_FF4DDC6E66E774C84482453AC25B64AF_video_dashinit.mp4
  let newPath = filePath.replace("file:///", "");
  // Initialize the Groq client
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Create a temporary file path for the processed audio
  const tempFilePath = path.join(__dirname, "temp_audio.mp3");

  // Convert the audio to 16000 Hz mono MP3
  await new Promise((resolve, reject) => {
    ffmpeg(newPath)
      .outputOptions([
        "-ar 16000", // Set audio sampling rate to 16000 Hz
        "-ac 1", // Set number of audio channels to 1 (mono)
        "-codec:a libmp3lame", // Encode audio as MP3
      ])
      .save(tempFilePath)
      .on("end", resolve)
      .on("error", reject);
  });

  // Create a translation job
  const translation = await groq.audio.translations.create({
    file: fs.createReadStream(tempFilePath),
    model: "whisper-large-v3",
    response_format: "json",
    response_format: "verbose_json",
    temperature: 0.0,
  });

  console.log(translation.segments);

  let _translation_object = {
    duration: translation.duration,
    text: translation.text,
    segments: translation.segments.map((segment) => ({
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
    })),
  };

  // Remove the temporary file
  fs.unlinkSync(tempFilePath);

  // Return the translation
  return { translation: _translation_object };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 768,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  });
  win.loadFile("index.html");
}

// Window control handlers
ipcMain.handle("window-close", () => {
  win?.close();
});

ipcMain.handle("window-minimize", () => {
  win?.minimize();
});

ipcMain.handle("window-maximize", () => {
  if (win?.isMaximized()) {
    win?.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle("dialog:openFile", handleFileOpen);

ipcMain.handle("create-translation", generateTranslation);

ipcMain.handle("save-translation", async (event, checksum, translation) => {
  const cacheDir = path.join(__dirname, ".cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
  }

  const cacheFilePath = path.join(cacheDir, `${checksum}.json`);
  fs.writeFileSync(cacheFilePath, JSON.stringify(translation));
});

ipcMain.handle("get-translation", async (event, checksum) => {
  const cacheFilePath = path.join(__dirname, ".cache", `${checksum}.json`);
  if (fs.existsSync(cacheFilePath)) {
    return JSON.parse(fs.readFileSync(cacheFilePath));
  }
});

ipcMain.handle('generate-audio-segments', async (event, data) => {
  try {
    const { videoPath, segments } = data;
    let newPath = videoPath.replace("file:///", "");
    const processedSegments = await generateMatchedAudioSegments({
      inputAudioPath: newPath,
      segments: segments,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });
    return processedSegments;
  } catch (error) {
    console.error('Error in generating audio segments:', error);
    throw error;
  }
});

ipcMain.handle('generate-summarization', generateSummarization);

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
