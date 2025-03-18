// import * as Tone from 'tone';
import { wavetable } from './wavetable.js';

const audioCtx = new AudioContext();
const steps = document.querySelectorAll('.step');

steps.forEach((item) => {
  item.addEventListener('input', (e) => {
    instruments[instrument][parseFloat(e.target.value)] = e.target.checked ? 1 : 0;
  });
});

const instruments = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];
let instrument = 1;

const resetPads = () => {
  instruments[instrument].forEach((step, stepIndex) => {
    document.querySelector(`.step[value="${stepIndex}"]`).checked = (step === 1 ? true : false);
  });
};

const instrumentControl = document.querySelector('#instrument');
instrumentControl.value = instrument;
instrumentControl.addEventListener('change', (ev) => {
  instrument = parseFloat(ev.target.value);
  resetPads();
}, false);

const wave = new PeriodicWave(audioCtx, {
  real: wavetable.real,
  imag: wavetable.imag,
});

let attackTime = 0.2;
const attackControl = document.querySelector('#attack');
attackControl.addEventListener('input', (ev) => {
  attackTime = ev.target.valueAsNumber;
}, false);

let releaseTime = 0.5;

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
};

// Expose frequency & frequency modulation
let pulseHz = 880;

let lfoHz = 30;

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
};

let noiseDuration = 1;

let bandHz = 1000;

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
  };

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
};

let playbackRate = 1;

// Scheduling
let tempo = 60;
const bpmControl = document.querySelector('#bpm');
const bpmValEl = document.querySelector('#bpmval');

const stepsInSequence = 16;

bpmControl.addEventListener('input', (ev) => {
  tempo = ev.target.valueAsNumber;
  bpmValEl.innerText = tempo;
}, false);

const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

let currentNote = 0; // The note we are currently playing
let nextNoteTime = 0.0; // when the next note is due.
function nextNote() {
  const secondsPerBeat = 60.0 / tempo;
  nextNoteTime += secondsPerBeat; // Add beat length to last beat time
  // Advance the beat number, wrap to zero when reaching {stepsInSequence}
  currentNote = (currentNote + 1) % stepsInSequence;
};

// Create a queue for the notes that are to be played, with the current time that we want them to play:
const notesInQueue = [];

function scheduleNote(beatNumber, time) {
  // Push the note into the queue, even if we're not playing.
  notesInQueue.push({ note: beatNumber, time: time });
  if(instruments[0][beatNumber]) {
    playSweep(time);
  };
  if(instruments[1][beatNumber]) {
    playSweep(time);
  };
  if(instruments[2][beatNumber]) {
    playSweep(time);
  };
  if(instruments[3][beatNumber]) {
    playSweep(time);
  };
  if(instruments[4][beatNumber]) {
    playSweep(time);
  };
  if(instruments[5][beatNumber]) {
    playSweep(time);
  };
  if(instruments[6][beatNumber]) {
    playSweep(time);
  };
  if(instruments[7][beatNumber]) {
    playSweep(time);
  };
  if(instruments[8][beatNumber]) {
    playSweep(time);
  };
  if(instruments[9][beatNumber]) {
    playSweep(time);
  };
  if(instruments[10][beatNumber]) {
    playSweep(time);
  };
  if(instruments[11][beatNumber]) {
    playSweep(time);
  };
};

let timerID;
function scheduler() {
  // While there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(currentNote, nextNoteTime);
    nextNote();
  }
  timerID = setTimeout(scheduler, lookahead);
};

// Draw function to update the UI, so we can see when the beat progress.
// This is a loop: it reschedules itself to redraw at the end.
let lastNoteDrawn = 3;
function draw() {
  let drawNote = lastNoteDrawn;
  const currentTime = audioCtx.currentTime;

  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
    drawNote = notesInQueue[0].note;
    notesInQueue.shift(); // Remove note from queue
  };

  // We only need to draw if the note has moved.
  if (lastNoteDrawn !== drawNote) {
    // console.log('drawNote', drawNote);
    steps.forEach((step) => {
      step.style.borderColor = "var(--black)";
    });
    steps[drawNote].style.borderColor = "var(--yellow)";
    lastNoteDrawn = drawNote;
  };
  // Set up to draw again
  requestAnimationFrame(draw);
};

