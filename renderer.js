const filePicker = document.getElementById('filePicker');
const videoPlayer = document.getElementById('videoPlayer');

filePicker.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const videoUrl = URL.createObjectURL(file);
    videoPlayer.style.display = 'block';
    videoPlayer.src = videoUrl;
  }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        const videoUrl = URL.createObjectURL(file);
        videoPlayer.style.display = 'block';
        videoPlayer.src = videoUrl;
        document.getElementById('placeholder').style.display = 'none';
    }
});

videoPlayer.addEventListener('loadeddata', () => {
    document.getElementById('placeholder').style.display = 'none';
});

filePicker.addEventListener('click', (e) => {
    e.stopPropagation();
});

document.getElementById('placeholder').addEventListener('click', () => {
    filePicker.click();
});

videoPlayer.addEventListener('error', () => {
    videoPlayer.style.display = 'none';
    document.getElementById('placeholder').style.display = 'flex';
});