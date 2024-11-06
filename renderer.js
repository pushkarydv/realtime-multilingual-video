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
  const { translation } = await window.electron.generateTranslation(filePath);
  TRANSLATION_DATA.push(...translation.segments);
  generateTranslationsButton.style.display = "none";
  translationTextDiv.style.display = "block";
});


videoPlayer.addEventListener("timeupdate", () => {
    const segments = TRANSLATION_DATA;
    const totalDuration = videoPlayer.duration;
    const currentTime = videoPlayer.currentTime;

    const segmentDuration = totalDuration / segments.length;
    const currentSegmentIndex = Math.floor(currentTime / segmentDuration);

    if (currentSegmentIndex >= 0 && currentSegmentIndex < segments.length) {
        translationTextDiv.textContent = segments[currentSegmentIndex].text;
    } else {
        translationTextDiv.textContent = "";
    }
});
