class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.targetSampleRate = 16000;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0 && input[0].length > 0) {
            const channelData = input[0];

            // In an AudioWorklet, `sampleRate` is a global variable indicating the context's rate
            const inRate = sampleRate;

            let pcm16;

            if (inRate !== this.targetSampleRate) {
                // Downsample mathematically
                const ratio = inRate / this.targetSampleRate;
                const outLength = Math.round(channelData.length / ratio);
                const outBuffer = new Float32Array(outLength);

                let offsetResult = 0;
                let offsetBuffer = 0;

                while (offsetResult < outBuffer.length) {
                    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
                    let accum = 0, count = 0;
                    for (let i = offsetBuffer; i < nextOffsetBuffer && i < channelData.length; i++) {
                        accum += channelData[i];
                        count++;
                    }
                    outBuffer[offsetResult] = count > 0 ? accum / count : 0;
                    offsetResult++;
                    offsetBuffer = nextOffsetBuffer;
                }

                // Convert to Int16
                pcm16 = new Int16Array(outBuffer.length);
                for (let i = 0; i < outBuffer.length; i++) {
                    let s = Math.max(-1, Math.min(1, outBuffer[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
            } else {
                // Direct conversion if already 16kHz
                pcm16 = new Int16Array(channelData.length);
                for (let i = 0; i < channelData.length; i++) {
                    let s = Math.max(-1, Math.min(1, channelData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
            }

            // Transfer the buffer to the main thread
            this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        }
        return true; // Retain the processor
    }
}

registerProcessor('audio-processor', AudioProcessor);