// When the sample has loaded, allow play
const loadingEl = document.querySelector(".loading");
const playButton = document.querySelector("#playBtn");
let isPlaying = false;
loadingEl.style.display = 'none';

playButton.addEventListener('click', (ev) => {
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




// original 808 objects

class Sequencer {
  constructor() {
    
    this.steps = this.getSteps();
    this.channels = [
      new Channel([ACcent], [new LevelKnob()]),
      new Channel([BassDrum], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([SnareDrum], [new LevelKnob(), new ToneKnob(), new SnappyKnob()]),
      new Channel([LowConga, LowTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([MidConga, MidTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([HiConga, HiTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([CLave, RimShot], [new LevelKnob()]),
      new Channel([MAracas, handClaP], [new LevelKnob()]),
      new Channel([CowBell], [new LevelKnob()]),
      new Channel([CYmbal], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([OpenHats], [new LevelKnob(), new DecayKnob()]),
      new Channel([ClosedHats], [new LevelKnob()])
    ];

    // this.start();

  };
  getSteps() {
    const out = [];
    let colorIndex = -1;
    for(var step=0;step<this.stepCount;step++) {
      if(step % 4 === 0) {
        colorIndex += 1;
      };
      out.push(new Step(this.stepColors[colorIndex]));
    };
    return out;
  };
  start() {

    const setText = useSetAtom(countAtom);

    console.log('start');

    setText(this.currentStep);

    this.steps.forEach((step) => {
      step.unflash();
    });

    this.steps[this.currentStep].flash();

    if(this.currentStep===(this.steps.length - 1)) {
      this.currentStep = 0;
    }
    else {
      this.currentStep += 1;
    };
    
    setTimeout(() => {

      this.start();
      
    }, 1000);

    return this;

  };
  stop() {};
  playing = false;
  stepCount = 16;
  stepLength = 16;
  currentStep = 0;
  tempo = 120;
  
  stepColors = ['red', 'orange', 'yellow', 'white'];
};

class Knob {
  constructor() {
  };
  label = 'Knob';
};

class LevelKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Level';
};

class TuningKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Tuning';
};

class ToneKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Tone';
};

class DecayKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Decay';
};

class SnappyKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Snappy';
};

class Switch {
  constructor() {};
};

class Variation {
  constructor() {};
};

class Instrument {
  constructor(name) {
    this.name = name;
  };
  play() {};
};

class Step {
  constructor(color) {
    this.color = color;
  };
  flash() {
    this.active = true;
  };
  unflash() {
    this.active = false;
  };
  active = false;
  color = 'red';
};

class Channel {
  constructor(instruments, modifiers) {
    this.instruments = instruments;
    this.modifiers = modifiers;
  };
};

const ACcent = new Instrument('ACcent');
const BassDrum = new Instrument('BassDrum');
const SnareDrum = new Instrument('SnareDrum');
const LowConga = new Instrument('LowConga');
const LowTom = new Instrument('LowTom');
const MidConga = new Instrument('MidConga');
const MidTom = new Instrument('MidTom');
const HiConga = new Instrument('HiConga');
const HiTom = new Instrument('HiTom');
const CLave = new Instrument('CLave');
const RimShot = new Instrument('RimShot');
const MAracas = new Instrument('MAracas');
const handClaP = new Instrument('handClaP');
const CowBell = new Instrument('CowBell');
const CYmbal = new Instrument('CYmbal');
const OpenHats = new Instrument('OpenHats');
const ClosedHats = new Instrument('ClosedHats');

export const sequencer = new Sequencer();

// console.log(sequencer);




