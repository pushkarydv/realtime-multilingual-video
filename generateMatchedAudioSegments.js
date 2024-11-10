const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function generateMatchedAudioSegments({
    inputAudioPath,    // Path to source audio file
    segments,          // Array of segments with {text, startTime, endTime}
    outputDir = './temp_audio',  // Directory to store output
}) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const processedSegments = [];
    
    try {
        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });
        
        // Process each segment
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            
            // 1. Extract reference audio segment for analysis
            const referenceSegmentPath = path.join(outputDir, `reference_${i}_${Date.now()}.mp3`);
            await new Promise((resolve, reject) => {
                ffmpeg(inputAudioPath)
                    .setStartTime(segment.startTime)
                    .setDuration(segment.endTime - segment.startTime)
                    .output(referenceSegmentPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // 2. Analyze reference audio characteristics
            const audioStats = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(referenceSegmentPath, (err, data) => {
                    if (err) reject(err);
                    const audioStream = data.streams.find(stream => stream.codec_type === 'audio');
                    resolve({
                        duration: segment.endTime - segment.startTime,
                        sampleRate: audioStream.sample_rate,
                        bitRate: audioStream.bit_rate,
                        channels: audioStream.channels,
                        volumeLevel: data.streams[0].volume || 1
                    });
                });
            });

            // 3. Generate speech using OpenAI
            const speechResponse = await openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: segment.text,
                speed: audioStats.duration / (segment.endTime - segment.startTime)
            });

            // 4. Save the generated speech
            const generatedPath = path.join(outputDir, `generated_${i}_${Date.now()}.mp3`);
            const buffer = Buffer.from(await speechResponse.arrayBuffer());
            await fs.writeFile(generatedPath, buffer);

            // 5. Match audio characteristics
            const finalOutputPath = path.join(outputDir, `final_${i}_${Date.now()}.mp3`);
            await new Promise((resolve, reject) => {
                ffmpeg(generatedPath)
                    .audioFrequency(audioStats.sampleRate)
                    .audioBitrate(audioStats.bitRate)
                    .audioChannels(audioStats.channels)
                    .audioFilters([
                        `volume=${audioStats.volumeLevel}`,
                        'compand=0.3|0.3:1|1:-90/-60|-60/-40|-40/-30|-20/-20:6:0:-90:0.2',
                        'equalizer=f=1000:width_type=o:width=2:g=0',
                        'aecho=0.8:0.88:60:0.4'
                    ])
                    .output(finalOutputPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // 6. Cleanup temporary files
            await fs.unlink(referenceSegmentPath);
            await fs.unlink(generatedPath);

            // 7. Add to processed segments
            processedSegments.push({
                ...segment,
                audioPath: finalOutputPath
            });

            // Optional: Log progress
            console.log(`Processed segment ${i + 1} of ${segments.length}`);
        }

        return processedSegments;

    } catch (error) {
        console.error('Error in generateMatchedAudioSegments:', error);
        throw error;
    }
}

// example usage funciton for tests
async function example() {
    const segments = [
        {
            "text": "The root of mercy is religion, sin is the root of pride.",
            "startTime": 0,
            "endTime": 23
        },
        {
            "text": "Tulsi Daya Na Chhoriye Jab Tak Ghatme Pran",
            "startTime": 23,
            "endTime": 35
        }
        // ... other segments
    ];

    try {
        const processedSegments = await generateMatchedAudioSegments({
            inputAudioPath: '/path/to/source.mp3',
            segments: segments,
        });

        console.log('Processed segments:', processedSegments);
        // Each segment now has an audioPath property with the path to its processed audio file
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = generateMatchedAudioSegments;