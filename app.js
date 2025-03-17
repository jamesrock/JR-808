import * as Tone from 'tone';
import { wavetableSource } from './wavetable';

const audioCtx = new AudioContext();

// Before we do anything more, let's grab our checkboxes from the interface. We want to keep them in the groups they are in as each row represents a different sound or _voice_.
const pads = document.querySelectorAll(".pads");

const wave = new PeriodicWave(audioCtx, {
  real: wavetable.real,
  imag: wavetable.imag,
});

let attackTime = 0.2;
const attackControl = document.querySelector("#attack");
attackControl.addEventListener(
  "input",
  (ev) => {
    attackTime = parseFloat(ev.target.value);
  },
  false
);

let releaseTime = 0.5;
const releaseControl = document.querySelector("#release");
releaseControl.addEventListener(
  "input",
  (ev) => {
    releaseTime = parseFloat(ev.target.value);
  },
  false
);

// Expose attack time & release time
const sweepLength = 2;
function playSweep(time) {
  const osc = new OscillatorNode(audioCtx, {
    frequency: 380,
    type: "custom",
    periodicWave: wave,
  });

  const sweepEnv = new GainNode(audioCtx);
  sweepEnv.gain.cancelScheduledValues(time);
  sweepEnv.gain.setValueAtTime(0, time);
  sweepEnv.gain.linearRampToValueAtTime(1, time + attackTime);
  sweepEnv.gain.linearRampToValueAtTime(
    0,
    time + sweepLength - releaseTime
  );

  osc.connect(sweepEnv).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + sweepLength);
}

// Expose frequency & frequency modulation
let pulseHz = 880;
const hzControl = document.querySelector("#hz");
hzControl.addEventListener(
  "input",
  (ev) => {
    pulseHz = parseFloat(ev.target.value);
  },
  false
);

let lfoHz = 30;
const lfoControl = document.querySelector("#lfo");
lfoControl.addEventListener(
  "input",
  (ev) => {
    lfoHz = parseFloat(ev.target.value);
  },
  false
);

const pulseTime = 1;
function playPulse(time) {
  const osc = new OscillatorNode(audioCtx, {
    type: "sine",
    frequency: pulseHz,
  });

  const amp = new GainNode(audioCtx, {
    value: 1,
  });

  const lfo = new OscillatorNode(audioCtx, {
    type: "square",
    frequency: lfoHz,
  });

  lfo.connect(amp.gain);
  osc.connect(amp).connect(audioCtx.destination);
  lfo.start();
  osc.start(time);
  osc.stop(time + pulseTime);
}

// Expose noteDuration & band frequency
let noiseDuration = 1;
const durControl = document.querySelector("#duration");
durControl.addEventListener(
  "input",
  (ev) => {
    noiseDuration = parseFloat(ev.target.value);
  },
  false
);

let bandHz = 1000;
const bandControl = document.querySelector("#band");
bandControl.addEventListener(
  "input",
  (ev) => {
    bandHz = parseFloat(ev.target.value);
  },
  false
);

function playNoise(time) {
  const bufferSize = audioCtx.sampleRate * noiseDuration; // set the time of the note

  // Create an empty buffer
  const noiseBuffer = new AudioBuffer({
    length: bufferSize,
    sampleRate: audioCtx.sampleRate,
  });

  // Fill the buffer with noise
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // Create a buffer source for our created data
  const noise = new AudioBufferSourceNode(audioCtx, {
    buffer: noiseBuffer,
  });

  // Filter the output
  const bandpass = new BiquadFilterNode(audioCtx, {
    type: "bandpass",
    frequency: bandHz,
  });

  // Connect our graph
  noise.connect(bandpass).connect(audioCtx.destination);
  noise.start(time);
}

