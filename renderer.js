const videoPlayer = document.getElementById("videoPlayer");
const TRANSLATION_DATA = [];

// Custom Method to extract audio from video
// async function extractAudioFromVideoFile(file) {
//     if (!file.type.startsWith('video/')) {
//         alert("Please select a video file.");
//         return;
//     }

//     const audioContext = new AudioContext();
//     const arrayBuffer = await file.arrayBuffer();

//     // Decode the audio data
//     const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

//     // Create an offline context to render audio
//     const offlineContext = new OfflineAudioContext(
//         audioBuffer.numberOfChannels,
//         audioBuffer.length,
//         audioBuffer.sampleRate
//     );

//     // Create a buffer source
//     const source = offlineContext.createBufferSource();
//     source.buffer = audioBuffer;
//     source.connect(offlineContext.destination);
//     source.start();

//     // Render the audio
//     const renderedBuffer = await offlineContext.startRendering();

//     // Convert to WAV format
//     const wavBlob = audioBufferToWav(renderedBuffer);
//     const audioUrl = URL.createObjectURL(wavBlob);

//     // Create audio player
//     const audioElement = document.createElement('audio');
//     audioElement.src = audioUrl;
//     audioElement.controls = true;
//     document.body.appendChild(audioElement);

//     // Create download link
//     const downloadLink = document.createElement('a');
//     downloadLink.href = audioUrl;
//     downloadLink.download = 'extracted-audio.wav';
//     downloadLink.textContent = 'Download Audio';
//     document.body.appendChild(downloadLink);
// }

// // Function to convert AudioBuffer to WAV format
// function audioBufferToWav(buffer) {
//     const length = buffer.length * buffer.numberOfChannels * 2;
//     const view = new DataView(new ArrayBuffer(44 + length));

//     // Write WAV header
//     writeString(view, 0, 'RIFF');
//     view.setUint32(4, 36 + length, true);
//     writeString(view, 8, 'WAVE');
//     writeString(view, 12, 'fmt ');
//     view.setUint32(16, 16, true);
//     view.setUint16(20, 1, true);
//     view.setUint16(22, buffer.numberOfChannels, true);
//     view.setUint32(24, buffer.sampleRate, true);
//     view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
//     view.setUint16(32, buffer.numberOfChannels * 2, true);
//     view.setUint16(34, 16, true);
//     writeString(view, 36, 'data');
//     view.setUint32(40, length, true);

//     // Write audio data
//     const data = new Float32Array(buffer.length * buffer.numberOfChannels);
//     let offset = 44;
//     for (let i = 0; i < buffer.numberOfChannels; i++) {
//         const channel = buffer.getChannelData(i);
//         for (let j = 0; j < channel.length; j++) {
//             const sample = Math.max(-1, Math.min(1, channel[j]));
//             view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
//             offset += 2;
//         }
//     }

//     return new Blob([view], { type: 'audio/wav' });
// }

// function writeString(view, offset, string) {
//     for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     document.getElementById('extractAudioButton').addEventListener('click', function() {
//         const fileInput = document.getElementById('filePicker');
//         if (fileInput.files.length === 0) {
//             alert('Please select a video file.');
//             return;
//         }
//         extractAudioFromVideoFile(fileInput.files[0]);
//     });
// });


async function generateSHA256Checksum(file) {
  // Create a FileReader to read the video file
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    // When the file is successfully read, generate the checksum
    fileReader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;

        // Use crypto.subtle.digest to calculate the SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

        // Convert the ArrayBuffer hash to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.readAsArrayBuffer(file);
  });
}
async function generateSHA256ChecksumFromFilePath(filePath) {
  const response = await fetch(filePath);
  const arrayBuffer = await response.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const selectFileButton = document.getElementById("select-file-button");
const generateTranslationsButton = document.getElementById(
  "generate-translations-button"
);

selectFileButton.addEventListener("click", async () => {
  const filePath = await window.electron.openFile();
  if (filePath) {
    selectFileButton.style.display = "none";
    videoPlayer.style.display = "block";
    videoPlayer.src = filePath;
    generateTranslationsButton.style.display = "block";
  }
});

const translationTextDiv = document.getElementById("translation-text");

generateTranslationsButton.addEventListener("click", async () => {
  const filePath = videoPlayer.src;

  generateTranslationsButton.textContent = "Generating Translations...";
  generateTranslationsButton.disabled = true;

  // this will be used to uniquely identify file and fetch file form .cache folder
  const checksum = await generateSHA256ChecksumFromFilePath(filePath);

  // check if translation data is already present in .cache folder
  const translationData = await window.electron.getTranslation(checksum);
  if (translationData) {
    console.log(TRANSLATION_DATA);
    TRANSLATION_DATA.push(...translationData.segments);
    generateTranslationsButton.style.display = "none";
    translationTextDiv.style.display = "block";
    return;
  }
  
  const { translation } = await window.electron.generateTranslation(filePath);
  TRANSLATION_DATA.push(...translation.segments);
  console.log(TRANSLATION_DATA);
  // create a file in .cache folder with checksum as name and save the translation data
  await window.electron.saveTranslation(checksum, translation);

  generateTranslationsButton.style.display = "none";
  translationTextDiv.style.display = "block";
});


videoPlayer.addEventListener("timeupdate", () => {
  const segments = TRANSLATION_DATA;
  const currentTime = videoPlayer.currentTime;

  for (const segment of segments) {
    // passing 1s gap with removing = in operators
    if (currentTime > segment.startTime && currentTime < segment.endTime) {
      translationTextDiv.textContent = segment.text;
      return;
    }
  }

  translationTextDiv.textContent = "";
});
