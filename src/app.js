import '/app.css';
import {
  Storage,
  DisplayObject,
  setDocumentHeight,
  makeSelect,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
  makeToggle,
  getXAsPercentOfY,
  floorTo,
  ceilTo,
  limit,
  minWidth
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

const limitChars = (name, max = 12) => {
  return name.length > max ? `${name.split('').splice(0, max).join('').trim()}...` : name;
};

const addInputListeners = (nodes, listener) => {

  nodes.forEach((node) => {
    node.addEventListener('input', () => {
      listener(node.getValue());
    });
  });

  return nodes;

};

const append = (target) => {
  const fn = (node) => {
    target.appendChild(node);
    return fn;
  };
  return fn;
};

const appendTo = (target) => {
  const fn = (node) => {
    node.appendTo(target);
    return fn;
  };
  return fn;
};

export class SoundManager {
  constructor(sounds) {

    this.context = new AudioContext();
    this.sounds = sounds;
    this.buffers = {};
    this.mixer = {};
    this.keys = Object.keys(this.sounds);

    this.listenForStateChange();

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
  listenForStateChange() {

    this.context.addEventListener('statechange', async () => {
      if(this.context.state === 'suspended') {
        await this.context.resume();
      };
    });

    return this;

  };
};

class Toggle extends DisplayObject {
  constructor(items, name = '{name}', value, className, title = '{title}') {

    super();

    this.node = makeNode('form', className);
    this.name = name;
    this.value = value;
    this.title = title;
    this.toggle = makeToggle(items, name, value);

    append(this.node)(this.toggle);

    this.setProp('title', title);

  };
  getValue() {

    const data = new FormData(this.node);
    return Number(data.get(this.name));

  };
  scrollIntoView() {

    this.toggle.querySelector(`input[value="${this.value}"]`).scrollIntoView();
    return this;

  };
};

class ToggleFallback extends DisplayObject {
  constructor(items, value) {

    super();

    this.node = makeSelect(items, value);

  };
  getValue() {

    return Number(this.node.value);

  };
};

class Slider extends DisplayObject {
  constructor(label = '{label}', value, min, max, step = 1, transform = (a) => a, direction = 'vertical') {

    super();

    this.node = makeNode('div', 'slider');
    this.display = makeNode('div', 'slider-display');
    this.slider = makeSlider(value, min, max, step);
    this.label = label;
    this.transform = transform;
    this.direction = direction;

    this.setProp('direction', this.direction);

    append(this.node)(this.slider)(this.display);

    this.node.addEventListener('input', () => {
      this.inputHandler();
    });

    this.inputHandler();

  };
  getValue() {

    return Number(this.slider.value);

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
      // 'tom-low': '',
      // 'tom-high': '',
      // 'crash': '',
      // 'ride': '',
    });
    this.storage = new Storage('me.jamesrock.seq');
    this.keys = this.sounds.keys;
    this.instruments = this.keys.map((name) => new Instrument(name));
    this.instrumentSelect = this.makeInstrumentSelect();

    this.startButton = makeButton('start');
    this.saveButton = makeButton('store');
    this.tapButton = makeButton('tap');
    this.patternClearButton = makeButton('clear\nptrn', 'clear');
    this.instrumentClearButton = makeButton('clear\ninst', 'clear');
    this.partPrevButton = makeButton('<', 'dir');
    this.partAddButton = makeButton('+16', 'add');
    this.partNextButton = makeButton('>', 'dir');

    const sliderDirection = tiny ? 'horizontal' : 'vertical';

    this.bpmSelect = new Slider('BPM', 120, 60, 180, 2, (a) => a, sliderDirection);
    this.panningSelect = new Slider('PAN', 0, -1, 1, 0.1, (value) => getXAsPercentOfY(value, 1), sliderDirection);
    this.volumeSelect = new Slider('LEVEL', 0.5, 0, 1, 0.1, (value) => floorTo(getXAsPercentOfY(value, 1)), sliderDirection);

    this.controllersNode = makeNode('div', 'controllers');
    this.controllersTopNode = makeNode('div', 'controllers-top');
    this.controllersBottomNode = makeNode('div', 'controllers-bottom');
    this.controllersBottomLeftNode = makeNode('div', 'controllers-bottom-left');
    this.controllersBottomRightNode = makeNode('div', 'controllers-bottom-right');
    this.fallbacksNode = makeNode('div', 'fallbacks');
    this.buttonsNode = makeNode('div', 'buttons');
    this.buttonsTopNode = makeNode('div', 'buttons-top');
    this.buttonsBottomNode = makeNode('div', 'buttons-bottom');
    this.buttonsLeftNode = makeNode('div', 'buttons-left');
    this.buttonsRightNode = makeNode('div', 'buttons-right');
    this.slidersNode = makeNode('div', 'sliders');
    this.patternsNode = makeNode('div', 'patterns-target');
    this.patternsFallbackNode = makeNode('div', 'patterns-fallback-target');

    appendTo(this.slidersNode)(this.volumeSelect)(this.panningSelect)(this.bpmSelect);
    append(this.buttonsLeftNode)(this.patternClearButton)(this.instrumentClearButton);
    append(this.buttonsRightNode)(this.tapButton)(this.saveButton)(this.startButton);
    append(this.controllersTopNode)(this.patternsNode)(this.slidersNode);
    appendTo(this.controllersBottomLeftNode)(this.instrumentSelect);
    append(this.controllersBottomLeftNode)(this.fallbacksNode);
    append(this.controllersBottomNode)(this.controllersBottomLeftNode)(this.controllersBottomRightNode);
    append(this.buttonsTopNode)(this.partPrevButton)(this.partAddButton)(this.partNextButton);
    append(this.buttonsBottomNode)(this.buttonsLeftNode)(this.buttonsRightNode);
    append(this.buttonsNode)(this.buttonsTopNode)(this.buttonsBottomNode);
    append(this.controllersBottomRightNode)(this.buttonsNode);
    append(this.controllersNode)(this.controllersTopNode)(this.controllersBottomNode);
    append(this.node)(this.controllersNode);
    appendTo(this.node)(this.steps);

    if(tiny) {
      appendTo(this.fallbacksNode)(this.bpmSelect)(this.panningSelect)(this.volumeSelect);
      append(this.fallbacksNode)(this.patternsFallbackNode);
      appendTo(this.fallbacksNode)(this.instrumentSelect);
    };

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

    addInputListeners([this.bpmSelect], (value) => {
      this.bpm = value;
    });

    addInputListeners([this.instrumentSelect], (value) => {
      this.instrument = this.instruments[value];
      this.applyInstrument();
    });

    addInputListeners([this.panningSelect], (value) => {
      this.sounds.pan(this.instrument.name, value);
    });

    addInputListeners([this.volumeSelect], (value) => {
      this.sounds.volume(this.instrument.name, value);
    });

    [this.patternsNode, this.patternsFallbackNode].forEach((node) => {
      node.addEventListener('input', () => {
        this.patternChangeHandler();
      });
    });

    this.tapButton.addEventListener('click', () => {
      this.bpmSelect.setValue(tap(this.bpmSelect.getValue()));
    });

    this.patternClearButton.addEventListener('click', () => {

      if(!confirm('clear pattern?')) {
        return;
      };

      this.instruments.forEach((inst) => {
        inst.clear();
      });

      this.applyInstrument();

    });

    this.instrumentClearButton.addEventListener('click', () => {

      if(!confirm('clear instrument?')) {
        return;
      };

      this.instrument.clear();
      this.applyInstrument();

    });

    this.partPrevButton.addEventListener('click', () => {

      this.part --;
      this.steps.setPart(this.part);
      this.toggleButtons();
      this.flashPart();

    });

    this.partAddButton.addEventListener('click', () => {

      this.instruments.forEach((inst) => {
        inst.addPart();
      });

      this.applyInstrument();

      this.part ++;
      this.parts ++;
      this.steps.setPart(this.part);
      this.toggleButtons();

    });

    this.partNextButton.addEventListener('click', () => {

      this.part ++;
      this.steps.setPart(this.part);
      this.toggleButtons();
      this.flashPart();

    });

    this.toggleButtons();

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

    this.storage.set('pattern', this.presets.length - 1);

    return this;

  };
  start() {

    this.playing = true;

    if(this.queued && this.currentStep === 0) {
      this.queued = false;
      this.stop();
      this.patternChangeHandler();
      this.setProp('queued', this.queued);
    };

    this.steps.flash(this.currentStep);

    this.play(this.currentStep);

    this.toggleButtons();

    if(this.currentStep % 16 === 0) {
      const part = ceilTo((this.currentStep+1)/16);
      this.steps.setPart(part-1);
      this.part = part-1;
      this.partAddButton.innerText = part;
    };

    if(this.currentStep === (this.instrument.steps.length - 1)) {
      this.currentStep = 0;
    }
    else {
      this.currentStep ++;
    };

    this.timer = setTimeout(() => {
      this.start();
    }, this.modes[this.mode]/this.bpm);

    return this;

  };
  stop() {

    this.playing = false;
    this.currentStep = 0;
    this.steps.clear();

    this.resetPartAddButton();
    this.toggleButtons();

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

    const existing = this.storage.get('patterns');
    const patternId = this.patternSelect.getValue();
    const pattern = existing[patternId];
    const overwrite = confirm(`overwrite pattern '${pattern[0]}'?`);

    if(overwrite) {

      existing[patternId] = this.getPatternData(pattern[0]);
      this.storage.set('patterns', existing);

    }
    else {

      const name = prompt('new pattern name?');

      if(!name) {return};

      const saved = [...existing, this.getPatternData(name)];
      this.storage.set('patterns', saved);

    };

    this.renderPatternSelect(true);

    return this;

  };
  renderPatternSelect(refresh = false) {

    if(this.patternSelect) {
      this.patternSelect.destroy();
    };

    const saved = this.storage.get('patterns');
    const items = saved.map(([name, bpm], index) => [`${limitChars(name)} ${bpm}`, index]);
    const defaultValue = refresh ? (saved.length - 1) : this.storage.get('pattern');

    if(tiny) {
      this.patternSelect = new ToggleFallback(items, defaultValue);
      this.patternSelect.appendTo(this.patternsFallbackNode);
    }
    else {
      this.patternSelect = new Toggle(items, 'pattern', defaultValue, 'patterns', 'Pattern');
      this.patternSelect.appendTo(this.patternsNode);
      this.patternSelect.scrollIntoView();
    };

    this.patternChangeHandler();

    return this;

  };
  patternChangeHandler() {

    if(this.playing && !this.queued) {
      this.queued = true;
      this.setProp('queued', this.queued);
      return;
    };

    const saved = this.storage.get('patterns');
    const patternId = this.patternSelect.getValue();
    const pattern = saved[patternId];
    this.bpm = pattern[1];
    this.bpmSelect.setValue(pattern[1]);
    this.instruments = pattern[2].map((steps, index) => new Instrument(this.keys[index], steps));
    this.sounds.mixer = toMixer(this.keys, pattern[3]);
    this.instrument = this.instruments[this.instrumentSelect.getValue()];
    this.part = 0;
    this.parts = this.instrument.steps.length/16;
    this.steps.setPart(0);
    this.storage.set('pattern', patternId);
    this.applyInstrument();
    this.toggleButtons();

  };
  applyInstrument() {

    this.steps.applyInstrument();

    const channel = this.sounds.mixer[this.instrument.name];

    this.volumeSelect.setValue(channel[0]);
    this.panningSelect.setValue(channel[1]);

    return this;

  };
  getPatternData(name) {

    return [name, this.bpmSelect.getValue(), this.instruments.map((inst) => inst.steps), this.instruments.map((inst) => this.sounds.mixer[inst.name])]

  };
  toggleButtons() {

    if(this.playing) {
      this.partPrevButton.disabled = true;
      this.partAddButton.disabled = true;
      this.partNextButton.disabled = true;
      return;
    };

    this.partPrevButton.disabled = false;
    this.partAddButton.disabled = false;
    this.partNextButton.disabled = false;

    if(this.parts===1) {
      // can't move either way
      this.partPrevButton.disabled = true;
      this.partNextButton.disabled = true;
      return;
    };

    if(this.parts===4) {
      // can't add new part
      this.partAddButton.disabled = true;
    };

    if(this.part===this.parts-1) {
      // can't move next
      this.partNextButton.disabled = true;
    };

    if(this.part===0) {
      // can't move left
      this.partPrevButton.disabled = true;
    };

    return this;

  };
  flashPart() {

    this.partAddButton.innerText = (this.part + 1);
    this.partAddButton.disabled = true;

    clearTimeout(this.flashTimeout);

    this.flashTimeout = setTimeout(() => {
      this.resetPartAddButton();
    }, 1000);

    return this;

  };
  resetPartAddButton() {

    this.partAddButton.innerText = '+16';
    this.toggleButtons();
    return this;

  };
  makeInstrumentSelect() {

    const items = this.keys.map((inst, index) => [inst, index]);

    if(tiny) {
      return new ToggleFallback(items, 0);
    }
    else {
      return new Toggle(items, 'instrument', 0, 'instruments', 'Instrument');
    };

  };
  playing = false;
  currentStep = 0;
  bpm = 120;
  queued = false;
  modes = {
    '1/16': 15000,
    '1/8': 30000,
    '1/4': 60000
  };
  mode = '1/16';
  presets = [
    ["empty",120,[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["bob",120,[[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["eminem",120,[[1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["clint eastwood","84",[[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],[0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0],[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
    ["don't wanna","102",[[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,1],[1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0],[0.5,0]]],
  ];
  part = 0;
  parts = 1;
  flashTimeout = 0;
};

class Instrument {
  constructor(name, steps = makeArray(16, () => 0)) {

    this.name = name;
    this.steps = steps;

  };
  clear() {

    this.steps = makeArray(this.steps.length, () => 0);
    return this;

  };
  addPart() {

    const copy = this.steps.slice(this.steps.length-16);
    this.steps = this.steps.concat(copy);

  };
};

class Steps extends DisplayObject {
  constructor(seq, count = 64) {

    super();

    this.seq = seq;
    this.node = makeNode('div', 'steps');
    this.count = count;
    this.steps = this.make();

    this.addListeners();
    this.render();

  };
  make() {

    let colorIndex = 0;

    return makeArray(this.count).map((index) => {
      const step = new Step(this.seq, index, this.part, this.stepColors[colorIndex]);
      if((index + 1) % 4 === 0) {
        colorIndex += 1;
      };
      if((index + 1) % 16 === 0) {
        this.part += 1;
        colorIndex = 0;
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
  flash(index) {

    this.clear();
    this.steps[index].flash();
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
  setPart(part) {

    this.steps.forEach((step) => {
      if(step.part===part) {
        step.show();
      }
      else {
        step.hide();
      };
    });

    return this;

  };
  addListeners() {

    let beats = [];

    this.node.addEventListener('click', (e) => {
      if(e.target?.classList.contains('step')) {
        this.steps[e.target.dataset.beat].toggle();
  		};
    });

    this.node.addEventListener('touchstart', () => {
      beats = [];
    });

    this.node.addEventListener('touchmove', (e) => {

      const node = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);

     	if(node?.classList.contains('step')) {
        const beat = node.dataset.beat;
    		if(beats.indexOf(beat)===-1) {
     			beats.push(beat);
          this.steps[beat].toggle();
    		};
     	};
     	e.preventDefault();

    });

    return this;

  };
  stepColors = ['red', 'orange', 'yellow', 'white'];
  part = 0;
};

class Step extends DisplayObject {
  constructor(seq, beat, part, color = 'red') {

    super();

    this.node = makeNode('div', `step.${color}`);
    this.indicator = makeNode('div', 'step-indicator');
    this.seq = seq;
    this.beat = beat;
    this.part = part;
    this.color = color;
    this.visible = this.part===this.seq.part;

    this.node.appendChild(this.indicator);

    this.setProp('enabled', this.enabled);
    this.setProp('active', this.active);
    this.setProp('visible', this.visible);
    this.setProp('beat', this.beat);

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
  show() {

    this.visible = true;
    this.setProp('visible', this.visible);
    return this;

  };
  hide() {

    this.visible = false;
    this.setProp('visible', this.visible);
    return this;

  };
  enabled = false;
  active = false;
  visible = false;
};

class Channel {
  constructor(instruments, modifiers) {
    this.instruments = instruments;
    this.modifiers = modifiers;
  };
};

const tiny = !minWidth(376);
const gutter = tiny ? 15 : 25;
const gap = 4;
const padSize = (((limit(window.innerWidth, 500) - (gutter*2)) - (gap*3)) / 4);
document.documentElement.style.setProperty('--gap', `${gap}px`);
document.documentElement.style.setProperty('--pad-size', `${padSize}px`);
document.documentElement.style.setProperty('--sliders-size', `${(padSize*2) + gap}px`);
document.documentElement.style.setProperty('--gutter', `${gutter}px`);

const sequencer = new Sequencer();

console.log(sequencer);

sequencer.appendTo(document.body);