// Loading the file: fetch the audio file and decode the data
async function getFile(audioContext, filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

let playbackRate = 1;
const rateControl = document.querySelector("#rate");
rateControl.addEventListener(
  "input",
  (ev) => {
    playbackRate = parseFloat(ev.target.value);
  },
  false
);

// Create a buffer, plop in data, connect and play -> modify graph here if required
function playSample(audioContext, audioBuffer, time) {
  const sampleSource = new AudioBufferSourceNode(audioContext, {
    buffer: audioBuffer,
    playbackRate: playbackRate,
  });
  sampleSource.connect(audioContext.destination);
  sampleSource.start(time);
  return sampleSource;
}

async function setupSample() {
  const filePath = "dtmf.mp3";
  // Here we're waiting for the load of the file
  // To be able to use this keyword we need to be within an `async` function
  const sample = await getFile(audioCtx, filePath);
  return sample;
}

// Scheduling
let tempo = 60.0;
const bpmControl = document.querySelector("#bpm");
const bpmValEl = document.querySelector("#bpmval");

bpmControl.addEventListener(
  "input",
  (ev) => {
    tempo = parseFloat(ev.target.value);
    bpmValEl.innerText = tempo;
  },
  false
);

const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

let currentNote = 0; // The note we are currently playing
let nextNoteTime = 0.0; // when the next note is due.
function nextNote() {
  const secondsPerBeat = 60.0 / tempo;

  nextNoteTime += secondsPerBeat; // Add beat length to last beat time

  // Advance the beat number, wrap to zero when reaching 4
  currentNote = (currentNote + 1) % 4;
}

// Create a queue for the notes that are to be played, with the current time that we want them to play:
const notesInQueue = [];
let dtmf;

function scheduleNote(beatNumber, time) {
  // Push the note into the queue, even if we're not playing.
  notesInQueue.push({ note: beatNumber, time: time });

  if (pads[0].querySelectorAll("input")[beatNumber].checked) {
    playSweep(time);
  }
  if (pads[1].querySelectorAll("input")[beatNumber].checked) {
    playPulse(time);
  }
  if (pads[2].querySelectorAll("input")[beatNumber].checked) {
    playNoise(time);
  }
  if (pads[3].querySelectorAll("input")[beatNumber].checked) {
    playSample(audioCtx, dtmf, time);
  }
}

let timerID;
function scheduler() {
  // While there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(currentNote, nextNoteTime);
    nextNote();
  }
  timerID = setTimeout(scheduler, lookahead);
}

// Draw function to update the UI, so we can see when the beat progress.
// This is a loop: it reschedules itself to redraw at the end.
let lastNoteDrawn = 3;
function draw() {
  let drawNote = lastNoteDrawn;
  const currentTime = audioCtx.currentTime;

  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
    drawNote = notesInQueue[0].note;
    notesInQueue.shift(); // Remove note from queue
  }

  // We only need to draw if the note has moved.
  if (lastNoteDrawn !== drawNote) {
    pads.forEach((pad) => {
      pad.children[lastNoteDrawn * 2].style.borderColor = "var(--black)";
      pad.children[drawNote * 2].style.borderColor = "var(--yellow)";
    });

    lastNoteDrawn = drawNote;
  }
  // Set up to draw again
  requestAnimationFrame(draw);
}

// When the sample has loaded, allow play
const loadingEl = document.querySelector(".loading");
const playButton = document.querySelector("#playBtn");
let isPlaying = false;
setupSample().then((sample) => {
  loadingEl.style.display = "none";

  dtmf = sample; // to be used in our playSample function

  playButton.addEventListener("click", (ev) => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      // Start playing

      // Check if context is in suspended state (autoplay policy)
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      currentNote = 0;
      nextNoteTime = audioCtx.currentTime;
      scheduler(); // kick off scheduling
      requestAnimationFrame(draw); // start the drawing loop.
      ev.target.dataset.playing = "true";
    } else {
      window.clearTimeout(timerID);
      ev.target.dataset.playing = "false";
    }
  });
});