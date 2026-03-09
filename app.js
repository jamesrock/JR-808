import '/app.css';
import {
  Storage,
  // SoundManager,
  DisplayObject,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
  makeToggle,
  makeSelect,
  getXAsPercentOfY,
  floorTo
} from '@jamesrock/rockjs';

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
  constructor(items, name = '{name}', value, className) {

    super();

    this.node = makeNode('form', className);
    this.name = name;

    this.node.appendChild(makeToggle(items, name, value));

  };
  getValue() {

    const data = new FormData(this.node);

    return data.get(this.name);

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
    this.instrumentSelect = new Toggle(this.keys.map((inst, index) => [inst, index]), 'instrument', 0, 'instruments');

    this.startButton = makeButton('start');
    this.saveButton = makeButton('save');
    this.bpmSelect = new Slider('BPM', 120, 60, 180, 2);
    this.panningSelect = new Slider('PAN', 0, -1, 1, 0.1, (value) => getXAsPercentOfY(value, 1));
    this.volumeSelect = new Slider('LEVEL', 0.5, 0, 1, 0.05, (value) => floorTo(getXAsPercentOfY(value, 1)));
    this.controllersNode = makeNode('div', 'controllers');
    this.buttonsNode = makeNode('div', 'buttons');
    this.slidersNode = makeNode('div', 'sliders');

    this.volumeSelect.appendTo(this.slidersNode);
    this.panningSelect.appendTo(this.slidersNode);
    this.bpmSelect.appendTo(this.slidersNode);
    this.buttonsNode.appendChild(this.startButton);
    this.buttonsNode.appendChild(this.saveButton);
    this.instrumentSelect.appendTo(this.controllersNode);
    this.controllersNode.appendChild(this.slidersNode);
    this.controllersNode.appendChild(this.buttonsNode);
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
      this.applyPattern();
    });

    this.panningSelect.addEventListener('input', () => {
      this.sounds.pan(this.keys[this.instrumentSelect.getValue()], Number(this.panningSelect.getValue()));
    });

    this.volumeSelect.addEventListener('input', () => {
      this.sounds.volume(this.keys[this.instrumentSelect.getValue()], Number(this.volumeSelect.getValue()));
    });

    if(!this.storage.get('patterns')) {
      this.applyPresets();
    };

    this.sounds.load().then(() => {
      this.renderPatternSelect();
    });

  };
  applyPattern() {

    this.steps.steps.forEach((step, index) => {
      if(this.instruments[this.instrumentSelect.getValue()].steps[index]) {
        step.enable();
      }
      else {
        step.disable();
      };
    });

    const channel = this.sounds.mixer[this.keys[this.instrumentSelect.getValue()]];

    this.volumeSelect.setValue(channel[0]);
    this.panningSelect.setValue(channel[1]);

    return this;

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
  play(beat) {

    this.instruments.forEach((inst) => {
      if(inst.steps[beat]) {
        this.sounds.play(inst.name);
      };
    });

    return this;

  };
  stop() {

    this.playing = false;
    this.currentStep = 0;
    this.steps.clear();

    clearTimeout(this.timer);
    return this;

  };
  enable(beat) {

    this.instruments[this.instrumentSelect.getValue()].steps[beat] = 1;

  };
  disable(beat) {

    this.instruments[this.instrumentSelect.getValue()].steps[beat] = 0;

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
  save(override) {

    let name = override ? override : prompt('name?');

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
      this.patternSelect.parentNode.removeChild(this.patternSelect);
    };

    const saved = this.storage.get('patterns');

    this.patternSelect = makeSelect(saved.map(([label], index) => [label, index]), saved.length-1);

    this.buttonsNode.appendChild(this.patternSelect);

    this.patternSelect.addEventListener('input', () => {
      this.patternChangeHandler();
    });
    this.patternChangeHandler();

    return this;

  };
  patternChangeHandler() {

    const saved = this.storage.get('patterns');
    const pattern = saved[this.patternSelect.value];
    this.bpmSelect.setValue(pattern[1]);
    this.instruments = pattern[2].map((steps, index) => new Instrument(this.keys[index], steps));
    this.sounds.mixer = toMixer(this.keys, pattern[3]);
    this.applyPattern();

  };
  playing = false;
  stepLength = 16;
  currentStep = 0;
  modes = {
    '1/16': 15000,
    '1/8': 30000,
    '1/4': 60000
  };
  mode = '1/16';
  presets = [
    ["empty @120",120,[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["bob @124",124,[[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["eminem @120",120,[[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]]
  ];
};

class Knob extends DisplayObject {
  constructor() {

    super();

  };
  label = 'Knob';
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
      if(this.enabled) {
        this.disable();
      }
      else {
        this.enable();
      };
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
  enable() {

    this.enabled = true;
    this.setProp('enabled', this.enabled);
    this.seq.enable(this.beat);
    return this;

  };
  disable() {

    this.enabled = false;
    this.setProp('enabled', this.enabled);
    this.seq.disable(this.beat);
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
