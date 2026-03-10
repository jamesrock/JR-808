import '/app.css';
import {
  Storage,
  // SoundManager,
  DisplayObject,
  setDocumentHeight,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
  makeToggle,
  getXAsPercentOfY,
  floorTo,
  isTiny
} from '@jamesrock/rockjs';

setDocumentHeight();

let taps = [];

const tap = (base) => {

  const now = performance.now();
  taps.push(now);

  if(taps.length > 1 && now - taps[taps.length - 2] > 2000) {
    taps = [now];
    return base;
  };

  if(taps.length < 2) return base;

  if(taps.length > 10) taps.shift();

  const intervals = [];
  for(let i = 1; i < taps.length; i++) {
    intervals.push(taps[i] - taps[i - 1]);
  };

  const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;

  return floorTo(60000 / averageInterval);

};

const makeSlider = (value, min, max, step = 1) => {
  const node = makeInput(0, 'range');
  node.min = min;
  node.max = max;
  node.step = step;
  node.value = value;
  return node;
};

const toMixer = (keys, saved) => {
  const out = {};
  saved.forEach((item, index) => {
    out[keys[index]] = item;
  });
  return out;
};

export class SoundManager {
  constructor(sounds) {

    this.context = new AudioContext();
    this.sounds = sounds;
    this.buffers = {};
    this.mixer = {};
    this.keys = Object.keys(this.sounds);

  };
  async load() {

    return Promise.all(this.keys.map((key) => this.loadBuffer(key, this.sounds[key]))).then((items) => {
      items.forEach(([name, buffer]) => {
        this.buffers[name] = buffer;
        this.mixer[name] = [0.5, 0];
      });
    });

  };
  async loadBuffer(name, path) {

    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    return [name, audioBuffer];

  };
  play(sound = 'point') {

    if(!this.buffers[sound]) {
      console.log(`SoundManager: '${sound}' not loaded!`);
      return;
    };

    const source = this.context.createBufferSource();
    const gainer = this.context.createGain();
    const panner = this.context.createStereoPanner();

    source.buffer = this.buffers[sound];
    gainer.gain.value = this.mixer[sound][0];
    panner.pan.value = this.mixer[sound][1];

    source.connect(gainer).connect(panner).connect(this.context.destination);

    source.start();

  };
  volume(sound, value) {

    this.mixer[sound][0] = value;
    return this;

  };
  pan(sound, value) {

    this.mixer[sound][1] = value;
    return this;

  };
};

class Toggle extends DisplayObject {
  constructor(items, name = '{name}', value, className, title = '{title}') {

    super();

    this.node = makeNode('form', className);
    this.name = name;
    this.title = title;
    this.toggle = makeToggle(items, name, value);

    this.node.appendChild(this.toggle);

    this.setProp('title', title);

  };
  getValue() {

    const data = new FormData(this.node);
    return data.get(this.name);

  };
  scrollToBottom() {

    this.toggle.scrollTop = this.toggle.scrollHeight;
    return this;

  };
};

class Slider extends DisplayObject {
  constructor(label = '{label}', value, min, max, step = 1, transform = (a) => a) {

    super();

    this.node = makeNode('div', 'slider');
    this.display = makeNode('div', 'slider-display');
    this.slider = makeSlider(value, min, max, step);
    this.label = label;
    this.transform = transform;

    this.node.appendChild(this.slider);
    this.node.appendChild(this.display);

    this.node.addEventListener('input', () => {
      this.inputHandler();
    });

    this.inputHandler();

  };
  getValue() {

    return this.slider.value;

  };
  setValue(value) {

    this.slider.value = value;
    this.inputHandler();
    return this;

  };
  inputHandler() {

    this.display.innerHTML = `<div class="slider-display-label">${this.label}</div><div class="slider-display-value">${this.transform(this.slider.value)}</div>`;

  };
};

class Sequencer extends DisplayObject {
  constructor() {

    super();

    this.node = makeNode('div', 'step-sequencer');

    this.steps = new Steps(this);
    // this.channels = this.setupChannelStrips();
    this.sounds = new SoundManager({
      'kick': '/audio/kick.mp3',
      'snare': '/audio/snare.mp3',
      'hats-closed': '/audio/hats-closed.mp3',
      'hats-open': '/audio/hats-open.mp3',
      'clap': '/audio/clap.mp3',
      'clave': '/audio/clave.mp3',
      // 'crash': '',
      // 'ride': '',
    });
    this.storage = new Storage('me.jamesrock.seq');
    this.keys = this.sounds.keys;
    this.instruments = this.keys.map((name) => new Instrument(name));
    this.instrumentSelect = new Toggle(this.keys.map((inst, index) => [inst, index]), 'instrument', 0, 'instruments', 'Instrument');

    this.startButton = makeButton('start');
    this.saveButton = makeButton('save');
    this.tapButton = makeButton('tap');
    this.bpmSelect = new Slider('BPM', 120, 60, 180, 2);
    this.panningSelect = new Slider('PAN', 0, -1, 1, 0.1, (value) => getXAsPercentOfY(value, 1));
    this.volumeSelect = new Slider('LEVEL', 0.5, 0, 1, 0.05, (value) => floorTo(getXAsPercentOfY(value, 1)));
    this.controllersNode = makeNode('div', 'controllers');
    this.controllersLeftNode = makeNode('div', 'controllers-left');
    this.controllersRightNode = makeNode('div', 'controllers-right');
    this.buttonsNode = makeNode('div', 'buttons');
    this.slidersNode = makeNode('div', 'sliders');
    this.patternsNode = makeNode('div', 'patterns-target');

    this.volumeSelect.appendTo(this.slidersNode);
    this.panningSelect.appendTo(this.slidersNode);
    this.bpmSelect.appendTo(this.slidersNode);
    this.buttonsNode.appendChild(this.tapButton);
    this.buttonsNode.appendChild(this.saveButton);
    this.buttonsNode.appendChild(this.startButton);
    this.instrumentSelect.appendTo(this.controllersLeftNode);
    this.controllersLeftNode.appendChild(this.slidersNode);
    this.controllersRightNode.appendChild(this.patternsNode);
    this.controllersRightNode.appendChild(this.buttonsNode);

    this.controllersNode.appendChild(this.controllersLeftNode);
    this.controllersNode.appendChild(this.controllersRightNode);

    this.node.appendChild(this.controllersNode);
    this.steps.appendTo(this.node);

    this.startButton.addEventListener('click', () => {

      if(this.playing) {
        this.stop();
        this.startButton.innerText = 'start';
      }
      else {
        this.start();
        this.startButton.innerText = 'stop';
      };

    });

    this.saveButton.addEventListener('click', () => {
      this.save();
    });

    this.instrumentSelect.addEventListener('input', () => {
      this.instrument = this.instruments[this.instrumentSelect.getValue()];
      this.applyInstrument();
    });

    this.panningSelect.addEventListener('input', () => {
      this.sounds.pan(this.instrument.name, Number(this.panningSelect.getValue()));
    });

    this.volumeSelect.addEventListener('input', () => {
      this.sounds.volume(this.instrument.name, Number(this.volumeSelect.getValue()));
    });

    this.tapButton.addEventListener('click', () => {
      this.bpmSelect.setValue(tap(this.bpmSelect.getValue()));
    });

    if(!this.storage.get('patterns')) {
      this.applyPresets();
    };

    this.sounds.load().then(() => {
      this.renderPatternSelect();
    });

  };
  applyPresets() {

    this.presets.forEach((item) => {

      const existing = this.storage.get('patterns') || [];
      const saved = [...existing, item];
      this.storage.set('patterns', saved);

    });

    return this;

  };
  start() {

    this.playing = true;

    this.steps.clear();
    this.steps.steps[this.currentStep].flash();

    this.play(this.currentStep);

    if(this.queued && this.currentStep === (this.steps.count - 1)) {
      this.patternChangeHandler(true);
      this.queued = false;
      this.setProp('queued', this.queued);
    };

    if(this.currentStep===(this.steps.count - 1)) {
      this.currentStep = 0;
    }
    else {
      this.currentStep ++;
    };

    this.timer = setTimeout(() => {
      this.start();
    }, this.modes[this.mode]/this.bpmSelect.getValue());

    return this;

  };
  stop() {

    this.playing = false;
    this.currentStep = 0;
    this.steps.clear();

    clearTimeout(this.timer);
    return this;

  };
  play(beat) {

    this.instruments.forEach((inst) => {
      if(inst.steps[beat]) {
        this.sounds.play(inst.name);
      };
    });

    return this;

  };
  enable(beat) {

    this.instrument.steps[beat] = 1;

  };
  disable(beat) {

    this.instrument.steps[beat] = 0;

  };
  setupChannelStrips() {

    const Kick = new Instrument('BassDrum');
    const Snare = new Instrument('SnareDrum');
    const RimShot = new Instrument('RimShot');
    const Clap = new Instrument('handClaP');
    const LowConga = new Instrument('LowConga');
    const LowTom = new Instrument('LowTom');
    const MidConga = new Instrument('MidConga');
    const MidTom = new Instrument('MidTom');
    const HiConga = new Instrument('HiConga');
    const HiTom = new Instrument('HiTom');
    const Accent = new Instrument('ACcent');
    const Clave = new Instrument('CLave');
    const Maracas = new Instrument('MAracas');
    const CowBell = new Instrument('CowBell');
    const Cymbal = new Instrument('CYmbal');
    const OpenHats = new Instrument('OpenHats');
    const ClosedHats = new Instrument('ClosedHats');

    return [
      new Channel([Accent], [new LevelKnob()]),
      new Channel([Kick], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([Snare], [new LevelKnob(), new ToneKnob(), new SnappyKnob()]),
      new Channel([LowConga, LowTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([MidConga, MidTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([HiConga, HiTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([Clave, RimShot], [new LevelKnob()]),
      new Channel([Maracas, Clap], [new LevelKnob()]),
      new Channel([CowBell], [new LevelKnob()]),
      new Channel([Cymbal], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([OpenHats], [new LevelKnob(), new DecayKnob()]),
      new Channel([ClosedHats], [new LevelKnob()])
    ];

  };
  save() {

    let name = prompt('pattern name?');

    if(!name) {return};

    name += ` @${this.bpmSelect.getValue()}`;
    const existing = this.storage.get('patterns');
    const saved = [...existing, [name, this.bpmSelect.getValue(), this.instruments.map((inst) => inst.steps), this.instruments.map((inst) => this.sounds.mixer[inst.name])]];
    this.storage.set('patterns', saved);
    this.renderPatternSelect();

    return this;

  };
  renderPatternSelect() {

    if(this.patternSelect) {
      this.patternSelect.destroy();
    };

    const saved = this.storage.get('patterns');

    this.patternSelect = new Toggle(saved.map(([label], index) => [label, index]), 'pattern', saved.length-1, 'patterns', 'Pattern');
    this.patternSelect.appendTo(this.patternsNode);
    this.patternSelect.scrollToBottom();
    this.patternSelect.addEventListener('input', () => {
      this.patternChangeHandler();
    });
    this.patternChangeHandler();

    return this;

  };
  patternChangeHandler(force = false) {

    if(!force && this.playing) {
      this.queued = true;
      this.setProp('queued', this.queued);
      return;
    };

    const saved = this.storage.get('patterns');
    const pattern = saved[this.patternSelect.getValue()];
    this.bpmSelect.setValue(pattern[1]);
    this.instruments = pattern[2].map((steps, index) => new Instrument(this.keys[index], steps));
    this.sounds.mixer = toMixer(this.keys, pattern[3]);
    this.instrument = this.instruments[this.instrumentSelect.getValue()];
    this.applyInstrument();

  };
  applyInstrument() {

    this.steps.applyInstrument();

    const channel = this.sounds.mixer[this.instrument.name];

    this.volumeSelect.setValue(channel[0]);
    this.panningSelect.setValue(channel[1]);

    return this;

  };
  playing = false;
  patternLength = 16;
  currentStep = 0;
  queued = false;
  modes = {
    '1/16': 15000,
    '1/8': 30000,
    '1/4': 60000
  };
  mode = '1/16';
  presets = [
    ["empty @120",120,[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["bob @120",120,[[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["eminem @120",120,[[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]]
  ];
};

class Instrument {
  constructor(name, steps = makeArray(16, () => 0)) {

    this.name = name;
    this.steps = steps;

  };
};

class Steps extends DisplayObject {
  constructor(seq, count = 16) {

    super();

    this.seq = seq;
    this.count = count;
    this.node = makeNode('div', 'steps');
    this.steps = this.make();

    this.render();

  };
  make() {

    let colorIndex = 0;

    return makeArray(this.count).map((index) => {
      const step = new Step(this.seq, this.stepColors[colorIndex], index);
      if(index > 0 && (index + 1) % 4 === 0) {
        colorIndex += 1;
      };
      return step;
    });

  };
  render() {

    this.steps.forEach((step) => {
      step.appendTo(this.node);
    });

    return this;

  };
  clear() {

    this.steps.forEach((step) => {
      step.unflash();
    });

    return this;

  };
  applyInstrument() {

    this.steps.forEach((step, index) => {
      if(this.seq.instrument.steps[index]) {
        step.enable(true);
      }
      else {
        step.disable(true);
      };
    });

    return this;

  };
  stepColors = ['red', 'orange', 'yellow', 'white'];
};

class Step extends DisplayObject {
  constructor(seq, color = 'red',  beat) {

    super();

    this.node = makeNode('div', 'step');
    this.indicator = makeNode('div', 'step-indicator');
    this.color = color;
    this.beat = beat;
    this.seq = seq;

    this.node.appendChild(this.indicator);

    this.setProp('enabled', this.enabled);
    this.setProp('color', this.color);

    this.addEventListener('click', () => {
      this.toggle();
    });

  };
  flash() {

    this.active = true;
    this.setProp('active', this.active);
    return this;

  };
  unflash() {

    this.active = false;
    this.setProp('active', this.active);
    return this;

  };
  enable(soft = false) {

    this.enabled = true;
    this.setProp('enabled', this.enabled);
    if(!soft) {
      this.seq.enable(this.beat);
    };
    return this;

  };
  disable(soft = false) {

    this.enabled = false;
    this.setProp('enabled', this.enabled);
    if(!soft) {
      this.seq.disable(this.beat);
    };
    return this;

  };
  toggle() {

    if(this.enabled) {
      this.disable();
    }
    else {
      this.enable();
    };
    return this;

  };
  enabled = false;
  active = false;
};

class Channel {
  constructor(instruments, modifiers) {
    this.instruments = instruments;
    this.modifiers = modifiers;
  };
};

const sequencer = new Sequencer();

console.log(sequencer);

sequencer.appendTo(document.body);

if(isTiny) {
  document.documentElement.style.setProperty('--pad-size', `${((window.innerWidth - 60) - 30) / 4}px`);
};
